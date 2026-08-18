/**
 * BestWindow: headline answer component for the results page.
 *
 * This is a server component. It renders the single most important
 * piece of information on the page: the best window for a phone call.
 *
 * Accessibility (self-certified, see journal for full checklist):
 * - <section> with aria-labelledby pointing to the <h2>
 * - Heading hierarchy: <h2> following the page <h1>
 * - All text uses existing tokens with verified 7:1+ contrast
 * - Meaning conveyed with text, not colour (1.4.1)
 * - Max 80ch via max-width-text container (1.4.8)
 * - line-height 1.5 on body text, 1.3 on heading (1.4.8)
 * - Plain English, Flesch-Kincaid Grade 6-8 (3.1.5)
 * - Language hedged: "expected signal", never "you will have signal"
 */

import type { BestWindow as BestWindowType } from "@/app/lib/best-window";
import { formatDuration } from "@/app/components/JourneyTimeline";

interface BestWindowProps {
  window: BestWindowType | null;
  networkName: string;
}

export function BestWindow({ window, networkName }: BestWindowProps) {
  if (window === null) {
    return (
      <section aria-labelledby="best-window-heading">
        <h2 id="best-window-heading">No good signal window found</h2>
        <p>
          This journey has no stretch of expected {networkName} signal long
          enough to recommend for a call.
        </p>
        <p>
          You could try a different mobile network, or check whether breaking
          the journey into shorter legs helps.
        </p>
      </section>
    );
  }

  // Route-overview mode: no clock times available (startTime/endTime null).
  // Show station-to-station description with duration and call quality.
  const isRouteOverview = window.startTime === null || window.endTime === null;

  const qualityLabel =
    window.quality === "video" ? "voice and video" : "voice";
  const callTypeLabel =
    window.quality === "video" ? "a video call" : "a voice call";

  return (
    <section aria-labelledby="best-window-heading">
      <h2 id="best-window-heading">Best window</h2>
      {!isRouteOverview && (
        <p className="ts-best-window__times">
          {window.startTime} – {window.endTime}
        </p>
      )}
      <p>
        {formatDuration(window.durationMinutes)} of expected {qualityLabel}{" "}
        signal on {networkName}, {window.startStation} to {window.endStation}.
        {isRouteOverview
          ? ` Good enough for ${callTypeLabel}.`
          : ""}
      </p>
      {window.confidence === "low" && (
        <p className="ts-muted">Based on limited data for this route.</p>
      )}
    </section>
  );
}
