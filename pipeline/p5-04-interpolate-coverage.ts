/**
 * P5-04: Signal gap-fill via tunnel marking + graph interpolation
 *
 * Fills two categories of no-data track nodes:
 *
 * Phase A — Tunnel marking
 *   For each tunnel in data/tunnels.json, snap its coordinate polyline to
 *   track-graph nodes within 200 m. For snapped nodes not already in
 *   signal-segments.json, add entries with band: "none", source: "tunnel",
 *   confidence: "high". Nodes that already have data are not modified.
 *
 * Phase B — Graph interpolation
 *   For remaining no-data nodes (after Phase A), run a Dijkstra outward
 *   along the track graph, accumulating distance in metres, stopping at
 *   MAX_DISTANCE = 5,000 m. Per operator, compute a distance-weighted
 *   evidence score from reachable covered nodes. Minimum evidence threshold:
 *   covered_weight + none_weight >= 0.3. If threshold met, emit voice or
 *   none depending on which side has more weight. Never emits "video".
 *   Source: "interpolated", confidence: "low", count: 0.
 *
 * CLI flags:
 *   --dry-run      Print stats but do not write output file
 *   --tunnels-only Phase A only (skip graph interpolation)
 *
 * Usage:
 *   npx tsx pipeline/p5-04-interpolate-coverage.ts [--dry-run] [--tunnels-only]
 *
 * Output: updated data/signal-segments.json (in place, same format as p5-03)
 *
 * Reuses from p2-03-build-signal.ts: buildGridIndex, findNearestNode, haversineMetres
 */

import * as fs from "fs";
import * as path from "path";
import { buildGridIndex, findNearestNode } from "./p2-03-build-signal";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const SIGNAL_PATH = path.join(DATA_DIR, "signal-segments.json");
const GRAPH_PATH = path.join(DATA_DIR, "track-graph.json");
const TUNNELS_PATH = path.join(DATA_DIR, "tunnels.json");

const OPERATORS = ["EE", "O2", "Three", "Vodafone"] as const;
type Operator = (typeof OPERATORS)[number];

/** Maximum distance (metres) for snapping tunnel waypoints to graph nodes. */
const TUNNEL_SNAP_DISTANCE_M = 200;

/** Maximum BFS distance (metres) for interpolation. */
const MAX_INTERP_DISTANCE_M = 5000;

/**
 * Minimum combined weight to emit an interpolated result for an operator.
 * weight = 1 / (1 + dist_m / 1000):
 *   at 0 m → 1.0, at 1 km → 0.5, at 2.3 km → 0.3 (threshold crossover),
 *   at 5 km → 0.17
 * Roughly equivalent to one data node within ~2.3 km.
 */
const MIN_WEIGHT_THRESHOLD = 0.3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TunnelData {
  id: number;
  name: string | null;
  coords: [number, number][]; // [lat, lon] pairs
  length_m: number;
  source: string;
}

interface OperatorEntry {
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

interface SignalNode {
  lat: number;
  lon: number;
  operators: Record<string, OperatorEntry>;
}

interface SignalSegmentsData {
  generated: string;
  source: string;
  thresholds: Record<string, number>;
  node_count: number;
  measurement_count: number;
  nodes: Record<string, SignalNode>;
}

// ---------------------------------------------------------------------------
// Min-heap for Dijkstra
// ---------------------------------------------------------------------------

class MinHeap {
  private items: Array<{ id: string; dist: number }> = [];

  get size(): number {
    return this.items.length;
  }

  push(id: string, dist: number): void {
    this.items.push({ id, dist });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): { id: string; dist: number } | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[i].dist >= this.items[parent].dist) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.items.length;
    for (;;) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.items[left].dist < this.items[smallest].dist)
        smallest = left;
      if (right < n && this.items[right].dist < this.items[smallest].dist)
        smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [
        this.items[smallest],
        this.items[i],
      ];
      i = smallest;
    }
  }
}

// ---------------------------------------------------------------------------
// BFS with distance accumulation (Dijkstra, pruned at maxDist)
// ---------------------------------------------------------------------------

/**
 * Run Dijkstra outward from startId, collecting all reachable nodes within
 * maxDist metres. Returns a map of nodeId → distance (metres).
 * The start node itself is excluded from the result.
 */
