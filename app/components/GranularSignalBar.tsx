/**
 * GranularSignalBar
 *
 * A narrow vertical heat strip that runs alongside the journey details,
 * showing per-node signal quality colour-coded from green (good data)
 * through amber (limited) to red (none).
 *
 * This component is purely decorative — it is hidden from the
 * accessibility tree with aria-hidden="true".  The JourneyTimeline table
 * is the accessible equivalent and must always be present alongside it.
 *
 * Colours are not used as the sole means of conveying information (WCAG
 * 1.4.1) because the table carries all the same data accessibly.
 * No contrast requirements apply to aria-hidden decorative elements.
 */

import type { GranularJourneySignal, SignalBand, SignalSource } from "@/app/lib/signal";

/** Map (band, source) to a CSS modifier class for the segment colour. */
function segClass(band: SignalBand, source: SignalSource): string {
  if (band === "no-data" || band === "unknown") return "nodata";
  const estimated = source === "modelled" || source === "interpolated";
  if (band === "video") return estimated ? "video-est" : "video";
  if (band === "voice") return estimated ? "voice-est" : "voice";
  if (band === "none") return estimated ? "none-est" : "none";
  return "nodata";
}

interface Props {
  granular: GranularJourneySignal;
}

export function GranularSignalBar({ granular }: Props) {
  const { segments, callingPointFractions } = granular;

  return (
    <div className="ts-granular-bar" aria-hidden="true">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={`ts-granular-bar__seg ts-granular-bar__seg--${segClass(seg.band, seg.source)}`}
          style={{ flex: seg.distanceFraction }}
        />
      ))}
      {/* Thin white separator lines at each intermediate station stop */}
      {callingPointFractions.slice(1, -1).map((frac, i) => (
        <div
          key={`sep-${i}`}
          className="ts-granular-bar__sep"
          style={{ top: `${frac * 100}%` }}
        />
      ))}
    </div>
  );
}
