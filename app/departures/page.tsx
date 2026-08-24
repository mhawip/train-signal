import Link from "next/link";
import type { Metadata } from "next";
import { FocusHeading } from "@/app/components/FocusHeading";
import { fetchDepartureList } from "@/app/lib/darwin";
import { findScheduledDepartures } from "@/app/lib/schedule";
import { buildResultsUrl, getTodayISO } from "@/app/lib/journey-params";
import { getStationByCRS } from "@/app/lib/stations";
import type { DepartureSummary } from "@/app/lib/journey-types";
import {
  buildOgTitle,
  buildDeparturesDescription,
} from "@/app/lib/og-metadata";

interface DeparturesPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    time?: string;
    network?: string;
  }>;
}

/**
 * Format an ISO date string ("YYYY-MM-DD") into a short human-readable
 * form like "14 August". Returns the raw string if parsing fails.
 */
function formatDateShort(dateStr: string): string {
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
  return `${Number(parts[2])} ${months[monthIndex]}`;
}

/**
 * Format an ISO date string ("YYYY-MM-DD") into a full human-readable
 * form like "14 August 2026". Returns the raw string if parsing fails.
 */
function formatDateFull(dateStr: string): string {
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

/**
 * Calculate journey duration from departure and arrival times.
 * Handles overnight journeys (arrival before departure).
 */
function formatDuration(depTime: string, arrTime: string): string {
  const [dh, dm] = depTime.split(":").map(Number);
  const [ah, am] = arrTime.split(":").map(Number);
  let totalMinutes = ah * 60 + am - (dh * 60 + dm);
  // Handle overnight journeys
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

/**
 * Look up station names from CRS codes. Uses the first departure's
 * origin/destination names if available, otherwise falls back to the
 * CRS codes themselves.
 */
function getStationNames(
  departures: DepartureSummary[],
  fromCrs: string,
  toCrs: string,
): { originName: string; destName: string } {
  if (departures.length > 0) {
    return {
      originName: departures[0].originName,
      destName: departures[0].destinationName,
    };
  }
  return {
    originName: fromCrs.toUpperCase(),
    destName: toCrs.toUpperCase(),
  };
}

export async function generateMetadata({
  searchParams,
}: DeparturesPageProps): Promise<Metadata> {
  const params = await searchParams;

  if (!params.from || !params.to) {
    return { title: "Choose a departure — Train Signal" };
  }

  // Use station names (not CRS codes) in the page title for plain
  // English (3.1.5) and a meaningful title (2.4.2). Fall back to the
  // uppercased CRS code if the lookup fails.
  const fromStation = getStationByCRS(params.from);
  const toStation = getStationByCRS(params.to);
  const from = fromStation ? fromStation.name : params.from.toUpperCase();
  const to = toStation ? toStation.name : params.to.toUpperCase();
  const dateStr = params.date ? formatDateFull(params.date) : "";
  const datePart = dateStr ? `, ${dateStr}` : "";

  const ogTitle = buildOgTitle(
    from,
    to,
    params.from,
    params.to,
    "departures — Train Signal",
  );
  const ogDescription = dateStr
    ? buildDeparturesDescription(from, to, dateStr)
    : buildDeparturesDescription(from, to, "the selected date");

  return {
    title: `Choose a departure: ${from} to ${to}${datePart} — Train Signal`,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
    },
  };
}

/**
 * Build a "Back to search" URL preserving the user's form parameters.
 */
function buildBackUrl(params: {
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  network?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.date) sp.set("date", params.date);
  if (params.time) sp.set("time", params.time);
  if (params.network) sp.set("network", params.network);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * Fetch departures from the appropriate source:
 * - Today: Darwin LDBWS (live departures)
 * - Future dates: NR SCHEDULE timetable
 *
 * Returns null on error (to distinguish from an empty list).
 */
async function fetchDepartures(
  from: string,
  to: string,
  date: string,
  time: string,
): Promise<DepartureSummary[] | null> {
  try {
    const today = getTodayISO();
    if (date === today) {
      return await fetchDepartureList(from, to, date, time);
    }
    return findScheduledDepartures(from, to, date, time);
  } catch (error) {
    console.error("Failed to fetch departures:", error);
    return null;
  }
}

export default async function DeparturesPage({
  searchParams,
}: DeparturesPageProps) {
  const params = await searchParams;

  const hasRouteParams = params.from && params.to;

  // Missing essential parameters
  if (!hasRouteParams) {
    return (
      <main id="main-content">
        <FocusHeading className="ts-departure-header__heading">
          Choose a departure
        </FocusHeading>
        <p className="ts-departure-header__context">
          Choose a departure and arrival station to search for trains.
        </p>
        <nav aria-label="Page navigation" className="ts-results-nav">
          <Link href="/" className="ts-back-link">
            Back to search
          </Link>
        </nav>
      </main>
    );
  }

  const fromCrs = params.from!;
  const toCrs = params.to!;
  const date = params.date || getTodayISO();
  const time = params.time || "00:00";
  const network = params.network || "";

  const departures = await fetchDepartures(fromCrs, toCrs, date, time);

  const backUrl = buildBackUrl(params);
  const dateDisplay = formatDateShort(date);

  // Error state: fetchDepartures returned null
  if (departures === null) {
    return (
      <main id="main-content">
        <FocusHeading className="ts-departure-header__heading">
          Choose a departure
        </FocusHeading>
        <p className="ts-departure-header__context">
          Something went wrong while looking for trains. Please try again.
        </p>
        <nav aria-label="Page navigation" className="ts-results-nav">
          <Link href={backUrl} className="ts-back-link">
            Back to search
          </Link>
        </nav>
      </main>
    );
  }

  const { originName, destName } = getStationNames(
    departures,
    fromCrs,
    toCrs,
  );

  // Zero results
  if (departures.length === 0) {
    return (
      <main id="main-content">
        <FocusHeading className="ts-departure-header__heading">
          Choose a departure
        </FocusHeading>
        <p className="ts-departure-header__context">
          We could not find any trains from {originName} to {destName} on{" "}
          {dateDisplay} near {time}. Try a different date or time.
        </p>
        <nav aria-label="Page navigation" className="ts-results-nav">
          <Link href={backUrl} className="ts-back-link">
            Back to search
          </Link>
        </nav>
      </main>
    );
  }

  // Build the context sentence
  const trainWord = departures.length === 1 ? "train" : "trains";
  const contextText = `${departures.length} ${trainWord} from ${originName} to ${destName} on ${dateDisplay}, near ${time}.`;

  return (
    <main id="main-content">
      <FocusHeading className="ts-departure-header__heading">
        Choose a departure
      </FocusHeading>
      <p className="ts-departure-header__context">{contextText}</p>

      <ol className="ts-departure-list">
        {departures.map((dep) => {
          const resultsUrl = buildResultsUrl({
            from: fromCrs,
            to: toCrs,
            date,
            time: dep.departureTime,
            network,
          });
          const duration = formatDuration(dep.departureTime, dep.arrivalTime);
          const route = `${dep.originName} to ${dep.destinationName}`;

          return (
            <li key={dep.departureTime} className="ts-departure-list__item">
              <a className="ts-departure-list__link" href={resultsUrl}>
                <span className="ts-departure-list__time">
                  {dep.departureTime}
                </span>
                <span className="ts-departure-list__details">
                  <span className="ts-departure-list__route">{route}</span>
                  <span className="ts-departure-list__meta">
                    Arrives {dep.arrivalTime} &middot; {duration}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href={backUrl} className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
