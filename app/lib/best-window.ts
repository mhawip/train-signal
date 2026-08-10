/**
 * Best-window algorithm: find the longest continuous stretch of usable
 * signal on a journey, with clock times and quality classification.
 *
 * A segment is "usable" if its band is "video" or "voice" -- not
 * "none", "no-data", or "unknown". The algorithm finds all maximal
 * consecutive runs of usable segments, picks the longest by duration,
 * and returns it with start/end times, quality, and confidence.
 *
 * This is a pure function with no side effects. It imports only types
 * and the elapsedMinutes helper (already tested in JourneyTimeline).
 */

import type { Journey } from "@/app/lib/journey-types";
import type { SegmentSignal } from "@/app/lib/signal";
import { elapsedMinutes } from "@/app/components/JourneyTimeline";

export interface BestWindow {
  /** Clock time "HH:MM" when the window starts */
  startTime: string;
  /** Clock time "HH:MM" when the window ends */
  endTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** "video" if the whole window is video-capable; "voice" if any segment is voice-only */
  quality: "video" | "voice";
  /** "low" if any segment in the window has low or no-data confidence */
  confidence: "high" | "low";
  /** Station name where the window begins */
  startStation: string;
  /** Station name where the window ends */
  endStation: string;
}

/**
 * Whether a segment's band counts as usable for a call.
 * Only "video" and "voice" are usable -- "none", "no-data", and
 * "unknown" all break a run.
 */
function isUsable(signal: SegmentSignal): boolean {
  return signal.band === "video" || signal.band === "voice";
}

/**
 * Find the best window of usable signal on a journey.
 *
 * Returns null if no usable run exists, or if every candidate run
 * has missing times (scheduledDeparture/scheduledArrival is null).
 */
export function findBestWindow(
  journey: Journey,
  signalProfile: SegmentSignal[]
): BestWindow | null {
  const { callingPoints } = journey;

  if (signalProfile.length === 0 || callingPoints.length < 2) {
    return null;
  }

  // Find all maximal consecutive runs of usable segments.
  // A run is [startIndex, endIndex] inclusive, referring to segment
  // indices in signalProfile. Segment i covers callingPoints[i] to
  // callingPoints[i+1].
  interface Run {
    start: number;
    end: number;
  }

  const runs: Run[] = [];
  let runStart: number | null = null;

  for (let i = 0; i < signalProfile.length; i++) {
    if (isUsable(signalProfile[i])) {
      if (runStart === null) {
        runStart = i;
      }
    } else {
      if (runStart !== null) {
        runs.push({ start: runStart, end: i - 1 });
        runStart = null;
      }
    }
  }
  // Close any open run at the end
  if (runStart !== null) {
    runs.push({ start: runStart, end: signalProfile.length - 1 });
  }

  if (runs.length === 0) {
    return null;
  }

  // Evaluate each run: compute duration, quality, confidence.
  // Pick the longest by duration; ties go to the earlier run.
  let bestWindow: BestWindow | null = null;

  for (const run of runs) {
    const departurePoint = callingPoints[run.start];
    const arrivalPoint = callingPoints[run.end + 1];

    const startTime = departurePoint.scheduledDeparture;
    const endTime = arrivalPoint.scheduledArrival;

    // Skip runs where we cannot determine times
    if (!startTime || !endTime) {
      continue;
    }

    const duration = elapsedMinutes(startTime, endTime);

    // Quality: "video" only if every segment in the run is video-capable
    let allVideo = true;
    let hasLowConfidence = false;

    for (let i = run.start; i <= run.end; i++) {
      if (signalProfile[i].band !== "video") {
        allVideo = false;
      }
      if (
        signalProfile[i].confidence === "low" ||
        signalProfile[i].confidence === "no-data"
      ) {
        hasLowConfidence = true;
      }
    }

    const candidate: BestWindow = {
      startTime,
      endTime,
      durationMinutes: duration,
      quality: allVideo ? "video" : "voice",
      confidence: hasLowConfidence ? "low" : "high",
      startStation: departurePoint.name,
      endStation: arrivalPoint.name,
    };

    if (
      bestWindow === null ||
      candidate.durationMinutes > bestWindow.durationMinutes
    ) {
      bestWindow = candidate;
    }
    // Equal duration: earlier run wins (it was found first, so we
    // do not replace bestWindow on equality)
  }

  return bestWindow;
}
