/**
 * pipeline/build-stations.ts
 *
 * Builds data/stations.json from two open-data sources:
 *
 * 1. davwheat/uk-railway-stations (ODbL 1.0)
 *    - CRS codes, station names, lat/lon for all GB passenger stations
 *    - Source: https://github.com/davwheat/uk-railway-stations
 *
 * 2. NaPTAN — National Public Transport Access Nodes (OGL v3.0)
 *    - TIPLOC codes derived from ATCOCode (strip "9100" prefix)
 *    - Source: https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv
 *
 * Re-runnable: produces byte-identical output for identical inputs.
 * Run: npx ts-node pipeline/build-stations.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DavwheatStation {
  stationName: string;
  lat: number;
  long: number;
  crsCode: string;
  constituentCountry: string;
}

interface OutputStation {
  name: string;
  crs: string;
  tiploc: string | null;
  lat: number;
  lon: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const OUT_FILE = path.join(ROOT, "data", "stations.json");

const DAVWHEAT_URL =
  "https://raw.githubusercontent.com/davwheat/uk-railway-stations/main/stations.json";
const NAPTAN_URL =
  "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv";

const DAVWHEAT_RAW = path.join(RAW_DIR, "davwheat-stations.json");
const NAPTAN_RAW = path.join(RAW_DIR, "naptan.csv");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (reqUrl: string): void => {
      https
        .get(reqUrl, (res) => {
          // Follow redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", reject);
    };
    request(url);
  });
}

/**
 * Normalise a station name for fuzzy matching:
 * - lowercase
 * - strip " Rail Station", " Railway Station" suffix
 * - strip parenthetical region hints
 * - collapse whitespace
 */
function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+rail(way)?\s+station$/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Haversine distance in km between two lat/lon points.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// NaPTAN CSV streaming parser — extract RLY entries
// ---------------------------------------------------------------------------

interface NaptanStation {
  tiploc: string;
  name: string;
  lat: number;
  lon: number;
}

async function parseNaptanRly(csvPath: string): Promise<NaptanStation[]> {
  const stations: NaptanStation[] = [];
  const stream = fs.createReadStream(csvPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;

  for await (const line of rl) {
    if (!headers) {
      headers = line.split(",");
      continue;
    }

    const fields = line.split(",");
    const stopTypeIdx = headers.indexOf("StopType");
    const statusIdx = headers.indexOf("Status");
    const atcoIdx = headers.indexOf("ATCOCode");
    const nameIdx = headers.indexOf("CommonName");
    const latIdx = headers.indexOf("Latitude");
    const lonIdx = headers.indexOf("Longitude");

    if (
      fields[stopTypeIdx] !== "RLY" ||
      fields[statusIdx] !== "active"
    ) {
      continue;
    }

    const atco = fields[atcoIdx];
    if (!atco.startsWith("9100")) continue;

    const tiploc = atco.slice(4); // Strip "9100" prefix
    const lat = parseFloat(fields[latIdx]);
    const lon = parseFloat(fields[lonIdx]);

    if (isNaN(lat) || isNaN(lon)) continue;

    stations.push({
      tiploc,
      name: fields[nameIdx],
      lat,
      lon,
    });
  }

  return stations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  // Step 1: Download sources if not already present
  if (!fs.existsSync(DAVWHEAT_RAW)) {
    console.log("Downloading davwheat station data...");
    await download(DAVWHEAT_URL, DAVWHEAT_RAW);
    console.log("  Done.");
  } else {
    console.log("Using cached davwheat station data.");
  }

  if (!fs.existsSync(NAPTAN_RAW)) {
    console.log("Downloading NaPTAN data (this may take a minute)...");
    await download(NAPTAN_URL, NAPTAN_RAW);
    console.log("  Done.");
  } else {
    console.log("Using cached NaPTAN data.");
  }

  // Step 2: Load davwheat stations
  const davwheat: DavwheatStation[] = JSON.parse(
    fs.readFileSync(DAVWHEAT_RAW, "utf-8"),
  );
  console.log(`Loaded ${davwheat.length} stations from davwheat dataset.`);

  // Filter to GB only (england, scotland, wales — exclude any NI if present)
  const gbStations = davwheat.filter((s) =>
    ["england", "scotland", "wales"].includes(s.constituentCountry),
  );
  console.log(`  ${gbStations.length} GB stations after country filter.`);

  // Step 3: Parse NaPTAN for TIPLOC mapping
  console.log("Parsing NaPTAN for TIPLOC codes...");
  const naptanStations = await parseNaptanRly(NAPTAN_RAW);
  console.log(`  ${naptanStations.length} active RLY entries in NaPTAN.`);

  // Build lookup by normalised name, and also by coordinates
  const naptanByName = new Map<string, NaptanStation[]>();
  for (const ns of naptanStations) {
    const key = normaliseName(ns.name);
    const existing = naptanByName.get(key) ?? [];
    existing.push(ns);
    naptanByName.set(key, existing);
  }

  // Step 4: Match TIPLOCs to davwheat stations
  let matched = 0;
  let unmatched = 0;

  const output: OutputStation[] = gbStations.map((s) => {
    // Try name match first
    const normalised = normaliseName(s.stationName);
    const candidates = naptanByName.get(normalised);

    let tiploc: string | null = null;

    if (candidates && candidates.length === 1) {
      tiploc = candidates[0].tiploc;
      matched++;
    } else if (candidates && candidates.length > 1) {
      // Multiple name matches — pick the closest by distance
      let best: NaptanStation | null = null;
      let bestDist = Infinity;
      for (const c of candidates) {
        const d = haversineKm(s.lat, s.long, c.lat, c.lon);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (best && bestDist < 5) {
        tiploc = best.tiploc;
        matched++;
      } else {
        unmatched++;
      }
    } else {
      // No name match — try coordinate proximity (within 1 km)
      let best: NaptanStation | null = null;
      let bestDist = Infinity;
      for (const ns of naptanStations) {
        const d = haversineKm(s.lat, s.long, ns.lat, ns.lon);
        if (d < bestDist) {
          bestDist = d;
          best = ns;
        }
      }
      if (best && bestDist < 1) {
        tiploc = best.tiploc;
        matched++;
      } else {
        unmatched++;
      }
    }

    return {
      name: s.stationName,
      crs: s.crsCode,
      tiploc,
      lat: roundCoord(s.lat),
      lon: roundCoord(s.long),
    };
  });

  console.log(
    `TIPLOC matching: ${matched} matched, ${unmatched} unmatched out of ${output.length}.`,
  );

  // Step 5: Sort deterministically by name, then CRS for ties
  output.sort((a, b) => a.name.localeCompare(b.name) || a.crs.localeCompare(b.crs));

  // Step 6: Write output
  const json = JSON.stringify(output, null, 2) + "\n";
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, json, "utf-8");

  const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`\nWrote ${output.length} stations to ${OUT_FILE}`);
  console.log(`  File size: ${sizeKb} KB`);

  // Sanity checks
  if (output.length < 2400) {
    console.warn(
      `WARNING: Only ${output.length} stations — expected ~2,500+. Check the source data.`,
    );
  }
  if (parseFloat(sizeKb) > 500) {
    console.warn(
      `WARNING: File is ${sizeKb} KB — target is under 500 KB.`,
    );
  }
}

/**
 * Round a coordinate to 6 decimal places (sub-metre precision,
 * sufficient for our purposes and keeps file size down).
 */
function roundCoord(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
