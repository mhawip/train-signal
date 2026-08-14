import { describe, it, expect, beforeEach } from "vitest";
import {
  findScheduledJourney,
  findScheduledDepartures,
  _setScheduleData,
  _resetScheduleData,
  getDayIndex,
  isCancelled,
  decodeSchedule,
  decodeCancellation,
} from "./schedule";
import type { ScheduleIndex } from "./schedule";

// ---------------------------------------------------------------------------
// Compact encoding helpers (mirror pipeline output format)
// ---------------------------------------------------------------------------

/**
 * Encode a schedule with route-table format.
 * The route table is managed externally; this helper just builds the string.
 *
 * Format: "uid|stp|YYYYMMDD|YYYYMMDD|daysRun|routeIdx|arr/dep arr/dep ..."
 */
function enc(
  uid: string,
  stp: string,
  from: string,
  to: string,
  days: string,
  routeIdx: number,
  calls: Array<{ a?: string; d?: string }>,
): string {
  const compactDate = (d: string) => d.replace(/-/g, "");
  const compactTime = (t?: string) => (t ? t.replace(":", "") : "");
  const times = calls
    .map((cp) => `${compactTime(cp.a)}/${compactTime(cp.d)}`)
    .join(" ");
  return `${uid}|${stp}|${compactDate(from)}|${compactDate(to)}|${days}|${routeIdx}|${times}`;
}

/**
 * Encode a cancellation as "uid|YYYYMMDD|YYYYMMDD|daysRun".
 */
function encCancel(uid: string, from: string, to: string, days: string): string {
  const compactDate = (d: string) => d.replace(/-/g, "");
  return `${uid}|${compactDate(from)}|${compactDate(to)}|${days}`;
}

/**
 * Build a minimal ScheduleIndex with the given routes, encoded schedules,
 * and cancellations. Automatically builds the byOrigin index.
 */
