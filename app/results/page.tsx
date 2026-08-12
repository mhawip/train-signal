import Link from "next/link";
import type { Metadata } from "next";
import { JourneyTimeline } from "@/app/components/JourneyTimeline";
import { VisualTimeline } from "@/app/components/VisualTimeline";
import { BestWindow } from "@/app/components/BestWindow";
import { getJourneySignal } from "@/app/lib/signal";
import { findBestWindow } from "@/app/lib/best-window";
import type { Journey } from "@/app/lib/journey-types";
import { fetchDepartures } from "@/app/lib/darwin";
import { getTodayISO } from "@/app/lib/journey-params";

/**
 * Fixture journey for display while the timetable API integration
 * is incomplete (P1-01 and P1-02 are blocked on credentials).
 *
 * Route: Leeds to London Kings Cross via ECML, a well-known service.
 * Times are representative of a typical LNER service.
 */
const FIXTURE_JOURNEY: Journey = {
  origin: {
    crs: "LDS",
    name: "Leeds",
    scheduledArrival: null,
    scheduledDeparture: "14:12",
  },
  destination: {
    crs: "KGX",
    name: "London Kings Cross",
    scheduledArrival: "16:27",
    scheduledDeparture: null,
  },
  callingPoints: [
    {
      crs: "LDS",
      name: "Leeds",
      scheduledArrival: null,
      scheduledDeparture: "14:12",
    },
    {
      crs: "WKF",
      name: "Wakefield Westgate",
      scheduledArrival: "14:25",
      scheduledDeparture: "14:27",
    },
    {
      crs: "DON",
      name: "Doncaster",
      scheduledArrival: "14:44",
      scheduledDeparture: "14:46",
    },
    {
      crs: "GRA",
      name: "Grantham",
      scheduledArrival: "15:14",
      scheduledDeparture: "15:16",
    },
    {
      crs: "PBR",
      name: "Peterborough",
      scheduledArrival: "15:39",
      scheduledDeparture: "15:41",
    },
    {
      crs: "KGX",
      name: "London Kings Cross",
      scheduledArrival: "16:27",
      scheduledDeparture: null,
    },
  ],
  network: "EE",
  date: "2026-07-14",
};

interface ResultsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    network?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ResultsPageProps): Promise<Metadata> {
  const params = await searchParams;

  // Use fixture journey names for now; real data will replace this
  const journey = FIXTURE_JOURNEY;
  const origin = journey.origin.name;
  const destination = journey.destination.name;
  const dateStr = params.date || journey.date;

  // Format date for the title
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
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
  const monthIndex = Number(monthStr) - 1;
  const formattedDate = `${Number(dayStr)} ${months[monthIndex]} ${yearStr}`;

  return {
    title: `${origin} to ${destination}, ${formattedDate} — Train Signal`,
  };
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;

  // Try live Darwin data for today's journeys
  let journey: Journey = FIXTURE_JOURNEY;
  let isLiveData = false;

  const today = getTodayISO();
  const hasRouteParams = params.from && params.to;

  if (hasRouteParams && params.date === today) {
    const liveJourney = await fetchDepartures(
      params.from!,
      params.to!,
      params.date!,
      params.time || "00:00",
      params.network || "EE",
    );
    if (liveJourney) {
      journey = liveJourney;
      isLiveData = true;
    }
  }

  const heading = `${journey.origin.name} to ${journey.destination.name}`;

  // Compute signal profile server-side
  const signalProfile = getJourneySignal(journey);

  // Network name to show -- prefer URL param, fall back to journey data
  const networkName = params.network || journey.network;

  // Find the best window for a call on this journey
  const bestWindow = findBestWindow(journey, signalProfile);

  return (
    <main id="main-content">
      <a href="#journey-table" className="ts-skip-link">
        Skip to journey details
      </a>

      <h1>{heading}</h1>

      <BestWindow window={bestWindow} networkName={networkName} />

      {isLiveData ? (
        <p className="ts-notice">
          Showing live journey data for today.
        </p>
      ) : (
        <p className="ts-notice">
          This is example data. Live journey data is only available for
          today&#39;s services.
        </p>
      )}

      <p>
        Showing expected signal for {networkName} on this route.
      </p>

      <p className="ts-notice ts-notice--vintage">
        Signal data is based on Ofcom rail measurements from 2018 and 2019.
        Results show expected signal, not a guarantee. Coverage may have
        improved since then.
      </p>

      <JourneyTimeline journey={journey} signalProfile={signalProfile} />

      <VisualTimeline journey={journey} signalProfile={signalProfile} />

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href="/" className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
