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

export type SignalSource = "measured" | "modelled" | "interpolated" | "no-data";

export interface SegmentSignal {
  band: SignalBand;
  confidence: Confidence;
  /** Data provenance: measured (yellow-train), modelled (coverage map), or no-data */
  source: SignalSource;
  /** Path nodes that had data for this operator */
  coveredNodes: number;
  /** Total path nodes in this segment */
  totalNodes: number;
  /** Tunnels on this segment (display name) */
  tunnels: string[];
}

/**
 * A contiguous stretch of track within a leg that has consistent signal
 * quality. Multiple SubSegments make up one leg of the journey.
 */
export interface SubSegment {
  band: SignalBand;
  confidence: Confidence;
  /** Dominant data source for this stretch */
  source: SignalSource;
  /**
   * This sub-segment's share of the total leg path distance (0–1).
   * Multiply by the leg's known duration to estimate the time in minutes.
   */
  distanceFraction: number;
  /** Tunnels whose coordinates fall within this sub-segment */
  tunnels: string[];
}

/** Per-leg signal broken down into contiguous same-band sub-segments. */
export interface LegSignal {
  subSegments: SubSegment[];
}

/**
 * One colour run in the granular signal bar visualisation.
 * Each segment is a merged stretch of consecutive same-(band, source) nodes.
 */
export interface GranularSegment {
  band: SignalBand;
  source: SignalSource;
  /** This segment's share of total journey track distance (0–1). */
  distanceFraction: number;
}

/**
 * Full-journey granular signal data for the heat-strip visualisation.
 * Decorative — the JourneyTimeline table is the accessible equivalent.
 */
