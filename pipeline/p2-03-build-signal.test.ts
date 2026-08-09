/**
 * Tests for P2-03 signal pipeline: classification logic, percentile
 * calculation, grid index, and snapping.
 */

import { describe, it, expect } from "vitest";
import {
  percentile,
  classifySignal,
  haversineMetres,
  buildGridIndex,
  findNearestNode,
  THRESHOLDS,
} from "./p2-03-build-signal";

// ---------------------------------------------------------------------------
// Percentile
// ---------------------------------------------------------------------------

describe("percentile", () => {
  it("returns the single value for a one-element array", () => {
    expect(percentile([42], 10)).toBe(42);
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 90)).toBe(42);
  });

  it("returns NaN for an empty array", () => {
    expect(percentile([], 10)).toBeNaN();
  });

  it("computes p10 correctly for a sorted array of 10 values", () => {
    // Values: -100, -90, -80, -70, -60, -50, -40, -30, -20, -10
    // p10 index = 0.1 * 9 = 0.9 => lerp(-100, -90, 0.9) = -91
    const arr = [-100, -90, -80, -70, -60, -50, -40, -30, -20, -10];
    expect(percentile(arr, 10)).toBeCloseTo(-91, 5);
  });

  it("computes p50 (median) correctly for an odd-length array", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(percentile(arr, 50)).toBe(3);
  });

  it("computes p50 for an even-length array with interpolation", () => {
    const arr = [1, 2, 3, 4];
    // p50 index = 0.5 * 3 = 1.5 => lerp(2, 3, 0.5) = 2.5
    expect(percentile(arr, 50)).toBe(2.5);
  });

  it("handles unsorted input", () => {
    const arr = [5, 1, 3, 2, 4];
    expect(percentile(arr, 50)).toBe(3);
  });

  it("returns min at p0 and max at p100", () => {
    const arr = [10, 20, 30, 40, 50];
    expect(percentile(arr, 0)).toBe(10);
    expect(percentile(arr, 100)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Signal classification
// ---------------------------------------------------------------------------

describe("classifySignal", () => {
  it('classifies strong signal as "video"', () => {
    const result = classifySignal(-80, -10, 50);
    expect(result.band).toBe("video");
    expect(result.confidence).toBe("high");
  });

  it('classifies moderate signal as "voice"', () => {
    const result = classifySignal(-90, -10, 50);
    expect(result.band).toBe("voice");
    expect(result.confidence).toBe("high");
  });

  it('classifies weak signal as "none"', () => {
    const result = classifySignal(-100, -10, 50);
    expect(result.band).toBe("none");
    expect(result.confidence).toBe("high");
  });

  it('returns "no-data" for fewer than 3 measurements', () => {
    const result = classifySignal(-70, -8, 2);
    expect(result.band).toBe("no-data");
    expect(result.confidence).toBe("no-data");
  });

  it('returns "low" confidence for 3-9 measurements', () => {
    const result = classifySignal(-80, -10, 5);
    expect(result.band).toBe("video");
    expect(result.confidence).toBe("low");
  });

  it("degrades video to voice when RSRQ is poor", () => {
    // RSRP good enough for video, but RSRQ < -15
    const result = classifySignal(-80, -16, 50);
    expect(result.band).toBe("voice");
  });

  it("degrades to none when RSRQ is very poor", () => {
    // RSRP good enough for video, but RSRQ < -20
    const result = classifySignal(-80, -21, 50);
    expect(result.band).toBe("none");
  });

  it("RSRQ degradation does not affect already-none classification", () => {
    const result = classifySignal(-100, -21, 50);
    expect(result.band).toBe("none");
  });

  it("boundary: RSRP exactly at video threshold", () => {
    const result = classifySignal(THRESHOLDS.VIDEO_RSRP_MIN, -10, 20);
    expect(result.band).toBe("video");
  });

  it("boundary: RSRP just below video threshold", () => {
    const result = classifySignal(THRESHOLDS.VIDEO_RSRP_MIN - 0.1, -10, 20);
    expect(result.band).toBe("voice");
  });

  it("boundary: RSRP exactly at voice threshold", () => {
    const result = classifySignal(THRESHOLDS.VOICE_RSRP_MIN, -10, 20);
    expect(result.band).toBe("voice");
  });

  it("boundary: RSRP just below voice threshold", () => {
    const result = classifySignal(THRESHOLDS.VOICE_RSRP_MIN - 0.1, -10, 20);
    expect(result.band).toBe("none");
  });

  it("boundary: exactly 3 measurements is not no-data", () => {
    const result = classifySignal(-80, -10, 3);
    expect(result.band).not.toBe("no-data");
    expect(result.confidence).toBe("low");
  });

  it("boundary: exactly 10 measurements is high confidence", () => {
    const result = classifySignal(-80, -10, 10);
    expect(result.confidence).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Haversine
// ---------------------------------------------------------------------------

describe("haversineMetres", () => {
  it("returns 0 for same point", () => {
    expect(haversineMetres(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it("computes roughly correct distance for known pair", () => {
    // London Kings Cross to Leeds: ~275 km by straight line
    const d = haversineMetres(51.5308, -0.1238, 53.7957, -1.5484);
    expect(d).toBeGreaterThan(250_000);
    expect(d).toBeLessThan(300_000);
  });

  it("returns small distance for nearby points", () => {
    // ~100m apart (roughly 0.001 degrees lat)
    const d = haversineMetres(51.5, -0.1, 51.501, -0.1);
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(120);
  });
});

// ---------------------------------------------------------------------------
// Grid index and nearest-node lookup
// ---------------------------------------------------------------------------

describe("buildGridIndex and findNearestNode", () => {
  const testNodes: Record<string, [number, number]> = {
    "1": [51.5, -0.1],
    "2": [51.6, -0.2],
    "3": [52.0, -1.0],
    "4": [53.0, -2.0],
  };

  it("builds an index with the correct number of cells", () => {
    const idx = buildGridIndex(testNodes, 0.5);
    // Each node could be in a different cell or some could share
    expect(idx.cells.size).toBeGreaterThan(0);
    expect(idx.cells.size).toBeLessThanOrEqual(4);
  });

  it("finds the nearest node when within range", () => {
    const idx = buildGridIndex(testNodes, 0.5);
    const result = findNearestNode(idx, 51.5001, -0.1001, 500);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.dist).toBeLessThan(50);
  });

  it("returns null when no node is within range", () => {
    const idx = buildGridIndex(testNodes, 0.5);
    const result = findNearestNode(idx, 55.0, 5.0, 500);
    expect(result).toBeNull();
  });

  it("selects the closest node when multiple are nearby", () => {
    const idx = buildGridIndex(testNodes, 0.5);
    // Point closer to node 1 than node 2
    const result = findNearestNode(idx, 51.51, -0.11, 50_000);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
  });

  it("works with the default grid cell size", () => {
    const idx = buildGridIndex(testNodes);
    const result = findNearestNode(idx, 51.5, -0.1);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.dist).toBeLessThan(1);
  });
});
