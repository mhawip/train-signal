/**
 * URL search param serialisation/deserialisation for the journey form.
 *
 * The form state is encoded as URL search params so that:
 * - Results pages are bookmarkable and shareable
 * - The back button restores the form state
 * - Pre-filled URLs can be used as deep links
 *
 * Param names: from, to, date, time, network
 */

export const NETWORKS = ["EE", "O2", "Vodafone", "Three"] as const;
export type Network = (typeof NETWORKS)[number];

export interface JourneyParams {
  from: string;
  to: string;
  date: string;
  time: string;
  network: string;
}

/**
 * Read journey form values from URL search params.
 * Returns empty strings for missing params rather than undefined,
 * so the form fields always have controlled values.
 */
export function parseJourneyParams(
  searchParams: URLSearchParams
): JourneyParams {
  return {
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    date: searchParams.get("date") ?? "",
    time: searchParams.get("time") ?? "",
    network: searchParams.get("network") ?? "",
  };
}

/**
 * Encode journey form values as a URL search string.
 * Only includes non-empty values to keep URLs clean.
 *
 * @returns The search string including the leading "?"
 */
export function buildResultsUrl(params: JourneyParams): string {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.date) searchParams.set("date", params.date);
  if (params.time) searchParams.set("time", params.time);
  if (params.network) searchParams.set("network", params.network);

  return `/results?${searchParams.toString()}`;
}

/**
 * Get today's date as an ISO date string (YYYY-MM-DD).
 * Uses the local timezone, which is appropriate because train times
 * are in UK local time.
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the date 56 days from today as an ISO date string.
 * 56 days = 8 weeks, the limit of the SCHEDULE timetable horizon.
 */
export function getMaxDateISO(): string {
  const max = new Date();
  max.setDate(max.getDate() + 56);
  const year = max.getFullYear();
  const month = String(max.getMonth() + 1).padStart(2, "0");
  const day = String(max.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Encode journey form values as a URL for the departure selection page.
 * Same params as buildResultsUrl but points to /departures.
 *
 * @returns The URL string including the leading "?"
 */
export function buildDeparturesUrl(params: JourneyParams): string {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.date) searchParams.set("date", params.date);
  if (params.time) searchParams.set("time", params.time);
  if (params.network) searchParams.set("network", params.network);

  return `/departures?${searchParams.toString()}`;
}

/**
 * Encode origin, destination, and optional network as a URL for the
 * route-overview results page (no date/time).
 *
 * @returns The URL string e.g. "/results?from=LDS&to=KGX"
 */
export function buildRouteOverviewUrl(params: {
  from: string;
  to: string;
  network?: string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.network) searchParams.set("network", params.network);

  return `/results?${searchParams.toString()}`;
}

/**
 * Check whether a network value is one of the valid options.
 */
export function isValidNetwork(value: string): value is Network {
  return NETWORKS.includes(value as Network);
}
