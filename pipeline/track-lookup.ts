/**
 * Track geometry lookup: given two station CRS codes, returns the track
 * geometry (coordinate sequence) and tunnels along the path between them.
 *
 * Uses Dijkstra's algorithm on the simplified OSM railway graph
 * (data/track-graph.json) with station-to-node mapping (data/station-nodes.json)
 * and tunnel data (data/tunnels.json).
 *
 * This module is used by the signal pipeline (P2-03) and can be imported
 * by the Next.js app for server-side route resolution.
 */

import * as fs from "fs";
import * as path from "path";

// --- Types ---

interface TrackGraph {
  nodes: Record<string, [number, number]>; // nodeId -> [lat, lon]
  edges: [number, number, number][]; // [nodeA, nodeB, distance_m]
}

interface StationNode {
  nodeId: number;
  dist_m: number;
}

interface Tunnel {
  id: number;
  name: string | null;
  coords: [number, number][];
  length_m: number;
  source: string;
}

export interface TrackSegmentTunnel {
  name: string | null;
  startIdx: number;
  endIdx: number;
  length_m: number;
  osmId: number;
}

export interface TrackSegment {
  coords: [number, number][]; // lat/lon sequence from origin to dest
  distance_m: number;
  tunnels: TrackSegmentTunnel[];
}

// --- Haversine ---

function haversineMetres(
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

// --- Data loading ---

const DATA_DIR = path.join(__dirname, "..", "data");

let graphCache: TrackGraph | null = null;
let stationNodesCache: Record<string, StationNode> | null = null;
let tunnelsCache: Tunnel[] | null = null;
let adjacencyCache: Map<number, { other: number; dist: number }[]> | null =
  null;

function loadGraph(): TrackGraph {
  if (!graphCache) {
    graphCache = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "track-graph.json"), "utf8")
    );
  }
  return graphCache!;
}

function loadStationNodes(): Record<string, StationNode> {
  if (!stationNodesCache) {
    stationNodesCache = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "station-nodes.json"), "utf8")
    );
  }
  return stationNodesCache!;
}

function loadTunnels(): Tunnel[] {
  if (!tunnelsCache) {
    tunnelsCache = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "tunnels.json"), "utf8")
    );
  }
  return tunnelsCache!;
}

function getAdjacency(): Map<number, { other: number; dist: number }[]> {
  if (!adjacencyCache) {
    const graph = loadGraph();
    adjacencyCache = new Map();
    for (const [a, b, d] of graph.edges) {
      if (!adjacencyCache.has(a)) adjacencyCache.set(a, []);
      if (!adjacencyCache.has(b)) adjacencyCache.set(b, []);
      adjacencyCache.get(a)!.push({ other: b, dist: d });
      adjacencyCache.get(b)!.push({ other: a, dist: d });
    }
  }
  return adjacencyCache!;
}

// --- Dijkstra ---

function dijkstra(
  startNode: number,
  endNode: number
): { path: number[]; distance: number } | null {
  const adj = getAdjacency();

  // Simple priority queue using a sorted array (adequate for ~20k nodes)
  const dist = new Map<number, number>();
  const prev = new Map<number, number>();
  const visited = new Set<number>();

  dist.set(startNode, 0);

  // Use a binary heap approximation: array of [distance, node] sorted on insert
  const queue: [number, number][] = [[0, startNode]];

  while (queue.length > 0) {
    // Find minimum
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) minIdx = i;
    }
    const [currentDist, current] = queue[minIdx];
    queue.splice(minIdx, 1);

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endNode) {
      // Reconstruct path
      const nodePath: number[] = [];
      let node: number | undefined = endNode;
      while (node !== undefined) {
        nodePath.unshift(node);
        node = prev.get(node);
      }
      return { path: nodePath, distance: currentDist };
    }

    const neighbors = adj.get(current) || [];
    for (const { other, dist: edgeDist } of neighbors) {
      if (visited.has(other)) continue;
      const newDist = currentDist + edgeDist;
      const oldDist = dist.get(other);
      if (oldDist === undefined || newDist < oldDist) {
        dist.set(other, newDist);
        prev.set(other, current);
        queue.push([newDist, other]);
      }
    }
  }

  return null; // No path found
}

// --- Tunnel matching ---

/**
 * Find tunnels that overlap with the path coordinates.
 * Uses a proximity check: a tunnel is "on the path" if its midpoint
 * is within 200m of any path coordinate.
 */