export interface GranularJourneySignal {
  segments: GranularSegment[];
  /**
   * Cumulative distance fractions (0..1) where each calling point falls.
   * First element is always 0.0 (journey start), last is always 1.0.
   * Interior values mark the inter-leg boundaries.
   */
  callingPointFractions: number[];
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
  source?: "measured" | "modelled" | "interpolated" | "tunnel" | "no-data";
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
      source: "no-data",
      coveredNodes: 0,
      totalNodes: 0,
    };
  }

  let videoCount = 0;
  let voiceCount = 0;
  let noneCount = 0;
  let hasLowConfidence = false;
  // Track the highest-quality source seen across covering nodes.
  // Priority: measured (incl. tunnel) > interpolated > modelled > no-data
  let hasMeasured = false;
  let hasInterpolated = false;
  let hasModelled = false;

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

    // Only track source for nodes that contribute a usable band
    if (opData.band !== "no-data") {
      const src = opData.source;
      if (src === "measured" || src === "tunnel" || !src) {
        // tunnel = physically factual, same confidence tier as measured.
        // Absent source (pre-P5-03 data) is assumed measured.
        hasMeasured = true;
      } else if (src === "interpolated") {
        hasInterpolated = true;
      } else if (src === "modelled") {
        hasModelled = true;
      }
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
      source: "no-data",
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

  // Source: highest-quality tier seen across covering nodes
  const source: SignalSource = hasMeasured
    ? "measured"
    : hasInterpolated
      ? "interpolated"
      : hasModelled
        ? "modelled"
        : "no-data";

  return {
    band: dominantBand,
    confidence: hasLowConfidence ? "low" : "high",
    source,
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
// Worst-case classification across all operators
//
// Used when no network is selected: returns the worst signal band seen
// across EE, O2, Vodafone, and Three. This is conservative -- it tells
// the user the worst they are likely to experience regardless of network.
// ---------------------------------------------------------------------------

const ALL_OPERATORS = ["EE", "O2", "Vodafone", "Three"];

// Band quality rank (higher = better for the user)
const BAND_RANK: Record<string, number> = {
  "no-data": 0,
  "none": 1,
  "voice": 2,
  "video": 3,
};

function classifySegmentWorstCase(
  pathNodeIds: string[]
): Omit<SegmentSignal, "tunnels"> {
  let worstBand: SignalBand = "no-data";
  let hasData = false;
  let hasLowConfidence = false;
  let maxCoveredNodes = 0;
  const totalNodes = pathNodeIds.length;

  // Collect all per-operator results so we can determine the source
  // of whichever band is worst across all operators.
  const opResults: Array<Omit<SegmentSignal, "tunnels">> = [];

  for (const op of ALL_OPERATORS) {
    const result = classifySegment(pathNodeIds, op);
    opResults.push(result);
    if (result.band === "no-data") continue;

    if (!hasData) {
      worstBand = result.band;
      hasData = true;
    } else if (BAND_RANK[result.band] < BAND_RANK[worstBand]) {
      worstBand = result.band;
    }

    if (result.confidence === "low") hasLowConfidence = true;
    if (result.coveredNodes > maxCoveredNodes) {
      maxCoveredNodes = result.coveredNodes;
    }
  }

  if (!hasData) {
    return { band: "no-data", confidence: "no-data", source: "no-data", coveredNodes: 0, totalNodes };
  }

  // Determine source from the operators that produced the worst band.
  // Prefer "measured" over "modelled" over "no-data" -- if any operator
  // with the worst band has measured data, the result is measured.
  const SOURCE_RANK: Record<string, number> = {
    "measured":      3,
    "interpolated":  2,
    "modelled":      1,
    "no-data":       0,
  };
  let bestSourceRank = -1;
  let resultSource: SignalSource = "no-data";

  for (const r of opResults) {
    if (r.band === worstBand) {
      const rank = SOURCE_RANK[r.source] ?? 0;
      if (rank > bestSourceRank) {
        bestSourceRank = rank;
        resultSource = r.source;
      }
    }
  }

  return {
    band: worstBand,
    confidence: hasLowConfidence ? "low" : "high",
    source: resultSource,
    coveredNodes: maxCoveredNodes,
    totalNodes,
  };
}

// ---------------------------------------------------------------------------
// Source rank (module-level, reused by detailed classification)
// ---------------------------------------------------------------------------

const SOURCE_RANK_MAP: Record<string, number> = {
  measured:      3,
  interpolated:  2,
  modelled:      1,
  "no-data":     0,
};

/**
 * Derive a normalised SignalSource from a raw pipeline source string.
 * "tunnel" is treated at the same confidence tier as "measured".
 */
function normalisedSource(raw: string | undefined): SignalSource {
  if (raw === "measured" || raw === "tunnel" || !raw) return "measured";
  if (raw === "interpolated") return "interpolated";
  if (raw === "modelled") return "modelled";
  return "no-data";
}

// ---------------------------------------------------------------------------
// Detailed (sub-segment) classification
//
// For each leg, walks the individual track nodes and groups consecutive nodes
// with the same (band, source tier) into runs. Source tier collapses
// "modelled" and "interpolated" together so they share a visual style.
// Runs shorter than MIN_RUN_FRACTION of the total leg distance are absorbed
// into the adjacent run to avoid showing noise as meaningful signal changes.
// ---------------------------------------------------------------------------

/**
 * Classify the signal at a single node for a given operator,
 * or worst-case across all operators when operator is null.
 */
function classifyNode(
  nodeId: string,
  operator: string | null
): { band: SignalBand; confidence: Confidence; source: SignalSource } {
  const signalNode = signalData.nodes[nodeId];
  if (!signalNode) {
    return { band: "no-data", confidence: "no-data", source: "no-data" };
  }

  if (operator) {
    const opData = signalNode.operators[operator];
    if (!opData) {
      return { band: "no-data", confidence: "no-data", source: "no-data" };
    }
    return {
      band: opData.band as SignalBand,
      confidence: opData.confidence as Confidence,
      source: normalisedSource(opData.source),
    };
  }

  // Worst-case across all operators
  let worstBand: SignalBand = "no-data";
  let hasLow = false;
  let bestSourceRank = -1;
  let resultSource: SignalSource = "no-data";

  for (const op of ALL_OPERATORS) {
    const opData = signalNode.operators[op];
    if (!opData || opData.band === "no-data") continue;

    const band = opData.band as SignalBand;
    const bandRankVal = BAND_RANK[band] ?? -1;
    const worstRankVal = BAND_RANK[worstBand] ?? -1;
    if (worstBand === "no-data" || bandRankVal < worstRankVal) {
      worstBand = band;
    }
    if (opData.confidence === "low") hasLow = true;

    const src = normalisedSource(opData.source);
    const rank = SOURCE_RANK_MAP[src] ?? 0;
    if (rank > bestSourceRank) {
      bestSourceRank = rank;
      resultSource = src;
    }
  }

  return {
    band: worstBand,
    confidence: hasLow ? "low" : "high",
    source: resultSource,
  };
}

/**
 * "Visual tier" used as the grouping key alongside band.
 * Modelled and interpolated use the same CSS pattern so are merged.
 */
function sourceTierKey(source: SignalSource): "measured" | "estimated" | "none" {
  if (source === "measured") return "measured";
  if (source === "modelled" || source === "interpolated") return "estimated";
  return "none";
}

/**
 * How far below 3% of the total leg distance a run must be before it is
 * absorbed into its neighbour. Prevents brief signal flickers from showing
 * as distinct sub-segments.
 */
const MIN_RUN_FRACTION = 0.03;

/**
 * Compute intra-leg sub-segments for a single leg defined by its ordered
 * path node IDs and the operator (or null for worst-case).
 */
function computeSubSegments(
  pathNodes: string[],
  operator: string | null
): SubSegment[] {
  if (pathNodes.length === 0) {
    return [{
      band: "no-data",
      confidence: "no-data",
      source: "no-data",
      distanceFraction: 1,
      tunnels: [],
    }];
  }

  // Edge distances along the path (index i = dist from node i to node i+1)
  const edgeDists: number[] = [];
  let totalDist = 0;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const adj = adjacency.get(pathNodes[i]);
    const edge = adj?.find(e => e.to === pathNodes[i + 1]);
    const d = edge?.dist ?? 0;
    edgeDists.push(d);
    totalDist += d;
  }

  // Build initial runs: group consecutive same (band, source-tier) nodes
  type Run = {
    band: SignalBand;
    confidence: Confidence;
    source: SignalSource;      // dominant source (highest rank seen in run)
    distM: number;
    nodeIds: string[];
  };

  const runs: Run[] = [];

  for (let i = 0; i < pathNodes.length; i++) {
    const { band, confidence, source } = classifyNode(pathNodes[i], operator);
    // Distance contributed by THIS node is the edge TO the next node
    const d = i < edgeDists.length ? edgeDists[i] : 0;

    const last = runs.at(-1);
    const tierMatch =
      last &&
      last.band === band &&
      sourceTierKey(last.source) === sourceTierKey(source);

    if (tierMatch) {
      last.distM += d;
      last.nodeIds.push(pathNodes[i]);
      // Upgrade source if this node has higher-rank provenance
      if ((SOURCE_RANK_MAP[source] ?? 0) > (SOURCE_RANK_MAP[last.source] ?? 0)) {
        last.source = source;
      }
      // Downgrade confidence conservatively
      if (confidence === "low") last.confidence = "low";
    } else {
      runs.push({
        band,
        confidence,
        source,
        distM: d,
        nodeIds: [pathNodes[i]],
      });
    }
  }

  // Absorb runs shorter than MIN_RUN_FRACTION into their larger neighbour.
  // Repeat until stable (a single pass may leave new short runs after merging).
  if (totalDist > 0) {
    let changed = true;
    while (changed && runs.length > 1) {
      changed = false;
      for (let i = 0; i < runs.length; i++) {
        if (runs[i].distM / totalDist < MIN_RUN_FRACTION) {
          // Determine which neighbour to merge into (prefer the larger one)
          const mergeIdx =
            i === 0
              ? 1
              : i === runs.length - 1
                ? i - 1
                : runs[i - 1].distM >= runs[i + 1].distM
                  ? i - 1
                  : i + 1;

          const target = runs[mergeIdx];
          target.distM += runs[i].distM;
          if (mergeIdx < i) {
            target.nodeIds.push(...runs[i].nodeIds);
          } else {
            target.nodeIds.unshift(...runs[i].nodeIds);
          }
          if (runs[i].confidence === "low") target.confidence = "low";

          runs.splice(i, 1);
          changed = true;
          break; // restart scan
        }
      }
    }
  }

  // Convert runs to SubSegments
  return runs.map(run => ({
    band: run.band,
    confidence: run.confidence,
    source: run.source,
    distanceFraction: totalDist > 0 ? run.distM / totalDist : 1 / runs.length,
    tunnels: findTunnelsOnPath(run.nodeIds),
  }));
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
 *   4. Classify the signal along that path for the journey's operator,
 *      or worst-case across all operators if no network is selected
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
        source: "no-data",
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
        source: "no-data",
        coveredNodes: 0,
        totalNodes: 0,
        tunnels: [],
      });
      continue;
    }

    const classification = network
      ? classifySegment(pathNodes, network)
      : classifySegmentWorstCase(pathNodes);
    const segmentTunnels = findTunnelsOnPath(pathNodes);

    results.push({
      ...classification,
      tunnels: segmentTunnels,
    });
  }

  return results;
}

