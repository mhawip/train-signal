/**
 * JourneyTimeline: text-equivalent table for a rail journey.
 *
 * This is a server component. It renders a semantic HTML table showing
 * each calling point with arrival/departure times, elapsed journey
 * time, and expected signal quality. This table is the primary
 * accessible representation of the journey (specs/accessibility.md
 * section 7) -- the visual timeline is a progressive enhancement.
 *
 * Accessibility:
 * - Uses <table>, <caption>, <thead>, <tbody>, <tfoot>
 * - Column headers use <th scope="col">
 * - Station name cells use <th scope="row">
 * - All times are plain text, no abbreviations
 * - Signal column uses text labels, not colour alone (1.4.1)
 * - Icons are aria-hidden; text labels carry the accessible meaning
 * - Wrapper has role="region" with aria-label and tabindex="0"
 *   so it is keyboard-scrollable at narrow viewports (specs/accessibility.md 7.4)
 */

import type { Journey } from "@/app/lib/journey-types";
import type { SegmentSignal } from "@/app/lib/signal";

export interface JourneyTimelineProps {
  journey: Journey;
  signalProfile?: SegmentSignal[];
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

// ---------------------------------------------------------------------------
// Signal band display helpers
//
// Each band has a text label (the accessible name), an inline SVG icon
// (aria-hidden, purely decorative), and a CSS class for the visual
// timeline. Labels are plain English (WCAG 3.1.5).
// ---------------------------------------------------------------------------

/**
 * Inline SVG icon for the "voice and video" band.
 * A checkmark indicating good signal. aria-hidden because the text
 * label carries the meaning.
 */
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="ts-band-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

/**
 * Inline SVG icon for the "voice only" band.
 * A phone handset. aria-hidden.
 */
function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      className="ts-band-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328Z" />
    </svg>
  );
}

/**
 * Inline SVG icon for the "no signal" band.
 * An X mark indicating no usable signal. aria-hidden.
 */
function XIcon() {
  return (
    <svg
      aria-hidden="true"
      className="ts-band-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

/**
 * Inline SVG icon for modelled (estimated) signal bands.
 * A coverage-map pin. aria-hidden.
 */
function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="ts-band-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 1a5 5 0 0 0-5 5c0 4.5 5 9 5 9s5-4.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
    </svg>
  );
}

/**
 * Render the signal cell content for a segment.
 * Returns icon + text label + optional tunnel and confidence notes.
 *
 * Wording per specs/accessibility.md section 15.3:
 * - Measured video: "Voice and video calls expected"
 * - Measured voice: "Voice calls expected"
 * - Measured/any none: "No signal expected"
 * - Modelled voice: "Ofcom coverage maps suggest voice calls may be possible here"
 * - Modelled none: "Ofcom coverage maps suggest no coverage here"
 * - No data: "No signal data available"
 * - Unknown: en dash
 */
function SignalCell({ signal }: { signal: SegmentSignal }) {
  const { band, confidence, source, tunnels } = signal;

  let icon: React.ReactNode = null;
  let label = "";

  if (band === "unknown") {
    return <>{"\u2013"}</>;
  }

  if (band === "no-data") {
    label = "No signal data available";
  } else if (source === "modelled") {
    // Modelled segments use hedged wording that attributes the source
    // explicitly. "Expected" is reserved for measured data only.
    switch (band) {
      case "voice":
        label = "Ofcom coverage maps suggest voice calls may be possible here";
        break;
      case "none":
        label = "Ofcom coverage maps suggest no coverage here";
        break;
      case "video":
        // Modelled data caps at voice -- video should not occur, but
        // handle it defensively with the voice wording.
        label = "Ofcom coverage maps suggest voice calls may be possible here";
        break;
    }
    // Coverage-map pin icon for all modelled bands
    icon = <PinIcon />;
  } else {
    // Measured data (or source absent / "no-data" source with a
    // usable band -- shouldn't happen, but handle defensively)
    switch (band) {
      case "video":
        icon = <CheckIcon />;
        label = "Voice and video calls expected";
        break;
      case "voice":
        icon = <PhoneIcon />;
        label = "Voice calls expected";
        break;
      case "none":
        icon = <XIcon />;
        label = "No signal expected";
        break;
    }
  }

  return (
    <span className="ts-signal-cell">
      {icon}
      <span className="ts-signal-cell__label">{label}</span>
      {confidence === "low" && source !== "modelled" && (
        <span className="ts-signal-cell__note">(limited data)</span>
      )}
      {tunnels.length > 0 && (
        <span className="ts-signal-cell__note">
          (includes {tunnels.join(", ")})
        </span>
      )}
    </span>
  );
}

