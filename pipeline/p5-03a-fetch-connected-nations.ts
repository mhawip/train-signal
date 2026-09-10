/**
 * P5-03a: Fetch Ofcom Connected Nations coverage via API
 *
 * Queries the Ofcom Connected Nations Mobile API for each track-graph node
 * location and outputs data/raw/connected-nations-2025/coverage-grid.csv,
 * which is consumed by pipeline/p5-03-build-connected-nations.ts.
 *
 * Steps:
 *   1. Reverse-geocode each track node lat/lon → UK postcode (postcodes.io, free)
 *   2. Fetch per-operator 4G voice outdoor coverage for each unique postcode
 *      (Ofcom Connected Nations Mobile API)
 *   3. Write coverage-grid.csv (latitude,longitude,operator,voice_outdoor)
 *
 * Progress is cached to data/raw/connected-nations-2025/fetch-cache.json.
 * Safe to interrupt and resume — the script skips already-completed work.
 *
 * Requirements:
 *   OFCOM_CN_API_KEY in .env.local or environment.
 *   API: https://api.ofcom.org.uk (Basic tier: 100 calls/min, 50k/month)
 *
 * Operator code mapping (from Ofcom API field prefixes):
 *   EE = EE, H3 = Three, TF = O2 (Telefónica UK), VO = Vodafone
 *
 * Usage:
 *   npx tsx pipeline/p5-03a-fetch-connected-nations.ts [--dry-run] [--csv-only]
 *
 *   --dry-run   Run all phases but do not write coverage-grid.csv.
 *               Cache is still saved normally.
 *   --csv-only  Skip phases 1 and 2; regenerate CSV from existing cache only.
 *               Useful after cache is fully populated.
 *
 * Output:
 *   data/raw/connected-nations-2025/coverage-grid.csv
 *   data/raw/connected-nations-2025/fetch-cache.json  (progress cache)
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const GRAPH_PATH = path.join(DATA_DIR, "track-graph.json");
const CN_DIR = path.join(DATA_DIR, "raw", "connected-nations-2025");
const CACHE_PATH = path.join(CN_DIR, "fetch-cache.json");
const OUTPUT_CSV_PATH = path.join(CN_DIR, "coverage-grid.csv");
const ENV_LOCAL_PATH = path.join(PROJECT_ROOT, ".env.local");

/** Ofcom Connected Nations Mobile API base URL. */
const OFCOM_BASE = "https://api-proxy.ofcom.org.uk/mobile";

/** postcodes.io reverse-geocode base URL (free, no key required). */
const POSTCODES_IO_BASE = "https://api.postcodes.io";

/**
 * Minimum interval between Ofcom API calls.
 * Basic tier allows 100 calls/minute = 600 ms/call. Using 650 ms for margin.
 */
const OFCOM_RATE_MS = 650;

/** Save cache to disk every N Ofcom API calls. */
const CACHE_SAVE_INTERVAL = 10;

/** How many postcodes.io requests to make concurrently. */
const GEOCODE_CONCURRENCY = 20;

/** How many nodes to log progress after during geocoding. */
const GEOCODE_LOG_INTERVAL = 500;

/**
 * Ofcom API operator field prefixes and their internal names.
 * TF = Telefónica UK = O2.
 */