/**
 * Compute per-leg sub-segment signal detail for a journey.
 *
 * Returns one LegSignal per leg (callingPoints.length - 1 entries).
 * Each LegSignal.subSegments contains consecutive same-band stretches
 * within the leg, ordered from the departure station to the arrival station.
 * Short flickers (< 3% of leg distance) are absorbed into their neighbours.
 *
 * For each leg:
 *   1. Look up station nodes and find the shortest path
 *   2. Call computeSubSegments to group path nodes into runs
 *   3. If stations are unmapped, return a single no-data sub-segment
 */
export function getJourneySignalDetailed(journey: Journey): LegSignal[] {
  const { callingPoints, network } = journey;
  const results: LegSignal[] = [];

  for (let i = 0; i < callingPoints.length - 1; i++) {
    const fromCrs = callingPoints[i].crs;
    const toCrs = callingPoints[i + 1].crs;

    const fromStation = trackGraph.stationNodes[fromCrs];
    const toStation = trackGraph.stationNodes[toCrs];

    if (!fromStation || !toStation) {
      results.push({
        subSegments: [{
          band: "unknown",
          confidence: "no-data",
          source: "no-data",
          distanceFraction: 1,
          tunnels: [],
        }],
      });
      continue;
    }

    const fromNodeId = String(fromStation.nodeId);
    const toNodeId = String(toStation.nodeId);
    const pathNodes = findPath(fromNodeId, toNodeId);

    if (pathNodes.length === 0) {
      results.push({
        subSegments: [{
          band: "unknown",
          confidence: "no-data",
          source: "no-data",
          distanceFraction: 1,
          tunnels: [],
        }],
      });
      continue;
    }

    const operator = network || null;
    const subSegments = computeSubSegments(pathNodes, operator);
    results.push({ subSegments });
  }

  return results;
}

