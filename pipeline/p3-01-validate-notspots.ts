/**
 * P3-01: Cross-validation script
 *
 * Queries the signal model for specific routes and outputs per-node
 * signal classification for each operator, allowing comparison against
 * known notspot data.
 *
 * Usage: npx tsx pipeline/p3-01-validate-notspots.ts
 */

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");

// Load data
interface TrackGraph {
  nodes: Record<string, [number, number]>;
  edges: [number, number, number][];
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

console.log("Loading track graph...");
const trackGraph: TrackGraph = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "track-graph.json"), "utf8")
);

console.log("Loading signal data...");
const signalData: SignalData = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "signal-segments.json"), "utf8")
);

console.log("Loading tunnels...");
interface TunnelData {
  id: number;
  name: string | null;
  coords: [number, number][];
  length_m: number;
  source: string;
}
const tunnels: TunnelData[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "tunnels.json"), "utf8")
);

console.log(
  `Loaded: ${Object.keys(trackGraph.nodes).length} nodes, ${Object.keys(signalData.nodes).length} signal nodes, ${tunnels.length} tunnels`
);

// --- Dijkstra ---

type AdjEntry = { other: number; dist: number };
const adjacency = new Map<number, AdjEntry[]>();

for (const [a, b, d] of trackGraph.edges) {
  if (!adjacency.has(a)) adjacency.set(a, []);
  if (!adjacency.has(b)) adjacency.set(b, []);
  adjacency.get(a)!.push({ other: b, dist: d });
  adjacency.get(b)!.push({ other: a, dist: d });
}

function dijkstra(
  startNode: number,
  endNode: number
): { path: number[]; distance: number } | null {
  const dist = new Map<number, number>();
  const prev = new Map<number, number>();
  const visited = new Set<number>();

  dist.set(startNode, 0);
  const queue: [number, number][] = [[0, startNode]];

  while (queue.length > 0) {
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i][0] < queue[minIdx][0]) minIdx = i;
    }
    const [currentDist, current] = queue[minIdx];
    queue.splice(minIdx, 1);

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === endNode) {
      const nodePath: number[] = [];
      let node: number | undefined = endNode;
      while (node !== undefined) {
        nodePath.unshift(node);
        node = prev.get(node);
      }
      return { path: nodePath, distance: currentDist };
    }

    const neighbors = adjacency.get(current) || [];
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

  return null;
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

// --- Tunnel detection ---

function findTunnelsOnPath(pathNodeIds: number[]): string[] {
  const pathCoords: [number, number][] = [];
  for (const nodeId of pathNodeIds) {
    const coords = trackGraph.nodes[String(nodeId)];
    if (coords) pathCoords.push(coords);
  }
  if (pathCoords.length === 0) return [];

  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const [lat, lon] of pathCoords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  minLat -= 0.002;
  maxLat += 0.002;
  minLon -= 0.003;
  maxLon += 0.003;

  const result: string[] = [];

  for (const tunnel of tunnels) {
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

    let found = false;
    const midIdx = Math.floor(tunnel.coords.length / 2);
    const [tLat, tLon] = tunnel.coords[midIdx];
    for (const [pLat, pLon] of pathCoords) {
      if (haversineMetres(tLat, tLon, pLat, pLon) <= 300) {
        found = true;
        break;
      }
    }

    if (found && tunnel.name) {
      result.push(`${tunnel.name} (${tunnel.length_m}m)`);
    }
  }

  return [...new Set(result)];
}

// --- Route analysis ---

const operators = ["EE", "Three", "O2", "Vodafone"];

interface RouteSpec {
  name: string;
  stations: string[]; // CRS codes for multi-stop route
  knownNotspots: string[];
}

