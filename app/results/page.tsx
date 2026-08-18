import Link from "next/link";
import type { Metadata } from "next";
import { JourneyTimeline } from "@/app/components/JourneyTimeline";
import { VisualTimeline } from "@/app/components/VisualTimeline";
import { BestWindow } from "@/app/components/BestWindow";
import { getJourneySignal } from "@/app/lib/signal";
import { findBestWindow } from "@/app/lib/best-window";
import type { Journey } from "@/app/lib/journey-types";
import { fetchDepartures } from "@/app/lib/darwin";
import { findScheduledJourney, findTypicalJourney } from "@/app/lib/schedule";
import { getTodayISO } from "@/app/lib/journey-params";

interface ResultsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    network?: string;
  }>;
}

/**
 * Format an ISO date string ("YYYY-MM-DD") into a human-readable form
 * like "13 August 2026". Returns the raw string if parsing fails.
 */
function formatDate(dateStr: string): string {
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
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const monthIndex = Number(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return dateStr;
  return `${Number(parts[2])} ${months[monthIndex]} ${parts[0]}`;
}

export async function generateMetadata({
  searchParams,
}: ResultsPageProps): Promise<Metadata> {
  const params = await searchParams;

  if (!params.from || !params.to) {
    return { title: "Train Signal" };
  }

  const from = params.from.toUpperCase();
  const to = params.to.toUpperCase();

  // Route-overview mode: no date/time params
  if (!params.date && !params.time) {
    return {
      title: `${from} to ${to} route signal — Train Signal`,
    };
  }

  const dateStr = params.date ? formatDate(params.date) : "";
  const datePart = dateStr ? `, ${dateStr}` : "";

  return {
    title: `${from} to ${to}${datePart} — Train Signal`,
  };
}

/**
 * Fetch journey data from the appropriate source:
 * - Today: Darwin LDBWS (live departures)
 * - Future dates within 8-week horizon: NR SCHEDULE timetable
 *
 * Returns null if no matching service is found in either source.
 */
async function fetchJourney(
  from: string,
  to: string,
  date: string,
  time: string,
  network: string,
): Promise<Journey | null> {
  const today = getTodayISO();

  if (date === today) {
    return fetchDepartures(from, to, date, time, network);
  }

  // Future date: use the NR SCHEDULE timetable (synchronous lookup)
  return findScheduledJourney(from, to, date, time, network);
}

/**
 * Build the back-to-search URL, preserving origin, destination, and
 * optionally network so the form is pre-filled when the user returns.
 */
function buildBackLink(params: {
  from?: string;
  to?: string;
  network?: string;
  isRouteOverview: boolean;
}): string {
  const url = new URLSearchParams();
  if (params.from) url.set("from", params.from);
  if (params.to) url.set("to", params.to);
  if (params.network) url.set("network", params.network);
  const qs = url.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * Build the URL for the "Search again with your network selected" link.
 * Always adds network=open to pre-open the network accordion (without
 * pre-selecting any radio button). Adds mode=timed if date/time present
 * so the date/time accordion also opens.
 */
function buildNetworkNoticeLink(params: {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
}): string {
  const url = new URLSearchParams();
  if (params.from) url.set("from", params.from);
  if (params.to) url.set("to", params.to);
  if (params.date) url.set("date", params.date);
  if (params.time) url.set("time", params.time);
  if (params.date && params.time) url.set("mode", "timed");
  url.set("network", "open");
  return `/?${url.toString()}`;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;

  const hasRouteParams = params.from && params.to;

  // If essential params are missing, show an error rather than guessing
  if (!hasRouteParams) {
    return (
      <main id="main-content">
        <h1>No journey selected</h1>
        <p>
          Choose a departure and arrival station to check your signal.
        </p>
        <nav aria-label="Page navigation" className="ts-results-nav">
          <Link href="/" className="ts-back-link">
            Back to search
          </Link>
        </nav>
      </main>
    );
  }

  // Route-overview mode: no date or time params
  const isRouteOverview = !params.date && !params.time;

  let journey: Journey | null;

  if (isRouteOverview) {
    journey = findTypicalJourney(
      params.from!,
      params.to!,
      params.network || "",
    );
  } else {
    journey = await fetchJourney(
      params.from!,
      params.to!,
      params.date || getTodayISO(),
      params.time || "00:00",
      params.network || "",
    );
  }

  const backLink = buildBackLink({
    from: params.from,
    to: params.to,
    network: params.network,
    isRouteOverview,
  });

  // No matching service or route found
  if (!journey) {
    const fromCode = params.from!.toUpperCase();
    const toCode = params.to!.toUpperCase();

    if (isRouteOverview) {
      return (
        <main id="main-content">
          <h1>No route found</h1>
          <p>
            We could not find a route from {fromCode} to {toCode} in
            the timetable. Check the station names and try again.
          </p>
          <nav aria-label="Page navigation" className="ts-results-nav">
            <Link href={backLink} className="ts-back-link">
              Back to search
            </Link>
          </nav>
        </main>
      );
    }

    const dateDisplay = params.date ? formatDate(params.date) : "the selected date";
    const timeDisplay = params.time || "any time";

    return (
      <main id="main-content">
        <h1>No service found</h1>
        <p>
          We could not find a train from {fromCode} to {toCode} on{" "}
          {dateDisplay} at {timeDisplay}. The timetable covers today
          and up to 8 weeks ahead.
        </p>
        <p>
          Check the station names and date, then try again.
        </p>
        <nav aria-label="Page navigation" className="ts-results-nav">
          <Link href={backLink} className="ts-back-link">
            Back to search
          </Link>
        </nav>
      </main>
    );
  }

  const heading = `${journey.origin.name} to ${journey.destination.name} signal`;

  // Compute signal profile server-side
  const signalProfile = getJourneySignal(journey);

  // Network name to show -- prefer URL param, fall back to journey data.
  // Empty string means no network was selected (worst-case mode).
  const networkName = params.network || journey.network || "";

  // Find the best window for a call on this journey
  const bestWindow = findBestWindow(journey, signalProfile);

  return (
    <main id="main-content">
      <a href="#journey-table" className="ts-skip-link">
        Skip to journey details
      </a>

      <h1>{heading}</h1>

      {isRouteOverview && (
        <p className="ts-route-subtitle">
          Typical stopping pattern. Times and signal may vary by train.
        </p>
      )}

      <BestWindow
        window={bestWindow}
        networkName={networkName || "all networks"}
      />

      {networkName ? (
        <p>Showing expected signal for {networkName} on this route.</p>
      ) : (
        <div
          className="ts-notice ts-notice--network"
          role="note"
          aria-label="Network notice"
        >
          <p>
            No mobile network selected. These results show the worst expected signal
            across EE, O2, Vodafone, and Three. If you know your network, results
            will be more accurate.
          </p>
          <p className="ts-notice__action">
            <a
              className="ts-notice__link"
              href={buildNetworkNoticeLink({
                from: params.from,
                to: params.to,
                date: params.date,
                time: params.time,
              })}
            >
              Search again with your network selected
            </a>
          </p>
        </div>
      )}

      <p className="ts-notice ts-notice--vintage">
        Signal data is based on Ofcom rail measurements from 2018 and 2019.
        Results show expected signal, not a guarantee. Coverage may have
        improved since then.
      </p>

      <JourneyTimeline journey={journey} signalProfile={signalProfile} />

      <VisualTimeline journey={journey} signalProfile={signalProfile} />

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href={backLink} className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
