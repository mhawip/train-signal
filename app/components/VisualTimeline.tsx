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
 * Signal bands use three redundant cues per specs/accessibility.md 2.8:
 * 1. Fill pattern (solid, hatching, crosshatch)
 * 2. Icon (checkmark, phone, X)
 * 3. Text label (inline for bands taller than ~60px)
 */

import type { Journey } from "@/app/lib/journey-types";
import type { SegmentSignal, SignalBand } from "@/app/lib/signal";
import { elapsedMinutes } from "@/app/components/JourneyTimeline";

export interface VisualTimelineProps {
  journey: Journey;
  signalProfile?: SegmentSignal[];
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

/**
 * Minimum height for showing inline text labels within a band.
 * Below this, the legend provides the band identification.
 * Per specs/accessibility.md 6.2: "For bands longer than approximately
 * 60px, the band name must be rendered as inline text."
 */
const INLINE_LABEL_MIN_PX = 60;

/**
 * Map a signal band to its CSS class name.
 */
function bandClass(band: SignalBand): string {
  switch (band) {
    case "video":
      return "ts-band--video";
    case "voice":
      return "ts-band--voice";
    case "none":
      return "ts-band--none";
    case "no-data":
      return "ts-band--no-data";
    case "unknown":
      return "";
  }
}

/**
 * Map a signal band to its inline text label.
 * Plain English per WCAG 3.1.5.
 */
function bandLabel(band: SignalBand): string {
  switch (band) {
    case "video":
      return "Voice and video";
    case "voice":
      return "Voice only";
    case "none":
      return "No signal";
    case "no-data":
      return "No data";
    case "unknown":
      return "";
  }
}

/**
 * Inline SVG icon for use within band segments.
 * All icons are 16x16 minimum (specs/accessibility.md 6.2).
 */
function BandIcon({ band }: { band: SignalBand }) {
  switch (band) {
    case "video":
      return (
        <svg
          className="ts-band-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
      );
    case "voice":
      return (
        <svg
          className="ts-band-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328Z" />
        </svg>
      );
    case "none":
      return (
        <svg
          className="ts-band-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
        </svg>
      );
    default:
      return null;
  }
}

export function VisualTimeline({
  journey,
  signalProfile,
}: VisualTimelineProps) {
  const { callingPoints } = journey;

  // Build segments: pairs of consecutive calling points with durations
  const segments: Array<{
    from: (typeof callingPoints)[number];
    to: (typeof callingPoints)[number];
    durationMinutes: number;
    heightPx: number;
    signal?: SegmentSignal;
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

    segments.push({
      from,
      to,
      durationMinutes,
      heightPx,
      signal: signalProfile?.[i],
    });
  }

  return (
    <section className="ts-visual-timeline" aria-hidden="true">
      <h2 className="ts-visual-timeline__heading">Journey timeline</h2>

      {/* Legend: always visible, shows all band types with pattern + icon + label
       * (specs/accessibility.md 2.8, specs/design-system.md section 4) */}
      {signalProfile && signalProfile.length > 0 && (
        <div className="ts-legend">
          <div className="ts-legend__item">
            <span className="ts-legend__swatch ts-band--video" />
            <BandIcon band="video" />
            <span className="ts-legend__label">Voice and video</span>
          </div>
          <div className="ts-legend__item">
            <span className="ts-legend__swatch ts-band--voice" />
            <BandIcon band="voice" />
            <span className="ts-legend__label">Voice only</span>
          </div>
          <div className="ts-legend__item">
            <span className="ts-legend__swatch ts-band--none" />
            <BandIcon band="none" />
            <span className="ts-legend__label">No signal</span>
          </div>
          <div className="ts-legend__item">
            <span className="ts-legend__swatch ts-band--tunnel" />
            <span className="ts-legend__label">Tunnel</span>
          </div>
        </div>
      )}

      <div className="ts-visual-timeline__track">
        {segments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          const signal = segment.signal;
          const band = signal?.band;

          // Build CSS classes for the segment bar
          const segmentClasses = ["ts-visual-timeline__segment"];
          if (band) {
            const bc = bandClass(band);
            if (bc) segmentClasses.push(bc);
          }
          if (signal?.confidence === "low") {
            segmentClasses.push("ts-band--low-confidence");
          }

          const showInlineLabel =
            segment.heightPx >= INLINE_LABEL_MIN_PX && band && band !== "unknown";

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

              {/* Segment bar: vertical bar between stations, coloured by signal band */}
              <div
                className={segmentClasses.join(" ")}
                style={{ height: `${segment.heightPx}px` }}
              >
                {showInlineLabel && (
                  <span className="ts-visual-timeline__band-label">
                    {band && <BandIcon band={band} />}
                    {bandLabel(band!)}
                    {signal?.tunnels && signal.tunnels.length > 0 && (
                      <span className="ts-visual-timeline__tunnel-note">
                        {signal.tunnels.join(", ")}
                      </span>
                    )}
                  </span>
                )}
              </div>

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
