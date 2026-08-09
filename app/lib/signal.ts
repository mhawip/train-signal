/**
 * Signal data operations for journey segments.
 *
 * Server-side only -- loads data files via fs.readFileSync at module scope.
 * This module:
 *   1. Loads the track graph and signal measurement data
 *   2. Finds paths between stations using Dijkstra's algorithm
 *   3. Classifies each segment's signal quality for a given operator
 *   4. Detects tunnels along the path
 *
 * Signal classification thresholds are from Ofcom LTE yellow-train
 * measurements (June 2018 -- June 2019). The "band" and "confidence"
 * values are pre-computed in data/signal-segments.json by the pipeline
 * (pipeline/p2-03-build-signal.ts). This module reads those pre-computed
 * values rather than re-deriving them from RSRP/RSRQ.
 */

import fs from "fs";
import path from "path";
import type { Journey } from "@/app/lib/journey-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignalBand = "video" | "voice" | "none" | "no-data" | "unknown";
export type Confidence = "high" | "low" | "no-data";

export interface SegmentSignal {
  band: SignalBand;
  confidence: Confidence;
  /** Path nodes that had data for this operator */
  coveredNodes: number;
  /** Total path nodes in this segment */
  totalNodes: number;
  /** Tunnels on this segment (display name) */
  tunnels: string[];
}

// ---------------------------------------------------------------------------
// Data loading -- one-time at module scope
// ---------------------------------------------------------------------------

interface TrackGraphData {
  nodes: Record<string, [number, number]>;
  edges: Record<string, [number, number, number]>;
  stationNodes: Record<string, { nodeId: number; dist_m: number }>;
}

interface OperatorSignal {
  count: number;
  rsrp_p10: number;
  rsrq_p10: number;
  sinr_p10: number;
  date_min: string;
  date_max: string;
  band: "video" | "voice" | "none" | "no-data";
  confidence: "high" | "low" | "no-data";
}

interface SignalNode {
  lat: number;
  lon: number;
  operators: Record<string, OperatorSignal>;
}

interface SignalData {
  generated: string;
  source: string;
  thresholds: Record<string, number>;
  node_count: number;
  measurement_count: number;
  nodes: Record<string, SignalNode>;
}

interface TunnelData {
  id: number;
  name: string | null;
  coords: [number, number][];
  length_m: number;
  source: string;
}

const dataDir = path.join(process.cwd(), "data");

const trackGraph: TrackGraphData = JSON.parse(
  fs.readFileSync(path.join(dataDir, "track-graph.json"), "utf-8")
);

const signalData: SignalData = JSON.parse(
  fs.readFileSync(path.join(dataDir, "signal-segments.json"), "utf-8")
);

const tunnels: TunnelData[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, "tunnels.json"), "utf-8")
);

// ---------------------------------------------------------------------------
// Adjacency list -- built once from track-graph edges
// ---------------------------------------------------------------------------

type AdjEntry = { to: string; dist: number };
const adjacency = new Map<string, AdjEntry[]>();

for (const edgeKey of Object.keys(trackGraph.edges)) {
  const [fromNum, toNum, dist] = trackGraph.edges[edgeKey];
  const from = String(fromNum);
  const to = String(toNum);

  if (!adjacency.has(from)) adjacency.set(from, []);
  if (!adjacency.has(to)) adjacency.set(to, []);
  adjacency.get(from)!.push({ to, dist });
  adjacency.get(to)!.push({ to: from, dist });
}

// ---------------------------------------------------------------------------
// Dijkstra's shortest path
//
// The graph has ~21k nodes and ~28k edges. A binary heap is a good fit
// at this scale -- it keeps pathfinding under a few milliseconds.
// ---------------------------------------------------------------------------

/**
 * Minimal binary min-heap keyed on numeric priority.
 * Used by Dijkstra to avoid O(V^2) scan of unvisited nodes.
 */
class MinHeap {
  private items: Array<{ node: string; dist: number }> = [];

  get size(): number {
    return this.items.length;
  }

  push(node: string, dist: number): void {
    this.items.push({ node, dist });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): { node: string; dist: number } | undefined {
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
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.items[left].dist < this.items[smallest].dist) {
        smallest = left;
      }
      if (right < n && this.items[right].dist < this.items[smallest].dist) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [
        this.items[smallest],
        this.items[i],
      ];
      i = smallest;
    }
  }
}

