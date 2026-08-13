/**
 * P1-02: Build SCHEDULE index from Network Rail CIF feed
 *
 * Downloads the NR SCHEDULE CIF JSON feed (full timetable), parses it line by
 * line, filters to passenger services with known station CRS codes, and emits
 * data/schedule-index.json -- a compact derived dataset for server-side journey
 * lookup up to 8 weeks ahead.
 *
 * Refresh strategy:
 *   Re-run this script weekly to pick up timetable updates.
 *   The NR SCHEDULE feed is refreshed each day at approximately 02:00 UK time.
 *   A GitHub Actions workflow (to be added as DW-08) will run this on a weekly
 *   schedule and commit any changes to data/schedule-index.json.
 *
 *   To run manually:
 *     NR_FEEDS_USER=<user> NR_FEEDS_PASS=<pass> npx tsx pipeline/p1-02-build-schedule.ts
 *
 *   Options:
 *     --dry-run   Download and parse but do not write output (for fast validation)
 *     --offline   Skip download; use data/raw/cif-full.jsonl.gz if it exists
 *
 * Source: https://datafeeds.networkrail.co.uk/ntrod/CifFileAuthenticate
 * Licence: OGL 2.0 with NRE amendments
 * Downloaded GZ saved to data/raw/cif-full.jsonl.gz (gitignored) so --offline works.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";
import * as https from "https";
import * as http from "http";

// ---------------------------------------------------------------------------
// Types for CIF JSON structures
// ---------------------------------------------------------------------------

interface CifScheduleLocation {
  location_type: string;
  tiploc_code: string;
  public_arrival: string;
  public_departure: string;
}

interface CifScheduleSegment {
  CIF_train_category?: string;
  schedule_location?: CifScheduleLocation[];
}

interface CifScheduleV1 {
  CIF_train_uid: string;
  transaction_type: string;
  schedule_start_date: string;
  schedule_end_date: string;
  CIF_stp_indicator: string;
  schedule_days_runs: string;
  applicable_timetable: string;
  atoc_code?: string;
  schedule_segment?: CifScheduleSegment;
}

interface CifJsonLine {
  JsonScheduleV1?: CifScheduleV1;
  JsonTimetableV1?: unknown;
  JsonScheduleDeleteV1?: unknown;
  JsonAssociationV1?: unknown;
  EOF?: boolean;
}

// ---------------------------------------------------------------------------
// Output types — compact string encoding
// ---------------------------------------------------------------------------
//
// Each schedule is encoded as a single pipe-delimited string:
//   "uid|stp|YYYYMMDD|YYYYMMDD|daysRun|CRS/HHMM/HHMM CRS/HHMM/HHMM ..."
//
// Each calling point is "CRS/arrival/departure" where arrival or departure
// may be empty (e.g. "LDS//1412" for origin, "KGX/1627/" for terminus).
// Times omit colons; dates omit dashes for compactness.
//
// Each cancellation is encoded as: "uid|YYYYMMDD|YYYYMMDD|daysRun"
//
// Only schedules whose date range overlaps the current 8-week window are
// included. The pipeline must be re-run weekly to keep the window current.
//
// This encoding eliminates repeated JSON key names across ~2M calling points,
// keeping file size under 20MB.

// Internal types used during building (before encoding to strings)
interface ScheduleCallInternal {
  c: string;
  a?: string;
  d?: string;
}

interface ScheduleEntryInternal {
  u: string;
  s: string;
  f: string;
  t: string;
  w: string;
  p: ScheduleCallInternal[];
}

interface CancellationEntryInternal {
  u: string;
  f: string;
  t: string;
  w: string;
}

interface ScheduleIndex {
  generated: string;
  scheduleCount: number;
  /** Unique CRS-code sequences, e.g. ["LDS,WKF,KGX", ...] */
  routes: string[];
  /** Schedules: "uid|stp|YYYYMMDD|YYYYMMDD|daysRun|routeIdx|/dep arr/dep arr/" */
  schedules: string[];
  /** Cancellations: "uid|YYYYMMDD|YYYYMMDD|daysRun" */
  cancellations: string[];
  /** Origin CRS -> indices into schedules[] */
  byOrigin: Record<string, number[]>;
}

