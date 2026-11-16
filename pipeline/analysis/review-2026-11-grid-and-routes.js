// Evidence script for specs/review-2026-11-signal-and-workflow.md (sections 3.3 to 3.5).
// One-off analysis, not part of the production pipeline (same status as p2-01-analyse-*.js).
//
// What it does, on the raw RDM 4G file:
//   - row hygiene counts: rsrp = 0 rows, operator name vs MNC disagreement, duplicate share
//   - strongest cell per pass (train + date) x ~200 m grid cell x operator, operator taken
//     from MNC; then the median across passes for each cell
//   - network-wide share of measured cells above a set of RSRP levels
//   - four routes: the app's current verdict (distance-weighted, from signal-segments.json)
//     next to the raw best-cell distribution for grid cells along the same path
//   - tests of what the WB_Rsrp column means relative to rsrp
//
// The route corridor is approximate: it follows straight lines between simplified graph
// nodes, so long edges can miss measurements. P7-08 replaces this with real geometry.
//
// Usage (from the repo root, about 4 minutes):
//   unzip -p data/raw/Global_View_4G.zip | node --max-old-space-size=8192 \
//     pipeline/analysis/review-2026-11-grid-and-routes.js \
//     data/track-graph.json data/signal-segments.json out.json
const fs = require("fs");
const readline = require("readline");
const [graphPath, segPath, outPath] = process.argv.slice(2);
const OPS = ["EE", "O2", "Three", "Vodafone"];
const MNC = { "30": 0, "33": 0, "10": 1, "20": 2, "15": 3 };

const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const seg = JSON.parse(fs.readFileSync(segPath, "utf8"));
const adj = new Map();
for (const e of Object.values(graph.edges)) {
  const a = String(e[0]), b = String(e[1]);
  if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push([b, e[2]]); adj.get(b).push([a, e[2]]);
}
function dijkstra(from, to) {
  const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
  const heap = [[0, from]];
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let s = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a][0] < heap[s][0]) s = a; if (b < heap.length && heap[b][0] < heap[s][0]) s = b; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return t; };
  while (heap.length) {
    const [d, u] = pop(); if (done.has(u)) continue; done.add(u);
    if (u === to) { const p = []; let n = to; while (n !== undefined) { p.push(n); n = prev.get(n); } return p.reverse(); }
    for (const [v, w] of adj.get(u) || []) { if (done.has(v)) continue; const nd = d + w; if (!dist.has(v) || nd < dist.get(v)) { dist.set(v, nd); prev.set(v, u); push([nd, v]); } }
  }
  return [];
}
const ROUTES = {
  "Leeds-KingsCross": ["LDS", "WKF", "DON", "RET", "NNG", "GRA", "PBO", "SVG", "KGX"],
  "Paddington-Bristol": ["PAD", "RDG", "DID", "SWI", "CPM", "BTH", "BRI"],
  "LiverpoolSt-Norwich": ["LST", "CHM", "COL", "MNG", "IPS", "SMK", "DIS", "NRW"],
  "Edinburgh-GlasgowQueenSt": ["EDB", "HYM", "LIN", "FKK", "GLQ"],
};
const routes = {};
for (const [name, crs] of Object.entries(ROUTES)) {
  const nodes = []; let ok = true; const legKm = [];
  for (let i = 0; i < crs.length - 1; i++) {
    const a = graph.stationNodes[crs[i]], b = graph.stationNodes[crs[i + 1]];
    if (!a || !b) { ok = false; break; }
    const p = dijkstra(String(a.nodeId), String(b.nodeId));
    if (!p.length) { ok = false; break; }
    let km = 0; for (let j = 0; j < p.length - 1; j++) km += (adj.get(p[j]).find((x) => x[0] === p[j + 1]) || [0, 0])[1] / 1000;
    legKm.push(+km.toFixed(1));
    for (const n of (nodes.length ? p.slice(1) : p)) nodes.push(n);
  }
  routes[name] = { ok, nodes, legKm };
}
// current app verdict along each route (distance-weighted per node -> outgoing edge), per operator
function currentVerdict(nodes, op) {
  const acc = { video: 0, voice: 0, none: 0, "no-data": 0 }, src = {}; let tot = 0, maxEdge = 0;
  for (let j = 0; j < nodes.length - 1; j++) {
    const d = (adj.get(nodes[j]).find((x) => x[0] === nodes[j + 1]) || [0, 0])[1];
    const n = seg.nodes[nodes[j]]; const o = n && n.operators[op];
    const band = o ? o.band : "no-data"; acc[band] += d; tot += d; if (d > maxEdge) maxEdge = d;
    const s = o ? (o.source || "measured") : "no-data"; src[s] = (src[s] || 0) + d;
  }
  const pc = (x) => +(100 * x / tot).toFixed(1);
  return { km: +(tot / 1000).toFixed(1), nodes: nodes.length, maxEdgeKm: +(maxEdge / 1000).toFixed(1), good: pc(acc.video), limited: pc(acc.voice), none: pc(acc.none), noData: pc(acc["no-data"]), sourceKmPct: Object.fromEntries(Object.entries(src).map(([k, v]) => [k, pc(v)])) };
}