/**
 * Produce a flat, distance-normalised array of (band, source) segments
 * covering the whole journey, for the granular heat-strip visualisation.
 *
 * Each leg's path is walked node-by-node; signal is classified per node
 * and attributed to the edge leading out of it.  Consecutive nodes with
 * the same (band, source) are merged into a single GranularSegment.
 *
 * The callingPointFractions array lets the bar overlay separator lines at
 * the exact proportional positions of intermediate station stops.
 *
 * This function is intentionally kept separate from getJourneySignalDetailed
 * so it can be called independently on the server without running
 * computeSubSegments.
 */
export function getJourneyGranularSignal(
  journey: Journey,
): GranularJourneySignal {
  const { callingPoints, network } = journey;
  const operator = network || null;

  interface EdgeRecord {
    band: SignalBand;
    source: SignalSource;
    distM: number;
  }

  const edgeRecords: EdgeRecord[] = [];
  // Indices into edgeRecords where each leg starts (and a terminal sentinel)
  const legBoundaryIndices: number[] = [0];

  for (let i = 0; i < callingPoints.length - 1; i++) {
    const fromCrs = callingPoints[i].crs;
    const toCrs = callingPoints[i + 1].crs;
    const fromStation = trackGraph.stationNodes[fromCrs];
    const toStation = trackGraph.stationNodes[toCrs];

    if (!fromStation || !toStation) {
      // Placeholder: use a nominal 10 km no-data segment so the bar proportions
      // still make rough geographic sense even when a station is unmapped.
      edgeRecords.push({ band: "no-data", source: "no-data", distM: 10_000 });
      legBoundaryIndices.push(edgeRecords.length);
      continue;
    }

    const fromNodeId = String(fromStation.nodeId);
    const toNodeId = String(toStation.nodeId);
    const pathNodes = findPath(fromNodeId, toNodeId);

    if (pathNodes.length === 0) {
      edgeRecords.push({ band: "no-data", source: "no-data", distM: 10_000 });
      legBoundaryIndices.push(edgeRecords.length);
      continue;
    }

    for (let j = 0; j < pathNodes.length - 1; j++) {
      const adj = adjacency.get(pathNodes[j]);
      const edge = adj?.find((e) => e.to === pathNodes[j + 1]);
      const distM = edge?.dist ?? 0;
      const { band, source } = classifyNode(pathNodes[j], operator);
      edgeRecords.push({ band, source, distM });
    }
    legBoundaryIndices.push(edgeRecords.length);
  }

  const totalDist = edgeRecords.reduce((s, e) => s + e.distM, 0);

  if (totalDist === 0) {
    return {
      segments: [{ band: "no-data", source: "no-data", distanceFraction: 1 }],
      callingPointFractions: [0, 1],
    };
  }

  // Merge consecutive same-(band, source) edges
  const segments: GranularSegment[] = [];
  for (const rec of edgeRecords) {
    const frac = rec.distM / totalDist;
    const last = segments.at(-1);
    if (last && last.band === rec.band && last.source === rec.source) {
      last.distanceFraction += frac;
    } else {
      segments.push({ band: rec.band, source: rec.source, distanceFraction: frac });
    }
  }

  // Cumulative distances at each leg boundary index
  const cumDist: number[] = [0];
  for (const rec of edgeRecords) {
    cumDist.push(cumDist.at(-1)! + rec.distM);
  }

  const callingPointFractions = legBoundaryIndices.map(
    (idx) => cumDist[idx] / totalDist,
  );

  return { segments, callingPointFractions };
}