/** Strip dashes from an ISO date: "2026-08-01" -> "20260801" */
function compactDate(d: string): string {
  return d.replace(/-/g, "");
}

/** Strip colon from a time: "14:12" -> "1412". Empty/undefined pass through. */
function compactTime(t: string | undefined): string {
  if (!t) return "";
  return t.replace(":", "");
}

/**
 * Build the routes table and encode schedules.
 * Returns { routes, encodedSchedules }.
 */
function encodeSchedules(
  entries: ScheduleEntryInternal[],
): { routes: string[]; encodedSchedules: string[] } {
  // Build route lookup: CRS sequence string -> index
  const routeToIdx = new Map<string, number>();
  const routes: string[] = [];

  function getRouteIdx(entry: ScheduleEntryInternal): number {
    const key = entry.p.map((c) => c.c).join(",");
    let idx = routeToIdx.get(key);
    if (idx === undefined) {
      idx = routes.length;
      routeToIdx.set(key, idx);
      routes.push(key);
    }
    return idx;
  }

  const encodedSchedules = entries.map((entry) => {
    const routeIdx = getRouteIdx(entry);
    // Times only: "arr/dep" for each stop, space-separated
    const times = entry.p.map(
      (c) => `${compactTime(c.a)}/${compactTime(c.d)}`,
    ).join(" ");
    return `${entry.u}|${entry.s}|${compactDate(entry.f)}|${compactDate(entry.t)}|${entry.w}|${routeIdx}|${times}`;
  });

  return { routes, encodedSchedules };
}

/** Encode a cancellation entry as a compact pipe-delimited string. */
function encodeCancellation(entry: CancellationEntryInternal): string {
  return `${entry.u}|${compactDate(entry.f)}|${compactDate(entry.t)}|${entry.w}`;
}

// ---------------------------------------------------------------------------
// Station data types
// ---------------------------------------------------------------------------