function findTunnelsAlongPath(
  pathCoords: [number, number][]
): TrackSegmentTunnel[] {
  const tunnels = loadTunnels();
  const result: TrackSegmentTunnel[] = [];

  for (const tunnel of tunnels) {
    // Use tunnel midpoint for proximity check
    const midIdx = Math.floor(tunnel.coords.length / 2);
    const [tLat, tLon] = tunnel.coords[midIdx];

    // Find nearest path point
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < pathCoords.length; i++) {
      const d = haversineMetres(pathCoords[i][0], pathCoords[i][1], tLat, tLon);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    if (nearestDist <= 200) {
      // Also check tunnel start and end to find the index range
      let startIdx = nearestIdx;
      let endIdx = nearestIdx;

      // Find nearest path point to tunnel start
      const [sLat, sLon] = tunnel.coords[0];
      let bestStartDist = Infinity;
      for (let i = 0; i < pathCoords.length; i++) {
        const d = haversineMetres(pathCoords[i][0], pathCoords[i][1], sLat, sLon);
        if (d < bestStartDist) {
          bestStartDist = d;
          startIdx = i;
        }
      }

      // Find nearest path point to tunnel end
      const [eLat, eLon] = tunnel.coords[tunnel.coords.length - 1];
      let bestEndDist = Infinity;
      for (let i = 0; i < pathCoords.length; i++) {
        const d = haversineMetres(pathCoords[i][0], pathCoords[i][1], eLat, eLon);
        if (d < bestEndDist) {
          bestEndDist = d;
          endIdx = i;
        }
      }

      // Ensure start <= end
      if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

      result.push({
        name: tunnel.name,
        startIdx,
        endIdx,
        length_m: tunnel.length_m,
        osmId: tunnel.id,
      });
    }
  }

  // Sort by position along path
  result.sort((a, b) => a.startIdx - b.startIdx);

  return result;
}

// --- Public API ---

/**
 * Get the track segment between two stations.
 *
 * @param originCRS - CRS code of the origin station (e.g. "KGX")
 * @param destCRS - CRS code of the destination station (e.g. "LDS")
 * @returns Track segment with coordinates and tunnel data, or null if
 *          no path could be found.
 */
export function getTrackSegment(
  originCRS: string,
  destCRS: string
): TrackSegment | null {
  const stationNodes = loadStationNodes();
  const graph = loadGraph();

  const origin = stationNodes[originCRS];
  const dest = stationNodes[destCRS];

  if (!origin) {
    console.error(`Station ${originCRS} not found in station-nodes.json`);
    return null;
  }
  if (!dest) {
    console.error(`Station ${destCRS} not found in station-nodes.json`);
    return null;
  }

  const result = dijkstra(origin.nodeId, dest.nodeId);
  if (!result) {
    console.error(
      `No path found between ${originCRS} (node ${origin.nodeId}) and ${destCRS} (node ${dest.nodeId})`
    );
    return null;
  }

  // Convert node path to coordinate sequence
  const coords: [number, number][] = [];
  for (const nodeId of result.path) {
    const nodeCoords = graph.nodes[String(nodeId)];
    if (nodeCoords) {
      coords.push(nodeCoords as [number, number]);
    }
  }

  // Find tunnels along the path
  const tunnels = findTunnelsAlongPath(coords);

  return {
    coords,
    distance_m: result.distance,
    tunnels,
  };
}

// --- CLI interface ---

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: npx tsx pipeline/track-lookup.ts <originCRS> <destCRS>");
    console.log("Example: npx tsx pipeline/track-lookup.ts KGX LDS");
    process.exit(1);
  }

  const [origin, dest] = args;
  console.log(`Looking up track segment: ${origin} -> ${dest}`);

  const segment = getTrackSegment(origin, dest);
  if (!segment) {
    console.error("Failed to find track segment.");
    process.exit(1);
  }

  console.log(`Distance: ${(segment.distance_m / 1000).toFixed(1)} km`);
  console.log(`Coordinates: ${segment.coords.length} points`);
  console.log(`Tunnels: ${segment.tunnels.length}`);

  if (segment.tunnels.length > 0) {
    console.log("\nTunnels along route:");
    for (const t of segment.tunnels) {
      console.log(
        `  ${t.name || "(unnamed)"} — ${t.length_m}m (path indices ${t.startIdx}-${t.endIdx})`
      );
    }
  }
}
