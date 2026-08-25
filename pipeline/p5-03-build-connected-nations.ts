/**
 * P5-03: Connected Nations modelled coverage integration
 *
 * Reads Ofcom Connected Nations per-operator 4G voice coverage predictions
 * and merges them into data/signal-segments.json for track-graph nodes that
 * have no measured data (fewer than 3 measurements across all operators).
 *
 * The Connected Nations data must be obtained separately (see
 * specs/signal-model.md, P5-03 section) and placed at:
 *   data/raw/connected-nations-2025/coverage-grid.csv
 *
 * Expected CSV schema (one row per grid cell per operator):
 *   easting,northing,operator,voice_outdoor
 *
 * Where:
 *   - easting/northing: OSGB36 (EPSG:27700) 100m grid cell centroid
 *   - operator: one of EE, O2, Three, Vodafone (or variants; see normalisation)
 *   - voice_outdoor: 1 = covered, 0 = not covered
 *
 * If the file contains lat/lon columns instead (latitude,longitude), those
 * are used directly without coordinate conversion.
 *
 * Merge rules:
 *   1. A node is eligible only if ALL operators have < 3 measurements
 *   2. Modelled entries cap at band "voice" -- never "video"
 *   3. Source field is "modelled" for all entries from this pipeline
 *   4. Grid cells are snapped to the nearest track-graph node within 200 m
 *
 * Usage:
 *   npx tsx pipeline/p5-03-build-connected-nations.ts [--dry-run]
 *
 * --dry-run   Process but do not write output file.
 *
 * Output: updated data/signal-segments.json (in place)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import {
  buildGridIndex,
  findNearestNode,
  haversineMetres,
  normaliseOperator,
} from "./p2-03-build-signal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SIGNAL_PATH = path.join(DATA_DIR, "signal-segments.json");
const GRAPH_PATH = path.join(DATA_DIR, "track-graph.json");
const CN_CSV_PATH = path.join(
  DATA_DIR,
  "raw",
  "connected-nations-2025",
  "coverage-grid.csv"
);

/** Maximum distance (metres) from a graph node to accept a grid cell snap. */
const MAX_SNAP_DISTANCE_M = 200;

/** Minimum measurement count -- nodes below this for ALL operators are eligible. */
const MIN_COUNT_DATA = 3;

/** The four operators the app uses. */
const OPERATORS = ["EE", "O2", "Three", "Vodafone"] as const;

// ---------------------------------------------------------------------------
// OSGB36 (easting/northing) to WGS84 (lat/lon) conversion
//
// Uses the standard Helmert 7-parameter transformation via Airy 1830 ellipsoid.
// Accuracy is ~5 m, which is sufficient for 100 m grid snapping.
// ---------------------------------------------------------------------------

