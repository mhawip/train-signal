/**
 * Network Rail SCHEDULE timetable lookup (server-side only).
 *
 * Reads data/schedule-index.json (pre-built by pipeline/p1-02-build-schedule.ts)
 * to answer future-date journey queries. Returns Journey | null -- null if no
 * matching service found, or if the data file is missing.
 *
 * This module must never be imported from client components.
 */

// This module is server-side only. Never import from client components.

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import type { CallingPoint, DepartureSummary, Journey } from "@/app/lib/journey-types";

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/**
 * The on-disk format uses compact pipe-delimited strings to keep file size
 * under 20 MB for ~380k schedules.
 *
 * Schedule string: "uid|stp|startDate|endDate|daysRun|CRS/arr/dep CRS/arr/dep ..."
 * Cancellation string: "uid|startDate|endDate|daysRun"
 */

export interface ScheduleCall {
  c: string;   // CRS code
  a?: string;  // arrival "HH:MM" (absent for origin)
  d?: string;  // departure "HH:MM" (absent for terminus)
}

export interface ScheduleEntry {
  u: string;   // CIF_train_uid
  s: string;   // CIF_stp_indicator: "P", "O", or "N"
  f: string;   // schedule_start_date "YYYY-MM-DD"
  t: string;   // schedule_end_date "YYYY-MM-DD"
  w: string;   // schedule_days_runs "1111100" etc.
  p: ScheduleCall[];
}

export interface CancellationEntry {
  u: string;   // CIF_train_uid being cancelled
  f: string;   // cancel from date
  t: string;   // cancel to date
  w: string;   // days of week
}

