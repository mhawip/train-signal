#!/usr/bin/env node
/**
 * P2-01: Analyse spread sample of Ofcom LTE yellow-train data
 *
 * This script processes a file composed of chunks from different positions
 * in the original CSV. It handles partial/broken lines gracefully.
 * Filters for ECML corridor and analyses measurement density.
 */

const fs = require('fs');
const readline = require('readline');

const INPUT = process.argv[2] || 'C:/Users/MattHamilton/OneDrive/Prototypes/train-signal/data/raw/lte-sample-spread.csv';

// Expected column count (from header)
const EXPECTED_COLS = 18;

// ECML waypoints (Kings Cross to Leeds) - lat/lon
const ECML_WAYPOINTS = [
  { name: 'London Kings Cross', lat: 51.530827, lon: -0.122907 },
  { name: 'Finsbury Park',     lat: 51.564724, lon: -0.105642 },
  { name: 'Stevenage',         lat: 51.899025, lon: -0.206437 },
  { name: 'Peterborough',      lat: 52.574947, lon: -0.249810 },
  { name: 'Grantham',          lat: 52.906448, lon: -0.642438 },
  { name: 'Newark North Gate', lat: 53.080000, lon: -0.800000 },
  { name: 'Retford',           lat: 53.315872, lon: -0.947720 },
  { name: 'Doncaster',         lat: 53.521469, lon: -1.140225 },
  { name: 'Wakefield Westgate',lat: 53.681736, lon: -1.506386 },
  { name: 'Leeds',             lat: 53.795158, lon: -1.549089 },
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function distToRoute(lat, lon) {
  let minDist = Infinity;
  let bestRouteKm = 0;
  let cumulativeKm = 0;

  for (let i = 0; i < ECML_WAYPOINTS.length - 1; i++) {
    const a = ECML_WAYPOINTS[i];
    const b = ECML_WAYPOINTS[i + 1];
    const segLen = haversineKm(a.lat, a.lon, b.lat, b.lon);
    const dA = haversineKm(a.lat, a.lon, lat, lon);
    const dB = haversineKm(b.lat, b.lon, lat, lon);
    const t = Math.max(0, Math.min(segLen, (dA*dA + segLen*segLen - dB*dB) / (2 * segLen)));
    const frac = t / segLen;
    const projLat = a.lat + frac * (b.lat - a.lat);
    const projLon = a.lon + frac * (b.lon - a.lon);
    const distToProj = haversineKm(lat, lon, projLat, projLon);

    if (distToProj < minDist) {
      minDist = distToProj;
      bestRouteKm = cumulativeKm + t;
    }
    cumulativeKm += segLen;
  }

  return { dist: minDist, routeKm: bestRouteKm };
}

let totalRouteKm = 0;
for (let i = 0; i < ECML_WAYPOINTS.length - 1; i++) {
  const a = ECML_WAYPOINTS[i];
  const b = ECML_WAYPOINTS[i + 1];
  totalRouteKm += haversineKm(a.lat, a.lon, b.lat, b.lon);
}

const CORRIDOR_WIDTH_KM = 3;
const numBuckets = Math.ceil(totalRouteKm);

// Per operator, per bucket
const buckets = {};
const operatorTotals = {};
let totalRows = 0;
let parsedRows = 0;
let skippedRows = 0;
let ecmlRows = 0;
const dateRange = { min: null, max: null };
const trainsSeen = new Set();
const datesSeen = new Set();

// Column indices (hardcoded from known header)
const COL = {
  latitude: 0, longitude: 1, eastings: 2, northings: 3,
  speed: 4, train: 5, datetime: 6, mnc: 7, operator: 8,
  earfcn: 9, dlfreq: 10, phylayercellid: 11, pci: 12,
  rsrp: 13, cal_rsrp: 14, total_power: 15, rsrq: 16, sinr: 17
};

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  totalRows++;

  // Skip header lines and partial lines
  if (line.startsWith('\uFEFF') || line.startsWith('latitude')) return;

  const parts = line.split(',');
  if (parts.length !== EXPECTED_COLS) { skippedRows++; return; }

  const lat = parseFloat(parts[COL.latitude]);
  const lon = parseFloat(parts[COL.longitude]);
  if (isNaN(lat) || isNaN(lon)) { skippedRows++; return; }

  parsedRows++;

  const operator = parts[COL.operator];
  const calRsrp = parseFloat(parts[COL.cal_rsrp]);
  const rsrq = parseFloat(parts[COL.rsrq]);
  const sinr = parseFloat(parts[COL.sinr]);
  const dt = parts[COL.datetime];
  const train = parts[COL.train];

  trainsSeen.add(train);
  const dateOnly = dt ? dt.substring(0, 10) : null;
  if (dateOnly) datesSeen.add(dateOnly);

  // Quick bounding box pre-filter for ECML
  if (lat < 51.4 || lat > 53.9 || lon < -1.7 || lon > 0.1) return;

  const { dist, routeKm } = distToRoute(lat, lon);
  if (dist > CORRIDOR_WIDTH_KM) return;

  ecmlRows++;

  if (!dateRange.min || dt < dateRange.min) dateRange.min = dt;
  if (!dateRange.max || dt > dateRange.max) dateRange.max = dt;

  if (!operatorTotals[operator]) operatorTotals[operator] = 0;
  operatorTotals[operator]++;

  const bucketIdx = Math.min(Math.floor(routeKm), numBuckets - 1);

  if (!buckets[operator]) buckets[operator] = {};
  if (!buckets[operator][bucketIdx]) {
    buckets[operator][bucketIdx] = { count: 0, rsrpValues: [], rsrqValues: [], sinrValues: [], dates: new Set() };
  }

  const b = buckets[operator][bucketIdx];
  b.count++;
  if (dateOnly) b.dates.add(dateOnly);
  if (!isNaN(calRsrp)) b.rsrpValues.push(calRsrp);
  if (!isNaN(rsrq)) b.rsrqValues.push(rsrq);
  if (!isNaN(sinr)) b.sinrValues.push(sinr);
});