const OPERATORS: ReadonlyArray<{
  code: string;
  name: string;
  voiceOutdoorField: string;
}> = [
  { code: "EE", name: "EE",       voiceOutdoorField: "EEVoiceOutdoor" },
  { code: "H3", name: "Three",    voiceOutdoorField: "H3VoiceOutdoor" },
  { code: "TF", name: "O2",       voiceOutdoorField: "TFVoiceOutdoor" },
  { code: "VO", name: "Vodafone", voiceOutdoorField: "VOVoiceOutdoor" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Cache {
  /**
   * nodeId → postcode string, or null if reverse-geocode returned no result
   * (e.g. node is on a viaduct over sea, in a tunnel, or outside GB).
   */
  nodePostcodes: Record<string, string | null>;
  /**
   * postcode → per-operator-name voice outdoor coverage.
   * null means Ofcom returned 404 (postcode has no coverage data).
   * A missing key means this postcode has not been fetched yet.
   */
  postcodesCoverage: Record<string, Record<string, boolean> | null>;
}

interface TrackGraph {
  nodes: Record<string, [number, number]>; // nodeId → [lat, lon]
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Load OFCOM_CN_API_KEY from process.env, then from .env.local. */
function loadApiKey(): string {
  if (process.env.OFCOM_CN_API_KEY) return process.env.OFCOM_CN_API_KEY;
  if (fs.existsSync(ENV_LOCAL_PATH)) {
    for (const line of fs.readFileSync(ENV_LOCAL_PATH, "utf8").split("\n")) {
      const match = line.match(/^OFCOM_CN_API_KEY\s*=\s*(.+)$/);
      if (match) return match[1].trim();
    }
  }
  return "";
}

function saveCache(cache: Cache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

// ---------------------------------------------------------------------------
// Phase 1: Reverse geocode via postcodes.io
// ---------------------------------------------------------------------------

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `${POSTCODES_IO_BASE}/postcodes?lon=${lon}&lat=${lat}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result: Array<{ postcode: string }> | null;
    };
    return body.result?.[0]?.postcode ?? null;
  } catch {
    return null;
  }
}

async function geocodeAllNodes(
  nodes: Record<string, [number, number]>,
  cache: Cache
): Promise<void> {
  const nodeIds = Object.keys(nodes);
  const pending = nodeIds.filter(
    (id) => cache.nodePostcodes[id] === undefined
  );

  if (pending.length === 0) {
    console.log(`  All ${nodeIds.length} nodes already geocoded (cached).`);
    return;
  }

  const alreadyCached = nodeIds.length - pending.length;
  console.log(
    `  ${pending.length} nodes to geocode (${alreadyCached} already cached).`
  );

  let done = 0;

  for (let i = 0; i < pending.length; i += GEOCODE_CONCURRENCY) {
    const batch = pending.slice(i, i + GEOCODE_CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (nodeId) => {
        const [lat, lon] = nodes[nodeId];
        const postcode = await reverseGeocode(lat, lon);
        return { nodeId, postcode };
      })
    );

    for (const { nodeId, postcode } of results) {
      cache.nodePostcodes[nodeId] = postcode;
    }

    done += batch.length;

    if (done % GEOCODE_LOG_INTERVAL === 0 || done === pending.length) {
      saveCache(cache);
      console.log(`  ${done}/${pending.length} geocoded...`);
    }
  }

  const found = Object.values(cache.nodePostcodes).filter(
    (pc) => pc !== null
  ).length;
  const notFound = Object.values(cache.nodePostcodes).filter(
    (pc) => pc === null
  ).length;
  console.log(
    `  Complete: ${found} nodes have a postcode, ${notFound} returned null (no GB postcode).`
  );
}

// ---------------------------------------------------------------------------
// Phase 2: Ofcom API
// ---------------------------------------------------------------------------

class RateLimitError extends Error {}

async function fetchOfcomCoverage(
  postcode: string,
  apiKey: string
): Promise<Record<string, boolean> | null> {
  const encoded = postcode.replace(/\s+/g, ""); // "SW1A 1AA" → "SW1A1AA"
  const url = `${OFCOM_BASE}/coverage/${encoded}`;

  const res = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
  });

  if (res.status === 404) {
    // Postcode not in Ofcom database (e.g. new development, large estate)
    return null;
  }
  if (res.status === 429) {
    throw new RateLimitError(`Rate limited on ${postcode}`);
  }
  if (!res.ok) {
    throw new Error(
      `Ofcom API ${res.status} ${res.statusText} for postcode ${postcode}`
    );
  }

  const body = (await res.json()) as {
    Availability?: Array<Record<string, unknown>>;
  };

  const availability = body.Availability ?? [];

  // An operator is "covered" if ANY address in the postcode has a VoiceOutdoor
  // value > 0. Value 0 = no signal predicted; 1–4 = increasing coverage quality.
  const coverage: Record<string, boolean> = {};
  for (const { name, voiceOutdoorField } of OPERATORS) {
    let covered = false;
    for (const address of availability) {
      const val = address[voiceOutdoorField];
      if (typeof val === "number" && val > 0) {
        covered = true;
        break;
      }
    }
    coverage[name] = covered;
  }

  return coverage;
}

async function fetchAllPostcodes(
  cache: Cache,
  apiKey: string
): Promise<void> {
  const allPostcodes = new Set<string>();
  for (const pc of Object.values(cache.nodePostcodes)) {
    if (pc !== null) allPostcodes.add(pc);
  }

  const pending = Array.from(allPostcodes).filter(
    (pc) => cache.postcodesCoverage[pc] === undefined
  );

  const alreadyFetched = allPostcodes.size - pending.length;

  if (pending.length === 0) {
    console.log(
      `  All ${allPostcodes.size} unique postcodes already fetched (cached).`
    );
    return;
  }

  const estMinutes = Math.ceil((pending.length * OFCOM_RATE_MS) / 60000);
  console.log(
    `  ${allPostcodes.size} unique postcodes total: ${alreadyFetched} cached, ${pending.length} to fetch.`
  );
  console.log(
    `  Rate: ~${Math.round(60000 / OFCOM_RATE_MS)}/min — estimated ~${estMinutes} minutes.`
  );
  console.log("  (Safe to interrupt; progress is saved every 10 calls.)");
  console.log("");

  let fetched = 0;
  let errors = 0;

  for (const postcode of pending) {
    await sleep(OFCOM_RATE_MS);

    let retries = 0;
    let success = false;

    while (retries < 3 && !success) {
      try {
        cache.postcodesCoverage[postcode] = await fetchOfcomCoverage(
          postcode,
          apiKey
        );
        fetched++;
        success = true;
      } catch (err) {
        if (err instanceof RateLimitError) {
          console.warn(
            `  Rate limit hit — pausing 30 seconds before retry ${retries + 1}/3...`
          );
          await sleep(30_000);
          retries++;
        } else {
          console.error(`  Error fetching "${postcode}": ${err}`);
          errors++;
          break; // Leave uncached; will retry on next run
        }
      }
    }

    if (fetched > 0 && fetched % CACHE_SAVE_INTERVAL === 0) {
      saveCache(cache);
      const pct = ((fetched / pending.length) * 100).toFixed(1);
      console.log(
        `  ${fetched}/${pending.length} (${pct}%) — ${errors} errors`
      );
    }
  }

  saveCache(cache);
  console.log(
    `  Complete: ${fetched} fetched successfully, ${errors} errors (will retry next run).`
  );
}

// ---------------------------------------------------------------------------
// Phase 3: Write CSV
// ---------------------------------------------------------------------------

function writeCsv(
  nodes: Record<string, [number, number]>,
  cache: Cache,
  dryRun: boolean
): void {
  const lines: string[] = ["latitude,longitude,operator,voice_outdoor"];

  let noPostcode = 0;
  let notFetched = 0;
  let totalEntries = 0;
  let coveredEntries = 0;

  for (const [nodeId, [lat, lon]] of Object.entries(nodes)) {
    const postcode = cache.nodePostcodes[nodeId];

    if (postcode === null || postcode === undefined) {
      noPostcode++;
      continue;
    }

    if (cache.postcodesCoverage[postcode] === undefined) {
      notFetched++;
      continue;
    }

    // null = 404 from Ofcom (no data for this postcode); treat as all uncovered
    const coverage = cache.postcodesCoverage[postcode] ?? {};

    for (const { name } of OPERATORS) {
      const covered = coverage[name] ?? false;
      lines.push(`${lat},${lon},${name},${covered ? 1 : 0}`);
      totalEntries++;
      if (covered) coveredEntries++;
    }
  }

  const pctCovered =
    totalEntries > 0
      ? ((coveredEntries / totalEntries) * 100).toFixed(1)
      : "0.0";

  console.log(
    `  ${totalEntries.toLocaleString()} entries (${OPERATORS.length} operators × nodes with data)`
  );
  console.log(
    `  Covered: ${coveredEntries.toLocaleString()} / ${totalEntries.toLocaleString()} operator-node pairs (${pctCovered}%)`
  );
  if (noPostcode > 0) {
    console.log(
      `  Skipped — no postcode found: ${noPostcode.toLocaleString()} nodes`
    );
  }
  if (notFetched > 0) {
    console.log(
      `  Skipped — Ofcom not yet fetched: ${notFetched.toLocaleString()} nodes (re-run to complete)`
    );
  }

  if (dryRun) {
    console.log("  DRY RUN: not writing coverage-grid.csv.");
    return;
  }

  fs.mkdirSync(CN_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_CSV_PATH, lines.join("\n") + "\n", "utf8");

  const sizeMB = (fs.statSync(OUTPUT_CSV_PATH).size / (1024 * 1024)).toFixed(
    1
  );
  console.log(`  Written: ${OUTPUT_CSV_PATH} (${sizeMB} MB)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvOnly = args.includes("--csv-only");

  console.log("=== P5-03a: Fetch Ofcom Connected Nations coverage ===");
  console.log(
    `Mode: ${csvOnly ? "CSV ONLY (skip API calls)" : dryRun ? "DRY RUN (no CSV written)" : "FULL"}`
  );
  console.log("");

  // --- API key ---
  const apiKey = loadApiKey();
  if (!apiKey && !csvOnly) {
    console.error(
      "OFCOM_CN_API_KEY not found in environment or .env.local."
    );
    console.error("Add it to .env.local:");
    console.error("  OFCOM_CN_API_KEY=<your key from api.ofcom.org.uk>");
    process.exit(1);
  }
  if (apiKey && !csvOnly) {
    console.log(
      `API key loaded: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars)`
    );
    console.log("");
  }

  // --- Ensure output directory exists ---
  fs.mkdirSync(CN_DIR, { recursive: true });

  // --- Load cache ---
  let cache: Cache = { nodePostcodes: {}, postcodesCoverage: {} };
  if (fs.existsSync(CACHE_PATH)) {
    console.log(`Loading cache from ${CACHE_PATH}...`);
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Cache;
    const geocodedCount = Object.keys(cache.nodePostcodes).length;
    const fetchedCount = Object.keys(cache.postcodesCoverage).length;
    console.log(
      `  ${geocodedCount} nodes geocoded, ${fetchedCount} postcodes fetched in cache.`
    );
    console.log("");
  }

  // --- Load track graph ---
  console.log("Loading track graph...");
  const graph: TrackGraph = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
  const nodeCount = Object.keys(graph.nodes).length;
  console.log(`  ${nodeCount.toLocaleString()} nodes`);
  console.log("");

  // --- Phase 1: Geocode ---
  if (!csvOnly) {
    console.log("Phase 1: Reverse-geocoding node locations → postcodes (postcodes.io)...");
    await geocodeAllNodes(graph.nodes, cache);
    console.log("");
  }

  // --- Phase 2: Ofcom API ---
  if (!csvOnly) {
    console.log("Phase 2: Fetching Ofcom coverage per postcode...");
    await fetchAllPostcodes(cache, apiKey);
    console.log("");
  }

  // --- Phase 3: Write CSV ---
  console.log("Phase 3: Writing coverage-grid.csv...");
  writeCsv(graph.nodes, cache, dryRun);

  console.log("");
  console.log("=== Done ===");

  if (!dryRun) {
    console.log("");
    console.log("Next step (merge into signal-segments.json):");
    console.log(
      "  npx tsx pipeline/p5-03-build-connected-nations.ts"
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