const routes: RouteSpec[] = [
  {
    name: "ECML: Leeds (LDS) to London Kings Cross (KGX)",
    stations: [
      "LDS",
      "WKF",
      "DON",
      "RET",
      "NNG",
      "GRA",
      "PBO",
      "HUN",
      "SVG",
      "FPK",
      "KGX",
    ],
    knownNotspots: [
      "Stoke Tunnel area (south of Grantham)",
      "Rural sections between Retford and Newark",
      "Gasworks Tunnel and Copenhagen Tunnel (Kings Cross approaches)",
      "Various cuttings along the route",
    ],
  },
  {
    name: "Transpennine: Leeds (LDS) to Manchester Piccadilly (MAN)",
    stations: ["LDS", "HUD", "MAN"],
    knownNotspots: [
      "Standedge Tunnel (~5km, longest rail tunnel in England)",
      "Diggle area",
      "Rural Pennine sections",
    ],
  },
  {
    name: "GWR: London Paddington (PAD) to Bristol Temple Meads (BRI)",
    // CPM = Chippenham (was incorrectly CHW = Chalkwell, Essex — fixed P6-01)
    stations: ["PAD", "RDG", "SWI", "CPM", "BTH", "BRI"],
    knownNotspots: [
      "Box Tunnel (1.8km, near Bath)",
      "Chipping Sodbury Tunnel (~4km, near Bristol)",
      "Rural sections in Wiltshire",
    ],
  },
  {
    name: "CrossCountry: Birmingham New Street (BHM) to Manchester Piccadilly (MAN)",
    stations: ["BHM", "DBY", "SHF", "MAN"],
    knownNotspots: [
      "Hope Valley rural sections (SHF-MAN)",
      "Derbyshire valleys between Derby and Chesterfield",
    ],
  },
  {
    name: "WCML: London Euston (EUS) to Glasgow Central (GLC)",
    stations: ["EUS", "MKC", "RUG", "CRE", "WGN", "PRE", "CAR", "GLC"],
    knownNotspots: [
      "Rural Cumbria between Penrith and Carlisle",
      "Lune Valley and Shap Summit sections",
      "Rural central belt south of Glasgow",
    ],
  },
  {
    name: "Chiltern: London Marylebone (MYB) to Birmingham New Street (BHM)",
    stations: ["MYB", "BAN", "LMS", "BHM"],
    knownNotspots: [
      "Rural Oxfordshire and Warwickshire (MYB-BAN, sparse measurement data)",
      "Chiltern Tunnel (near Amersham)",
    ],
  },
  {
    name: "Edinburgh (EDB) to Glasgow Central (GLC)",
    stations: ["EDB", "HYM", "GLC"],
    knownNotspots: [
      "Rural sections in central belt",
      "Cuttings between Edinburgh and Haymarket",
    ],
  },
];

console.log("\n=== ROUTE ANALYSIS ===\n");