/** Convert OSGB36 easting/northing to WGS84 lat/lon. */
export function osgb36ToWgs84(
  easting: number,
  northing: number
): { lat: number; lon: number } {
  // Airy 1830 ellipsoid
  const a = 6377563.396;
  const b = 6356256.909;
  const F0 = 0.9996012717;
  const lat0 = (49 * Math.PI) / 180;
  const lon0 = (-2 * Math.PI) / 180;
  const N0 = -100000;
  const E0 = 400000;
  const e2 = 1 - (b * b) / (a * a);
  const n = (a - b) / (a + b);

  // Iterate to find latitude on Airy ellipsoid
  let lat = (northing - N0) / (a * F0) + lat0;
  let M = 0;
  for (let i = 0; i < 20; i++) {
    const latMinusLat0 = lat - lat0;
    const latPlusLat0 = lat + lat0;
    M =
      b *
      F0 *
      ((1 + n + (5 / 4) * n * n + (5 / 4) * n * n * n) * latMinusLat0 -
        (3 * n + 3 * n * n + (21 / 8) * n * n * n) * Math.sin(latMinusLat0) * Math.cos(latPlusLat0) +
        ((15 / 8) * n * n + (15 / 8) * n * n * n) * Math.sin(2 * latMinusLat0) * Math.cos(2 * latPlusLat0) -
        ((35 / 24) * n * n * n) * Math.sin(3 * latMinusLat0) * Math.cos(3 * latPlusLat0));
    if (Math.abs(northing - N0 - M) < 0.00001) break;
    lat = (northing - N0 - M) / (a * F0) + lat;
  }

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;

  const VII = tanLat / (2 * rho * nu);
  const VIII =
    (tanLat / (24 * rho * nu * nu * nu)) *
    (5 + 3 * tanLat * tanLat + eta2 - 9 * tanLat * tanLat * eta2);
  const IX =
    (tanLat / (720 * rho * Math.pow(nu, 5))) *
    (61 + 90 * tanLat * tanLat + 45 * Math.pow(tanLat, 4));
  const X = 1 / (cosLat * nu);
  const XI =
    (1 / (cosLat * 6 * nu * nu * nu)) * (nu / rho + 2 * tanLat * tanLat);
  const XII =
    (1 / (cosLat * 120 * Math.pow(nu, 5))) *
    (5 + 28 * tanLat * tanLat + 24 * Math.pow(tanLat, 4));
  const XIIA =
    (1 / (cosLat * 5040 * Math.pow(nu, 7))) *
    (61 +
      662 * tanLat * tanLat +
      1320 * Math.pow(tanLat, 4) +
      720 * Math.pow(tanLat, 6));

  const dE = easting - E0;
  const airyLat =
    lat -
    VII * dE * dE +
    VIII * Math.pow(dE, 4) -
    IX * Math.pow(dE, 6);
  const airyLon =
    lon0 +
    X * dE -
    XI * Math.pow(dE, 3) +
    XII * Math.pow(dE, 5) -
    XIIA * Math.pow(dE, 7);

  // Helmert transform from Airy 1830 to WGS84
  // Convert lat/lon to cartesian
  const sinAiryLat = Math.sin(airyLat);
  const cosAiryLat = Math.cos(airyLat);
  const sinAiryLon = Math.sin(airyLon);
  const cosAiryLon = Math.cos(airyLon);
  const nuAiry = a / Math.sqrt(1 - e2 * sinAiryLat * sinAiryLat);
  const x1 = nuAiry * cosAiryLat * cosAiryLon;
  const y1 = nuAiry * cosAiryLat * sinAiryLon;
  const z1 = nuAiry * (1 - e2) * sinAiryLat;

  // Helmert parameters (Airy 1830 -> WGS84)
  const tx = 446.448;
  const ty = -125.157;
  const tz = 542.06;
  const s = -20.4894e-6;
  const rx = (0.1502 / 3600) * (Math.PI / 180);
  const ry = (0.247 / 3600) * (Math.PI / 180);
  const rz = (0.8421 / 3600) * (Math.PI / 180);

  const x2 = tx + (1 + s) * x1 + -rz * y1 + ry * z1;
  const y2 = ty + rz * x1 + (1 + s) * y1 + -rx * z1;
  const z2 = tz + -ry * x1 + rx * y1 + (1 + s) * z1;

  // Convert back to lat/lon on WGS84 ellipsoid
  const aWgs = 6378137.0;
  const bWgs = 6356752.3141;
  const e2Wgs = 1 - (bWgs * bWgs) / (aWgs * aWgs);
  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let wgsLat = Math.atan2(z2, p * (1 - e2Wgs));
  for (let i = 0; i < 10; i++) {
    const sinWgsLat = Math.sin(wgsLat);
    const nuWgs = aWgs / Math.sqrt(1 - e2Wgs * sinWgsLat * sinWgsLat);
    wgsLat = Math.atan2(z2 + e2Wgs * nuWgs * sinWgsLat, p);
  }
  const wgsLon = Math.atan2(y2, x2);

  return {
    lat: (wgsLat * 180) / Math.PI,
    lon: (wgsLon * 180) / Math.PI,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignalSegmentsData {
  generated: string;
  source: string;
  thresholds: {
    video_rsrp_min: number;
    voice_rsrp_min: number;
    rsrq_degrade_voice: number;
    rsrq_degrade_none: number;
    min_count_low: number;
    min_count_high: number;
  };
  node_count: number;
  measurement_count: number;
  nodes: Record<
    string,
    {
      lat: number;
      lon: number;
      operators: Record<
        string,
        {
          count: number;
          rsrp_p10: number;
          rsrp_p50: number;
          rsrq_p10: number;
          sinr_p10: number | null;
          date_min: string;
          date_max: string;
          band: string;
          confidence: string;
          source?: string;
        }
      >;
    }
  >;
}

interface CoverageRow {
  lat: number;
  lon: number;
  operator: string;
  voiceCovered: boolean;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCnHeader(line: string): Record<string, number> {
  const clean = line.replace(/^\uFEFF/, "");
  const cols = clean.split(",");
  const map: Record<string, number> = {};
  for (let i = 0; i < cols.length; i++) {
    map[cols[i].trim().toLowerCase()] = i;
  }
  return map;
}

function parseCnRow(
  line: string,
  colMap: Record<string, number>,
  hasLatLon: boolean
): CoverageRow | null {
  const parts = line.split(",");
  if (parts.length < 4) return null;

  let lat: number, lon: number;

  if (hasLatLon) {
    lat = parseFloat(parts[colMap["latitude"]]);
    lon = parseFloat(parts[colMap["longitude"]]);
  } else {
    const easting = parseFloat(parts[colMap["easting"]]);
    const northing = parseFloat(parts[colMap["northing"]]);
    if (isNaN(easting) || isNaN(northing)) return null;
    const wgs = osgb36ToWgs84(easting, northing);
    lat = wgs.lat;
    lon = wgs.lon;
  }

  if (isNaN(lat) || isNaN(lon)) return null;

  const operatorRaw = parts[colMap["operator"]]?.trim();
  if (!operatorRaw) return null;
  const operator = normaliseOperator(operatorRaw);
  if (!operator) return null;

  const voiceRaw = parts[colMap["voice_outdoor"]]?.trim();
  const voiceCovered = voiceRaw === "1" || voiceRaw?.toLowerCase() === "true";

  return { lat, lon, operator, voiceCovered };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("=== P5-03: Connected Nations modelled coverage integration ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (no write)" : "FULL"}`);
  console.log("");

  // --- Check input file ---
  if (!fs.existsSync(CN_CSV_PATH)) {
    console.error(`Connected Nations CSV not found: ${CN_CSV_PATH}`);
    console.error("");
    console.error("The Ofcom Connected Nations per-pixel per-operator coverage data is");
    console.error("not available as a direct public download. It must be obtained via:");
    console.error("  1. Ofcom Connected Nations API (requires registration)");
    console.error("  2. FOI request to Ofcom for the underlying 100m grid data");
    console.error("  3. Operator coverage APIs (EE, O2, Three, Vodafone)");
    console.error("");
    console.error("See specs/signal-model.md (P5-03 section) for details.");
    console.error("");
    console.error("Expected file format (CSV, one row per grid cell per operator):");
    console.error("  easting,northing,operator,voice_outdoor");
    console.error("  OR");
    console.error("  latitude,longitude,operator,voice_outdoor");
    process.exit(1);
  }

  // --- Load track graph ---
  console.log("Loading track graph...");
  const graph: {
    nodes: Record<string, [number, number]>;
    edges: [number, number, number][];
  } = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  const graphNodeCount = Object.keys(graph.nodes).length;
  console.log(`  ${graphNodeCount} nodes`);

  // --- Load signal segments ---
  console.log("Loading signal segments...");
  const signalData: SignalSegmentsData = JSON.parse(
    fs.readFileSync(SIGNAL_PATH, "utf8")
  );
  console.log(`  ${signalData.node_count} signal nodes`);

  // --- Build spatial index ---
  console.log("Building spatial index...");
  const index = buildGridIndex(graph.nodes);
  console.log(`  ${index.cells.size} grid cells`);

  // --- Identify eligible nodes ---
  // A node is eligible if ALL operators have < MIN_COUNT_DATA measurements.
  // This includes nodes not in signal-segments.json at all (zero measurements).
  console.log("Identifying eligible nodes (all operators < 3 measurements)...");
  const eligibleNodes = new Set<string>();

  for (const nodeId of Object.keys(graph.nodes)) {
    const signalNode = signalData.nodes[nodeId];
    if (!signalNode) {
      // Not in signal data at all -- eligible
      eligibleNodes.add(nodeId);
      continue;
    }

    // Check if ALL operators have < MIN_COUNT_DATA
    let allBelow = true;
    for (const op of OPERATORS) {
      const opData = signalNode.operators[op];
      if (opData && opData.count >= MIN_COUNT_DATA) {
        allBelow = false;
        break;
      }
    }
    if (allBelow) {
      eligibleNodes.add(nodeId);
    }
  }

  console.log(
    `  ${eligibleNodes.size} eligible nodes (${((eligibleNodes.size / graphNodeCount) * 100).toFixed(1)}% of graph)`
  );

  // --- Stream Connected Nations CSV ---
  console.log("");
  console.log(`Streaming Connected Nations CSV: ${CN_CSV_PATH}`);

  // Accumulate coverage per eligible node per operator
  // nodeId -> operator -> { covered: boolean }
  const coverageMap = new Map<string, Map<string, boolean>>();
  let totalRows = 0;
  let parsedRows = 0;
  let snappedRows = 0;
  let eligibleSnapped = 0;
  let skippedNotEligible = 0;

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(CN_CSV_PATH, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let colMap: Record<string, number> | null = null;
    let hasLatLon = false;

    rl.on("line", (line: string) => {
      if (!colMap) {
        colMap = parseCnHeader(line);
        hasLatLon =
          colMap["latitude"] !== undefined && colMap["longitude"] !== undefined;
        const hasEastNorth =
          colMap["easting"] !== undefined && colMap["northing"] !== undefined;

        if (!hasLatLon && !hasEastNorth) {
          console.error(
            "CSV must contain either latitude/longitude or easting/northing columns"
          );
          rl.close();
          stream.destroy();
          reject(new Error("Missing coordinate columns"));
          return;
        }

        if (colMap["operator"] === undefined) {
          console.error("CSV must contain an 'operator' column");
          rl.close();
          stream.destroy();
          reject(new Error("Missing operator column"));
          return;
        }

        if (colMap["voice_outdoor"] === undefined) {
          console.error("CSV must contain a 'voice_outdoor' column");
          rl.close();
          stream.destroy();
          reject(new Error("Missing voice_outdoor column"));
          return;
        }

        console.log(
          `  Coordinate mode: ${hasLatLon ? "lat/lon" : "OSGB36 easting/northing"}`
        );
        return;
      }

      totalRows++;

      if (totalRows % 1_000_000 === 0) {
        console.log(`  ${(totalRows / 1e6).toFixed(0)}M rows processed...`);
      }

      const row = parseCnRow(line, colMap, hasLatLon);
      if (!row) return;
      parsedRows++;

      // Snap to nearest graph node within 200 m
      const nearest = findNearestNode(index, row.lat, row.lon, MAX_SNAP_DISTANCE_M);
      if (!nearest) return;
      snappedRows++;

      // Only process eligible nodes
      if (!eligibleNodes.has(nearest.id)) {
        skippedNotEligible++;
        return;
      }
      eligibleSnapped++;

      // Record coverage -- if multiple grid cells snap to the same node,
      // take the optimistic value (covered if ANY cell says covered).
      // This is because a node near a coverage boundary should get the
      // benefit of the doubt -- under-promising is handled by the "voice"
      // cap and the "modelled" source tag.
      if (!coverageMap.has(nearest.id)) {
        coverageMap.set(nearest.id, new Map());
      }
      const opMap = coverageMap.get(nearest.id)!;
      const existing = opMap.get(row.operator);
      if (existing === undefined || !existing) {
        opMap.set(row.operator, row.voiceCovered);
      }
    });

    rl.on("close", resolve);
    rl.on("error", reject);
    stream.on("error", reject);
  });

  console.log("");
  console.log("=== Row counts ===");
  console.log(`  Total CSV rows:         ${totalRows.toLocaleString()}`);
  console.log(`  Parsed successfully:    ${parsedRows.toLocaleString()}`);
  console.log(`  Snapped to graph:       ${snappedRows.toLocaleString()}`);
  console.log(`  On eligible nodes:      ${eligibleSnapped.toLocaleString()}`);
  console.log(`  Skipped (has data):     ${skippedNotEligible.toLocaleString()}`);
  console.log(
    `  Unique nodes with coverage: ${coverageMap.size.toLocaleString()}`
  );

  // --- Merge modelled coverage into signal-segments.json ---
  console.log("");
  console.log("Merging modelled coverage...");

  const today = new Date().toISOString().slice(0, 10);
  const perOperatorGains: Record<string, number> = {};
  for (const op of OPERATORS) {
    perOperatorGains[op] = 0;
  }
  let nodesGained = 0;

  for (const [nodeId, opMap] of coverageMap) {
    const graphCoords = graph.nodes[nodeId];
    if (!graphCoords) continue;

    // Ensure node exists in signal data
    if (!signalData.nodes[nodeId]) {
      signalData.nodes[nodeId] = {
        lat: Math.round(graphCoords[0] * 100000) / 100000,
        lon: Math.round(graphCoords[1] * 100000) / 100000,
        operators: {},
      };
    }

    const node = signalData.nodes[nodeId];
    let anyOperatorAdded = false;

    for (const op of OPERATORS) {
      // Skip if this operator already has enough data
      const existing = node.operators[op];
      if (existing && existing.count >= MIN_COUNT_DATA) continue;

      const covered = opMap.get(op);
      // If we have a coverage determination from Connected Nations:
      if (covered !== undefined) {
        node.operators[op] = {
          count: 0,
          rsrp_p10: 0,
          rsrp_p50: 0,
          rsrq_p10: 0,
          sinr_p10: null,
          date_min: today,
          date_max: today,
          band: covered ? "voice" : "none",
          confidence: "low",
          source: "modelled",
        };
        perOperatorGains[op]++;
        anyOperatorAdded = true;
      } else if (!existing) {
        // No CN data for this operator at this node -- mark as modelled no-data
        // so the node is complete (all four operators present)
        node.operators[op] = {
          count: 0,
          rsrp_p10: 0,
          rsrp_p50: 0,
          rsrq_p10: 0,
          sinr_p10: null,
          date_min: today,
          date_max: today,
          band: "none",
          confidence: "no-data",
          source: "modelled",
        };
        perOperatorGains[op]++;
        anyOperatorAdded = true;
      }
    }

    if (anyOperatorAdded) nodesGained++;
  }

  // Update metadata
  signalData.node_count = Object.keys(signalData.nodes).length;
  signalData.source +=
    " + Ofcom Connected Nations 2025 modelled coverage (P5-03)";

  // --- Log results ---
  console.log("");
  console.log("=== Per-operator node counts gained ===");
  for (const op of OPERATORS) {
    console.log(`  ${op}: ${perOperatorGains[op].toLocaleString()}`);
  }
  console.log(
    `  Total nodes gained: ${nodesGained.toLocaleString()}`
  );
  console.log(
    `  New total signal nodes: ${signalData.node_count.toLocaleString()}`
  );

  // --- Write output ---
  if (dryRun) {
    console.log("");
    console.log("DRY RUN: not writing output file.");
  } else {
    // Sort nodes by ID for deterministic output
    const sortedNodes: Record<string, typeof signalData.nodes[string]> = {};
    const sortedKeys = Object.keys(signalData.nodes).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    for (const key of sortedKeys) {
      // Sort operators alphabetically within each node
      const node = signalData.nodes[key];
      const sortedOps: typeof node.operators = {};
      for (const op of Object.keys(node.operators).sort()) {
        sortedOps[op] = node.operators[op];
      }
      sortedNodes[key] = { ...node, operators: sortedOps };
    }
    signalData.nodes = sortedNodes;

    console.log(`\nWriting ${SIGNAL_PATH}...`);
    fs.writeFileSync(SIGNAL_PATH, JSON.stringify(signalData), "utf8");

    const fileSizeKB = (fs.statSync(SIGNAL_PATH).size / 1024).toFixed(0);
    const fileSizeMB = (fs.statSync(SIGNAL_PATH).size / (1024 * 1024)).toFixed(
      1
    );
    console.log(`  File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
  }

  console.log("");
  console.log("=== Done ===");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const isDirectExecution =
  typeof require !== "undefined" && require.main === module;

const isCLI =
  isDirectExecution ||
  (process.argv[1] &&
    process.argv[1].replace(/\\/g, "/").includes("p5-03-build-connected-nations") &&
    !process.argv[1].includes("vitest") &&
    !process.argv[1].includes("jest"));

if (isCLI) {
  main().catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}

// Export for testing
export { osgb36ToWgs84 as _osgb36ToWgs84 };
