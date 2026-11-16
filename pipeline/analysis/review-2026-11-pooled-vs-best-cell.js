// Evidence script for specs/review-2026-11-signal-and-workflow.md (section 3.2).
// One-off analysis, not part of the production pipeline (same status as p2-01-analyse-*.js).
//
// Replays the current pipeline's method (every scanner row pooled per graph node, 10th
// percentile) next to a best-cell method (strongest row per train/date/second/operator),
// on the raw RDM 4G file, and prints the band shares each one produces.
//
// Known limits, fixed in review-2026-11-grid-and-routes.js: this script trusts the
// operator NAME column, keeps duplicate rows and keeps rsrp = 0 rows.
//
// Usage (from the repo root, about 4 minutes):
//   unzip -p data/raw/Global_View_4G.zip | node --max-old-space-size=8192 \
//     pipeline/analysis/review-2026-11-pooled-vs-best-cell.js data/track-graph.json out.json
const fs = require("fs");
const readline = require("readline");

const graphPath = process.argv[2];
const outPath = process.argv[3];

const OPS = ["EE", "O2", "Three", "Vodafone"];
function normOp(raw) {
  const t = raw.trim();
  if (t === "EE") return 0;
  if (t.startsWith("O2")) return 1;
  if (t === "Three") return 2;
  if (t.startsWith("Vodafone")) return 3;
  return -1;
}

// ---- graph + node grid (replicates pipeline snap-to-node within 500 m) ----
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const CELL = 0.01;
const grid = new Map();
for (const [id, [lat, lon]] of Object.entries(graph.nodes)) {
  const k = Math.floor(lat / CELL) + "," + Math.floor(lon / CELL);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push([id, lat, lon]);
}
function hav(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function nearestNode(lat, lon) {
  const cr = Math.floor(lat / CELL), cc = Math.floor(lon / CELL);
  let best = null, bd = Infinity;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const b = grid.get((cr + dr) + "," + (cc + dc));
    if (!b) continue;
    for (const n of b) { const d = hav(lat, lon, n[1], n[2]); if (d < bd) { bd = d; best = n[0]; } }
  }
  return bd <= 500 ? best : null;
}

// ---- pass: group rows into (train,date,second,operator) samples ----
const trainIdx = new Map();
const earfcnIdx = new Map();
const sampleIdx = new Map(); // numeric key -> index
let cap = 1 << 22;
let bestRsrp = new Float32Array(cap), bestSinr = new Float32Array(cap), bestWbq = new Float32Array(cap),
  bestWbRsrp = new Float32Array(cap), sLat = new Float32Array(cap), sLon = new Float32Array(cap),
  nRows = new Uint16Array(cap), efMask = new Uint32Array(cap), sSpeed = new Float32Array(cap),
  bestEf = new Uint8Array(cap);
function grow() {
  const g = (A, T) => { const n = new T(cap * 2); n.set(A); return n; };
  bestRsrp = g(bestRsrp, Float32Array); bestSinr = g(bestSinr, Float32Array); bestWbq = g(bestWbq, Float32Array);
  bestWbRsrp = g(bestWbRsrp, Float32Array); sLat = g(sLat, Float32Array); sLon = g(sLon, Float32Array);
  nRows = g(nRows, Uint16Array); efMask = g(efMask, Uint32Array); sSpeed = g(sSpeed, Float32Array);
  bestEf = g(bestEf, Uint8Array); cap *= 2;
}
let nSamples = 0;

const H = (lo, hi) => ({ lo, hi, bins: new Float64Array(hi - lo + 1), n: 0 });
function hadd(h, v) { let i = Math.round(v) - h.lo; if (i < 0) i = 0; if (i > h.hi - h.lo) i = h.hi - h.lo; h.bins[i]++; h.n++; }
function hq(h, p) { let t = h.n * p, c = 0; for (let i = 0; i < h.bins.length; i++) { c += h.bins[i]; if (c >= t) return h.lo + i; } return h.hi; }
function hge(h, thr) { let c = 0; for (let i = Math.max(0, thr - h.lo); i < h.bins.length; i++) c += h.bins[i]; return h.n ? c / h.n : 0; }