// ---- stream ----
const BLAT = 0.002, BLON = 0.003; // ~222 m x ~200 m
const passIdx = new Map();
const binIdx = new Map();
let cap = 1 << 21, nb = 0;
let bNb = new Float32Array(cap), bWb = new Float32Array(cap), bSinr = new Float32Array(cap), bEf = new Int32Array(cap);
function grow() { const g = (A, T) => { const x = new T(cap * 2); x.set(A); return x; }; bNb = g(bNb, Float32Array); bWb = g(bWb, Float32Array); bSinr = g(bSinr, Float32Array); bEf = g(bEf, Int32Array); cap *= 2; }
let rows = 0, kept = 0, nbZero = 0, nbHigh = 0, nbLow = 0, opFromMncOnly = 0, opMismatch = 0, noOp = 0;
const dupSample = new Set(); let dupSampleRows = 0;
const semGroups = new Map(); // sampled seconds -> rows
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let header = null, col = {};
rl.on("line", (line) => {
  if (!header) { header = line.replace(/^﻿/, "").split(",").map((s) => s.trim().toLowerCase()); header.forEach((h, i) => (col[h] = i)); return; }
  rows++;
  const p = line.split(",");
  const opRaw = (p[col.operator] || "").trim();
  let op = opRaw === "EE" ? 0 : opRaw.startsWith("O2") ? 1 : opRaw === "Three" ? 2 : opRaw.startsWith("Vodafone") ? 3 : -1;
  const m = MNC[(p[col.mnc] || "").trim()];
  if (op < 0 && m !== undefined) { op = m; opFromMncOnly++; }
  else if (op >= 0 && m !== undefined && m !== op) opMismatch++;
  if (op < 0) { noOp++; return; }
  const sp = +p[col.gps_speed]; if (!(sp >= 5)) return;
  const rsrp = parseFloat(p[col.rsrp]);
  if (!isFinite(rsrp)) return;
  if (rsrp === 0) { nbZero++; }
  if (rsrp > -30) { nbHigh++; return; }
  if (rsrp < -150) { nbLow++; return; }
  const lat = +p[col.latitude], lon = +p[col.longitude];
  const wb = parseFloat(p[col.wb_rsrp]);
  const sinrS = (p[col.sinr] || "").trim(); const sinr = sinrS === "" ? NaN : parseFloat(sinrS);
  const train = p[col.train], d = p[col.date], t = p[col.time], ef = p[col.earfcn], pci = p[col.pci];
  kept++;
  const rowKey = train + d + t + op + "|" + ef + "|" + pci;
  const h = hash(rowKey);
  if (h % 10 === 0) { dupSampleRows++; dupSample.add(rowKey); }
  const secKey = train + d + t;
  if (hash(secKey) % 25 === 0) { let a = semGroups.get(secKey + "|" + op + "|" + ef); if (!a) { a = new Map(); semGroups.set(secKey + "|" + op + "|" + ef, a); } if (!a.has(pci)) a.set(pci, [rsrp, wb, sinr]); }
  const pk = train + d; if (!passIdx.has(pk)) passIdx.set(pk, passIdx.size);
  const bl = Math.round(lat / BLAT), bo = Math.round((lon + 10) / BLON);
  const key = ((bl * 8192 + bo) * 512 + passIdx.get(pk)) * 4 + op;
  let i = binIdx.get(key);
  if (i === undefined) { if (nb >= cap) grow(); i = nb++; binIdx.set(key, i); bNb[i] = -999; bWb[i] = -999; bSinr[i] = NaN; bEf[i] = 0; }
  if (rsrp > bNb[i]) { bNb[i] = rsrp; bSinr[i] = sinr; bEf[i] = +ef; }
  if (isFinite(wb) && wb < -30 && wb > bWb[i]) bWb[i] = wb;
});

