#!/usr/bin/env node
/**
 * P2-01: Thin vertical slice analysis
 *
 * Analyses a sample of the Ofcom LTE yellow-train CSV to assess
 * measurement density along the East Coast Main Line (Kings Cross to Leeds).
 *
 * The ECML corridor is defined by a series of waypoint stations.
 * We filter measurements to within ~3km of the track corridor and
 * bucket them into 1km segments along the route.
 */

const fs = require('fs');
const readline = require('readline');

const INPUT = process.argv[2] || 'C:/Users/MattHamilton/OneDrive/Prototypes/train-signal/data/raw/lte-sample-large.csv';

// ECML waypoints (Kings Cross to Leeds) - lat/lon
const ECML_WAYPOINTS = [
  { name: 'London Kings Cross', lat: 51.530827, lon: -0.122907 },
  { name: 'Finsbury Park',     lat: 51.564724, lon: -0.105642 },
  { name: 'Stevenage',         lat: 51.899025, lon: -0.206437 },
  { name: 'Peterborough',      lat: 52.574947, lon: -0.249810 },
  { name: 'Grantham',          lat: 52.906448, lon: -0.642438 },
  { name: 'Newark North Gate', lat: 53.080000, lon: -0.800000 },  // approximate
  { name: 'Retford',           lat: 53.315872, lon: -0.947720 },
  { name: 'Doncaster',         lat: 53.521469, lon: -1.140225 },
  { name: 'Wakefield Westgate',lat: 53.681736, lon: -1.506386 },
  { name: 'Leeds',             lat: 53.795158, lon: -1.549089 },
];

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Distance from a point to the nearest segment of the polyline
// Returns { dist, routeKm } where routeKm is distance along route from start
function distToRoute(lat, lon) {
  let minDist = Infinity;
  let bestRouteKm = 0;
  let cumulativeKm = 0;

  for (let i = 0; i < ECML_WAYPOINTS.length - 1; i++) {
    const a = ECML_WAYPOINTS[i];
    const b = ECML_WAYPOINTS[i + 1];
    const segLen = haversineKm(a.lat, a.lon, b.lat, b.lon);

    // Project point onto segment
    const dA = haversineKm(a.lat, a.lon, lat, lon);
    const dB = haversineKm(b.lat, b.lon, lat, lon);

    // Simple projection: t parameter along segment
    // Using cosine rule approximation
    const t = Math.max(0, Math.min(1, (dA*dA + segLen*segLen - dB*dB) / (2 * segLen * segLen) * segLen));

    // Interpolate point on segment
    const projLat = a.lat + t/segLen * (b.lat - a.lat);
    const projLon = a.lon + t/segLen * (b.lon - a.lon);
    const distToProj = haversineKm(lat, lon, projLat, projLon);

    if (distToProj < minDist) {
      minDist = distToProj;
      bestRouteKm = cumulativeKm + t;
    }

    cumulativeKm += segLen;
  }

  return { dist: minDist, routeKm: bestRouteKm };
}

// Compute total route length
let totalRouteKm = 0;
for (let i = 0; i < ECML_WAYPOINTS.length - 1; i++) {
  const a = ECML_WAYPOINTS[i];
  const b = ECML_WAYPOINTS[i + 1];
  totalRouteKm += haversineKm(a.lat, a.lon, b.lat, b.lon);
}
console.log(`ECML route length (waypoint-to-waypoint): ${totalRouteKm.toFixed(1)} km`);
console.log(`Waypoints: ${ECML_WAYPOINTS.map(w => w.name).join(' -> ')}`);
console.log();

const CORRIDOR_WIDTH_KM = 3; // max distance from route to count as "on the ECML"

// Buckets: 1km segments along the route
const numBuckets = Math.ceil(totalRouteKm);
// Per operator, per bucket: count of measurements, sum of RSRP, etc.
const buckets = {}; // operator -> { bucket_index -> { count, rsrpValues, rsrqValues, sinrValues } }

const operatorTotals = {};
let totalRows = 0;
let ecmlRows = 0;
let headerParsed = false;
let colIndices = {};

const dateRange = { min: null, max: null };
const trainsSeen = new Set();

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (!headerParsed) {
    const cols = line.split(',');
    cols.forEach((c, i) => { colIndices[c.trim()] = i; });
    headerParsed = true;
    console.log('Columns:', cols.join(', '));
    console.log();
    return;
  }

  totalRows++;
  const parts = line.split(',');

  const lat = parseFloat(parts[colIndices.latitude]);
  const lon = parseFloat(parts[colIndices.longitude]);
  const operator = parts[colIndices.operator];
  const calRsrp = parseFloat(parts[colIndices.cal_rsrp]);
  const rsrq = parseFloat(parts[colIndices.rsrq]);
  const sinr = parseFloat(parts[colIndices.sinr]);
  const dt = parts[colIndices.datetime];
  const train = parts[colIndices.train];

  // Quick bounding box pre-filter
  if (lat < 51.4 || lat > 53.9 || lon < -1.7 || lon > 0.1) return;

  const { dist, routeKm } = distToRoute(lat, lon);
  if (dist > CORRIDOR_WIDTH_KM) return;

  ecmlRows++;

  if (!dateRange.min || dt < dateRange.min) dateRange.min = dt;
  if (!dateRange.max || dt > dateRange.max) dateRange.max = dt;
  trainsSeen.add(train);

  if (!operatorTotals[operator]) operatorTotals[operator] = 0;
  operatorTotals[operator]++;

  const bucketIdx = Math.min(Math.floor(routeKm), numBuckets - 1);

  if (!buckets[operator]) buckets[operator] = {};
  if (!buckets[operator][bucketIdx]) {
    buckets[operator][bucketIdx] = { count: 0, rsrpValues: [], rsrqValues: [], sinrValues: [] };
  }

  const b = buckets[operator][bucketIdx];
  b.count++;
  if (!isNaN(calRsrp)) b.rsrpValues.push(calRsrp);
  if (!isNaN(rsrq)) b.rsrqValues.push(rsrq);
  if (!isNaN(sinr)) b.sinrValues.push(sinr);
});

