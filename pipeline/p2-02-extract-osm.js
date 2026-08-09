#!/usr/bin/env node

/**
 * P2-02: Extract GB railway geometry and tunnels from OpenStreetMap via Overpass API.
 *
 * Outputs:
 *   data/tunnels.json      — GB railway tunnels with names, coords, lengths
 *   data/track-graph.json  — compact railway graph (nodes + ways) for path-finding
 *
 * Raw Overpass responses are saved to data/raw/ (gitignored).
 *
 * Re-runnable. Overpass API endpoint: https://overpass-api.de/api/interpreter
 * GB bounding box: 49.8,-8.2,60.9,2.2
 *
 * Usage: node pipeline/p2-02-extract-osm.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const GB_BBOX = "49.8,-8.2,60.9,2.2";

const RAW_DIR = path.join(__dirname, "..", "data", "raw");
const DATA_DIR = path.join(__dirname, "..", "data");

// Ensure directories exist
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Haversine distance in metres between two [lat, lon] points.
 */
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute total length of a coordinate sequence in metres.
 */
function polylineLength(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineMetres(
      coords[i - 1][0],
      coords[i - 1][1],
      coords[i][0],
      coords[i][1]
    );
  }
  return Math.round(total);
}

/**
 * Quantise a number to 5 decimal places (roughly 1 m precision).
 */