function makeIndex(
  routes: string[],
  schedules: string[],
  cancellations: string[] = [],
): ScheduleIndex {
  const byOrigin: Record<string, number[]> = {};
  for (let i = 0; i < schedules.length; i++) {
    const decoded = decodeSchedule(schedules[i], routes);
    const origin = decoded.p[0].c;
    if (!byOrigin[origin]) byOrigin[origin] = [];
    byOrigin[origin].push(i);
  }
  return {
    generated: "2026-08-12T00:00:00.000Z",
    scheduleCount: schedules.length,
    routes,
    schedules,
    cancellations,
    byOrigin,
  };
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

// Route table: index 0 = LDS,WKF,KGX; 1 = LDS,DON,KGX; 2 = LDS,KGX
const ROUTES = ["LDS,WKF,KGX", "LDS,DON,KGX", "LDS,KGX"];

// A permanent Mon-Fri service: LDS 14:12 -> WKF 14:25/14:27 -> KGX 16:27
const SERVICE_A = enc(
  "W12345", "P", "2026-08-01", "2026-12-14", "1111100", 0,
  [{ d: "14:12" }, { a: "14:25", d: "14:27" }, { a: "16:27" }],
);

// A later Mon-Fri service: LDS 15:00 -> DON 15:30/15:32 -> KGX 17:12
const SERVICE_B = enc(
  "W12346", "P", "2026-08-01", "2026-12-14", "1111100", 1,
  [{ d: "15:00" }, { a: "15:30", d: "15:32" }, { a: "17:12" }],
);

// Sunday-only service: LDS -> KGX direct
const SERVICE_SUNDAY = enc(
  "W12347", "P", "2026-08-01", "2026-12-14", "0000001", 2,
  [{ d: "10:00" }, { a: "12:30" }],
);

// An overlay for SERVICE_A on a specific date range (same UID, route 0)
const SERVICE_A_OVERLAY = enc(
  "W12345", "O", "2026-08-10", "2026-08-14", "1111100", 0,
  [{ d: "14:15" }, { a: "14:28", d: "14:30" }, { a: "16:30" }],
);

// ---------------------------------------------------------------------------
// Decoding tests
// ---------------------------------------------------------------------------

describe("decodeSchedule", () => {
  it("decodes a compact schedule string with route table", () => {
    const decoded = decodeSchedule(SERVICE_A, ROUTES);
    expect(decoded.u).toBe("W12345");
    expect(decoded.s).toBe("P");
    expect(decoded.f).toBe("2026-08-01");
    expect(decoded.t).toBe("2026-12-14");
    expect(decoded.w).toBe("1111100");
    expect(decoded.p).toHaveLength(3);
    expect(decoded.p[0]).toEqual({ c: "LDS", d: "14:12" });
    expect(decoded.p[1]).toEqual({ c: "WKF", a: "14:25", d: "14:27" });
    expect(decoded.p[2]).toEqual({ c: "KGX", a: "16:27" });
  });
});

describe("decodeCancellation", () => {
  it("decodes a compact cancellation string", () => {
    const encoded = encCancel("W12345", "2026-08-10", "2026-08-14", "1111100");
    const decoded = decodeCancellation(encoded);
    expect(decoded.u).toBe("W12345");
    expect(decoded.f).toBe("2026-08-10");
    expect(decoded.t).toBe("2026-08-14");
    expect(decoded.w).toBe("1111100");
  });
});

// ---------------------------------------------------------------------------
// Day-of-week tests
// ---------------------------------------------------------------------------

describe("getDayIndex", () => {
  it("returns 0 for Monday", () => {
    expect(getDayIndex("2026-08-10")).toBe(0);
  });

  it("returns 6 for Sunday", () => {
    expect(getDayIndex("2026-08-16")).toBe(6);
  });

  it("returns 2 for Wednesday", () => {
    expect(getDayIndex("2026-08-12")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Cancellation check tests
// ---------------------------------------------------------------------------

describe("isCancelled", () => {
  const cancellations = [
    { u: "W12345", f: "2026-08-10", t: "2026-08-14", w: "1111100" },
  ];

  it("returns true when UID, date, and day match", () => {
    expect(isCancelled("W12345", "2026-08-12", 2, cancellations)).toBe(true);
  });

  it("returns false for a different UID", () => {
    expect(isCancelled("W99999", "2026-08-12", 2, cancellations)).toBe(false);
  });

  it("returns false when date is outside cancellation range", () => {
    expect(isCancelled("W12345", "2026-08-20", 2, cancellations)).toBe(false);
  });

  it("returns false when day does not match", () => {
    expect(isCancelled("W12345", "2026-08-16", 6, cancellations)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findScheduledJourney tests
// ---------------------------------------------------------------------------

describe("findScheduledJourney", () => {
  beforeEach(() => {
    _resetScheduleData();
  });

  it("returns null when schedule data is missing", () => {
    _setScheduleData(null);
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 1. Happy path: service found between LDS and KGX on a weekday
  it("finds a service between LDS and KGX on a weekday", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:00", "EE");

    expect(result).not.toBeNull();
    expect(result!.origin.crs).toBe("LDS");
    expect(result!.origin.scheduledDeparture).toBe("14:12");
    expect(result!.destination.crs).toBe("KGX");
    expect(result!.destination.scheduledArrival).toBe("16:27");
    expect(result!.network).toBe("EE");
    expect(result!.date).toBe("2026-08-12");
    expect(result!.callingPoints).toHaveLength(3);
  });

  // 2. Date before schedule_start_date -> null
  it("returns null when date is before schedule start", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledJourney("LDS", "KGX", "2026-07-01", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 3. Date after schedule_end_date -> null
  it("returns null when date is after schedule end", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledJourney("LDS", "KGX", "2027-01-01", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 4. Wrong day-of-week -> null (Sunday when service runs Mon-Fri)
  it("returns null when the day of week does not match", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-16", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 5. Active cancellation on requested date -> null
  it("returns null when the service is cancelled on the requested date", () => {
    const cancellations = [
      encCancel("W12345", "2026-08-10", "2026-08-14", "1111100"),
    ];
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A], cancellations));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 6. STP overlay alongside permanent: overlay returned, not permanent
  it("returns the overlay schedule when both overlay and permanent exist for same UID", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_A_OVERLAY]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:00", "EE");

    expect(result).not.toBeNull();
    expect(result!.origin.scheduledDeparture).toBe("14:15");
    expect(result!.destination.scheduledArrival).toBe("16:30");
  });

  // 7. No service calls at destination -> null
  it("returns null when no service calls at the destination", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledJourney("LDS", "MAN", "2026-08-12", "14:00", "EE");
    expect(result).toBeNull();
  });

  // 8. Requested time is after all services depart -> null
  it("returns null when requested time is after all departures", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "23:00", "EE");
    expect(result).toBeNull();
  });

  // 9. Two services match, picks the earlier departure time
  it("picks the earlier departure when two services match", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:00", "EE");

    expect(result).not.toBeNull();
    expect(result!.origin.scheduledDeparture).toBe("14:12");
  });

  it("picks SERVICE_B when time requested is after SERVICE_A departs", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-12", "14:13", "EE");

    expect(result).not.toBeNull();
    expect(result!.origin.scheduledDeparture).toBe("15:00");
  });

  it("handles case-insensitive CRS codes", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledJourney("lds", "kgx", "2026-08-12", "14:00", "EE");

    expect(result).not.toBeNull();
    expect(result!.origin.crs).toBe("LDS");
    expect(result!.destination.crs).toBe("KGX");
  });

  it("returns a Sunday service on Sunday", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_SUNDAY]));
    const result = findScheduledJourney("LDS", "KGX", "2026-08-16", "09:00", "Three");

    expect(result).not.toBeNull();
    expect(result!.origin.scheduledDeparture).toBe("10:00");
    expect(result!.network).toBe("Three");
  });

  it("trims calling points to only stops between origin and destination", () => {
    // Extended route: LDS,WKF,DON,KGX,STP
    const extRoutes = [...ROUTES, "LDS,WKF,DON,KGX,STP"];
    const extService = enc(
      "W99999", "P", "2026-08-01", "2026-12-14", "1111100", 3,
      [
        { d: "14:00" },
        { a: "14:15", d: "14:17" },
        { a: "14:30", d: "14:32" },
        { a: "16:00", d: "16:05" },
        { a: "16:20" },
      ],
    );
    _setScheduleData(makeIndex(extRoutes, [extService]));

    const result = findScheduledJourney("LDS", "DON", "2026-08-12", "13:00", "EE");
    expect(result).not.toBeNull();
    expect(result!.callingPoints).toHaveLength(3);
    expect(result!.callingPoints.map((cp) => cp.crs)).toEqual(["LDS", "WKF", "DON"]);
  });
});

// ---------------------------------------------------------------------------
// findScheduledDepartures tests
// ---------------------------------------------------------------------------

describe("findScheduledDepartures", () => {
  beforeEach(() => {
    _resetScheduleData();
  });

  it("returns empty array when schedule data is missing", () => {
    _setScheduleData(null);
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "14:00");
    expect(result).toEqual([]);
  });

  it("returns 1 before and 1 at-or-after when both exist", () => {
    // SERVICE_A departs 14:12, SERVICE_B departs 15:00
    // Requested time 14:30 -> A is before, B is at-or-after
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "14:30");

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe("14:12");
    expect(result[0].arrivalTime).toBe("16:27");
    expect(result[1].departureTime).toBe("15:00");
    expect(result[1].arrivalTime).toBe("17:12");
  });

  it("returns all at-or-after when none depart before", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "14:00");

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe("14:12");
    expect(result[1].departureTime).toBe("15:00");
  });

  it("returns only the closest before when all depart before requested time", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B]));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "23:00");

    // Only the closest before (15:00)
    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe("15:00");
  });

  it("returns empty array when no services match the route", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledDepartures("LDS", "MAN", "2026-08-12", "14:00");
    expect(result).toEqual([]);
  });

  it("returns empty array when date is outside validity range", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledDepartures("LDS", "KGX", "2027-01-01", "14:00");
    expect(result).toEqual([]);
  });

  it("returns empty array on wrong day of week", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    // Sunday -- SERVICE_A runs Mon-Fri
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-16", "14:00");
    expect(result).toEqual([]);
  });

  it("excludes cancelled services", () => {
    const cancellations = [
      encCancel("W12345", "2026-08-10", "2026-08-14", "1111100"),
    ];
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_B], cancellations));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "14:00");

    // SERVICE_A is cancelled, only SERVICE_B remains
    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe("15:00");
  });

  it("resolves STP overlay over permanent for same UID", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A, SERVICE_A_OVERLAY, SERVICE_B]));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "14:00");

    // Overlay replaces permanent for W12345: departs 14:15 instead of 14:12
    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe("14:15");
    expect(result[1].departureTime).toBe("15:00");
  });

  it("limits to 4 services at-or-after", () => {
    // Create 6 services all at or after 10:00
    const manyRoutes = [...ROUTES];
    const services: string[] = [];
    for (let i = 0; i < 6; i++) {
      const hour = 10 + i;
      const hourStr = String(hour).padStart(2, "0");
      const arrHour = hour + 2;
      const arrStr = String(arrHour).padStart(2, "0");
      services.push(
        enc(
          `S${i}`, "P", "2026-08-01", "2026-12-14", "1111100", 2,
          [{ d: `${hourStr}:00` }, { a: `${arrStr}:00` }],
        ),
      );
    }
    _setScheduleData(makeIndex(manyRoutes, services));
    const result = findScheduledDepartures("LDS", "KGX", "2026-08-12", "10:00");

    // Should return at most 4 at-or-after (no before available)
    expect(result).toHaveLength(4);
    expect(result[0].departureTime).toBe("10:00");
    expect(result[3].departureTime).toBe("13:00");
  });

  it("handles case-insensitive CRS codes", () => {
    _setScheduleData(makeIndex(ROUTES, [SERVICE_A]));
    const result = findScheduledDepartures("lds", "kgx", "2026-08-12", "14:00");
    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe("14:12");
  });
});