rl.on("close", () => {
  const out = { rows, kept, nbZero, nbHigh, nbLow, opFromMncOnly, opMismatch, noOp, passes: passIdx.size, passBinOps: nb };
  out.duplicateRowShare = +(100 * (1 - dupSample.size / dupSampleRows)).toFixed(1);
  // semantics tests
  let multi = 0, sameArg = 0; const spreadNb = [], spreadWb = [];
  let n2 = 0, sAbs = 0, sxy = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
  for (const g of semGroups.values()) {
    const a = [...g.values()];
    for (const [nbv, wbv, s] of a) {
      if (isFinite(wbv) && isFinite(s) && wbv < -30) { const pred = -10 * Math.log10(1 + Math.pow(10, -s / 10)); const obs = nbv - wbv; n2++; sAbs += Math.abs(obs - pred); sxy += obs * pred; sx += pred; sy += obs; sxx += pred * pred; syy += obs * obs; }
    }
    const v = a.filter((r) => isFinite(r[1]) && r[1] < -30);
    if (v.length >= 2) {
      multi++;
      let an = 0, aw = 0; for (let i = 1; i < v.length; i++) { if (v[i][0] > v[an][0]) an = i; if (v[i][1] > v[aw][1]) aw = i; }
      if (an === aw) sameArg++;
      spreadNb.push(Math.max(...v.map((r) => r[0])) - Math.min(...v.map((r) => r[0])));
      spreadWb.push(Math.max(...v.map((r) => r[1])) - Math.min(...v.map((r) => r[1])));
    }
  }
  const med = (a) => { a.sort((x, y) => x - y); return a.length ? +a[Math.floor(a.length / 2)].toFixed(1) : null; };
  const corr = (n2 * sxy - sx * sy) / Math.sqrt((n2 * sxx - sx * sx) * (n2 * syy - sy * sy));
  out.semantics = { groupsWith2plusPci: multi, shareSameStrongestByNbAndWb: +(100 * sameArg / multi).toFixed(1), medianSpreadAcrossPci_nb: med(spreadNb), medianSpreadAcrossPci_wb: med(spreadWb), rowsTested: n2, corr_nbMinusWb_vs_sinrModel: +corr.toFixed(3), meanAbsDiff_dB: +(sAbs / n2).toFixed(2) };

  // per (bin, op): median across passes
  const perBin = new Map(); // binop key -> {nb:[], wb:[], sinr:[], ef:[]}
  for (const [key, i] of binIdx) {
    const op = key % 4; const bk = Math.floor(key / 4 / 512) * 4 + op;
    let a = perBin.get(bk); if (!a) { a = { nb: [], wb: [], sinr: [] }; perBin.set(bk, a); }
    a.nb.push(bNb[i]); if (bWb[i] > -900) a.wb.push(bWb[i]); if (isFinite(bSinr[i])) a.sinr.push(bSinr[i]);
  }
  const mdn = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const thr = [-85, -90, -95, -100, -105, -110, -115, -120];
  const share = (vals) => Object.fromEntries(thr.map((t) => [t, +(100 * vals.filter((v) => v >= t).length / vals.length).toFixed(1)]));
  const q = (vals, p) => { const s = vals.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  const binMed = new Map(); // bk -> [medNb, medWb, medSinr, passes]
  const byOp = OPS.map(() => ({ nb: [], wb: [], sinr: [], passes: [] }));
  for (const [bk, a] of perBin) {
    const op = bk % 4; const mn = mdn(a.nb), mw = a.wb.length ? mdn(a.wb) : NaN, ms = a.sinr.length ? mdn(a.sinr) : NaN;
    binMed.set(bk, [mn, mw, ms, a.nb.length]);
    byOp[op].nb.push(mn); if (isFinite(mw)) byOp[op].wb.push(mw); if (isFinite(ms)) byOp[op].sinr.push(ms); byOp[op].passes.push(a.nb.length);
  }
  out.network = Object.fromEntries(OPS.map((o, k) => [o, {
    bins: byOp[k].nb.length, approxKm: +(byOp[k].nb.length * 0.21).toFixed(0), passesPerBin: { p50: q(byOp[k].passes, .5), p90: q(byOp[k].passes, .9), single: +(100 * byOp[k].passes.filter((x) => x === 1).length / byOp[k].passes.length).toFixed(1) },
    nb: { p10: q(byOp[k].nb, .1), p50: q(byOp[k].nb, .5), p90: q(byOp[k].nb, .9), ge: share(byOp[k].nb) },
    wb: { p10: q(byOp[k].wb, .1), p50: q(byOp[k].wb, .5), p90: q(byOp[k].wb, .9), ge: share(byOp[k].wb) },
    sinrAtBest: { p10: q(byOp[k].sinr, .1), p50: q(byOp[k].sinr, .5), p90: q(byOp[k].sinr, .9), ge0: +(100 * byOp[k].sinr.filter((x) => x >= 0).length / byOp[k].sinr.length).toFixed(1) },
  }]));

  // ---- route corridors ----
  out.routes = {};
  const R = 6371000, rad = Math.PI / 180;
  for (const [name, r] of Object.entries(routes)) {
    if (!r.ok) { out.routes[name] = { error: "unresolved" }; continue; }
    // walk the chords, sample every 100 m, collect bin keys within +-1 bin
    const cellSet = new Set(); let lenM = 0;
    for (let j = 0; j < r.nodes.length - 1; j++) {
      const a = graph.nodes[r.nodes[j]], b = graph.nodes[r.nodes[j + 1]];
      const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad * Math.cos(a[0] * rad);
      const d = R * Math.sqrt(dLat * dLat + dLon * dLon); lenM += d;
      const steps = Math.max(1, Math.ceil(d / 100));
      for (let s = 0; s <= steps; s++) {
        const lat = a[0] + (b[0] - a[0]) * s / steps, lon = a[1] + (b[1] - a[1]) * s / steps;
        const bl = Math.round(lat / BLAT), bo = Math.round((lon + 10) / BLON);
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) cellSet.add((bl + x) * 8192 + (bo + y));
      }
    }
    const res = { chordKm: +(lenM / 1000).toFixed(1), legKm: r.legKm, pathNodes: r.nodes.length, corridorBins: cellSet.size, current: {}, corrected: {} };
    for (let k = 0; k < 4; k++) {
      res.current[OPS[k]] = currentVerdict(r.nodes, OPS[k]);
      const nbv = [], wbv = [], sv = [];
      for (const c of cellSet) { const m = binMed.get(c * 4 + k); if (m) { nbv.push(m[0]); if (isFinite(m[1])) wbv.push(m[1]); if (isFinite(m[2])) sv.push(m[2]); } }
      res.corrected[OPS[k]] = nbv.length ? { binsWithData: nbv.length, nb_p50: q(nbv, .5), nb_ge: share(nbv), wb_p50: wbv.length ? q(wbv, .5) : null, wb_ge: wbv.length ? share(wbv) : null, sinr_ge0: sv.length ? +(100 * sv.filter((x) => x >= 0).length / sv.length).toFixed(1) : null } : { binsWithData: 0 };
    }
    out.routes[name] = res;
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  console.log("done", rows, kept, nb);
});