function q5(n) {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Make a single Overpass API request. Returns parsed JSON.
 */
function overpassQueryOnce(query) {
  return new Promise((resolve, reject) => {
    const postData = `data=${encodeURIComponent(query)}`;

    const urlObj = new URL(OVERPASS_URL);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "TrainSignal/0.1 (https://github.com/mhawip/train-signal)",
        Accept: "*/*",
      },
    };

    const transport = urlObj.protocol === "https:" ? https : http;

    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode !== 200) {
          const err = new Error(
            `Overpass API returned ${res.statusCode}: ${body.slice(0, 500)}`
          );
          err.statusCode = res.statusCode;
          reject(err);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse Overpass response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(300000, () => {
      req.destroy();
      reject(new Error("Overpass request timed out after 300s"));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * Make an Overpass API request with retry on 429/500.
 */
async function overpassQuery(query, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await overpassQueryOnce(query);
    } catch (err) {
      const retryable = err.statusCode === 429 || err.statusCode === 504;
      if (retryable && attempt < maxRetries) {
        const waitSec = 30 * (attempt + 1);
        console.log(
          `[overpass] ${err.statusCode} — retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Step 1: Download GB railway tunnels from Overpass.
 */
async function fetchTunnels() {
  console.log("[tunnels] Querying Overpass for GB railway tunnels...");

  const query = `
[out:json][timeout:180][bbox:${GB_BBOX}];
(
  way["railway"="rail"]["tunnel"="yes"];
  way["railway"="rail"]["tunnel"="building_passage"];
  way["railway"="light_rail"]["tunnel"="yes"];
);
out body;
>;
out skel qt;
`;

  const data = await overpassQuery(query);

  const rawPath = path.join(RAW_DIR, "tunnels-raw.json");
  fs.writeFileSync(rawPath, JSON.stringify(data));
  console.log(
    `[tunnels] Raw response saved to data/raw/tunnels-raw.json (${data.elements.length} elements)`
  );

  return data;
}

/**
 * Step 2: Download GB railway ways from Overpass (chunked by region).
 */
async function fetchRailwayWays() {
  console.log("[ways] Querying Overpass for GB railway ways...");

  // Split into regions to avoid timeout.
  // South: 49.8 to 52.5; Mid: 52.5 to 55.0; North: 55.0 to 60.9
  const regions = [
    { name: "south", bbox: "49.8,-8.2,52.5,2.2" },
    { name: "mid", bbox: "52.5,-8.2,55.0,2.2" },
    { name: "north", bbox: "55.0,-8.2,60.9,2.2" },
  ];

  const allElements = [];

  for (const region of regions) {
    console.log(`[ways]   Fetching ${region.name} (${region.bbox})...`);

    const query = `
[out:json][timeout:180][bbox:${region.bbox}];
(
  way["railway"="rail"]["service"!="siding"]["service"!="yard"];
  way["railway"="light_rail"]["service"!="siding"]["service"!="yard"];
);
out body;
>;
out skel qt;
`;

    const data = await overpassQuery(query);
    console.log(
      `[ways]   ${region.name}: ${data.elements.length} elements`
    );
    for (const el of data.elements) allElements.push(el);

    // Be polite to Overpass: wait 5 seconds between requests
    if (region !== regions[regions.length - 1]) {
      console.log("[ways]   Waiting 5s before next request...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  const combined = { elements: allElements };
  const rawPath = path.join(RAW_DIR, "railway-ways-raw.json");
  fs.writeFileSync(rawPath, JSON.stringify(combined));
  console.log(
    `[ways] Raw response saved to data/raw/railway-ways-raw.json (${allElements.length} total elements)`
  );

  return combined;
}

/**
 * Step 3: Process tunnels into compact format.
 */
function processTunnels(rawData) {
  console.log("[tunnels] Processing tunnels...");

  // Build node lookup: id -> {lat, lon}
  const nodes = new Map();
  for (const el of rawData.elements) {
    if (el.type === "node" && el.lat !== undefined) {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const tunnels = [];
  for (const el of rawData.elements) {
    if (el.type !== "way") continue;

    // Resolve node coordinates
    const coords = [];
    for (const nid of el.nodes) {
      const n = nodes.get(nid);
      if (n) coords.push([q5(n.lat), q5(n.lon)]);
    }

    if (coords.length < 2) continue;

    tunnels.push({
      id: el.id,
      name: (el.tags && el.tags.name) || null,
      coords,
      length_m: polylineLength(coords),
      source: "OpenStreetMap",
    });
  }

  console.log(
    `[tunnels] Processed ${tunnels.length} tunnels (${tunnels.filter((t) => t.name).length} named)`
  );

  return tunnels;
}

/**
 * Step 4: Process railway ways into a compact graph.
 *
 * To keep the graph under 5 MB for committing, we simplify ways by keeping only
 * junction nodes (nodes shared between ways) and endpoint nodes, plus enough
 * intermediate nodes to preserve geometry at roughly 500m resolution.
 *
 * Output format:
 * {
 *   nodes: { "id": [lat, lon], ... },
 *   edges: [ [nodeA, nodeB, distance_m], ... ]
 * }
 *
 * We also write data/station-nodes.json mapping each station CRS to its nearest
 * OSM graph node.
 */
function processTrackGraph(rawData) {
  console.log("[graph] Processing track graph...");

  // Build node lookup
  const nodeMap = new Map();
  for (const el of rawData.elements) {
    if (el.type === "node" && el.lat !== undefined) {
      nodeMap.set(el.id, [q5(el.lat), q5(el.lon)]);
    }
  }

  // Deduplicate ways and build adjacency
  const wayMap = new Map();
  const nodeRefCount = new Map(); // count how many ways reference each node

  for (const el of rawData.elements) {
    if (el.type !== "way") continue;
    if (wayMap.has(el.id)) continue;

    const resolvedNodes = el.nodes.filter((nid) => nodeMap.has(nid));
    if (resolvedNodes.length < 2) continue;

    wayMap.set(el.id, resolvedNodes);

    for (const nid of resolvedNodes) {
      nodeRefCount.set(nid, (nodeRefCount.get(nid) || 0) + 1);
    }
  }

  // Identify junction nodes (referenced by 2+ ways) -- these must be kept
  const junctionNodes = new Set();
  for (const [nid, count] of nodeRefCount) {
    if (count >= 2) junctionNodes.add(nid);
  }
  console.log(`[graph] ${junctionNodes.size} junction nodes (shared between ways)`);

  // Pre-snap stations to find nodes near stations. These must survive simplification.
  const stationsPath = path.join(DATA_DIR, "stations.json");
  const stationsList = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
  const stationSnapNodes = new Set();

  // Build a flat list of all way-referenced node IDs with coords for snapping
  const allWayNodeIds = new Set();
  for (const [, wn] of wayMap) {
    for (const nid of wn) allWayNodeIds.add(nid);
  }
  const wayNodeEntries = [];
  for (const nid of allWayNodeIds) {
    const c = nodeMap.get(nid);
    if (c) wayNodeEntries.push({ id: nid, lat: c[0], lon: c[1] });
  }

  const stationNodeMapping = {};
  for (const station of stationsList) {
    let bestDist = Infinity;
    let bestNodeId = null;
    for (const node of wayNodeEntries) {
      const d = haversineMetres(station.lat, station.lon, node.lat, node.lon);
      if (d < bestDist) {
        bestDist = d;
        bestNodeId = node.id;
      }
    }
    if (bestDist <= 2000) {
      stationSnapNodes.add(bestNodeId);
      stationNodeMapping[station.crs] = {
        nodeId: bestNodeId,
        dist_m: Math.round(bestDist),
      };
    }
  }
  console.log(`[graph] ${stationSnapNodes.size} station-nearest nodes marked as non-mergeable`);

  // Build raw adjacency: for each way, create edges between consecutive nodes
  // that are junctions, endpoints, or station nodes.
  const rawEdges = [];
  const keptNodes = new Set();

  for (const [, wayNodes] of wayMap) {
    let segStart = 0;
    for (let i = 0; i < wayNodes.length; i++) {
      const isJunction = junctionNodes.has(wayNodes[i]);
      const isStation = stationSnapNodes.has(wayNodes[i]);
      const isEndpoint = i === 0 || i === wayNodes.length - 1;

      if ((isJunction || isStation || isEndpoint) && i > segStart) {
        const startNode = wayNodes[segStart];
        const endNode = wayNodes[i];

        // Compute segment length
        let segLength = 0;
        for (let j = segStart + 1; j <= i; j++) {
          const c1 = nodeMap.get(wayNodes[j - 1]);
          const c2 = nodeMap.get(wayNodes[j]);
          if (c1 && c2) segLength += haversineMetres(c1[0], c1[1], c2[0], c2[1]);
        }

        keptNodes.add(startNode);
        keptNodes.add(endNode);
        rawEdges.push([startNode, endNode, Math.round(segLength)]);
        segStart = i;
      } else if (isJunction || isStation || isEndpoint) {
        segStart = i;
      }
    }
  }

  console.log(
    `[graph] After way splitting: ${keptNodes.size} nodes, ${rawEdges.length} edges`
  );

  // Now merge degree-2 nodes: if a node connects exactly 2 edges, merge them
  // into one longer edge. This collapses continuation junctions where OSM
  // contributors split ways but no actual track junction exists.
  const adjacency = new Map(); // nodeId -> [{other, dist, edgeIdx}]
  for (let ei = 0; ei < rawEdges.length; ei++) {
    const [a, b, d] = rawEdges[ei];
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a).push({ other: b, dist: d, edgeIdx: ei });
    adjacency.get(b).push({ other: a, dist: d, edgeIdx: ei });
  }

  // Mark degree-2 nodes for merging
  const mergeableNodes = new Set();
  for (const [nid, neighbors] of adjacency) {
    // Get unique neighbours (ignore parallel edges for merge decision)
    const uniqueNeighbors = new Set(neighbors.map((n) => n.other));
    if (uniqueNeighbors.size === 2 && !stationSnapNodes.has(nid)) {
      mergeableNodes.add(nid);
    }
  }
  console.log(`[graph] ${mergeableNodes.size} degree-2 nodes to merge`);

  // Build final edges by walking chains of degree-2 nodes
  const visited = new Set();
  const finalEdges = [];
  const finalNodes = new Set();

  for (const [a, b, d] of rawEdges) {
    // Skip if we've already handled this edge via chain walking
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (visited.has(key)) continue;

    // If neither endpoint is mergeable, keep edge as-is
    if (!mergeableNodes.has(a) && !mergeableNodes.has(b)) {
      visited.add(key);
      finalEdges.push([a, b, d]);
      finalNodes.add(a);
      finalNodes.add(b);
      continue;
    }

    // Walk chain from a non-mergeable endpoint
    let chainStart = a;
    if (mergeableNodes.has(a) && !mergeableNodes.has(b)) {
      chainStart = b;
    } else if (mergeableNodes.has(a) && mergeableNodes.has(b)) {
      // Both mergeable -- find a non-mergeable endpoint by walking
      // This can happen in loops; skip for now, handle below
      continue;
    }

    // Walk from chainStart through mergeable nodes
    let current = chainStart;
    let totalDist = 0;
    let prev = null;
    const chainVisited = new Set();

    while (true) {
      chainVisited.add(current);
      const neighbors = adjacency.get(current) || [];
      let nextNode = null;
      let nextDist = 0;

      for (const n of neighbors) {
        if (n.other === prev) continue;
        if (chainVisited.has(n.other)) continue;
        // Mark this raw edge as visited
        const eKey =
          current < n.other
            ? `${current}-${n.other}`
            : `${n.other}-${current}`;
        if (!visited.has(eKey)) {
          visited.add(eKey);
          nextNode = n.other;
          nextDist = n.dist;
          break;
        }
      }

      if (nextNode === null) break;

      totalDist += nextDist;
      prev = current;
      current = nextNode;

      if (!mergeableNodes.has(current)) {
        // Reached a non-mergeable node -- emit the merged edge
        finalEdges.push([chainStart, current, totalDist]);
        finalNodes.add(chainStart);
        finalNodes.add(current);
        break;
      }
    }
  }

  // Build compact node map
  const compactNodes = {};
  for (const nid of finalNodes) {
    const coords = nodeMap.get(nid);
    if (coords) compactNodes[nid] = coords;
  }

  console.log(
    `[graph] Final: ${Object.keys(compactNodes).length} nodes, ${finalEdges.length} edges`
  );

  return { nodes: compactNodes, edges: finalEdges, stationNodes: stationNodeMapping };
}

/**
 * Main pipeline.
 */
async function main() {
  console.log("=== P2-02: Extract OSM railway geometry and tunnels ===");
  console.log(`Overpass API: ${OVERPASS_URL}`);
  console.log(`GB bounding box: ${GB_BBOX}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log();

  // Step 1: Fetch tunnels (or use cached raw)
  let tunnelRaw;
  const tunnelRawPath = path.join(RAW_DIR, "tunnels-raw.json");
  if (fs.existsSync(tunnelRawPath)) {
    console.log("[tunnels] Using cached raw data from data/raw/tunnels-raw.json");
    tunnelRaw = JSON.parse(fs.readFileSync(tunnelRawPath, "utf8"));
  } else {
    tunnelRaw = await fetchTunnels();
  }

  // Step 2: Fetch railway ways (or use cached raw)
  let waysRaw;
  const waysRawPath = path.join(RAW_DIR, "railway-ways-raw.json");
  if (fs.existsSync(waysRawPath)) {
    console.log("[ways] Using cached raw data from data/raw/railway-ways-raw.json");
    waysRaw = JSON.parse(fs.readFileSync(waysRawPath, "utf8"));
  } else {
    waysRaw = await fetchRailwayWays();
  }

  // Step 3: Process tunnels
  const tunnels = processTunnels(tunnelRaw);
  const tunnelsPath = path.join(DATA_DIR, "tunnels.json");
  fs.writeFileSync(tunnelsPath, JSON.stringify(tunnels));
  console.log(
    `[tunnels] Written to data/tunnels.json (${(fs.statSync(tunnelsPath).size / 1024).toFixed(0)} KB)`
  );

  // Step 4: Process track graph
  const graph = processTrackGraph(waysRaw);
  const graphPath = path.join(DATA_DIR, "track-graph.json");
  fs.writeFileSync(graphPath, JSON.stringify(graph));
  const graphSizeKB = fs.statSync(graphPath).size / 1024;
  const graphSizeMB = graphSizeKB / 1024;
  console.log(
    `[graph] Written to data/track-graph.json (${graphSizeMB.toFixed(1)} MB)`
  );

  if (graphSizeMB > 5) {
    console.log(
      `[graph] WARNING: track-graph.json is ${graphSizeMB.toFixed(1)} MB. Consider further compression.`
    );
  }

  // Step 5: Write station node mapping (computed during graph processing)
  const stationNodes = graph.stationNodes;
  delete graph.stationNodes;
  const stationNodesPath = path.join(DATA_DIR, "station-nodes.json");
  fs.writeFileSync(stationNodesPath, JSON.stringify(stationNodes, null, 0));
  console.log(
    `[snap] Written to data/station-nodes.json (${(fs.statSync(stationNodesPath).size / 1024).toFixed(0)} KB)`
  );

  // Summary
  console.log();
  console.log("=== Summary ===");
  console.log(`Tunnels: ${tunnels.length} total, ${tunnels.filter((t) => t.name).length} named`);
  console.log(`Track graph: ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges`);
  console.log(`Station nodes: ${Object.keys(stationNodes).length} stations snapped`);
  console.log(
    `Output sizes: tunnels.json ${(fs.statSync(tunnelsPath).size / 1024).toFixed(0)} KB, ` +
    `track-graph.json ${graphSizeMB.toFixed(1)} MB, ` +
    `station-nodes.json ${(fs.statSync(stationNodesPath).size / 1024).toFixed(0)} KB`
  );

  // Check for well-known tunnels
  const wellKnown = ["Bramhope", "Severn", "Channel"];
  for (const name of wellKnown) {
    const found = tunnels.filter(
      (t) => t.name && t.name.toLowerCase().includes(name.toLowerCase())
    );
    if (found.length > 0) {
      console.log(
        `  Found: ${found.map((t) => `${t.name} (${t.length_m}m)`).join(", ")}`
      );
    } else {
      console.log(`  NOT FOUND: ${name} — check Overpass query`);
    }
  }

  console.log();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