export interface ScheduleIndex {
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

// ---------------------------------------------------------------------------
// Decoding helpers
// ---------------------------------------------------------------------------

/** Expand compact date "YYYYMMDD" to "YYYY-MM-DD". */
function expandDate(d: string): string {
  if (d.length === 8 && !d.includes("-")) {
    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
  }
  return d;
}

/** Expand compact time "HHMM" to "HH:MM". Returns empty string unchanged. */
function expandTime(t: string): string {
  if (t.length === 4 && !t.includes(":")) {
    return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
  }
  return t;
}

/**
 * Decode a compact schedule string into a ScheduleEntry.
 * @param encoded - The pipe-delimited schedule string
 * @param routes - The routes lookup table (CRS sequences)
 */
export function decodeSchedule(encoded: string, routes: string[]): ScheduleEntry {
  const parts = encoded.split("|");
  const routeIdx = parseInt(parts[5], 10);
  const timesStr = parts[6] ?? "";
  const crsCodes = routes[routeIdx].split(",");
  const timeParts = timesStr.split(" ");

  const calls: ScheduleCall[] = crsCodes.map((crs, i) => {
    const [a, d] = (timeParts[i] ?? "/").split("/");
    const call: ScheduleCall = { c: crs };
    if (a) call.a = expandTime(a);
    if (d) call.d = expandTime(d);
    return call;
  });

  return {
    u: parts[0],
    s: parts[1],
    f: expandDate(parts[2]),
    t: expandDate(parts[3]),
    w: parts[4],
    p: calls,
  };
}

/** Decode a compact cancellation string into a CancellationEntry. */
export function decodeCancellation(encoded: string): CancellationEntry {
  const parts = encoded.split("|");
  return {
    u: parts[0],
    f: expandDate(parts[1]),
    t: expandDate(parts[2]),
    w: parts[3],
  };
}

// ---------------------------------------------------------------------------
// Station name lookup
// ---------------------------------------------------------------------------

interface StationRecord {
  name: string;
  crs: string;
  tiploc: string;
  lat: number;
  lon: number;
}

let stationNameMap: Map<string, string> | null = null;

function getStationNameMap(): Map<string, string> {
  if (stationNameMap) return stationNameMap;
  try {
    const stationsPath = path.join(
      process.cwd(),
      "data",
      "stations.json",
    );
    const stations: StationRecord[] = JSON.parse(
      fs.readFileSync(stationsPath, "utf8"),
    );
    stationNameMap = new Map<string, string>();
    for (const s of stations) {
      if (s.crs) {
        stationNameMap.set(s.crs.toUpperCase(), s.name);
      }
    }
    return stationNameMap;
  } catch {
    stationNameMap = new Map();
    return stationNameMap;
  }
}

// ---------------------------------------------------------------------------
// Schedule data loader (lazy singleton)
// ---------------------------------------------------------------------------

let scheduleData: ScheduleIndex | null | undefined;

/**
 * Load and return the schedule index. Returns null if the file is missing
 * or unreadable. The data is cached after the first successful load.
 */
export function getScheduleData(): ScheduleIndex | null {
  if (scheduleData !== undefined) return scheduleData;
  try {
    // Try gzipped file first, fall back to plain JSON
    const gzPath = path.join(process.cwd(), "data", "schedule-index.json.gz");
    const jsonPath = path.join(process.cwd(), "data", "schedule-index.json");

    let raw: string;
    if (fs.existsSync(gzPath)) {
      const compressed = fs.readFileSync(gzPath);
      raw = zlib.gunzipSync(compressed).toString("utf8");
    } else if (fs.existsSync(jsonPath)) {
      raw = fs.readFileSync(jsonPath, "utf8");
    } else {
      scheduleData = null;
      return null;
    }

    scheduleData = JSON.parse(raw) as ScheduleIndex;
    return scheduleData;
  } catch {
    scheduleData = null;
    return null;
  }
}

/**
 * Reset the cached data. Exposed for testing so fixtures can be injected.
 */
export function _resetScheduleData(): void {
  scheduleData = undefined;
  stationNameMap = null;
}

/**
 * Inject schedule data directly. Exposed for testing.
 */
export function _setScheduleData(data: ScheduleIndex | null): void {
  scheduleData = data;
}

// ---------------------------------------------------------------------------
// Day-of-week helper
// ---------------------------------------------------------------------------

/**
 * Get the day-of-week index (0=Monday .. 6=Sunday) for an ISO date string.
 */
export function getDayIndex(date: string): number {
  const d = new Date(date + "T12:00:00Z"); // noon UTC to avoid DST edge cases
  // JS getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat
  const jsDay = d.getUTCDay();
  // Convert to 0=Mon, ..., 6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ---------------------------------------------------------------------------
// Time comparison
// ---------------------------------------------------------------------------

/**
 * Returns true if timeA >= timeB (both "HH:MM" strings).
 */
function isAtOrAfter(timeA: string, timeB: string): boolean {
  const [hA, mA] = timeA.split(":").map(Number);
  const [hB, mB] = timeB.split(":").map(Number);
  return hA > hB || (hA === hB && mA >= mB);
}

// ---------------------------------------------------------------------------
// STP priority
// ---------------------------------------------------------------------------

const STP_PRIORITY: Record<string, number> = {
  O: 3, // Overlay: highest
  N: 2, // New
  P: 1, // Permanent: lowest
};

function stpPriority(indicator: string): number {
  return STP_PRIORITY[indicator] ?? 0;
}

// ---------------------------------------------------------------------------
// Cancellation check
// ---------------------------------------------------------------------------

/**
 * Check if a schedule UID is cancelled on a given date.
 */
export function isCancelled(
  uid: string,
  date: string,
  dayIndex: number,
  cancellations: CancellationEntry[],
): boolean {
  for (const c of cancellations) {
    if (c.u !== uid) continue;
    if (date < c.f || date > c.t) continue;
    if (c.w[dayIndex] !== "1") continue;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find a scheduled service from `fromCrs` to `toCrs` on `date` at or after `time`.
 *
 * @param fromCrs  - Origin station CRS code (e.g. "LDS")
 * @param toCrs    - Destination station CRS code (e.g. "KGX")
 * @param date     - ISO date string "YYYY-MM-DD"
 * @param time     - Time string "HH:MM" -- picks first service at or after this time
 * @param network  - Mobile network (passed through to Journey)
 * @returns Journey with real calling points and times, or null
 */
export function findScheduledJourney(
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
  network: string,
): Journey | null {
  const data = getScheduleData();
  if (!data) return null;

  const fromUpper = fromCrs.toUpperCase();
  const toUpper = toCrs.toUpperCase();
  const dayIndex = getDayIndex(date);

  // Look up candidates by origin
  const indices = data.byOrigin[fromUpper];
  if (!indices || indices.length === 0) return null;

  // Decode cancellations once (lazily, only the ones we need)
  const decodedCancellations = data.cancellations.map(decodeCancellation);

  interface Match {
    schedule: ScheduleEntry;
    fromIdx: number;
    toIdx: number;
    depTime: string;
  }

  const matches: Match[] = [];

  for (const idx of indices) {
    const sched = decodeSchedule(data.schedules[idx], data.routes);

    // (a) Find fromCrs and toCrs in calling points; toCrs must be after fromCrs
    let fromIdx = -1;
    let toIdx = -1;
    for (let i = 0; i < sched.p.length; i++) {
      if (sched.p[i].c === fromUpper && fromIdx === -1) {
        fromIdx = i;
      }
      if (sched.p[i].c === toUpper && fromIdx !== -1) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) continue;

    // (b) Date within validity range
    if (date < sched.f || date > sched.t) continue;

    // (c) Day-of-week check
    if (sched.w[dayIndex] !== "1") continue;

    // (d) Cancellation check
    if (isCancelled(sched.u, date, dayIndex, decodedCancellations)) continue;

    // (e) Departure time at origin is at or after requested time
    const depTime = sched.p[fromIdx].d;
    if (!depTime) continue;
    if (!isAtOrAfter(depTime, time)) continue;

    matches.push({ schedule: sched, fromIdx, toIdx, depTime });
  }

  if (matches.length === 0) return null;

  // Resolve STP conflicts: group by UID, keep highest priority
  const byUid = new Map<string, Match[]>();
  for (const m of matches) {
    const uid = m.schedule.u;
    if (!byUid.has(uid)) byUid.set(uid, []);
    byUid.get(uid)!.push(m);
  }

  const resolved: Match[] = [];
  for (const group of byUid.values()) {
    if (group.length === 1) {
      resolved.push(group[0]);
    } else {
      // Pick highest STP priority
      group.sort((a, b) => stpPriority(b.schedule.s) - stpPriority(a.schedule.s));
      resolved.push(group[0]);
    }
  }

  // Sort by departure time, pick earliest
  resolved.sort((a, b) => {
    if (a.depTime < b.depTime) return -1;
    if (a.depTime > b.depTime) return 1;
    return 0;
  });

  const best = resolved[0];
  return buildJourney(best.schedule, best.fromIdx, best.toIdx, date, network);
}

// ---------------------------------------------------------------------------
// Departure list (multiple services for the selection page)
// ---------------------------------------------------------------------------

/**
 * Find up to 5 scheduled departures from `fromCrs` to `toCrs` on `date`
 * near `time`. Returns 1 service before the requested time (if available)
 * and up to 4 services at or after the requested time.
 *
 * @param fromCrs  - Origin station CRS code (e.g. "LDS")
 * @param toCrs    - Destination station CRS code (e.g. "KGX")
 * @param date     - ISO date string "YYYY-MM-DD"
 * @param time     - Time string "HH:MM"
 * @returns Array of DepartureSummary objects, may be empty
 */
export function findScheduledDepartures(
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
): DepartureSummary[] {
  const data = getScheduleData();
  if (!data) return [];

  const fromUpper = fromCrs.toUpperCase();
  const toUpper = toCrs.toUpperCase();
  const dayIndex = getDayIndex(date);
  const nameMap = getStationNameMap();

  // Look up candidates by origin
  const indices = data.byOrigin[fromUpper];
  if (!indices || indices.length === 0) return [];

  // Decode cancellations once
  const decodedCancellations = data.cancellations.map(decodeCancellation);

  interface CandidateMatch {
    depTime: string;
    arrTime: string;
    originName: string;
    destName: string;
    stpPriority: number;
    uid: string;
  }

  const allMatches: CandidateMatch[] = [];

  for (const idx of indices) {
    const sched = decodeSchedule(data.schedules[idx], data.routes);

    // Find fromCrs and toCrs in calling points; toCrs must be after fromCrs
    let fromIdx = -1;
    let toIdx = -1;
    for (let i = 0; i < sched.p.length; i++) {
      if (sched.p[i].c === fromUpper && fromIdx === -1) {
        fromIdx = i;
      }
      if (sched.p[i].c === toUpper && fromIdx !== -1) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) continue;

    // Date within validity range
    if (date < sched.f || date > sched.t) continue;

    // Day-of-week check
    if (sched.w[dayIndex] !== "1") continue;

    // Cancellation check
    if (isCancelled(sched.u, date, dayIndex, decodedCancellations)) continue;

    // Departure time at origin
    const depTime = sched.p[fromIdx].d;
    if (!depTime) continue;

    // Arrival time at destination
    const arrTime = sched.p[toIdx].a;
    if (!arrTime) continue;

    const originName = nameMap.get(fromUpper) ?? fromUpper;
    const destName = nameMap.get(toUpper) ?? toUpper;

    allMatches.push({
      depTime,
      arrTime,
      originName,
      destName,
      stpPriority: STP_PRIORITY[sched.s] ?? 0,
      uid: sched.u,
    });
  }

  if (allMatches.length === 0) return [];

  // Resolve STP conflicts: group by UID, keep highest priority
  const byUid = new Map<string, CandidateMatch[]>();
  for (const m of allMatches) {
    if (!byUid.has(m.uid)) byUid.set(m.uid, []);
    byUid.get(m.uid)!.push(m);
  }

  const resolved: CandidateMatch[] = [];
  for (const group of byUid.values()) {
    if (group.length === 1) {
      resolved.push(group[0]);
    } else {
      group.sort((a, b) => b.stpPriority - a.stpPriority);
      resolved.push(group[0]);
    }
  }

  // Sort by departure time
  resolved.sort((a, b) => {
    if (a.depTime < b.depTime) return -1;
    if (a.depTime > b.depTime) return 1;
    return 0;
  });

  // Split into before and at-or-after the requested time
  const before: CandidateMatch[] = [];
  const atOrAfter: CandidateMatch[] = [];

  for (const m of resolved) {
    if (isAtOrAfter(m.depTime, time)) {
      atOrAfter.push(m);
    } else {
      before.push(m);
    }
  }

  // Take the last service before the requested time (closest to it)
  const result: DepartureSummary[] = [];

  if (before.length > 0) {
    const closest = before[before.length - 1];
    result.push({
      departureTime: closest.depTime,
      arrivalTime: closest.arrTime,
      originName: closest.originName,
      destinationName: closest.destName,
    });
  }

  // Take up to 4 services at or after
  for (const m of atOrAfter.slice(0, 4)) {
    result.push({
      departureTime: m.depTime,
      arrivalTime: m.arrTime,
      originName: m.originName,
      destinationName: m.destName,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Route overview: typical stopping pattern
// ---------------------------------------------------------------------------

/**
 * Find the most common stopping pattern between two stations across
 * all services in the SCHEDULE data.
 *
 * "Stopping pattern" means the ordered list of CRS codes between
 * (and including) the origin and destination. The function counts how
 * often each pattern appears across all valid schedules and returns a
 * Journey built from the most frequent one. Times come from the first
 * matching schedule for that pattern (they are illustrative -- the
 * route-overview page uses leg durations, not clock times).
 *
 * The returned Journey has scheduledDeparture: null on the origin,
 * signalling to the UI that this is a route overview, not a specific
 * timetabled service.
 *
 * @returns Journey with null origin departure, or null if no route found
 */
export function findTypicalJourney(
  fromCrs: string,
  toCrs: string,
  network: string,
): Journey | null {
  const data = getScheduleData();
  if (!data) return null;

  const fromUpper = fromCrs.toUpperCase();
  const toUpper = toCrs.toUpperCase();

  const indices = data.byOrigin[fromUpper];
  if (!indices || indices.length === 0) return null;

  // Count stopping patterns: key is the comma-joined CRS codes
  // between origin and destination (inclusive). Track the first
  // schedule that produced each pattern so we can build a Journey.
  const patternCounts = new Map<string, number>();
  const patternFirstMatch = new Map<
    string,
    { schedule: ScheduleEntry; fromIdx: number; toIdx: number }
  >();

  for (const idx of indices) {
    const sched = decodeSchedule(data.schedules[idx], data.routes);

    // Find fromCrs and toCrs in calling points
    let fromIdx = -1;
    let toIdx = -1;
    for (let i = 0; i < sched.p.length; i++) {
      if (sched.p[i].c === fromUpper && fromIdx === -1) {
        fromIdx = i;
      }
      if (sched.p[i].c === toUpper && fromIdx !== -1) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) continue;

    // Build the pattern key from the CRS codes between origin and destination
    const patternCodes: string[] = [];
    for (let i = fromIdx; i <= toIdx; i++) {
      patternCodes.push(sched.p[i].c);
    }
    const key = patternCodes.join(",");

    patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
    if (!patternFirstMatch.has(key)) {
      patternFirstMatch.set(key, { schedule: sched, fromIdx, toIdx });
    }
  }

  if (patternCounts.size === 0) return null;

  // Find the most frequent pattern
  let bestKey = "";
  let bestCount = 0;
  for (const [key, count] of patternCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }

  const match = patternFirstMatch.get(bestKey)!;
  // Empty date signals route-overview mode to the UI. The calling
  // points retain their illustrative times for duration computation
  // (best-window algorithm, leg durations) but no clock times are
  // shown to the user.
  return buildJourney(
    match.schedule,
    match.fromIdx,
    match.toIdx,
    "",      // no specific date for route overview
    network,
  );
}

// ---------------------------------------------------------------------------
// Journey builder
// ---------------------------------------------------------------------------

function buildJourney(
  schedule: ScheduleEntry,
  fromIdx: number,
  toIdx: number,
  date: string,
  network: string,
): Journey {
  const nameMap = getStationNameMap();
  const callingPoints: CallingPoint[] = [];

  for (let i = fromIdx; i <= toIdx; i++) {
    const call = schedule.p[i];
    const name = nameMap.get(call.c) ?? call.c;
    callingPoints.push({
      crs: call.c,
      name,
      scheduledArrival: call.a ?? null,
      scheduledDeparture: call.d ?? null,
    });
  }

  return {
    origin: callingPoints[0],
    destination: callingPoints[callingPoints.length - 1],
    callingPoints,
    network,
    date,
  };
}