interface StationRecord {
  name: string;
  crs: string;
  tiploc: string;
  lat: number;
  lon: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHEDULE_URL =
  "https://datafeeds.networkrail.co.uk/ntrod/CifFileAuthenticate?type=CIF_ALL_FULL_DAILY&day=toc-full";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const OUTPUT_PATH = path.join(DATA_DIR, "schedule-index.json.gz");
const STATIONS_PATH = path.join(DATA_DIR, "stations.json");
const GZ_PATH = path.join(RAW_DIR, "cif-full.jsonl.gz");

/** Passenger train categories to include */
const PASSENGER_CATEGORIES = new Set([
  "OO", "OW", "XC", "XD", "XX", "XZ", "BR", "BS",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert CIF time "HHMM" to display time "HH:MM".
 * Returns undefined for empty strings.
 */
function cifTimeToDisplay(t: string): string | undefined {
  if (!t || t.trim() === "") return undefined;
  const clean = t.trim();
  if (clean.length < 4) return undefined;
  return `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
}

/**
 * Build a TIPLOC -> CRS lookup map from stations.json.
 */
function buildTiplocMap(stationsPath: string): Map<string, string> {
  const stations: StationRecord[] = JSON.parse(
    fs.readFileSync(stationsPath, "utf8"),
  );
  const map = new Map<string, string>();
  for (const s of stations) {
    if (s.tiploc && s.crs) {
      map.set(s.tiploc.toUpperCase(), s.crs.toUpperCase());
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Download helper (follows redirects, supports Basic Auth)
// ---------------------------------------------------------------------------

function downloadWithAuth(
  url: string,
  dest: string,
  username: string,
  password: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} ...`);
    console.log(`Destination: ${dest}`);

    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const doRequest = (reqUrl: string, includeAuth: boolean) => {
      const parsed = new URL(reqUrl);
      const proto = parsed.protocol === "https:" ? https : http;
      const headers: Record<string, string> = {};
      if (includeAuth) {
        headers["Authorization"] = `Basic ${auth}`;
      }
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers,
      };

      const request = proto.request(options, (response) => {
        // Handle redirects (NR feed redirects to S3 or similar)
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          console.log(`  Redirect ${response.statusCode} -> ${response.headers.location}`);
          // Strip auth when redirecting to a different host (e.g. S3 presigned URL)
          const redirectUrl = new URL(response.headers.location);
          const sameHost = redirectUrl.hostname === parsed.hostname;
          doRequest(response.headers.location, sameHost && includeAuth);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(
            new Error(`Download failed: HTTP ${response.statusCode}`),
          );
          return;
        }

        let downloaded = 0;
        let lastReport = 0;

        response.on("data", (chunk: Buffer) => {
          downloaded += chunk.length;
          if (downloaded - lastReport > 10e6) {
            console.log(
              `  ${(downloaded / 1e6).toFixed(0)} MB downloaded...`,
            );
            lastReport = downloaded;
          }
        });

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(
            `Download complete: ${(downloaded / 1e6).toFixed(1)} MB`,
          );
          resolve();
        });
      });

      request.on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });

      request.end();
    };

    doRequest(url, true);
  });
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const offline = args.includes("--offline");

  console.log("=== P1-02: Build schedule index ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "FULL"}${offline ? " (OFFLINE)" : ""}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log("");

  // --- Download if needed ---
  if (!offline) {
    const user = process.env.NR_FEEDS_USER;
    const pass = process.env.NR_FEEDS_PASS;
    if (!user || !pass) {
      console.error(
        "NR_FEEDS_USER and NR_FEEDS_PASS must be set. Use --offline to skip download.",
      );
      process.exit(1);
    }

    try {
      await downloadWithAuth(SCHEDULE_URL, GZ_PATH, user, pass);
    } catch (err) {
      console.error(`Download failed: ${err}`);
      if (fs.existsSync(GZ_PATH)) {
        console.log("Using previously downloaded file.");
      } else {
        console.error("No cached file available. Exiting.");
        process.exit(1);
      }
    }
  } else {
    if (!fs.existsSync(GZ_PATH)) {
      console.error(`Offline mode but ${GZ_PATH} does not exist.`);
      process.exit(1);
    }
    console.log(`Using cached file: ${GZ_PATH}`);
  }

  // --- Load TIPLOC map ---
  console.log("Loading station TIPLOC map...");
  const tiplocMap = buildTiplocMap(STATIONS_PATH);
  console.log(`  ${tiplocMap.size} TIPLOC -> CRS mappings`);

  // --- Stream and parse CIF JSONL ---
  console.log("Streaming CIF JSONL (gzip-compressed)...");

  const schedules: ScheduleEntryInternal[] = [];
  const cancellations: CancellationEntryInternal[] = [];

  let totalLines = 0;
  let jsonScheduleLines = 0;
  let passengerFiltered = 0;
  let tiplocFiltered = 0;
  let cancellationCount = 0;
  let skippedOther = 0;

  const rawStream = fs.createReadStream(GZ_PATH);
  const gunzipStream = zlib.createGunzip();
  const rl = readline.createInterface({
    input: rawStream.pipe(gunzipStream),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    totalLines++;

    if (totalLines % 100_000 === 0) {
      console.log(`  ${(totalLines / 1000).toFixed(0)}k lines processed...`);
    }

    if (!line.trim()) continue;

    let record: CifJsonLine;
    try {
      record = JSON.parse(line) as CifJsonLine;
    } catch {
      continue; // Skip unparseable lines
    }

    // We only care about JsonScheduleV1
    if (!record.JsonScheduleV1) {
      skippedOther++;
      continue;
    }

    jsonScheduleLines++;
    const sched = record.JsonScheduleV1;

    // Handle cancellations separately
    if (sched.CIF_stp_indicator === "C") {
      cancellationCount++;
      cancellations.push({
        u: sched.CIF_train_uid,
        f: sched.schedule_start_date,
        t: sched.schedule_end_date,
        w: sched.schedule_days_runs,
      });
      continue;
    }

    // Filter: public timetable only
    if (sched.applicable_timetable !== "Y") {
      continue;
    }

    // Filter: passenger categories only
    const category = sched.schedule_segment?.CIF_train_category;
    if (!category || !PASSENGER_CATEGORIES.has(category)) {
      passengerFiltered++;
      continue;
    }

    // Build calling points from schedule_location
    const locations = sched.schedule_segment?.schedule_location;
    if (!locations || locations.length === 0) continue;

    const callingPoints: ScheduleCallInternal[] = [];
    for (const loc of locations) {
      const pubArr = loc.public_arrival?.trim() ?? "";
      const pubDep = loc.public_departure?.trim() ?? "";

      // Skip pass-through points (no public arrival AND no public departure)
      if (pubArr === "" && pubDep === "") continue;

      // Map TIPLOC to CRS
      const crs = tiplocMap.get(loc.tiploc_code.toUpperCase());
      if (!crs) continue;

      const call: ScheduleCallInternal = { c: crs };
      const arrDisplay = cifTimeToDisplay(pubArr);
      const depDisplay = cifTimeToDisplay(pubDep);
      if (arrDisplay) call.a = arrDisplay;
      if (depDisplay) call.d = depDisplay;

      callingPoints.push(call);
    }

    // Must have at least 2 public stopping points
    if (callingPoints.length < 2) {
      tiplocFiltered++;
      continue;
    }

    schedules.push({
      u: sched.CIF_train_uid,
      s: sched.CIF_stp_indicator,
      f: sched.schedule_start_date,
      t: sched.schedule_end_date,
      w: sched.schedule_days_runs,
      p: callingPoints,
    });
  }

  // --- Log counts ---
  console.log("");
  console.log("=== Row counts (before window filter) ===");
  console.log(`  Total lines:              ${totalLines.toLocaleString()}`);
  console.log(`  JsonScheduleV1 records:   ${jsonScheduleLines.toLocaleString()}`);
  console.log(`  Non-schedule records:     ${skippedOther.toLocaleString()}`);
  console.log(`  Non-passenger filtered:   ${passengerFiltered.toLocaleString()}`);
  console.log(`  Insufficient CRS stops:   ${tiplocFiltered.toLocaleString()}`);
  console.log(`  Cancellation records:     ${cancellationCount.toLocaleString()}`);
  console.log(`  Schedules (all dates):    ${schedules.length.toLocaleString()}`);

  // --- Filter to 8-week window ---
  // Only keep schedules whose date range overlaps today through 8 weeks ahead.
  // This is the key size reduction: ~382k schedules -> ~182k.
  const today = new Date();
  const todayISO = today.toISOString().substring(0, 10);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 56);
  const maxDateISO = maxDate.toISOString().substring(0, 10);

  console.log("");
  console.log(`Filtering to 8-week window: ${todayISO} to ${maxDateISO}`);
  const preFilterCount = schedules.length;
  const preFilterCancCount = cancellations.length;

  const filteredSchedules = schedules.filter(
    (s) => s.t >= todayISO && s.f <= maxDateISO,
  );
  const filteredCancellations = cancellations.filter(
    (c) => c.t >= todayISO && c.f <= maxDateISO,
  );

  console.log(`  Schedules:     ${preFilterCount.toLocaleString()} -> ${filteredSchedules.toLocaleString().length > 0 ? filteredSchedules.length.toLocaleString() : "0"}`);
  console.log(`  Cancellations: ${preFilterCancCount.toLocaleString()} -> ${filteredCancellations.length.toLocaleString()}`);

  // --- Deterministic sort: uid, then start date, then stp ---
  console.log("");
  console.log("Sorting deterministically...");
  filteredSchedules.sort((a, b) => {
    const uidCmp = a.u.localeCompare(b.u);
    if (uidCmp !== 0) return uidCmp;
    const dateCmp = a.f.localeCompare(b.f);
    if (dateCmp !== 0) return dateCmp;
    return a.s.localeCompare(b.s);
  });

  filteredCancellations.sort((a, b) => {
    const uidCmp = a.u.localeCompare(b.u);
    if (uidCmp !== 0) return uidCmp;
    return a.f.localeCompare(b.f);
  });

  // --- Encode schedules and cancellations to compact strings ---
  console.log("Encoding to compact string format...");
  const { routes, encodedSchedules } = encodeSchedules(filteredSchedules);
  const encodedCancellations = filteredCancellations.map(encodeCancellation);
  console.log(`  ${routes.length.toLocaleString()} unique route patterns`);

  // --- Build byOrigin index ---
  // We need to extract the origin CRS from the encoded string.
  // The calling points are after the 5th pipe: "uid|stp|f|t|w|CRS/a/d ..."
  // The first CRS is the first 3 chars of the calls section.
  console.log("Building origin index...");
  const byOrigin: Record<string, number[]> = {};
  for (let i = 0; i < filteredSchedules.length; i++) {
    const originCrs = filteredSchedules[i].p[0].c;
    if (!byOrigin[originCrs]) byOrigin[originCrs] = [];
    byOrigin[originCrs].push(i);
  }

  // Sort the byOrigin keys for deterministic output
  const sortedByOrigin: Record<string, number[]> = {};
  for (const key of Object.keys(byOrigin).sort()) {
    sortedByOrigin[key] = byOrigin[key];
  }

  const uniqueOrigins = Object.keys(sortedByOrigin).length;
  console.log(`  ${uniqueOrigins} unique origin stations`);

  // --- Build output ---
  const output: ScheduleIndex = {
    generated: new Date().toISOString(),
    scheduleCount: encodedSchedules.length,
    routes,
    schedules: encodedSchedules,
    cancellations: encodedCancellations,
    byOrigin: sortedByOrigin,
  };

  // --- Write ---
  if (dryRun) {
    console.log("");
    console.log("DRY RUN: not writing output file.");
    console.log(`Would write ${filteredSchedules.length} schedules, ${filteredCancellations.length} cancellations.`);
  } else {
    console.log("");
    console.log(`Writing ${OUTPUT_PATH}...`);
    const jsonBytes = Buffer.from(JSON.stringify(output), "utf8");
    const compressed = zlib.gzipSync(jsonBytes, { level: 9 });
    fs.writeFileSync(OUTPUT_PATH, compressed);

    const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / 1e6).toFixed(1);
    const uncompressedMB = (jsonBytes.length / 1e6).toFixed(1);
    console.log(`  Uncompressed: ${uncompressedMB} MB`);
    console.log(`  Compressed:   ${fileSizeMB} MB`);
    console.log(`  File size: ${fileSizeMB} MB`);
    console.log(`  Schedules: ${filteredSchedules.length.toLocaleString()}`);
    console.log(`  Cancellations: ${filteredCancellations.length.toLocaleString()}`);
    console.log(`  Origins: ${uniqueOrigins}`);
  }

  console.log("");
  console.log("=== Done ===");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const isCLI =
  (typeof require !== "undefined" && require.main === module) ||
  (process.argv[1] &&
    process.argv[1].replace(/\\/g, "/").includes("p1-02-build-schedule") &&
    !process.argv[1].includes("vitest") &&
    !process.argv[1].includes("jest"));

if (isCLI) {
  main().catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
