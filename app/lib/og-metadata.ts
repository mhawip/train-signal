/**
 * Pure helper functions for building Open Graph metadata strings.
 *
 * Extracted from page-level generateMetadata so the logic can be
 * unit-tested without mocking Next.js internals. Every function here
 * is deterministic and side-effect-free.
 *
 * Character limits (hard, not soft):
 *   og:title       — 60 characters max
 *   og:description — 155 characters max
 *
 * Language constraints (specs/accessibility.md section 14):
 *   - "expected" or "likely" in every signal quality claim
 *   - No forbidden phrases (see FORBIDDEN_PHRASES)
 *   - No colour references
 *   - Plain English, Grade 6–8 reading level
 */

const OG_TITLE_MAX = 60;
const OG_DESC_MAX = 155;

// ---------------------------------------------------------------------------
// Title helpers
// ---------------------------------------------------------------------------

/**
 * Build an OG title, falling back to CRS codes if full station names
 * push it past 60 characters.
 *
 * @param fromName  Full station name (e.g. "Edinburgh Waverley")
 * @param toName    Full station name (e.g. "London Kings Cross")
 * @param fromCrs   CRS code (e.g. "EDB")
 * @param toCrs     CRS code (e.g. "KGX")
 * @param suffix    The suffix after station names (e.g. "signal — Train Signal")
 */
export function buildOgTitle(
  fromName: string,
  toName: string,
  fromCrs: string,
  toCrs: string,
  suffix: string,
): string {
  const fullTitle = `${fromName} to ${toName} ${suffix}`;
  if (fullTitle.length <= OG_TITLE_MAX) {
    return fullTitle;
  }
  // Fall back to CRS codes
  return `${fromCrs.toUpperCase()} to ${toCrs.toUpperCase()} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Results page OG description
// ---------------------------------------------------------------------------

/**
 * Format a duration in minutes as plain English.
 * Matches the formatDuration helper in JourneyTimeline.tsx.
 * "45 min", "1 hr 10 min", "2 hr".
 */
export function formatDurationOg(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainder} min`;
}

export interface BestWindowSummary {
  startStation: string;
  endStation: string;
  durationMinutes: number;
  /** "video" if the whole window is video-capable; "voice" if any segment is voice-only */
  quality: "video" | "voice";
}

/**
 * Template A: specific-train results with a best window.
 *
 * "Best window: [StartStation] to [EndStation], [duration]. Expected
 *  voice and video signal on [origin] to [destination], [date]."
 *
 * Truncated to 155 characters. If the full description exceeds the
 * limit, the date clause is dropped first, then station names in the
 * best-window clause are shortened.
 */
export function buildResultsDescriptionWithWindow(
  originName: string,
  destName: string,
  date: string,
  window: BestWindowSummary,
): string {
  const duration = formatDurationOg(window.durationMinutes);
  const qualityPhrase =
    window.quality === "video"
      ? "Expected voice and video signal"
      : "Expected voice signal";

  // Try full description first
  const full =
    `Best window: ${window.startStation} to ${window.endStation}, ${duration}. ` +
    `${qualityPhrase} on ${originName} to ${destName}, ${date}.`;

  if (full.length <= OG_DESC_MAX) {
    return full;
  }

  // Drop date clause
  const noDate =
    `Best window: ${window.startStation} to ${window.endStation}, ${duration}. ` +
    `${qualityPhrase} on ${originName} to ${destName}.`;

  if (noDate.length <= OG_DESC_MAX) {
    return noDate;
  }

  // Shouldn't normally happen, but safety net
  return noDate.slice(0, OG_DESC_MAX);
}

/**
 * Template B: specific-train results with no best window.
 *
 * "No clear window for a video call on this journey. Signal varies
 *  between [origin] and [destination], [date]."
 */
export function buildResultsDescriptionNoWindow(
  originName: string,
  destName: string,
  date: string,
): string {
  const full =
    `No clear window for a video call on this journey. ` +
    `Signal varies between ${originName} and ${destName}, ${date}.`;

  if (full.length <= OG_DESC_MAX) {
    return full;
  }

  // Drop date clause
  const noDate =
    `No clear window for a video call on this journey. ` +
    `Signal varies between ${originName} and ${destName}.`;

  if (noDate.length <= OG_DESC_MAX) {
    return noDate;
  }

  return noDate.slice(0, OG_DESC_MAX);
}

/**
 * Template C: route-overview mode (no date/time params).
 *
 * "Typical signal for [origin] to [destination]. Check when you are
 *  likely to have signal for a call on this route."
 */
export function buildRouteOverviewDescription(
  originName: string,
  destName: string,
): string {
  const full =
    `Typical signal for ${originName} to ${destName}. ` +
    `Check when you are likely to have signal for a call on this route.`;

  if (full.length <= OG_DESC_MAX) {
    return full;
  }

  // Shouldn't normally happen with reasonable station names
  return full.slice(0, OG_DESC_MAX);
}

// ---------------------------------------------------------------------------
// Departures page OG description
// ---------------------------------------------------------------------------

/**
 * Template D: departures page.
 *
 * "Choose a train from [origin] to [destination] on [date] to check
 *  your expected signal."
 */
export function buildDeparturesDescription(
  originName: string,
  destName: string,
  date: string,
): string {
  const full =
    `Choose a train from ${originName} to ${destName} on ${date} ` +
    `to check your expected signal.`;

  if (full.length <= OG_DESC_MAX) {
    return full;
  }

  // Drop date clause
  const noDate =
    `Choose a train from ${originName} to ${destName} ` +
    `to check your expected signal.`;

  if (noDate.length <= OG_DESC_MAX) {
    return noDate;
  }

  return noDate.slice(0, OG_DESC_MAX);
}
