import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchDepartures, parseDarwinResponse, parseDarwinDepartureList } from "./darwin";
import * as journeyParams from "@/app/lib/journey-params";
import darwinFixture from "./__fixtures__/darwin-lds-kgx.json";

// Mock getTodayISO so we can control the "today" check
vi.mock("@/app/lib/journey-params", async () => {
  const actual = await vi.importActual<typeof journeyParams>(
    "@/app/lib/journey-params",
  );
  return {
    ...actual,
    getTodayISO: vi.fn(() => "2026-08-12"),
  };
});

describe("parseDarwinResponse", () => {
  it("parses a valid fixture into a correct Journey", () => {
    const journey = parseDarwinResponse(
      darwinFixture,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).not.toBeNull();
    expect(journey!.origin.crs).toBe("LDS");
    expect(journey!.origin.name).toBe("Leeds");
    expect(journey!.destination.crs).toBe("KGX");
    expect(journey!.destination.name).toBe("London Kings Cross");
    expect(journey!.network).toBe("EE");
    expect(journey!.date).toBe("2026-08-12");
    expect(journey!.callingPoints.length).toBe(6);
  });

  it("sets origin with no scheduledArrival and terminus with no scheduledDeparture", () => {
    const journey = parseDarwinResponse(
      darwinFixture,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).not.toBeNull();
    // Origin: no arrival, has departure
    expect(journey!.origin.scheduledArrival).toBeNull();
    expect(journey!.origin.scheduledDeparture).toBe("14:12");
    // Terminus: has arrival, no departure
    expect(journey!.destination.scheduledArrival).toBe("16:27");
    expect(journey!.destination.scheduledDeparture).toBeNull();
  });

  it("picks the first service departing at or after the requested time", () => {
    // Request time 15:00 should pick the second service (15:00 departure)
    const journey = parseDarwinResponse(
      darwinFixture,
      "LDS",
      "KGX",
      "2026-08-12",
      "15:00",
      "Three",
    );

    expect(journey).not.toBeNull();
    expect(journey!.origin.scheduledDeparture).toBe("15:00");
    expect(journey!.destination.scheduledArrival).toBe("17:12");
    expect(journey!.network).toBe("Three");
    // Second service has 4 calling points (LDS, WKF, DON, KGX)
    expect(journey!.callingPoints.length).toBe(4);
  });

  it("returns null when no services match the requested time", () => {
    const journey = parseDarwinResponse(
      darwinFixture,
      "LDS",
      "KGX",
      "2026-08-12",
      "23:00",
      "EE",
    );

    expect(journey).toBeNull();
  });

  it("returns null for an empty service list", () => {
    const emptyResponse = {
      GetStationBoardResult: {
        locationName: "Leeds",
        crs: "LDS",
        trainServices: {
          service: [],
        },
      },
    };

    const journey = parseDarwinResponse(
      emptyResponse,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).toBeNull();
  });

  it("returns null when trainServices is missing", () => {
    const noServicesResponse = {
      GetStationBoardResult: {
        locationName: "Leeds",
        crs: "LDS",
      },
    };

    const journey = parseDarwinResponse(
      noServicesResponse,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).toBeNull();
  });

  it("returns null when GetStationBoardResult is missing", () => {
    const malformedResponse = {} as never;

    const journey = parseDarwinResponse(
      malformedResponse,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).toBeNull();
  });

  it("includes correct intermediate calling points", () => {
    const journey = parseDarwinResponse(
      darwinFixture,
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "EE",
    );

    expect(journey).not.toBeNull();
    const crsSequence = journey!.callingPoints.map((cp) => cp.crs);
    expect(crsSequence).toEqual(["LDS", "WKF", "DON", "GRA", "PBR", "KGX"]);

    // Check intermediate points have both arrival and departure
    const wakefield = journey!.callingPoints[1];
    expect(wakefield.scheduledArrival).toBe("14:25");
    expect(wakefield.scheduledDeparture).toBe("14:25");
  });
});