rl.on('close', () => {
  console.log('=== SUMMARY ===');
  console.log(`Total rows in sample: ${totalRows}`);
  console.log(`Rows within ${CORRIDOR_WIDTH_KM}km of ECML: ${ecmlRows}`);
  console.log(`Date range of ECML measurements: ${dateRange.min} to ${dateRange.max}`);
  console.log(`Trains seen: ${[...trainsSeen].join(', ')}`);
  console.log();

  console.log('=== MEASUREMENTS PER OPERATOR (ECML corridor) ===');
  for (const [op, count] of Object.entries(operatorTotals).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${op}: ${count}`);
  }
  console.log();

  // Per-operator density analysis
  for (const operator of Object.keys(buckets).sort()) {
    const opBuckets = buckets[operator];
    const coveredBuckets = Object.keys(opBuckets).length;
    const counts = Object.values(opBuckets).map(b => b.count);
    const totalMeasurements = counts.reduce((s, c) => s + c, 0);

    // Find gaps (buckets with 0 measurements)
    const allBucketIndices = Object.keys(opBuckets).map(Number).sort((a,b) => a-b);
    const minBucket = allBucketIndices[0];
    const maxBucket = allBucketIndices[allBucketIndices.length - 1];
    const spannedBuckets = maxBucket - minBucket + 1;
    const gapBuckets = spannedBuckets - coveredBuckets;

    console.log(`=== ${operator} ===`);
    console.log(`  Covered 1km segments: ${coveredBuckets} of ${numBuckets} (${(coveredBuckets/numBuckets*100).toFixed(1)}%)`);
    console.log(`  Spanned range: bucket ${minBucket} to ${maxBucket} (${spannedBuckets} km)`);
    console.log(`  Gaps within spanned range: ${gapBuckets} segments with 0 measurements`);
    console.log(`  Total measurements: ${totalMeasurements}`);
    console.log(`  Mean measurements per covered km: ${(totalMeasurements/coveredBuckets).toFixed(1)}`);
    console.log(`  Min measurements in a segment: ${Math.min(...counts)}`);
    console.log(`  Max measurements in a segment: ${Math.max(...counts)}`);
    console.log(`  Median measurements per segment: ${counts.sort((a,b) => a-b)[Math.floor(counts.length/2)]}`);

    // RSRP distribution across all ECML measurements for this operator
    const allRsrp = [];
    for (const b of Object.values(opBuckets)) {
      allRsrp.push(...b.rsrpValues);
    }
    allRsrp.sort((a, b) => a - b);
    if (allRsrp.length > 0) {
      const p10 = allRsrp[Math.floor(allRsrp.length * 0.1)];
      const p25 = allRsrp[Math.floor(allRsrp.length * 0.25)];
      const p50 = allRsrp[Math.floor(allRsrp.length * 0.5)];
      const p75 = allRsrp[Math.floor(allRsrp.length * 0.75)];
      const p90 = allRsrp[Math.floor(allRsrp.length * 0.9)];
      console.log(`  Cal RSRP distribution (dBm): p10=${p10}, p25=${p25}, p50=${p50}, p75=${p75}, p90=${p90}`);
    }

    // SINR distribution
    const allSinr = [];
    for (const b of Object.values(opBuckets)) {
      allSinr.push(...b.sinrValues);
    }
    allSinr.sort((a, b) => a - b);
    if (allSinr.length > 0) {
      const p10 = allSinr[Math.floor(allSinr.length * 0.1)];
      const p50 = allSinr[Math.floor(allSinr.length * 0.5)];
      const p90 = allSinr[Math.floor(allSinr.length * 0.9)];
      console.log(`  SINR distribution (dB): p10=${p10.toFixed(1)}, p50=${p50.toFixed(1)}, p90=${p90.toFixed(1)}`);
    }

    console.log();
  }

  // Show segment-by-segment density for one operator (EE) as a sample
  const sampleOp = 'EE';
  if (buckets[sampleOp]) {
    console.log(`=== Segment-by-segment density for ${sampleOp} (first 50 segments with data) ===`);
    const indices = Object.keys(buckets[sampleOp]).map(Number).sort((a,b) => a-b);
    let shown = 0;
    for (const idx of indices) {
      if (shown >= 50) break;
      const b = buckets[sampleOp][idx];
      const medianRsrp = b.rsrpValues.length > 0
        ? b.rsrpValues.sort((a,c) => a-c)[Math.floor(b.rsrpValues.length/2)].toFixed(1)
        : 'N/A';
      console.log(`  km ${idx}-${idx+1}: ${b.count} measurements, median cal_rsrp=${medianRsrp} dBm`);
      shown++;
    }
  }
});
