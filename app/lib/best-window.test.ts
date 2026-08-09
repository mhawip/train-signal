import { describe, it, expect } from "vitest";
import { findBestWindow } from "./best-window";
import type { Journey, CallingPoint } from "@/app/lib/journey-types";
import type { SegmentSignal } from "@/app/lib/signal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal CallingPoint for testing. */
function cp(
  name: string,
  crs: string,
  arrival: string | null,
  departure: string | null
): CallingPoint {
  return {
    name,
    crs,
    scheduledArrival: arrival,
    scheduledDeparture: departure,
  };
}

/** Build a minimal SegmentSignal for testing. */
function seg(
  band: SegmentSignal["band"],
  confidence: SegmentSignal["confidence"] = "high"
): SegmentSignal {
  return { band, confidence, coveredNodes: 10, totalNodes: 10, tunnels: [] };
}

/** Build a Journey from a list of calling points. */
function journey(points: CallingPoint[], network = "EE"): Journey {
  return {
    origin: points[0],
    destination: points[points.length - 1],
    callingPoints: points,
    network,
    date: "2026-07-14",
  };
}

// ---------------------------------------------------------------------------
// Fixture journey: Leeds -> KGX via WKF, DON, GRA, PBR
// 5 segments: LDS->WKF, WKF->DON, DON->GRA, GRA->PBR, PBR->KGX
// ---------------------------------------------------------------------------

const FIXTURE_POINTS: CallingPoint[] = [
  cp("Leeds", "LDS", null, "14:12"),
  cp("Wakefield Westgate", "WKF", "14:25", "14:27"),
  cp("Doncaster", "DON", "14:44", "14:46"),
  cp("Grantham", "GRA", "15:14", "15:16"),
  cp("Peterborough", "PBR", "15:39", "15:41"),
  cp("London Kings Cross", "KGX", "16:27", null),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("findBestWindow", () => {
  it("returns the full journey when all segments are video", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("video"),
      seg("video"),
      seg("video"),
      seg("video"),
      seg("video"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.startTime).toBe("14:12");
    expect(result!.endTime).toBe("16:27");
    expect(result!.quality).toBe("video");
    expect(result!.confidence).toBe("high");
    expect(result!.startStation).toBe("Leeds");
    expect(result!.endStation).toBe("London Kings Cross");
    // Duration: 14:12 to 16:27 = 135 minutes
    expect(result!.durationMinutes).toBe(135);
  });

  it("finds the longest run when none segments break the journey", () => {
    const j = journey(FIXTURE_POINTS);
    // Segments: video, NONE, video, video, video
    // Run 1: segment 0 only (LDS->WKF, 14:12-14:25 = 13 min)
    // Run 2: segments 2-4 (DON->GRA->PBR->KGX, 14:46-16:27 = 101 min)
    const profile: SegmentSignal[] = [
      seg("video"),
      seg("none"),
      seg("video"),
      seg("video"),
      seg("video"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.startTime).toBe("14:46");
    expect(result!.endTime).toBe("16:27");
    expect(result!.durationMinutes).toBe(101);
    expect(result!.startStation).toBe("Doncaster");
    expect(result!.endStation).toBe("London Kings Cross");
  });

  it("returns quality voice when the run mixes video and voice", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("video"),
      seg("voice"),
      seg("video"),
      seg("video"),
      seg("video"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    // All segments are usable, so it is one continuous run
    expect(result!.quality).toBe("voice");
    expect(result!.durationMinutes).toBe(135);
  });

  it("returns quality voice when only voice segments exist", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("voice"),
      seg("voice"),
      seg("voice"),
      seg("voice"),
      seg("voice"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.quality).toBe("voice");
  });

  it("returns null when no segments are usable", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("none"),
      seg("none"),
      seg("no-data"),
      seg("unknown"),
      seg("none"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).toBeNull();
  });

  it("returns null for a single no-data segment", () => {
    const points = [
      cp("A", "AAA", null, "10:00"),
      cp("B", "BBB", "10:30", null),
    ];
    const j = journey(points);
    const profile: SegmentSignal[] = [seg("no-data")];

    const result = findBestWindow(j, profile);

    expect(result).toBeNull();
  });

  it("returns null when signal profile is empty", () => {
    const j = journey(FIXTURE_POINTS);
    const result = findBestWindow(j, []);
    expect(result).toBeNull();
  });

  it("propagates low confidence from any segment in the run", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("video", "high"),
      seg("video", "low"),
      seg("video", "high"),
      seg("video", "high"),
      seg("video", "high"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("low");
  });

  it("propagates no-data confidence as low", () => {
    const j = journey(FIXTURE_POINTS);
    const profile: SegmentSignal[] = [
      seg("video", "high"),
      seg("video", "no-data"),
      seg("video", "high"),
      seg("video", "high"),
      seg("video", "high"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("low");
  });

  it("prefers the earlier run when durations are equal", () => {
    // Two runs of equal length, separated by a none segment.
    // 4 stops, 3 segments: video, none, video
    const points = [
      cp("A", "AAA", null, "10:00"),
      cp("B", "BBB", "10:30", "10:32"),
      cp("C", "CCC", "11:02", "11:04"),
      cp("D", "DDD", "11:34", null),
    ];
    const j = journey(points);
    // Segment 0: A->B (30 min), Segment 1: B->C (30 min), Segment 2: C->D (30 min)
    const profile: SegmentSignal[] = [
      seg("video"),
      seg("none"),
      seg("video"),
    ];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    // Both runs are 30 minutes; earlier run (segment 0) wins
    expect(result!.startTime).toBe("10:00");
    expect(result!.endTime).toBe("10:30");
    expect(result!.startStation).toBe("A");
  });

  it("handles midnight crossing via elapsedMinutes", () => {
    const points = [
      cp("A", "AAA", null, "23:30"),
      cp("B", "BBB", "00:15", null),
    ];
    const j = journey(points);
    const profile: SegmentSignal[] = [seg("video")];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.durationMinutes).toBe(45);
    expect(result!.startTime).toBe("23:30");
    expect(result!.endTime).toBe("00:15");
  });

  it("skips runs where start time is null and tries the next", () => {
    // Origin has no departure time (unusual but possible)
    const points = [
      cp("A", "AAA", null, null),      // no departure
      cp("B", "BBB", "10:30", "10:32"),
      cp("C", "CCC", "11:02", null),
    ];
    const j = journey(points);
    const profile: SegmentSignal[] = [seg("video"), seg("video")];

    const result = findBestWindow(j, profile);

    // The full run (segments 0-1) cannot compute a start time from
    // callingPoints[0].scheduledDeparture (null). But the run still
    // gets skipped. The algorithm finds no valid run.
    // Actually, segment 0 starts at callingPoints[0].scheduledDeparture
    // which is null, so the entire run (0-1) is skipped. No other runs.
    expect(result).toBeNull();
  });

  it("works for a single usable segment", () => {
    const points = [
      cp("A", "AAA", null, "09:00"),
      cp("B", "BBB", "09:45", null),
    ];
    const j = journey(points);
    const profile: SegmentSignal[] = [seg("voice")];

    const result = findBestWindow(j, profile);

    expect(result).not.toBeNull();
    expect(result!.startTime).toBe("09:00");
    expect(result!.endTime).toBe("09:45");
    expect(result!.durationMinutes).toBe(45);
    expect(result!.quality).toBe("voice");
    expect(result!.startStation).toBe("A");
    expect(result!.endStation).toBe("B");
  });
});
