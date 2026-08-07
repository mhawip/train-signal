/**
 * JourneyTimeline: text-equivalent table for a rail journey.
 *
 * This is a server component. It renders a semantic HTML table showing
 * each calling point with arrival/departure times and elapsed journey
 * time. This table is the primary accessible representation of the
 * journey (specs/accessibility.md section 7) -- the visual timeline
 * (P1-06) is a progressive enhancement over it.
 *
 * Accessibility:
 * - Uses <table>, <caption>, <thead>, <tbody>, <tfoot>
 * - Column headers use <th scope="col">
 * - Station name cells use <th scope="row">
 * - All times are plain text, no abbreviations
 * - Wrapper has role="region" with aria-label and tabindex="0"
 *   so it is keyboard-scrollable at narrow viewports (specs/accessibility.md 7.4)
 */

import type { Journey } from "@/app/lib/journey-types";

export interface JourneyTimelineProps {
  journey: Journey;
}

/**
 * Parse "HH:MM" into total minutes since midnight.
 * Exported for testing.
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate elapsed minutes between two "HH:MM" times, handling
 * midnight crossings. If the second time is numerically less than the
 * first, the journey is assumed to cross midnight.
 *
 * Exported for testing.
 */
export function elapsedMinutes(from: string, to: string): number {
  const fromMin = parseTimeToMinutes(from);
  const toMin = parseTimeToMinutes(to);

  if (toMin >= fromMin) {
    return toMin - fromMin;
  }
  // Midnight crossing: add 24 hours to the arrival
  return 1440 - fromMin + toMin;
}

/**
 * Format a number of minutes as a readable duration.
 * Uses plain English per WCAG 3.1.5: "45 min", "1 hr 15 min", "2 hr".
 */
export function formatDuration(minutes: number): string {
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

/**
 * Format an ISO date string as a readable date.
 * Returns e.g. "14 July 2026" from "2026-07-14".
 */
function formatDate(isoDate: string): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${day} ${months[monthIndex]} ${year}`;
}

export function JourneyTimeline({ journey }: JourneyTimelineProps) {
  const { callingPoints, origin, destination, date } = journey;
  const originDeparture = origin.scheduledDeparture;
  const caption = `${origin.name} to ${destination.name}, ${formatDate(date)}`;

  // Calculate total journey duration
  const totalMinutes =
    originDeparture && destination.scheduledArrival
      ? elapsedMinutes(originDeparture, destination.scheduledArrival)
      : 0;

  return (
    <section id="journey-table" aria-labelledby="journey-table-heading">
      <h2 id="journey-table-heading">Journey details</h2>
      <div
        className="ts-table-wrapper"
        role="region"
        aria-label={`Scrollable table: ${caption}`}
        tabIndex={0}
      >
        <table className="ts-table">
          <caption className="ts-table__caption">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Station</th>
              <th scope="col">Arrives</th>
              <th scope="col">Departs</th>
              <th scope="col">Journey time</th>
            </tr>
          </thead>
          <tbody>
            {callingPoints.map((point) => {
              const elapsed =
                originDeparture && point.scheduledArrival
                  ? elapsedMinutes(originDeparture, point.scheduledArrival)
                  : null;

              return (
                <tr key={point.crs}>
                  <th scope="row">{point.name}</th>
                  <td>{point.scheduledArrival ?? "\u2013"}</td>
                  <td>{point.scheduledDeparture ?? "\u2013"}</td>
                  <td>
                    {elapsed !== null ? formatDuration(elapsed) : "\u2013"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Total
              </th>
              <td>{formatDuration(totalMinutes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