const allRsrp = OPS.map(() => H(-150, -30));
const allSinr = OPS.map(() => H(-40, 40));
const earfcnRows = new Map(); // "op|earfcn|dlfreq" -> count
const trains = new Map();
const dates = new Map();
let total = 0, invalid = 0, badOp = 0, slow = 0, mojibake = 0, noSinr = 0;
const fieldCounts = new Map();

// pooled per-node (replicates current pipeline) -- store rsrp + wbq per node|op
const pooled = new Map(); // nodeId|op -> {r:[], q:[]}
let rowsSnapped = 0, rowsNotNearNode = 0;

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let header = null, col = {};
rl.on("line", (line) => {
  if (!header) {
    header = line.replace(/^﻿/, "").split(",").map((s) => s.trim().toLowerCase());
    header.forEach((h, i) => (col[h] = i));
    return;
  }
  total++;
  const p = line.split(",");
  fieldCounts.set(p.length, (fieldCounts.get(p.length) || 0) + 1);
  const opRaw = p[col.operator] || "";
  if (opRaw.includes("Ã")) mojibake++;
  const op = normOp(opRaw);
  if (op < 0) { badOp++; return; }
  const lat = +p[col.latitude], lon = +p[col.longitude], sp = +p[col.gps_speed];
  const rsrp = parseFloat(p[col.rsrp]);
  const wbRsrp = parseFloat(p[col.wb_rsrp]);
  const wbq = parseFloat(p[col.wb_rsrq]);
  const sinrS = (p[col.sinr] || "").trim();
  const sinr = sinrS === "" ? NaN : parseFloat(sinrS);
  if (!isFinite(lat) || !isFinite(lon) || !isFinite(rsrp)) { invalid++; return; }
  const train = p[col.train];
  trains.set(train, (trains.get(train) || 0) + 1);
  const d = p[col.date];
  dates.set(d, (dates.get(d) || 0) + 1);
  const ef = p[col.earfcn];
  const efKey = OPS[op] + "|" + ef + "|" + p[col.dlfreq];
  earfcnRows.set(efKey, (earfcnRows.get(efKey) || 0) + 1);
  if (!(sp >= 5)) { slow++; return; }
  hadd(allRsrp[op], rsrp);
  if (isFinite(sinr)) hadd(allSinr[op], sinr); else noSinr++;

  // replicate pipeline pooling
  const node = nearestNode(lat, lon);
  if (node) {
    rowsSnapped++;
    const k = node + "|" + op;
    let b = pooled.get(k);
    if (!b) { b = { r: [], q: [] }; pooled.set(k, b); }
    b.r.push(rsrp); b.q.push(isFinite(wbq) ? wbq : parseFloat(p[col.rsrq]));
  } else rowsNotNearNode++;

  // sample key
  if (!trainIdx.has(train)) trainIdx.set(train, trainIdx.size);
  if (!earfcnIdx.has(ef)) earfcnIdx.set(ef, earfcnIdx.size);
  const dd = +d.slice(0, 2), mm = +d.slice(3, 5);
  const t = p[col.time];
  const sec = (+t.slice(0, 2)) * 3600 + (+t.slice(3, 5)) * 60 + (+t.slice(6, 8));
  const dayNo = mm * 31 + dd;
  const key = ((dayNo * 86400 + sec) * 8 + trainIdx.get(train)) * 4 + op;
  let i = sampleIdx.get(key);
  if (i === undefined) {
    if (nSamples >= cap) grow();
    i = nSamples++;
    sampleIdx.set(key, i);
    bestRsrp[i] = -999; bestSinr[i] = NaN; bestWbq[i] = NaN; bestWbRsrp[i] = NaN;
  }
  nRows[i]++;
  const ei = earfcnIdx.get(ef);
  if (ei < 32) efMask[i] |= (1 << ei) >>> 0;
  if (rsrp > bestRsrp[i]) {
    bestRsrp[i] = rsrp; bestSinr[i] = sinr; bestWbq[i] = wbq; bestWbRsrp[i] = wbRsrp;
    sLat[i] = lat; sLon[i] = lon; sSpeed[i] = sp; bestEf[i] = ei;
  }
});