rl.on('close', () => {
  console.log(`ECML route length: ${totalRouteKm.toFixed(1)} km`);
  console.log();
  console.log('=== FILE SUMMARY ===');
  console.log(`Total lines: ${totalRows}`);
  console.log(`Parsed data rows: ${parsedRows}`);
  console.log(`Skipped (partial/malformed): ${skippedRows}`);
  console.log(`Unique trains: ${[...trainsSeen].join(', ')}`);
  console.log(`Unique dates: ${datesSeen.size}`);
  console.log(`Date spread: ${[...datesSeen].sort().slice(0, 3).join(', ')} ... ${[...datesSeen].sort().slice(-3).join(', ')}`);
  console.log();
  console.log('=== ECML CORRIDOR ===');
  console.log(`Rows within ${CORRIDOR_WIDTH_KM}km of ECML: ${ecmlRows}`);
  console.log(`ECML date range: ${dateRange.min} to ${dateRange.max}`);
  console.log();

  console.log('=== MEASUREMENTS PER OPERATOR (ECML) ===');
  for (const [op, count] of Object.entries(operatorTotals).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${op}: ${count}`);
  }
  console.log();

  // Per-operator density
  for (const operator of Object.keys(buckets).sort()) {
    const opBuckets = buckets[operator];
    const coveredBucketIndices = Object.keys(opBuckets).map(Number).sort((a,b) => a-b);
    const coveredCount = coveredBucketIndices.length;
    const counts = Object.values(opBuckets).map(b => b.count);
    const totalMeas = counts.reduce((s, c) => s + c, 0);
    const sortedCounts = [...counts].sort((a,b) => a-b);

    console.log(`=== ${operator} ===`);
    console.log(`  Covered 1km segments: ${coveredCount} of ${numBuckets} (${(coveredCount/numBuckets*100).toFixed(1)}%)`);
    console.log(`  Total measurements: ${totalMeas}`);
    console.log(`  Measurements per covered km: mean=${(totalMeas/coveredCount).toFixed(1)}, median=${sortedCounts[Math.floor(sortedCounts.length/2)]}, min=${sortedCounts[0]}, max=${sortedCounts[sortedCounts.length-1]}`);

    // How many unique dates contributed
    const allDates = new Set();
    for (const b of Object.values(opBuckets)) {
      for (const d of b.dates) allDates.add(d);
    }
    console.log(`  Unique measurement dates: ${allDates.size}`);

    // RSRP distribution
    const allRsrp = [];
    for (const b of Object.values(opBuckets)) allRsrp.push(...b.rsrpValues);
    allRsrp.sort((a, b) => a - b);
    if (allRsrp.length > 0) {
      const pct = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].map(p => {
        const val = allRsrp[Math.floor(allRsrp.length * p)];
        return `p${p*100}=${val.toFixed(1)}`;
      });
      console.log(`  Cal RSRP (dBm): ${pct.join(', ')}`);
    }

    // SINR distribution
    const allSinr = [];
    for (const b of Object.values(opBuckets)) allSinr.push(...b.sinrValues);
    allSinr.sort((a, b) => a - b);
    if (allSinr.length > 0) {
      const pct = [0.1, 0.5, 0.9].map(p => {
        const val = allSinr[Math.floor(allSinr.length * p)];
        return `p${p*100}=${val.toFixed(1)}`;
      });
      console.log(`  SINR (dB): ${pct.join(', ')}`);
    }
    console.log();
  }

  // Show which 1km segments have data for EE (as heatmap)
  const sampleOp = 'EE';
  if (buckets[sampleOp]) {
    console.log(`=== Coverage map for ${sampleOp}: measurements per 1km segment ===`);
    console.log('(Each character = 1 km. 0=no data, 1-9=measurement count category, *=10+)');
    let line = '';
    let gapCount = 0;
    for (let i = 0; i < numBuckets; i++) {
      const b = buckets[sampleOp][i];
      if (!b) { line += '.'; gapCount++; }
      else if (b.count < 10) line += String(b.count);
      else line += '*';
    }
    // Print in rows of 50
    for (let i = 0; i < line.length; i += 50) {
      const chunk = line.substring(i, i + 50);
      console.log(`  km ${String(i).padStart(3)}: ${chunk}`);
    }
    console.log(`  Total segments with no data: ${gapCount} of ${numBuckets}`);
  }
});
