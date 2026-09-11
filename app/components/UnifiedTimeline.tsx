/**
 * UnifiedTimeline: a single vertical timeline showing journey stops
 * and expected mobile signal between them.
 *
 * Each leg between stops is broken into sub-segments — contiguous
 * stretches of track with consistent signal quality. This allows a
 * long leg (e.g. York → London, ~2 hours) to show distinct good/poor
 * windows rather than a single averaged band.
 *
 * Visual design:
 * - Terminus stops (origin, destination) use hollow ring nodes
 * - Intermediate stops use filled circle nodes
 * - A thin spine connects nodes down the left column
 * - Between each pair of stops, one coloured band card per sub-segment
 *   shows the expected signal quality, confidence, and estimated duration
 *
 * The existing ts-band--* CSS classes handle background colour and pattern.
 * No aria-hidden is used on content — icons are aria-hidden individually but
 * every piece of meaning is also conveyed as visible text.
 */

import type { Journey } from "@/app/lib/journey-types";
import type { LegSignal, SubSegment, SignalBand, SignalSource } from "@/app/lib/signal";
import {
  elapsedMinutes,
  formatDuration,
} from "@/app/components/JourneyTimeline";

export interface UnifiedTimelineProps {
  journey: Journey;
  legSignals?: LegSignal[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bandClass(band: SignalBand, source?: SignalSource): string {
  if (source === "modelled" || source === "interpolated") {
    return band === "none" ? "ts-band--modelled-none" : "ts-band--modelled-voice";
  }
  switch (band) {
    case "video":
      return "ts-band--video";
    case "voice":
      return "ts-band--voice";
    case "none":
      return "ts-band--none";
    default:
      return "ts-band--no-data";
  }
}

function signalLabel(band: SignalBand, source?: SignalSource): string {
  if (source === "modelled" || source === "interpolated") {
    return band === "none"
      ? "No mobile coverage predicted here"
      : "Mobile data may be available here";
  }
  switch (band) {
    case "video":
      return "Good mobile data expected";
    case "voice":
      return "Mobile data expected";
    case "none":
      return "No mobile data expected";
    default:
      return "No signal data";
  }
}

function confidenceText(seg: SubSegment): string {
  if (seg.source === "modelled") return "Based on Ofcom coverage map";
  if (seg.source === "interpolated") return "Estimated from nearby track data";
  switch (seg.confidence) {
    case "high":
      return "High confidence";
    case "low":
      return "Limited data";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Icons (aria-hidden — text labels carry the meaning)
// ---------------------------------------------------------------------------

function SignalIcon({
  band,
  source,
}: {
  band: SignalBand;
  source?: SignalSource;
}) {
  if (source === "modelled" || source === "interpolated") {
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
  switch (band) {
    case "video":
      return (
        <svg
          aria-hidden="true"
          className="ts-band-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <rect x="1" y="11" width="3" height="4" rx="0.5" />
          <rect x="6" y="7" width="3" height="8" rx="0.5" />
          <rect x="11" y="3" width="3" height="12" rx="0.5" />
        </svg>
      );
    case "voice":
      return (
        <svg
          aria-hidden="true"
          className="ts-band-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <rect x="1" y="11" width="3" height="4" rx="0.5" />
          <rect x="6" y="7" width="3" height="8" rx="0.5" opacity="0.3" />
          <rect x="11" y="3" width="3" height="12" rx="0.5" opacity="0.3" />
        </svg>
      );
    case "none":
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
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-segment band card
// ---------------------------------------------------------------------------

function SubSegmentCard({
  seg,
  legMinutes,
}: {
  seg: SubSegment;
  legMinutes: number | null;
}) {
  const lowConfidenceClass =
    seg.confidence === "low" &&
    seg.source !== "modelled" &&
    seg.source !== "interpolated"
      ? " ts-band--low-confidence"
      : "";

  const subMinutes =
    legMinutes !== null
      ? Math.round(seg.distanceFraction * legMinutes)
      : null;
  const durationStr =
    subMinutes !== null && subMinutes >= 2
      ? formatDuration(subMinutes)
      : null;

  const confText = confidenceText(seg);
  const metaParts = [confText, durationStr].filter(Boolean);
  const metaLine = metaParts.join(" · ");

  const hasTunnels = seg.tunnels && seg.tunnels.length > 0;

  return (
    <div
      className={`ts-unified-timeline__band-info ${bandClass(seg.band, seg.source)}${lowConfidenceClass}`}
    >
      <div className="ts-unified-timeline__signal-label">
        {seg.band !== "no-data" && seg.band !== "unknown" && (
          <SignalIcon band={seg.band} source={seg.source} />
        )}
        <span>{signalLabel(seg.band, seg.source)}</span>
      </div>

      {(metaLine || hasTunnels) && (
        <div className="ts-unified-timeline__band-meta">
          {metaLine}
          {hasTunnels && (
            <span className="ts-unified-timeline__tunnel-note">
              {metaLine && " · "}
              Via {seg.tunnels.join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnifiedTimeline({
  journey,
  legSignals,
}: UnifiedTimelineProps) {
  const { callingPoints } = journey;
  const hasSignal = !!legSignals && legSignals.length > 0;

  return (
    <section id="journey-table" aria-labelledby="journey-table-heading">
      <h2 id="journey-table-heading">Journey details</h2>
      <div className="ts-unified-timeline">
        {callingPoints.map((point, index) => {
          const isFirst = index === 0;
          const isLast = index === callingPoints.length - 1;
          const isTerminus = isFirst || isLast;

          // Departure time for origin; arrival time for all other stops
          const displayTime = isFirst
            ? point.scheduledDeparture
            : point.scheduledArrival;

          // Sub-segments for the outgoing leg from this stop
          const legSignal: LegSignal | undefined =
            hasSignal && !isLast ? legSignals![index] : undefined;

          // Total leg duration for estimating sub-segment times
          const nextPoint = !isLast ? callingPoints[index + 1] : null;
          const legMinutes =
            nextPoint &&
            point.scheduledDeparture &&
            nextPoint.scheduledArrival
              ? elapsedMinutes(
                  point.scheduledDeparture,
                  nextPoint.scheduledArrival
                )
              : null;

          return (
            <div
              key={`${point.crs}-${index}`}
              className={`ts-unified-timeline__leg${isLast ? " ts-unified-timeline__leg--final" : ""}`}
            >
              {/* Left column: node dot + connecting spine */}
              <div
                className="ts-unified-timeline__connector"
                aria-hidden="true"
              >
                <div
                  className={`ts-unified-timeline__node${isTerminus ? " ts-unified-timeline__node--terminus" : ""}`}
                />
                {!isLast && <div className="ts-unified-timeline__spine" />}
              </div>

              {/* Right column: station row + signal bands */}
              <div className="ts-unified-timeline__content">
                <div className="ts-unified-timeline__stop-info">
                  <span className="ts-unified-timeline__station-name">
                    {point.name}
                  </span>
                  {displayTime && (
                    <span className="ts-unified-timeline__time">
                      {displayTime}
                    </span>
                  )}
                </div>

                {/* Signal bands — one card per sub-segment */}
                {!isLast && (
                  <div className="ts-unified-timeline__bands">
                    {legSignal ? (
                      legSignal.subSegments.map((seg, si) => (
                        <SubSegmentCard
                          key={si}
                          seg={seg}
                          legMinutes={legMinutes}
                        />
                      ))
                    ) : (
                      <div className="ts-unified-timeline__band-info ts-band--no-data">
                        <div className="ts-unified-timeline__signal-label">
                          <span>No signal data</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