/**
 * Map a confidence/source combination to a display label.
 * Plain English per WCAG 3.1.5.
 *
 * Per specs/accessibility.md section 15.3:
 * - Modelled segments always show "Estimated (coverage map)"
 * - No-data source shows "No data"
 * - Measured segments show "High", "Low", or "No data"
 */
function confidenceLabel(signal: SegmentSignal): string {
  if (signal.source === "modelled") {
    return "Estimated (coverage map)";
  }
  if (signal.source === "no-data") {
    return "No data";
  }
  switch (signal.confidence) {
    case "high":
      return "High";
    case "low":
      return "Low";
    case "no-data":
      return "No data";
  }
}

export function JourneyTimeline({
  journey,
  signalProfile,
}: JourneyTimelineProps) {
  const { callingPoints, origin, destination, date } = journey;
  const originDeparture = origin.scheduledDeparture;
  const hasSignal = signalProfile && signalProfile.length > 0;

  // Route-overview mode: no specific date means we show the typical
  // stopping pattern with leg durations instead of clock times.
  const isRouteOverview = date === "";

  const caption = isRouteOverview
    ? `Typical journey: ${origin.name} to ${destination.name}`
    : `${origin.name} to ${destination.name}, ${formatDate(date)}`;

  // Calculate total journey duration
  const totalMinutes =
    originDeparture && destination.scheduledArrival
      ? elapsedMinutes(originDeparture, destination.scheduledArrival)
      : 0;

  if (isRouteOverview) {
    // Route-overview table: 4 columns per accessibility.md section 12.5
    // Station | Leg duration | Expected signal | Confidence
    //
    // Accessibility notes (DW-18 review):
    // - En dash cells carry visually-hidden "Not applicable" text so screen
    //   readers announce meaning rather than "dash" or "en dash" (1.3.1).
    // - tfoot: Total header spans Station column only; duration appears in the
    //   Leg duration column so column-header association is unambiguous (1.3.1).

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
                <th scope="col">Leg duration</th>
                {hasSignal && <th scope="col">Expected signal</th>}
                {hasSignal && <th scope="col">Confidence</th>}
              </tr>
            </thead>
            <tbody>
              {callingPoints.map((point, index) => {
                // Leg duration: time from the previous stop to this one.
                // Origin (index 0) has no incoming leg.
                let legDuration: string | null = null;
                if (index > 0) {
                  const prevDeparture =
                    callingPoints[index - 1].scheduledDeparture;
                  const thisArrival = point.scheduledArrival;
                  if (prevDeparture && thisArrival) {
                    legDuration = formatDuration(
                      elapsedMinutes(prevDeparture, thisArrival)
                    );
                  }
                }

                const segmentSignal =
                  hasSignal && index > 0
                    ? signalProfile[index - 1]
                    : null;

                // Cells where there is no value show an en dash for sighted
                // users and visually-hidden text for screen readers (1.3.1).
                // "Not applicable" for the origin row (no incoming leg).
                // "Not available" for intermediate rows with missing time data.
                const legDurationCell =
                  index === 0 ? (
                    <>
                      <span aria-hidden="true">{"\u2013"}</span>
                      <span className="ts-visually-hidden">Not applicable</span>
                    </>
                  ) : legDuration !== null ? (
                    legDuration
                  ) : (
                    <>
                      <span aria-hidden="true">{"\u2013"}</span>
                      <span className="ts-visually-hidden">Not available</span>
                    </>
                  );

                return (
                  <tr key={point.crs}>
                    <th scope="row">{point.name}</th>
                    <td>{legDurationCell}</td>
                    {hasSignal && (
                      <td>
                        {segmentSignal ? (
                          <SignalCell signal={segmentSignal} />
                        ) : (
                          <>
                            <span aria-hidden="true">{"\u2013"}</span>
                            <span className="ts-visually-hidden">
                              Not applicable
                            </span>
                          </>
                        )}
                      </td>
                    )}
                    {hasSignal && (
                      <td>
                        {segmentSignal ? (
                          confidenceLabel(segmentSignal)
                        ) : (
                          <>
                            <span aria-hidden="true">{"\u2013"}</span>
                            <span className="ts-visually-hidden">
                              Not applicable
                            </span>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/*
               * Total row: Station column carries the "Total" row header;
               * Leg duration column carries the total journey time.
               * Remaining columns (Expected signal, Confidence) are left
               * empty — they have no meaningful total. Screen readers either
               * skip empty cells or announce "blank", which is unambiguous.
               * This structure keeps the duration associated with the correct
               * column header ("Leg duration") rather than the last column
               * ("Confidence"), which a colSpan=3 approach would misplace.
               */}
              <tr>
                <th scope="row">Total</th>
                <td>{formatDuration(totalMinutes)}</td>
                {hasSignal && <td></td>}
                {hasSignal && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  }

  // Specific-train table: 4 base columns + 2 signal columns when signal is present
  // (Expected signal + Confidence per specs/accessibility.md section 7.1, 15.3)
  const baseColCount = 4;
  const totalColCount = hasSignal ? baseColCount + 2 : baseColCount;

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
              {hasSignal && <th scope="col">Expected signal</th>}
              {hasSignal && <th scope="col">Confidence</th>}
              <th scope="col">Journey time</th>
            </tr>
          </thead>
          <tbody>
            {callingPoints.map((point, index) => {
              const elapsed =
                originDeparture && point.scheduledArrival
                  ? elapsedMinutes(originDeparture, point.scheduledArrival)
                  : null;

              // Signal is shown per leg INTO a station. The origin
              // (index 0) has no incoming leg, so it shows an en dash.
              // Each subsequent station at index i gets the signal for
              // segment i-1 (the leg from callingPoints[i-1] to
              // callingPoints[i]).
              const segmentSignal =
                hasSignal && index > 0
                  ? signalProfile[index - 1]
                  : null;

              return (
                <tr key={point.crs}>
                  <th scope="row">{point.name}</th>
                  <td>
                    {point.scheduledArrival ?? (
                      <>
                        <span aria-hidden="true">{"\u2013"}</span>
                        <span className="ts-visually-hidden">
                          Not applicable
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {point.scheduledDeparture ?? (
                      <>
                        <span aria-hidden="true">{"\u2013"}</span>
                        <span className="ts-visually-hidden">
                          Not applicable
                        </span>
                      </>
                    )}
                  </td>
                  {hasSignal && (
                    <td>
                      {segmentSignal ? (
                        <SignalCell signal={segmentSignal} />
                      ) : (
                        <>
                          <span aria-hidden="true">{"\u2013"}</span>
                          <span className="ts-visually-hidden">
                            Not applicable
                          </span>
                        </>
                      )}
                    </td>
                  )}
                  {hasSignal && (
                    <td>
                      {segmentSignal ? (
                        confidenceLabel(segmentSignal)
                      ) : (
                        <>
                          <span aria-hidden="true">{"\u2013"}</span>
                          <span className="ts-visually-hidden">
                            Not applicable
                          </span>
                        </>
                      )}
                    </td>
                  )}
                  <td>
                    {elapsed !== null ? formatDuration(elapsed) : (
                      <>
                        <span aria-hidden="true">{"\u2013"}</span>
                        <span className="ts-visually-hidden">
                          Not applicable
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={totalColCount - 1}>
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
