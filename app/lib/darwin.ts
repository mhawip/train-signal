/**
 * Darwin Live Departure Board integration (server-side only).
 *
 * Calls the Rail Data Marketplace REST wrapper around Darwin LDBWS
 * to fetch real-time departure information for today's services.
 *
 * This module must never be imported from client components.
 * The API key is read from process.env.DARWIN_API_KEY at call time.
 */

import type { CallingPoint, DepartureSummary, Journey } from "@/app/lib/journey-types";
import { getTodayISO } from "@/app/lib/journey-params";

// ---------------------------------------------------------------------------
// Darwin response types (subset of the RDM JSON wrapper)
// ---------------------------------------------------------------------------

interface DarwinCallingPoint {
  crs: string;
  locationName: string;
  /** Scheduled time, "HH:MM" */
  st: string;
  /** Actual time, "HH:MM" or "On time" / "Delayed" / "Cancelled" etc. */
  at: string;
}

interface DarwinCallingPointList {
  callingPoint: DarwinCallingPoint[];
}

interface DarwinLocation {
  crs: string;
  locationName: string;
}

interface DarwinService {
  /** Scheduled departure time, "HH:MM" */
  std: string;
  /** Estimated departure time */
  etd: string;
  origin: {
    location: DarwinLocation[];
  };
  destination: {
    location: DarwinLocation[];
  };
  subsequentCallingPoints?: {
    callingPointList: DarwinCallingPointList[];
  };
}

interface DarwinBoardResult {
  locationName: string;
  crs: string;
  trainServices?: {
    service: DarwinService[];
  };
}