rl.on("close", () => {
  const out = {};
  out.total = total; out.invalid = invalid; out.badOp = badOp; out.mojibakeOperatorRows = mojibake; out.slow = slow; out.noSinr = noSinr;
  out.fieldCounts = Object.fromEntries(fieldCounts);
  out.trains = Object.fromEntries(trains);
  const dk = [...dates.keys()].map((d) => d.slice(6) + "-" + d.slice(3, 5) + "-" + d.slice(0, 2)).sort();
  out.dateMin = dk[0]; out.dateMax = dk[dk.length - 1]; out.distinctDates = dk.length;
  out.nSamples = nSamples;
  out.rowsSnappedToNode = rowsSnapped; out.rowsNotNearNode = rowsNotNearNode;
  out.earfcn = [...earfcnRows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);

  // rows per sample, distinct earfcn per sample
  const rp = H(0, 60), ep = H(0, 32);
  const popcnt = (x) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
  const bsRsrp = OPS.map(() => H(-150, -30));
  const bsSinr = OPS.map(() => H(-40, 40));
  const opSamples = [0, 0, 0, 0];
  for (const [key, i] of sampleIdx) {
    const op = key % 4;
    opSamples[op]++;
    hadd(rp, nRows[i]); hadd(ep, popcnt(efMask[i]));
    hadd(bsRsrp[op], bestRsrp[i]);
    if (isFinite(bestSinr[i])) hadd(bsSinr[op], bestSinr[i]);
  }
  out.rowsPerSample = { p10: hq(rp, .1), p50: hq(rp, .5), p90: hq(rp, .9), p99: hq(rp, .99), mean: (total - badOp - invalid - slow) / nSamples };
  out.earfcnPerSample = { p10: hq(ep, .1), p50: hq(ep, .5), p90: hq(ep, .9) };
  out.opSamples = Object.fromEntries(OPS.map((o, i) => [o, opSamples[i]]));

  const thr = [-85, -89, -95, -99, -105, -110, -115, -120];
  const desc = (h) => ({ n: h.n, p10: hq(h, .1), p25: hq(h, .25), p50: hq(h, .5), p75: hq(h, .75), p90: hq(h, .9), ge: Object.fromEntries(thr.map((t) => [t, +(hge(h, t) * 100).toFixed(1)])) });
  out.allRowsRsrp = Object.fromEntries(OPS.map((o, i) => [o, desc(allRsrp[i])]));
  out.bestServerRsrp = Object.fromEntries(OPS.map((o, i) => [o, desc(bsRsrp[i])]));
  const sthr = [-10, -5, 0, 5, 10, 15];
  const sdesc = (h) => ({ n: h.n, p10: hq(h, .1), p50: hq(h, .5), p90: hq(h, .9), ge: Object.fromEntries(sthr.map((t) => [t, +(hge(h, t) * 100).toFixed(1)])) });
  out.allRowsSinr = Object.fromEntries(OPS.map((o, i) => [o, sdesc(allSinr[i])]));
  out.bestServerSinr = Object.fromEntries(OPS.map((o, i) => [o, sdesc(bsSinr[i])]));

  // ---- ~100 m spatial cells: per op, median of best-server RSRP across samples in cell ----
  const cells = new Map(); // "latbin,lonbin|op" -> [rsrp...]
  for (const [key, i] of sampleIdx) {
    const op = key % 4;
    const ck = Math.round(sLat[i] / 0.001) + "," + Math.round(sLon[i] / 0.0015) + "|" + op;
    let a = cells.get(ck);
    if (!a) { a = []; cells.set(ck, a); }
    a.push(bestRsrp[i]);
  }
  const cellMed = OPS.map(() => H(-150, -30));
  const cellP10 = OPS.map(() => H(-150, -30));
  const cellCount = [0, 0, 0, 0];
  const pct = (arr, p) => { arr.sort((a, b) => a - b); const x = p * (arr.length - 1); const lo = Math.floor(x), hi = Math.ceil(x); return arr[lo] + (arr[hi] - arr[lo]) * (x - lo); };
  for (const [ck, a] of cells) {
    const op = +ck.split("|")[1];
    cellCount[op]++;
    hadd(cellMed[op], pct(a, .5));
    hadd(cellP10[op], pct(a, .1));
  }
  out.cells100m = Object.fromEntries(OPS.map((o, i) => [o, { cells: cellCount[i], approxKm: +(cellCount[i] * 0.105).toFixed(0), median: desc(cellMed[i]), p10: desc(cellP10[i]) }]));

  // ---- node-level: current pooled method vs best-server method ----
  // best-server per node
  const bsNode = new Map();
  let bsSnapped = 0;
  for (const [key, i] of sampleIdx) {
    const op = key % 4;
    const node = nearestNode(sLat[i], sLon[i]);
    if (!node) continue;
    bsSnapped++;
    const k = node + "|" + op;
    let a = bsNode.get(k);
    if (!a) { a = []; bsNode.set(k, a); }
    a.push(bestRsrp[i]);
  }
  out.bestServerSamplesSnappedToNode = bsSnapped;
  const band = (rsrp, video, voice) => (rsrp >= video ? "video" : rsrp >= voice ? "voice" : "none");
  const tally = () => OPS.map(() => ({ video: 0, voice: 0, none: 0, nodata: 0 }));
  const cur = tally(), curNoRsrq = tally(), bsP10 = tally(), bsP50 = tally(), bsP10ofcom = tally(), bsP50ofcom = tally();
  for (const [k, b] of pooled) {
    const op = +k.split("|")[1];
    if (b.r.length < 3) { cur[op].nodata++; curNoRsrq[op].nodata++; continue; }
    const r10 = pct(b.r.slice(), .1), q10 = pct(b.q.filter(isFinite), .1);
    let bd = q10 < -20 ? "none" : band(r10, -89, -99);
    if (bd === "video" && q10 < -15) bd = "voice";
    cur[op][bd]++;
    curNoRsrq[op][band(r10, -89, -99)]++;
  }
  for (const [k, a] of bsNode) {
    const op = +k.split("|")[1];
    if (a.length < 3) { bsP10[op].nodata++; bsP50[op].nodata++; bsP10ofcom[op].nodata++; bsP50ofcom[op].nodata++; continue; }
    const r10 = pct(a.slice(), .1), r50 = pct(a.slice(), .5);
    bsP10[op][band(r10, -89, -99)]++;
    bsP50[op][band(r50, -89, -99)]++;
    bsP10ofcom[op][band(r10, -95, -110)]++;
    bsP50ofcom[op][band(r50, -95, -110)]++;
  }
  const fmt = (t) => Object.fromEntries(OPS.map((o, i) => { const x = t[i]; const s = x.video + x.voice + x.none; return [o, { ...x, pctVideo: +(100 * x.video / s).toFixed(1), pctVoice: +(100 * x.voice / s).toFixed(1), pctNone: +(100 * x.none / s).toFixed(1) }]; }));
  out.nodeBands = {
    "A_current_pooled_p10_with_rsrq(-89/-99)": fmt(cur),
    "B_pooled_p10_no_rsrq(-89/-99)": fmt(curNoRsrq),
    "C_bestserver_p10(-89/-99)": fmt(bsP10),
    "D_bestserver_p50(-89/-99)": fmt(bsP50),
    "E_bestserver_p10(-95/-110)": fmt(bsP10ofcom),
    "F_bestserver_p50(-95/-110)": fmt(bsP50ofcom),
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  console.log("done", total, "rows,", nSamples, "samples");
});
