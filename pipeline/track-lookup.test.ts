import { describe, it, expect } from "vitest";
import { getTrackSegment } from "./track-lookup";

describe("getTrackSegment", () => {
  it("returns a path from KGX to LDS with coordinates and tunnels", () => {
    const segment = getTrackSegment("KGX", "LDS");

    expect(segment).not.toBeNull();
    if (!segment) return;

    // Should have a meaningful number of coordinates
    expect(segment.coords.length).toBeGreaterThan(10);

    // Distance should be roughly 280-320 km (ECML)
    expect(segment.distance_m).toBeGreaterThan(250_000);
    expect(segment.distance_m).toBeLessThan(350_000);

    // Should have at least some tunnels (ECML has tunnels near London)
    expect(segment.tunnels.length).toBeGreaterThan(0);

    // Each coordinate should be a [lat, lon] pair in GB range
    for (const [lat, lon] of segment.coords) {
      expect(lat).toBeGreaterThan(49);
      expect(lat).toBeLessThan(61);
      expect(lon).toBeGreaterThan(-9);
      expect(lon).toBeLessThan(3);
    }
  });

  it("returns a path from LDS to KGX (reverse direction)", () => {
    const segment = getTrackSegment("LDS", "KGX");

    expect(segment).not.toBeNull();
    if (!segment) return;

    // Distance should be similar regardless of direction
    expect(segment.distance_m).toBeGreaterThan(250_000);
    expect(segment.distance_m).toBeLessThan(350_000);
  });

  it("returns null for a non-existent station code", () => {
    const segment = getTrackSegment("ZZZ", "LDS");
    expect(segment).toBeNull();
  });

  it("resolves a short route (e.g. PAD to RDG)", () => {
    const segment = getTrackSegment("PAD", "RDG");

    expect(segment).not.toBeNull();
    if (!segment) return;

    // Paddington to Reading is about 58 km
    expect(segment.distance_m).toBeGreaterThan(40_000);
    expect(segment.distance_m).toBeLessThan(100_000);
  });

  it("includes tunnel data with required fields", () => {
    const segment = getTrackSegment("KGX", "LDS");

    expect(segment).not.toBeNull();
    if (!segment) return;

    for (const tunnel of segment.tunnels) {
      // name can be null (unnamed tunnels)
      expect(typeof tunnel.name === "string" || tunnel.name === null).toBe(
        true
      );
      expect(typeof tunnel.startIdx).toBe("number");
      expect(typeof tunnel.endIdx).toBe("number");
      expect(tunnel.startIdx).toBeLessThanOrEqual(tunnel.endIdx);
      expect(tunnel.length_m).toBeGreaterThan(0);
      expect(typeof tunnel.osmId).toBe("number");
    }
  });

  it("tunnels are sorted by position along the path", () => {
    const segment = getTrackSegment("KGX", "LDS");

    expect(segment).not.toBeNull();
    if (!segment) return;

    for (let i = 1; i < segment.tunnels.length; i++) {
      expect(segment.tunnels[i].startIdx).toBeGreaterThanOrEqual(
        segment.tunnels[i - 1].startIdx
      );
    }
  });
});
