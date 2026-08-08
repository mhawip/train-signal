/**
 * VisualTimeline: decorative vertical timeline for a rail journey.
 *
 * This is a server component -- pure HTML + CSS, no client-side JS.
 * It is a progressive enhancement over the text-equivalent table
 * (JourneyTimeline) and is marked aria-hidden="true" throughout.
 * Screen readers interact with the table; sighted users have both.
 *
 * Accessibility:
 * - The entire component is aria-hidden="true" (specs/accessibility.md 6.1)
 * - No text content is exposed to the accessibility tree
 * - Decorative only; the table carries all information for AT
 *
 * Signal bands are not shown yet (Phase 2). Segments use a neutral
 * style (--color-field-border) to show journey shape only.
 */

import type { Journey } from "@/app/lib/journey-types";
import { elapsedMinutes } from "@/app/components/JourneyTimeline";

export interface VisualTimelineProps {
  journey: Journey;
}

/**
 * Minimum segment height in pixels. Keeps touch targets reasonable
 * and ensures very short legs are still visible.
 */
const MIN_SEGMENT_HEIGHT_PX = 48;

/**
 * Pixels per minute for proportional segment heights.
 * Calibrated so a typical 30-minute leg is around 90px,
 * giving a reasonable visual proportion without making
 * long journeys excessively tall.
 */
const PX_PER_MINUTE = 3;

export function VisualTimeline({ journey }: VisualTimelineProps) {
  const { callingPoints } = journey;

  // Build segments: pairs of consecutive calling points with durations
  const segments: Array<{
    from: (typeof callingPoints)[number];
    to: (typeof callingPoints)[number];
    durationMinutes: number;
    heightPx: number;
  }> = [];

  for (let i = 0; i < callingPoints.length - 1; i++) {
    const from = callingPoints[i];
    const to = callingPoints[i + 1];

    // Calculate duration from departure of "from" to arrival of "to"
    const departure = from.scheduledDeparture;
    const arrival = to.scheduledArrival;

    let durationMinutes = 0;
    if (departure && arrival) {
      durationMinutes = elapsedMinutes(departure, arrival);
    }

    const heightPx = Math.max(
      MIN_SEGMENT_HEIGHT_PX,
      durationMinutes * PX_PER_MINUTE
    );

    segments.push({ from, to, durationMinutes, heightPx });
  }

  return (
    <section
      className="ts-visual-timeline"
      aria-hidden="true"
    >
      <h2 className="ts-visual-timeline__heading">Journey timeline</h2>
      <div className="ts-visual-timeline__track">
        {segments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;

          return (
            <div
              className="ts-visual-timeline__segment-group"
              key={`${segment.from.crs}-${segment.to.crs}`}
            >
              {/* Station node: origin or intermediate */}
              <div className="ts-visual-timeline__stop">
                <div
                  className={`ts-visual-timeline__node ${
                    isFirst
                      ? "ts-visual-timeline__node--terminus"
                      : ""
                  }`}
                />
                <div className="ts-visual-timeline__label">
                  <span className="ts-visual-timeline__station-name">
                    {segment.from.name}
                  </span>
                  <span className="ts-visual-timeline__time">
                    {isFirst
                      ? segment.from.scheduledDeparture ?? ""
                      : segment.from.scheduledArrival ?? ""}
                  </span>
                </div>
              </div>

              {/* Segment bar: vertical line between stations */}
              <div
                className="ts-visual-timeline__segment"
                style={{ height: `${segment.heightPx}px` }}
              />

              {/* Final station node (only on the last segment) */}
              {isLast && (
                <div className="ts-visual-timeline__stop">
                  <div className="ts-visual-timeline__node ts-visual-timeline__node--terminus" />
                  <div className="ts-visual-timeline__label">
                    <span className="ts-visual-timeline__station-name">
                      {segment.to.name}
                    </span>
                    <span className="ts-visual-timeline__time">
                      {segment.to.scheduledArrival ?? ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