for (const route of routes) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`ROUTE: ${route.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Known external notspots: ${route.knownNotspots.join("; ")}`);

  // Process each segment pair
  for (let i = 0; i < route.stations.length - 1; i++) {
    const fromCrs = route.stations[i];
    const toCrs = route.stations[i + 1];

    const fromStation = trackGraph.stationNodes[fromCrs];
    const toStation = trackGraph.stationNodes[toCrs];

    if (!fromStation) {
      console.log(`\n  [${fromCrs} -> ${toCrs}] Station ${fromCrs} not in graph`);
      continue;
    }
    if (!toStation) {
      console.log(`\n  [${fromCrs} -> ${toCrs}] Station ${toCrs} not in graph`);
      continue;
    }

    const result = dijkstra(fromStation.nodeId, toStation.nodeId);
    if (!result) {
      console.log(`\n  [${fromCrs} -> ${toCrs}] No path found`);
      continue;
    }

    console.log(
      `\n  [${fromCrs} -> ${toCrs}] ${(result.distance / 1000).toFixed(1)} km, ${result.path.length} nodes`
    );

    // Tunnels
    const pathTunnels = findTunnelsOnPath(result.path);
    if (pathTunnels.length > 0) {
      console.log(`  Tunnels detected: ${pathTunnels.join(", ")}`);
    }

    // Per-operator analysis
    for (const op of operators) {
      let videoCount = 0;
      let voiceCount = 0;
      let noneCount = 0;
      let noDataCount = 0;
      let lowConfCount = 0;
      const noneNodes: Array<{
        nodeId: number;
        lat: number;
        lon: number;
        rsrp: number;
      }> = [];

      for (const nodeId of result.path) {
        const nodeKey = String(nodeId);
        const signalNode = signalData.nodes[nodeKey];
        if (!signalNode) {
          noDataCount++;
          continue;
        }

        const opData = signalNode.operators[op];
        if (!opData) {
          noDataCount++;
          continue;
        }

        if (opData.confidence === "low") lowConfCount++;

        switch (opData.band) {
          case "video":
            videoCount++;
            break;
          case "voice":
            voiceCount++;
            break;
          case "none":
            noneCount++;
            noneNodes.push({
              nodeId,
              lat: signalNode.lat,
              lon: signalNode.lon,
              rsrp: opData.rsrp_p10,
            });
            break;
          case "no-data":
            noDataCount++;
            break;
        }
      }

      const covered = videoCount + voiceCount + noneCount;
      const total = result.path.length;
      const coveragePct = total > 0 ? ((covered / total) * 100).toFixed(0) : "0";

      // Determine segment classification (mirrors classifySegment logic)
      let segBand: string;
      if (covered === 0 || covered / total < 0.2) {
        segBand = "no-data";
      } else if (noneCount >= voiceCount && noneCount >= videoCount) {
        segBand = "NONE";
      } else if (voiceCount >= videoCount) {
        segBand = "voice";
      } else {
        segBand = "video";
      }

      console.log(
        `    ${op.padEnd(10)} => ${segBand.padEnd(8)} | video:${videoCount} voice:${voiceCount} none:${noneCount} no-data:${noDataCount} low-conf:${lowConfCount} | coverage:${coveragePct}%`
      );

      // Show notspot node locations (nodes classified as "none")
      if (noneNodes.length > 0 && noneNodes.length <= 20) {
        for (const nn of noneNodes) {
          console.log(
            `      NONE node ${nn.nodeId}: lat=${nn.lat.toFixed(4)}, lon=${nn.lon.toFixed(4)}, rsrp_p10=${nn.rsrp}dBm`
          );
        }
      } else if (noneNodes.length > 20) {
        console.log(
          `      ${noneNodes.length} nodes classified as NONE (too many to list individually)`
        );
        // Show a sample
        const sample = [noneNodes[0], noneNodes[Math.floor(noneNodes.length / 2)], noneNodes[noneNodes.length - 1]];
        for (const nn of sample) {
          console.log(
            `      Sample NONE node ${nn.nodeId}: lat=${nn.lat.toFixed(4)}, lon=${nn.lon.toFixed(4)}, rsrp_p10=${nn.rsrp}dBm`
          );
        }
      }
    }
  }
}

// --- Summary statistics ---
console.log(`\n${"=".repeat(70)}`);
console.log("SUMMARY STATISTICS");
console.log(`${"=".repeat(70)}`);

let totalNodes = 0;
let nodesWithSignal = 0;
let nodesAllNone = 0;
let nodesAllVideo = 0;

for (const nodeKey of Object.keys(signalData.nodes)) {
  totalNodes++;
  const node = signalData.nodes[nodeKey];
  const opKeys = Object.keys(node.operators);
  if (opKeys.length === 0) continue;
  nodesWithSignal++;

  const allNone = opKeys.every(
    (k) =>
      node.operators[k].band === "none" || node.operators[k].band === "no-data"
  );
  const allVideo = opKeys.every((k) => node.operators[k].band === "video");
  if (allNone) nodesAllNone++;
  if (allVideo) nodesAllVideo++;
}

console.log(`Signal nodes in dataset: ${totalNodes}`);
console.log(`Nodes with operator data: ${nodesWithSignal}`);
console.log(`Nodes where ALL operators = none/no-data: ${nodesAllNone}`);
console.log(`Nodes where ALL operators = video: ${nodesAllVideo}`);
console.log(`Signal data thresholds: ${JSON.stringify(signalData.thresholds)}`);
console.log(`Generated: ${signalData.generated}`);
console.log(`Source: ${signalData.source}`);