/**
 * Find the shortest path between two node IDs in the track graph.
 * Returns an ordered list of node ID strings, or [] if no path exists.
 */
export function findPath(fromNodeId: string, toNodeId: string): string[] {
  if (fromNodeId === toNodeId) return [fromNodeId];
  if (!adjacency.has(fromNodeId) || !adjacency.has(toNodeId)) return [];

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  dist.set(fromNodeId, 0);
  heap.push(fromNodeId, 0);

  while (heap.size > 0) {
    const current = heap.pop()!;
    if (visited.has(current.node)) continue;
    visited.add(current.node);

    if (current.node === toNodeId) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | undefined = toNodeId;
      while (node !== undefined) {
        path.push(node);
        node = prev.get(node);
      }
      return path.reverse();
    }

    const neighbours = adjacency.get(current.node);
    if (!neighbours) continue;

    for (const { to, dist: edgeDist } of neighbours) {
      if (visited.has(to)) continue;
      const newDist = current.dist + edgeDist;
      const known = dist.get(to);
      if (known === undefined || newDist < known) {
        dist.set(to, newDist);
        prev.set(to, current.node);
        heap.push(to, newDist);
      }
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Signal classification for a segment
//
// For a given list of path node IDs and operator name, determine the
// dominant signal band and overall confidence level.
//
// The classification works on pre-computed band values from the Ofcom
// measurements. It does not re-derive bands from RSRP/RSRQ -- that
// logic lives in the pipeline (p2-03-build-signal.ts).
//
// Coverage threshold (20%): if fewer than 20% of path nodes have data
// for this operator, the result is "no-data" -- we don't have enough
// measurements to say anything meaningful.
// ---------------------------------------------------------------------------

/**
 * Classify the signal quality along a path for a given operator.
 * Exported for testing.
 */
export function classifySegment(
  pathNodeIds: string[],
  operator: string
): Omit<SegmentSignal, "tunnels"> {
  if (pathNodeIds.length === 0) {
    return {
      band: "no-data",
      confidence: "no-data",
      coveredNodes: 0,
      totalNodes: 0,
    };
  }

  let videoCount = 0;
  let voiceCount = 0;
  let noneCount = 0;
  let hasLowConfidence = false;

  for (const nodeId of pathNodeIds) {
    const signalNode = signalData.nodes[nodeId];
    if (!signalNode) continue;

    const opData = signalNode.operators[operator];
    if (!opData) continue;

    switch (opData.band) {
      case "video":
        videoCount++;
        break;
      case "voice":
        voiceCount++;
        break;
      case "none":
        noneCount++;
        break;
      // "no-data" from the pipeline means the node had too few
      // measurements for this operator -- treat it as uncovered
    }

    if (opData.confidence === "low") {
      hasLowConfidence = true;
    }
  }

  const coveredNodes = videoCount + voiceCount + noneCount;
  const totalNodes = pathNodeIds.length;

  // If fewer than 20% of path nodes have data, we can't say anything
  if (coveredNodes === 0 || coveredNodes / totalNodes < 0.2) {
    return {
      band: "no-data",
      confidence: "no-data",
      coveredNodes,
      totalNodes,
    };
  }

  // Dominant band: the one with the most data-having nodes.
  // Ties break conservatively: none > voice > video
  // (because claiming coverage we don't have is worse than
  // being cautious about coverage we might have)
  let dominantBand: SignalBand;
  if (noneCount >= voiceCount && noneCount >= videoCount) {
    dominantBand = "none";
  } else if (voiceCount >= videoCount) {
    dominantBand = "voice";
  } else {
    dominantBand = "video";
  }

  return {
    band: dominantBand,
    confidence: hasLowConfidence ? "low" : "high",
    coveredNodes,
    totalNodes,
  };
}

// ---------------------------------------------------------------------------
// Tunnel detection
//
// For each tunnel, check if any of its coordinates are within 200m of
// any path node. We use a simple distance check (Haversine). The 200m
// threshold is generous enough to catch nearby tunnels but tight enough
// to avoid false positives from tunnels on parallel lines.
// ---------------------------------------------------------------------------

/**
 * Haversine distance in metres between two points.
 */
function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find tunnels that lie along a path.
 *
 * For performance, we first compute a bounding box of the path nodes
 * (with 200m buffer) and skip tunnels whose coordinates are entirely
 * outside it. Then we check candidate tunnels point-by-point.
 */
function findTunnelsOnPath(pathNodeIds: string[]): string[] {
  if (pathNodeIds.length === 0) return [];

  // Build list of path node coordinates
  const pathCoords: Array<[number, number]> = [];
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;

  for (const nodeId of pathNodeIds) {
    const coords = trackGraph.nodes[nodeId];
    if (!coords) continue;
    pathCoords.push(coords);
    if (coords[0] < minLat) minLat = coords[0];
    if (coords[0] > maxLat) maxLat = coords[0];
    if (coords[1] < minLon) minLon = coords[1];
    if (coords[1] > maxLon) maxLon = coords[1];
  }

  if (pathCoords.length === 0) return [];

  // Approximate 200m buffer in degrees (~0.002 degrees at UK latitudes)
  const latBuffer = 0.002;
  const lonBuffer = 0.003;
  minLat -= latBuffer;
  maxLat += latBuffer;
  minLon -= lonBuffer;
  maxLon += lonBuffer;

  const result: string[] = [];

  // Sample path nodes at intervals to avoid O(nodes * tunnelCoords) for
  // every tunnel. Check every 5th node, plus the first and last.
  const sampleStep = 5;
  const sampledCoords: Array<[number, number]> = [];
  for (let i = 0; i < pathCoords.length; i += sampleStep) {
    sampledCoords.push(pathCoords[i]);
  }
  if (pathCoords.length > 1) {
    sampledCoords.push(pathCoords[pathCoords.length - 1]);
  }

  for (const tunnel of tunnels) {
    // Quick bounding-box rejection
    let inBounds = false;
    for (const coord of tunnel.coords) {
      if (
        coord[0] >= minLat &&
        coord[0] <= maxLat &&
        coord[1] >= minLon &&
        coord[1] <= maxLon
      ) {
        inBounds = true;
        break;
      }
    }
    if (!inBounds) continue;

    // Detailed distance check
    let found = false;
    for (const tunnelCoord of tunnel.coords) {
      for (const pathCoord of sampledCoords) {
        const dist = haversineMetres(
          tunnelCoord[0],
          tunnelCoord[1],
          pathCoord[0],
          pathCoord[1]
        );
        if (dist <= 200) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found && tunnel.name) {
      result.push(tunnel.name);
    }
  }

  // Deduplicate tunnel names (some tunnels have multiple entries with
  // the same name but different coordinates)
  return [...new Set(result)];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Compute the signal profile for each segment of a journey.
 *
 * Returns one SegmentSignal per segment (callingPoints.length - 1 entries).
 * Entry i covers callingPoints[i] to callingPoints[i+1].
 *
 * For each consecutive pair of calling points:
 *   1. Look up their track-graph node IDs from stationNodes
 *   2. If a station CRS is not in stationNodes, result is band: "unknown"
 *   3. Find the shortest path between those nodes
 *   4. Classify the signal along that path for the journey's operator
 *   5. Detect tunnels along the path
 */
export function getJourneySignal(journey: Journey): SegmentSignal[] {
  const { callingPoints, network } = journey;
  const results: SegmentSignal[] = [];

  for (let i = 0; i < callingPoints.length - 1; i++) {
    const fromCrs = callingPoints[i].crs;
    const toCrs = callingPoints[i + 1].crs;

    const fromStation = trackGraph.stationNodes[fromCrs];
    const toStation = trackGraph.stationNodes[toCrs];

    // If either station is not in the track graph, we can't resolve
    // the segment to track geometry
    if (!fromStation || !toStation) {
      results.push({
        band: "unknown",
        confidence: "no-data",
        coveredNodes: 0,
        totalNodes: 0,
        tunnels: [],
      });
      continue;
    }

    const fromNodeId = String(fromStation.nodeId);
    const toNodeId = String(toStation.nodeId);

    const pathNodes = findPath(fromNodeId, toNodeId);

    if (pathNodes.length === 0) {
      results.push({
        band: "unknown",
        confidence: "no-data",
        coveredNodes: 0,
        totalNodes: 0,
        tunnels: [],
      });
      continue;
    }

    const classification = classifySegment(pathNodes, network);
    const segmentTunnels = findTunnelsOnPath(pathNodes);

    results.push({
      ...classification,
      tunnels: segmentTunnels,
    });
  }

  return results;
}