interface DarwinResponse {
  GetStationBoardResult: DarwinBoardResult;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DARWIN_BASE_URL =
  "https://api.raildata.org.uk/1010-live-departure-board-dep/LDBWS/api/20220120/GetDepBoardWithDetails";

/**
 * Fetch departure information from Darwin for a same-day journey.
 *
 * Returns null (without calling the API) if:
 * - The requested date is not today
 * - The API key is not configured
 * - The API returns an error or no matching services
 * - The response cannot be parsed into a valid Journey
 *
 * @param fromCrs - Origin station CRS code (e.g. "LDS")
 * @param toCrs - Destination station CRS code (e.g. "KGX")
 * @param date - ISO date string "YYYY-MM-DD"
 * @param time - Time string "HH:MM"
 * @param network - Mobile network name (passed through to Journey)
 * @returns A Journey object, or null if data is unavailable
 */
export async function fetchDepartures(
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
  network: string = "EE",
): Promise<Journey | null> {
  // Only query Darwin for today's services
  const today = getTodayISO();
  if (date !== today) {
    return null;
  }

  const apiKey = process.env.DARWIN_API_KEY;
  if (!apiKey) {
    console.warn("DARWIN_API_KEY is not configured; cannot fetch live data.");
    return null;
  }

  const url = new URL(DARWIN_BASE_URL);
  url.searchParams.set("numRows", "10");
  url.searchParams.set("crs", fromCrs.toUpperCase());
  url.searchParams.set("filterCrs", toCrs.toUpperCase());
  url.searchParams.set("filterType", "to");
  url.searchParams.set("timeWindow", "120");
  url.searchParams.set("accessToken", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
  } catch {
    console.error("Darwin API request failed (network error).");
    return null;
  }

  if (!response.ok) {
    console.error(
      `Darwin API returned status ${response.status}: ${response.statusText}`,
    );
    return null;
  }

  let data: DarwinResponse;
  try {
    data = (await response.json()) as DarwinResponse;
  } catch {
    console.error("Darwin API returned invalid JSON.");
    return null;
  }

  return parseDarwinResponse(data, fromCrs, toCrs, date, time, network);
}

// ---------------------------------------------------------------------------
// Response parsing (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Parse a Darwin API response into a Journey.
 *
 * Picks the first service departing at or after the requested time
 * whose subsequent calling points include the destination.
 */
export function parseDarwinResponse(
  data: DarwinResponse,
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
  network: string,
): Journey | null {
  const board = data?.GetStationBoardResult;
  if (!board) return null;

  const services = board.trainServices?.service;
  if (!services || services.length === 0) return null;

  const fromUpper = fromCrs.toUpperCase();
  const toUpper = toCrs.toUpperCase();

  // Find a service departing at or after the requested time
  const matchingService = findMatchingService(services, toUpper, time);
  if (!matchingService) return null;

  return serviceToJourney(matchingService, board, fromUpper, toUpper, date, network);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compare two "HH:MM" time strings.
 * Returns true if timeA >= timeB.
 */
function isAtOrAfter(timeA: string, timeB: string): boolean {
  const [hA, mA] = timeA.split(":").map(Number);
  const [hB, mB] = timeB.split(":").map(Number);
  return hA > hB || (hA === hB && mA >= mB);
}

/**
 * Find the first service that departs at or after `time` and calls at `toCrs`.
 */
function findMatchingService(
  services: DarwinService[],
  toCrs: string,
  time: string,
): DarwinService | null {
  for (const svc of services) {
    // Check departure time is at or after the requested time
    if (!isAtOrAfter(svc.std, time)) continue;

    // Check the service actually calls at the destination
    const callingPoints = getCallingPoints(svc);
    const callsAtDest = callingPoints.some(
      (cp) => cp.crs.toUpperCase() === toCrs,
    );
    if (!callsAtDest) continue;

    return svc;
  }

  return null;
}

/**
 * Extract the flat list of subsequent calling points from a service.
 */
function getCallingPoints(svc: DarwinService): DarwinCallingPoint[] {
  const lists = svc.subsequentCallingPoints?.callingPointList;
  if (!lists || lists.length === 0) return [];
  // Darwin can return multiple lists for split services;
  // we take the first list which is the main route.
  return lists[0].callingPoint ?? [];
}

// ---------------------------------------------------------------------------
// Departure list (multiple services for the selection page)
// ---------------------------------------------------------------------------

/**
 * Fetch up to 5 departure summaries from Darwin for a same-day journey.
 *
 * Returns 1 service before the requested time (if available) and up to 4
 * services at or after the requested time. Returns an empty array if
 * Darwin is unavailable or returns no matching services.
 *
 * @param fromCrs - Origin station CRS code (e.g. "LDS")
 * @param toCrs - Destination station CRS code (e.g. "KGX")
 * @param date - ISO date string "YYYY-MM-DD"
 * @param time - Time string "HH:MM"
 * @returns Array of DepartureSummary objects, may be empty
 */
export async function fetchDepartureList(
  fromCrs: string,
  toCrs: string,
  date: string,
  time: string,
): Promise<DepartureSummary[]> {
  // Only query Darwin for today's services
  const today = getTodayISO();
  if (date !== today) {
    return [];
  }

  const apiKey = process.env.DARWIN_API_KEY;
  if (!apiKey) {
    console.warn("DARWIN_API_KEY is not configured; cannot fetch live data.");
    return [];
  }

  const url = new URL(DARWIN_BASE_URL);
  url.searchParams.set("numRows", "10");
  url.searchParams.set("crs", fromCrs.toUpperCase());
  url.searchParams.set("filterCrs", toCrs.toUpperCase());
  url.searchParams.set("filterType", "to");
  url.searchParams.set("timeWindow", "120");
  url.searchParams.set("accessToken", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
  } catch {
    console.error("Darwin API request failed (network error).");
    return [];
  }

  if (!response.ok) {
    console.error(
      `Darwin API returned status ${response.status}: ${response.statusText}`,
    );
    return [];
  }

  let data: DarwinResponse;
  try {
    data = (await response.json()) as DarwinResponse;
  } catch {
    console.error("Darwin API returned invalid JSON.");
    return [];
  }

  return parseDarwinDepartureList(data, toCrs, time);
}

/**
 * Parse a Darwin API response into up to 5 DepartureSummary objects.
 *
 * Includes 1 service departing before the requested time (if available)
 * and up to 4 services departing at or after the requested time.
 *
 * Exported for testing.
 */
export function parseDarwinDepartureList(
  data: DarwinResponse,
  toCrs: string,
  time: string,
): DepartureSummary[] {
  const board = data?.GetStationBoardResult;
  if (!board) return [];

  const services = board.trainServices?.service;
  if (!services || services.length === 0) return [];

  const toUpper = toCrs.toUpperCase();

  // Collect all services that call at the destination
  const validServices: Array<{
    svc: DarwinService;
    depTime: string;
    arrTime: string;
    originName: string;
    destName: string;
  }> = [];

  for (const svc of services) {
    const callingPoints = getCallingPoints(svc);
    const destCp = callingPoints.find(
      (cp) => cp.crs.toUpperCase() === toUpper,
    );
    if (!destCp) continue;

    const originName =
      svc.origin?.location?.[0]?.locationName ?? board.locationName;
    const destName = destCp.locationName;

    validServices.push({
      svc,
      depTime: svc.std,
      arrTime: destCp.st,
      originName,
      destName,
    });
  }

  if (validServices.length === 0) return [];

  // Split into before and at-or-after the requested time
  const before: typeof validServices = [];
  const atOrAfter: typeof validServices = [];

  for (const vs of validServices) {
    if (isAtOrAfter(vs.depTime, time)) {
      atOrAfter.push(vs);
    } else {
      before.push(vs);
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

  // Take up to 4 services at or after the requested time
  for (const vs of atOrAfter.slice(0, 4)) {
    result.push({
      departureTime: vs.depTime,
      arrivalTime: vs.arrTime,
      originName: vs.originName,
      destinationName: vs.destName,
    });
  }

  return result;
}

/**
 * Convert a Darwin service into our Journey type.
 */
function serviceToJourney(
  svc: DarwinService,
  board: DarwinBoardResult,
  fromCrs: string,
  toCrs: string,
  date: string,
  network: string,
): Journey | null {
  const darwinCallingPoints = getCallingPoints(svc);

  // Build the origin calling point from the board + service data
  const origin: CallingPoint = {
    crs: fromCrs,
    name: board.locationName,
    scheduledArrival: null,
    scheduledDeparture: svc.std,
  };

  // Find destination in calling points
  const destIndex = darwinCallingPoints.findIndex(
    (cp) => cp.crs.toUpperCase() === toCrs,
  );
  if (destIndex === -1) return null;

  const destCp = darwinCallingPoints[destIndex];
  const destination: CallingPoint = {
    crs: destCp.crs,
    name: destCp.locationName,
    scheduledArrival: destCp.st,
    scheduledDeparture: null,
  };

  // Build intermediate calling points (between origin and destination)
  const intermediates: CallingPoint[] = darwinCallingPoints
    .slice(0, destIndex)
    .map((cp) => ({
      crs: cp.crs,
      name: cp.locationName,
      scheduledArrival: cp.st,
      scheduledDeparture: cp.st, // Darwin only gives one time for intermediate stops
    }));

  const callingPoints: CallingPoint[] = [origin, ...intermediates, destination];

  return {
    origin,
    destination,
    callingPoints,
    network,
    date,
  };
}