function bfsReachable(
  startId: string,
  adjacency: Map<string, Array<{ to: string; dist: number }>>,
  maxDist: number
): Map<string, number> {
  const dist = new Map<string, number>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  dist.set(startId, 0);
  heap.push(startId, 0);

  while (heap.size > 0) {
    const current = heap.pop()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const neighbors = adjacency.get(current.id);
    if (!neighbors) continue;

    for (const { to, dist: edgeDist } of neighbors) {
      if (visited.has(to)) continue;
      const newDist = current.dist + edgeDist;
      if (newDist > maxDist) continue; // prune: don't go beyond maxDist
      const existing = dist.get(to);
      if (existing === undefined || newDist < existing) {
        dist.set(to, newDist);
        heap.push(to, newDist);
      }
    }
  }

  dist.delete(startId);
  return dist;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const tunnelsOnly = args.includes("--tunnels-only");

  console.log(
    "=== P5-04: Signal gap-fill via tunnel marking + graph interpolation ==="
  );
  console.log(`Mode:  ${dryRun ? "DRY RUN (no write)" : "FULL"}`);
  console.log(
    `Phase: ${tunnelsOnly ? "A only (tunnel marking)" : "A + B (tunnel + interpolation)"}`
  );
  console.log("");

  // --- Load data ---
  console.log("Loading track graph...");
  const graph: {
    nodes: Record<string, [number, number]>;
    edges: Array<[number, number, number]>;
  } = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  const graphNodeIds = Object.keys(graph.nodes);
  console.log(
    `  ${graphNodeIds.length} nodes, ${graph.edges.length} edges`
  );

  console.log("Loading signal segments...");
  const signalData: SignalSegmentsData = JSON.parse(
    fs.readFileSync(SIGNAL_PATH, "utf8")
  );
  console.log(`  ${signalData.node_count} signal nodes already covered`);
  console.log(
    `  ${graphNodeIds.length - signalData.node_count} nodes with no data`
  );

  console.log("Loading tunnels...");
  const tunnels: TunnelData[] = JSON.parse(
    fs.readFileSync(TUNNELS_PATH, "utf8")
  );
  console.log(`  ${tunnels.length} tunnels`);

  // --- Build adjacency list ---
  console.log("\nBuilding adjacency list...");
  const adjacency = new Map<string, Array<{ to: string; dist: number }>>();

  for (const [fromNum, toNum, dist] of graph.edges) {
    const from = String(fromNum);
    const to = String(toNum);
    if (!adjacency.has(from)) adjacency.set(from, []);
    if (!adjacency.has(to)) adjacency.set(to, []);
    adjacency.get(from)!.push({ to, dist });
    adjacency.get(to)!.push({ to: from, dist });
  }
  console.log(`  ${adjacency.size} nodes with adjacency entries`);

  // --- Build spatial index for tunnel snapping ---
  console.log("Building spatial index...");
  const index = buildGridIndex(graph.nodes);
  console.log(`  ${index.cells.size} grid cells`);

  const today = new Date().toISOString().slice(0, 10);

  // ===========================================================================
  // Phase A: Tunnel marking
  // ===========================================================================

  console.log("\n=== Phase A: Tunnel marking ===");

  // Walk every tunnel polyline and snap each waypoint to the nearest node
  const tunnelNodeIds = new Set<string>();

  for (const tunnel of tunnels) {
    for (const [lat, lon] of tunnel.coords) {
      const nearest = findNearestNode(index, lat, lon, TUNNEL_SNAP_DISTANCE_M);
      if (nearest) {
        tunnelNodeIds.add(nearest.id);
      }
    }
  }

  console.log(
    `  ${tunnelNodeIds.size} unique graph nodes snapped from tunnel polylines`
  );

  let tunnelNodesAdded = 0;
  let tunnelNodesSkipped = 0;

  for (const nodeId of tunnelNodeIds) {
    // Do not modify nodes that already have measured or modelled data
    if (signalData.nodes[nodeId]) {
      tunnelNodesSkipped++;
      continue;
    }

    const graphCoords = graph.nodes[nodeId];
    if (!graphCoords) continue;

    // All 4 operators → band: "none", source: "tunnel", confidence: "high"
    const operatorEntries: Record<string, OperatorEntry> = {};
    for (const op of OPERATORS) {
      operatorEntries[op] = {
        count: 0,
        rsrp_p10: 0,
        rsrp_p50: 0,
        rsrq_p10: 0,
        sinr_p10: null,
        date_min: today,
        date_max: today,
        band: "none",
        confidence: "high",
        source: "tunnel",
      };
    }

    signalData.nodes[nodeId] = {
      lat: Math.round(graphCoords[0] * 100000) / 100000,
      lon: Math.round(graphCoords[1] * 100000) / 100000,
      operators: operatorEntries,
    };

    tunnelNodesAdded++;
  }

  console.log(`  Added (new tunnel nodes):         ${tunnelNodesAdded}`);
  console.log(`  Skipped (node already has data):  ${tunnelNodesSkipped}`);

  if (tunnelsOnly) {
    console.log("\n[--tunnels-only] Skipping Phase B.");
  } else {
    // =========================================================================
    // Phase B: Graph interpolation
    // =========================================================================

    console.log("\n=== Phase B: Graph interpolation ===");

    // Eligible nodes: still not in signal-segments.json after Phase A.
    // Snapshot the covered set here so Phase B results don't influence each other.
    const coveredNodeIds = new Set(Object.keys(signalData.nodes));

    const eligibleNodes: string[] = [];
    for (const nodeId of graphNodeIds) {
      if (!coveredNodeIds.has(nodeId)) {
        eligibleNodes.push(nodeId);
      }
    }
    console.log(`  ${eligibleNodes.length} eligible nodes to process`);

    let interpNodesAdded = 0;
    let interpNodesSkipped = 0;
    let processed = 0;

    for (const nodeId of eligibleNodes) {
      processed++;
      if (processed % 1000 === 0) {
        console.log(
          `  ${processed}/${eligibleNodes.length} processed (${interpNodesAdded} added so far)...`
        );
      }

      // Dijkstra outward to find all covered nodes within MAX_INTERP_DISTANCE_M
      const reachable = bfsReachable(nodeId, adjacency, MAX_INTERP_DISTANCE_M);

      // Per-operator interpolation
      const opResults: Partial<Record<Operator, "voice" | "none">> = {};

      for (const op of OPERATORS) {
        let coveredWeight = 0; // band = voice or video
        let noneWeight = 0;    // band = none

        for (const [covNodeId, distM] of reachable) {
          // Only use nodes that existed before Phase B started (use snapshot)
          if (!coveredNodeIds.has(covNodeId)) continue;

          const covNode = signalData.nodes[covNodeId];
          if (!covNode) continue;

          const opData = covNode.operators[op];
          if (!opData || opData.band === "no-data") continue;

          // Weight decreases with distance: 1.0 at 0 m, 0.5 at 1 km, 0.17 at 5 km
          const weight = 1 / (1 + distM / 1000);

          if (opData.band === "voice" || opData.band === "video") {
            coveredWeight += weight;
          } else if (opData.band === "none") {
            noneWeight += weight;
          }
        }

        const totalWeight = coveredWeight + noneWeight;
        if (totalWeight < MIN_WEIGHT_THRESHOLD) continue; // insufficient evidence

        // Cap at "voice" — never emit "video" from interpolated data
        opResults[op] = coveredWeight > noneWeight ? "voice" : "none";
      }

      // Only add node to signal data if at least one operator got a result
      if (Object.keys(opResults).length === 0) {
        interpNodesSkipped++;
        continue;
      }

      const graphCoords = graph.nodes[nodeId];
      if (!graphCoords) continue;

      const operatorEntries: Record<string, OperatorEntry> = {};
      for (const op of OPERATORS) {
        const band = opResults[op];
        if (band !== undefined) {
          operatorEntries[op] = {
            count: 0,
            rsrp_p10: 0,
            rsrp_p50: 0,
            rsrq_p10: 0,
            sinr_p10: null,
            date_min: today,
            date_max: today,
            band,
            confidence: "low",
            source: "interpolated",
          };
        }
        // Operators with insufficient evidence are omitted entirely —
        // the app treats absent operators as no-data.
      }

      signalData.nodes[nodeId] = {
        lat: Math.round(graphCoords[0] * 100000) / 100000,
        lon: Math.round(graphCoords[1] * 100000) / 100000,
        operators: operatorEntries,
      };

      interpNodesAdded++;
    }

    console.log(`  Interpolated nodes added:          ${interpNodesAdded}`);
    console.log(`  Skipped (insufficient evidence):   ${interpNodesSkipped}`);
  }

  // --- Summary ---
  const newNodeCount = Object.keys(signalData.nodes).length;
  const originalNodeCount = signalData.node_count;
  signalData.node_count = newNodeCount;
  signalData.source += " + tunnel marking and graph interpolation (P5-04)";

  console.log("\n=== Summary ===");
  console.log(`  Signal nodes before: ${originalNodeCount}`);
  console.log(`  Signal nodes after:  ${newNodeCount}`);
  console.log(`  Nodes added:         ${newNodeCount - originalNodeCount}`);

  // --- Write output ---
  if (dryRun) {
    console.log("\nDRY RUN: not writing output file.");
  } else {
    // Sort nodes by numeric ID for deterministic output
    const sortedNodes: Record<string, SignalNode> = {};
    const sortedKeys = Object.keys(signalData.nodes).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    for (const key of sortedKeys) {
      const node = signalData.nodes[key];
      // Sort operators alphabetically within each node
      const sortedOps: typeof node.operators = {};
      for (const op of Object.keys(node.operators).sort()) {
        sortedOps[op] = node.operators[op];
      }
      sortedNodes[key] = { ...node, operators: sortedOps };
    }
    signalData.nodes = sortedNodes;

    console.log(`\nWriting ${SIGNAL_PATH}...`);
    fs.writeFileSync(SIGNAL_PATH, JSON.stringify(signalData), "utf8");

    const fileSizeMB = (
      fs.statSync(SIGNAL_PATH).size /
      (1024 * 1024)
    ).toFixed(1);
    console.log(`  File size: ${fileSizeMB} MB`);
    console.log(`  Nodes: ${signalData.node_count}`);
  }

  console.log("\n=== Done ===");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const isDirectExecution =
  typeof require !== "undefined" && require.main === module;

const isCLI =
  isDirectExecution ||
  (process.argv[1] &&
    process.argv[1]
      .replace(/\\/g, "/")
      .includes("p5-04-interpolate-coverage") &&
    !process.argv[1].includes("vitest") &&
    !process.argv[1].includes("jest"));

if (isCLI) {
  main().catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
