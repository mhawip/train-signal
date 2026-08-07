import Link from "next/link";
import type { Metadata } from "next";
import { JourneyTimeline } from "@/app/components/JourneyTimeline";
import type { Journey } from "@/app/lib/journey-types";

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

  // Always show the fixture journey for now; real data comes in a future task
  const journey = FIXTURE_JOURNEY;

  // If the user provided URL params, acknowledge them in the heading
  const hasParams = Boolean(params.from && params.to);
  const heading = `${journey.origin.name} to ${journey.destination.name}`;

  return (
    <main>
      <a href="#journey-table" className="ts-skip-link">
        Skip to journey details
      </a>

      <h1>{heading}</h1>

      <p className="ts-notice">
        This is example data. Live journey data will be shown once the timetable
        integration is complete.
      </p>

      {hasParams && params.network && (
        <p>
          Showing expected signal for {params.network} on this route.
        </p>
      )}

      <JourneyTimeline journey={journey} />

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href="/" className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