describe("parseDarwinDepartureList", () => {
  it("returns departures from the fixture", () => {
    // Fixture has two services: 14:12 and 15:00
    // Requesting time 14:30 should give 1 before (14:12) and 1 at-or-after (15:00)
    const result = parseDarwinDepartureList(darwinFixture, "KGX", "14:30");

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe("14:12");
    expect(result[0].arrivalTime).toBe("16:27");
    expect(result[0].originName).toBe("Leeds");
    expect(result[0].destinationName).toBe("London Kings Cross");
    expect(result[1].departureTime).toBe("15:00");
    expect(result[1].arrivalTime).toBe("17:12");
  });

  it("returns all services at-or-after when none depart before", () => {
    // Both services (14:12, 15:00) are at or after 14:00
    const result = parseDarwinDepartureList(darwinFixture, "KGX", "14:00");

    expect(result).toHaveLength(2);
    expect(result[0].departureTime).toBe("14:12");
    expect(result[1].departureTime).toBe("15:00");
  });

  it("returns only the before-service when all depart before requested time", () => {
    // Both services (14:12, 15:00) depart before 23:00
    const result = parseDarwinDepartureList(darwinFixture, "KGX", "23:00");

    // Should return just the last one before (15:00)
    expect(result).toHaveLength(1);
    expect(result[0].departureTime).toBe("15:00");
  });

  it("returns an empty array when no services call at destination", () => {
    const result = parseDarwinDepartureList(darwinFixture, "MAN", "14:00");
    expect(result).toHaveLength(0);
  });

  it("returns an empty array for an empty board", () => {
    const emptyResponse = {
      GetStationBoardResult: {
        locationName: "Leeds",
        crs: "LDS",
      },
    };
    const result = parseDarwinDepartureList(emptyResponse as never, "KGX", "14:00");
    expect(result).toHaveLength(0);
  });

  it("returns an empty array for a missing board", () => {
    const result = parseDarwinDepartureList({} as never, "KGX", "14:00");
    expect(result).toHaveLength(0);
  });
});

describe("fetchDepartures", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.mocked(journeyParams.getTodayISO).mockReturnValue("2026-08-12");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns null for a non-today date without calling fetch", async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    // Set env var so the null isn't from missing key
    const originalKey = process.env.DARWIN_API_KEY;
    process.env.DARWIN_API_KEY = "test-key";

    const result = await fetchDepartures("LDS", "KGX", "2026-09-01", "14:00");

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    process.env.DARWIN_API_KEY = originalKey;
  });

  it("returns null when the API key is not set", async () => {
    const originalKey = process.env.DARWIN_API_KEY;
    delete process.env.DARWIN_API_KEY;

    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const result = await fetchDepartures("LDS", "KGX", "2026-08-12", "14:00");

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    process.env.DARWIN_API_KEY = originalKey;
  });

  it("returns null when the API returns an error status", async () => {
    const originalKey = process.env.DARWIN_API_KEY;
    process.env.DARWIN_API_KEY = "test-key";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await fetchDepartures("LDS", "KGX", "2026-08-12", "14:00");

    expect(result).toBeNull();

    process.env.DARWIN_API_KEY = originalKey;
  });

  it("returns null when fetch throws a network error", async () => {
    const originalKey = process.env.DARWIN_API_KEY;
    process.env.DARWIN_API_KEY = "test-key";

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const result = await fetchDepartures("LDS", "KGX", "2026-08-12", "14:00");

    expect(result).toBeNull();

    process.env.DARWIN_API_KEY = originalKey;
  });

  it("returns a valid Journey when the API returns good data", async () => {
    const originalKey = process.env.DARWIN_API_KEY;
    process.env.DARWIN_API_KEY = "test-key";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(darwinFixture),
    });

    const result = await fetchDepartures(
      "LDS",
      "KGX",
      "2026-08-12",
      "14:00",
      "Vodafone",
    );

    expect(result).not.toBeNull();
    expect(result!.origin.crs).toBe("LDS");
    expect(result!.destination.crs).toBe("KGX");
    expect(result!.network).toBe("Vodafone");

    process.env.DARWIN_API_KEY = originalKey;
  });
});
