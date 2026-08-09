/**
 * P2-03: Full signal pipeline
 *
 * Streams the Ofcom LTE yellow-train CSV, snaps each measurement to the
 * nearest track-graph node, aggregates signal statistics per node per operator,
 * and emits data/signal-segments.json.
 *
 * Usage:
 *   npx tsx pipeline/p2-03-build-signal.ts [--dry-run] [--input <path>]
 *
 * --dry-run   Process only the first 100,000 rows (for fast iteration).
 * --input     Path to CSV file. Defaults to data/raw/lte-jun18tojun19-yt.csv.
 *             If the default file is missing, attempts to download it.
 *
 * Output: data/signal-segments.json
 *
 * Re-runnable to byte-identical output given the same input: output is
 * deterministically sorted by nodeId then operator name.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as https from "https";
import * as http from "http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodeMeasurements {
  rsrp: number[];
  rsrq: number[];
  sinr: number[]; // may have fewer entries than rsrp (NULLs)
  dates: string[]; // YYYY-MM-DD
}

interface NodeBucket {
  lat: number;
  lon: number;
  operators: Record<string, NodeMeasurements>;
}

interface OperatorOutput {
  count: number;
  rsrp_p10: number;
  rsrp_p50: number;
  rsrq_p10: number;
  sinr_p10: number | null;
  date_min: string;
  date_max: string;
  band: "video" | "voice" | "none" | "no-data";
  confidence: "high" | "low" | "no-data";
}

interface NodeOutput {
  lat: number;
  lon: number;
  operators: Record<string, OperatorOutput>;
}

interface SignalSegmentsOutput {
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
  nodes: Record<string, NodeOutput>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FULL_CSV_URL =
  "https://static.ofcom.org.uk/static/research/connected-nations2019/lte-jun18tojun19-yt.csv";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const DEFAULT_INPUT = path.join(RAW_DIR, "lte-jun18tojun19-yt.csv");
const OUTPUT_PATH = path.join(DATA_DIR, "signal-segments.json");
const GRAPH_PATH = path.join(DATA_DIR, "track-graph.json");

/** Maximum distance (metres) from a graph node to accept a measurement. */
const MAX_SNAP_DISTANCE_M = 500;

/** Minimum train speed (km/h) to include a measurement. Filters stationary. */
const MIN_SPEED_KMH = 5;

/** Grid cell size in degrees for spatial index. ~0.01 deg ~ 1.1 km */
const GRID_CELL_DEG = 0.01;

// Signal classification thresholds
export const THRESHOLDS = {
  /** RSRP p10 >= this: video+voice capable */
  VIDEO_RSRP_MIN: -85,
  /** RSRP p10 >= this (and < VIDEO): voice only */
  VOICE_RSRP_MIN: -95,
  /** RSRQ p10 < this: degrade to voice even if RSRP is good */
  RSRQ_DEGRADE_VOICE: -15,
  /** RSRQ p10 < this: degrade to no-signal */
  RSRQ_DEGRADE_NONE: -20,
  /** Measurements < this: "no-data" */
  MIN_COUNT_DATA: 3,
  /** Measurements < this: "low" confidence */
  MIN_COUNT_HIGH: 10,
};

// ---------------------------------------------------------------------------
// Spatial index: grid-based lookup for 21k graph nodes
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  lat: number;
  lon: number;
}

interface GridIndex {
  cellSize: number;
  cells: Map<string, GraphNode[]>;
}

function gridKey(lat: number, lon: number, cellSize: number): string {
  const r = Math.floor(lat / cellSize);
  const c = Math.floor(lon / cellSize);
  return `${r},${c}`;
}

export function buildGridIndex(
  nodes: Record<string, [number, number]>,
  cellSize: number = GRID_CELL_DEG
): GridIndex {
  const cells = new Map<string, GraphNode[]>();
  for (const [id, [lat, lon]] of Object.entries(nodes)) {
    const key = gridKey(lat, lon, cellSize);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push({ id, lat, lon });
  }
  return { cellSize, cells };
}

/**
 * Find the nearest graph node to (lat, lon). Returns null if the nearest
 * node is more than maxDistM away.
 */
