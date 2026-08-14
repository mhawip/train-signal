/**
 * Types for journey data displayed on the results page.
 *
 * These types represent calling points and journeys as returned by the
 * timetable API (or fixtures while the API integration is incomplete).
 * Times are UK local time in "HH:MM" format; no timezone conversion
 * is needed in the display layer.
 */

export interface CallingPoint {
  /** Station CRS code, e.g. "LDS" */
  crs: string;
  /** Station name, e.g. "Leeds" */
  name: string;
  /** Arrival time "HH:MM", or null for the origin station */
  scheduledArrival: string | null;
  /** Departure time "HH:MM", or null for the terminus station */
  scheduledDeparture: string | null;
}

export interface Journey {
  origin: CallingPoint;
  destination: CallingPoint;
  /** All stops including origin and destination, in order */
  callingPoints: CallingPoint[];
  /** Mobile network: "EE", "O2", "Vodafone", or "Three" */
  network: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
}

/**
 * Summary of a single departure for the departure selection page.
 *
 * Contains just enough information to display the departure list
 * and build the results page URL. Does not include full calling
 * point data -- that is fetched on the results page.
 */
export interface DepartureSummary {
  /** Actual departure time at origin, "HH:MM" */
  departureTime: string;
  /** Actual arrival time at destination, "HH:MM" */
  arrivalTime: string;
  /** Origin station name */
  originName: string;
  /** Destination station name */
  destinationName: string;
}