export function findNearestNode(
  index: GridIndex,
  lat: number,
  lon: number,
  maxDistM: number = MAX_SNAP_DISTANCE_M
): { id: string; dist: number } | null {
  const { cellSize, cells } = index;
  // Search the cell containing the point and all 8 neighbours
  const cr = Math.floor(lat / cellSize);
  const cc = Math.floor(lon / cellSize);

  let bestId: string | null = null;
  let bestDist = Infinity;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const key = `${cr + dr},${cc + dc}`;
      const bucket = cells.get(key);
      if (!bucket) continue;
      for (const node of bucket) {
        const d = haversineMetres(lat, lon, node.lat, node.lon);
        if (d < bestDist) {
          bestDist = d;
          bestId = node.id;
        }
      }
    }
  }

  if (bestId !== null && bestDist <= maxDistM) {
    return { id: bestId, dist: bestDist };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Haversine
// ---------------------------------------------------------------------------

export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Percentile calculation (sorted array, linear interpolation)
// ---------------------------------------------------------------------------

/**
 * Compute the p-th percentile of a numeric array using linear interpolation.
 * The array is sorted in place. p is in [0, 100].
 */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  arr.sort((a, b) => a - b);
  if (arr.length === 1) return arr[0];
  const idx = (p / 100) * (arr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  const frac = idx - lo;
  return arr[lo] * (1 - frac) + arr[hi] * frac;
}

// ---------------------------------------------------------------------------
// Signal classification (pure function, independently testable)
// ---------------------------------------------------------------------------

export function classifySignal(
  rsrpP10: number,
  rsrqP10: number,
  count: number
): { band: "video" | "voice" | "none" | "no-data"; confidence: "high" | "low" | "no-data" } {
  // Confidence first
  if (count < THRESHOLDS.MIN_COUNT_DATA) {
    return { band: "no-data", confidence: "no-data" };
  }
  const confidence = count >= THRESHOLDS.MIN_COUNT_HIGH ? "high" : "low";

  // RSRQ override: very poor quality degrades regardless of power
  if (rsrqP10 < THRESHOLDS.RSRQ_DEGRADE_NONE) {
    return { band: "none", confidence };
  }

  // Base classification on RSRP p10
  let band: "video" | "voice" | "none";
  if (rsrpP10 >= THRESHOLDS.VIDEO_RSRP_MIN) {
    band = "video";
  } else if (rsrpP10 >= THRESHOLDS.VOICE_RSRP_MIN) {
    band = "voice";
  } else {
    band = "none";
  }

  // RSRQ moderate degradation: video -> voice
  if (band === "video" && rsrqP10 < THRESHOLDS.RSRQ_DEGRADE_VOICE) {
    band = "voice";
  }

  return { band, confidence };
}

// ---------------------------------------------------------------------------
// CSV row parsing
// ---------------------------------------------------------------------------

interface ParsedRow {
  lat: number;
  lon: number;
  speed: number;
  operator: string;
  cal_rsrp: number;
  rsrq: number;
  sinr: number | null;
  date: string; // YYYY-MM-DD
}

// Column indices (set after header parsing)
let COL: Record<string, number> = {};

function parseHeader(line: string): void {
  // Strip BOM if present
  const clean = line.replace(/^\uFEFF/, "");
  const cols = clean.split(",");
  COL = {};
  for (let i = 0; i < cols.length; i++) {
    COL[cols[i].trim().toLowerCase()] = i;
  }
  // Validate required columns
  const required = ["latitude", "longitude", "speed", "operator", "cal_rsrp", "rsrq", "sinr", "datetime"];
  for (const r of required) {
    if (COL[r] === undefined) {
      throw new Error(`Missing required column: ${r}. Found columns: ${cols.join(", ")}`);
    }
  }
}

function parseRow(line: string): ParsedRow | null {
  const parts = line.split(",");
  if (parts.length < Object.keys(COL).length) return null;

  const lat = parseFloat(parts[COL["latitude"]]);
  const lon = parseFloat(parts[COL["longitude"]]);
  const speed = parseFloat(parts[COL["speed"]]);
  const operator = parts[COL["operator"]].trim();
  const cal_rsrp = parseFloat(parts[COL["cal_rsrp"]]);
  const rsrq = parseFloat(parts[COL["rsrq"]]);
  const sinrRaw = parts[COL["sinr"]].trim();
  const sinr = sinrRaw === "" || sinrRaw.toLowerCase() === "null" ? null : parseFloat(sinrRaw);
  const datetime = parts[COL["datetime"]].trim();

  // Validate numeric fields
  if (isNaN(lat) || isNaN(lon) || isNaN(cal_rsrp) || isNaN(rsrq)) return null;
  if (!operator) return null;

  // Extract date part (YYYY-MM-DD)
  const date = datetime.substring(0, 10);

  return { lat, lon, speed: isNaN(speed) ? 0 : speed, operator, cal_rsrp, rsrq, sinr, date };
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} ...`);
    console.log(`Destination: ${dest}`);

    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;

    const request = (proto as typeof https).get(url, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
      let downloaded = 0;
      let lastReport = 0;

      response.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        const pct = totalBytes > 0 ? ((downloaded / totalBytes) * 100).toFixed(1) : "?";
        const mb = (downloaded / 1e6).toFixed(0);
        if (downloaded - lastReport > 50e6) {
          console.log(`  ${mb} MB downloaded (${pct}%)`);
          lastReport = downloaded;
        }
      });

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`Download complete: ${(downloaded / 1e6).toFixed(0)} MB`);
        resolve();
      });
    });

    request.on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputIdx = args.indexOf("--input");
  let inputPath = inputIdx >= 0 && args[inputIdx + 1] ? args[inputIdx + 1] : DEFAULT_INPUT;

  // Resolve relative paths
  if (!path.isAbsolute(inputPath)) {
    inputPath = path.resolve(process.cwd(), inputPath);
  }

  const DRY_RUN_LIMIT = 100_000;

  console.log("=== P2-03: Build signal segments ===");
  console.log(`Mode: ${dryRun ? "DRY RUN (first " + DRY_RUN_LIMIT + " rows)" : "FULL"}`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log("");

  // --- Ensure input file exists ---
  if (!fs.existsSync(inputPath)) {
    if (inputPath === DEFAULT_INPUT) {
      console.log("Full CSV not found locally. Attempting download...");
      try {
        await downloadFile(FULL_CSV_URL, inputPath);
      } catch (err) {
        console.error(`Download failed: ${err}`);
        // Fall back to sample
        const samplePath = path.join(RAW_DIR, "lte-sample-spread.csv");
        if (fs.existsSync(samplePath)) {
          console.log(`Falling back to sample file: ${samplePath}`);
          inputPath = samplePath;
        } else {
          console.error("No input file available. Exiting.");
          process.exit(1);
        }
      }
    } else {
      console.error(`Input file not found: ${inputPath}`);
      process.exit(1);
    }
  }

  // --- Load track graph ---
  console.log("Loading track graph...");
  const graph: { nodes: Record<string, [number, number]>; edges: [number, number, number][] } =
    JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  console.log(`  ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges`);

  // --- Build spatial index ---
  console.log("Building spatial index...");
  const index = buildGridIndex(graph.nodes);
  console.log(`  ${index.cells.size} grid cells`);

  // --- Stream and process ---
  console.log("Streaming CSV...");
  const buckets = new Map<string, NodeBucket>();

  let totalRows = 0;
  let headerParsed = false;
  let filteredNearTrack = 0;
  let filteredSpeed = 0;
  let filteredInvalid = 0;
  let snappedRows = 0;
  const operatorCounts: Record<string, number> = {};

  const isSampleFile = inputPath.includes("sample");

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(inputPath, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line: string) => {
      if (!headerParsed) {
        parseHeader(line);
        headerParsed = true;
        return;
      }

      totalRows++;

      if (dryRun && totalRows > DRY_RUN_LIMIT) {
        rl.close();
        stream.destroy();
        return;
      }

      // Log progress every 1M rows
      if (totalRows % 1_000_000 === 0) {
        console.log(`  ${(totalRows / 1e6).toFixed(0)}M rows processed...`);
      }

      const row = parseRow(line);
      if (!row) {
        filteredInvalid++;
        return;
      }

      // Filter stationary measurements
      if (row.speed < MIN_SPEED_KMH) {
        filteredSpeed++;
        return;
      }

      // Snap to nearest graph node
      const nearest = findNearestNode(index, row.lat, row.lon);
      if (!nearest) {
        filteredNearTrack++;
        return;
      }

      snappedRows++;
      operatorCounts[row.operator] = (operatorCounts[row.operator] || 0) + 1;

      // Bucket the measurement
      if (!buckets.has(nearest.id)) {
        const nodeCoords = graph.nodes[nearest.id];
        buckets.set(nearest.id, {
          lat: nodeCoords[0],
          lon: nodeCoords[1],
          operators: {},
        });
      }

      const bucket = buckets.get(nearest.id)!;
      if (!bucket.operators[row.operator]) {
        bucket.operators[row.operator] = { rsrp: [], rsrq: [], sinr: [], dates: [] };
      }

      const opData = bucket.operators[row.operator];
      opData.rsrp.push(row.cal_rsrp);
      opData.rsrq.push(row.rsrq);
      if (row.sinr !== null && !isNaN(row.sinr)) {
        opData.sinr.push(row.sinr);
      }
      opData.dates.push(row.date);
    });

    rl.on("close", resolve);
    rl.on("error", reject);
    stream.on("error", reject);
  });

  // --- Log statistics ---
  console.log("");
  console.log("=== Row counts ===");
  console.log(`  Total data rows:      ${totalRows.toLocaleString()}`);
  console.log(`  Invalid/unparseable:  ${filteredInvalid.toLocaleString()}`);
  console.log(`  Filtered (speed < ${MIN_SPEED_KMH} km/h): ${filteredSpeed.toLocaleString()}`);
  console.log(`  Filtered (> ${MAX_SNAP_DISTANCE_M}m from track): ${filteredNearTrack.toLocaleString()}`);
  console.log(`  Snapped to nodes:     ${snappedRows.toLocaleString()}`);
  console.log(`  Nodes with data:      ${buckets.size.toLocaleString()}`);
  console.log("");
  console.log("=== Per-operator counts ===");
  for (const [op, count] of Object.entries(operatorCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${op}: ${count.toLocaleString()}`);
  }

  // --- Aggregate and classify ---
  console.log("");
  console.log("Aggregating and classifying...");

  const outputNodes: Record<string, NodeOutput> = {};
  let totalMeasurements = 0;

  // Sort node IDs for deterministic output
  const sortedNodeIds = Array.from(buckets.keys()).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  for (const nodeId of sortedNodeIds) {
    const bucket = buckets.get(nodeId)!;
    const nodeOut: NodeOutput = {
      lat: Math.round(bucket.lat * 100000) / 100000,
      lon: Math.round(bucket.lon * 100000) / 100000,
      operators: {},
    };

    // Sort operators alphabetically for deterministic output
    const sortedOps = Object.keys(bucket.operators).sort();

    for (const op of sortedOps) {
      const data = bucket.operators[op];
      const count = data.rsrp.length;
      totalMeasurements += count;

      // Compute percentiles (these sort the arrays in place -- fine, we don't need them after)
      const rsrpP10 = percentile([...data.rsrp], 10);
      const rsrpP50 = percentile([...data.rsrp], 50);
      const rsrqP10 = percentile([...data.rsrq], 10);
      const sinrP10 = data.sinr.length >= 3 ? percentile([...data.sinr], 10) : null;

      // Date range
      const sortedDates = [...new Set(data.dates)].sort();
      const dateMin = sortedDates[0];
      const dateMax = sortedDates[sortedDates.length - 1];

      // Classify
      const { band, confidence } = classifySignal(rsrpP10, rsrqP10, count);

      nodeOut.operators[op] = {
        count,
        rsrp_p10: Math.round(rsrpP10 * 10) / 10,
        rsrp_p50: Math.round(rsrpP50 * 10) / 10,
        rsrq_p10: Math.round(rsrqP10 * 10) / 10,
        sinr_p10: sinrP10 !== null ? Math.round(sinrP10 * 10) / 10 : null,
        date_min: dateMin,
        date_max: dateMax,
        band,
        confidence,
      };
    }

    outputNodes[nodeId] = nodeOut;
  }

  // --- Build output ---
  const sourceDesc = isSampleFile
    ? "Ofcom LTE yellow-train measurements (SAMPLE: lte-sample-spread.csv, not full dataset)"
    : "Ofcom LTE yellow-train measurements, Jun 2018 - Jun 2019";

  const output: SignalSegmentsOutput = {
    generated: new Date().toISOString(),
    source: sourceDesc,
    thresholds: {
      video_rsrp_min: THRESHOLDS.VIDEO_RSRP_MIN,
      voice_rsrp_min: THRESHOLDS.VOICE_RSRP_MIN,
      rsrq_degrade_voice: THRESHOLDS.RSRQ_DEGRADE_VOICE,
      rsrq_degrade_none: THRESHOLDS.RSRQ_DEGRADE_NONE,
      min_count_low: THRESHOLDS.MIN_COUNT_DATA,
      min_count_high: THRESHOLDS.MIN_COUNT_HIGH,
    },
    node_count: Object.keys(outputNodes).length,
    measurement_count: totalMeasurements,
    nodes: outputNodes,
  };

  // --- Write output ---
  console.log(`Writing ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  const fileSizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0);
  console.log(`  File size: ${fileSizeKB} KB`);
  console.log(`  Nodes: ${output.node_count}`);
  console.log(`  Total measurements: ${totalMeasurements.toLocaleString()}`);
  console.log("");
  console.log("=== Done ===");
}

// ---------------------------------------------------------------------------
// Entry point: only run when executed directly, not when imported for tests
// ---------------------------------------------------------------------------

const isDirectExecution =
  typeof require !== "undefined" &&
  require.main === module;

// Also check for tsx/ts-node which set require.main differently
const isCLI =
  isDirectExecution ||
  (process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("p2-03-build-signal") &&
   !process.argv[1].includes("vitest") && !process.argv[1].includes("jest"));

if (isCLI) {
  main().catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
