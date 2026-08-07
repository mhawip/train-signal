import { describe, expect, it } from "vitest";
import {
  searchStations,
  getStationByCRS,
  getStationCount,
} from "./stations";

describe("getStationCount", () => {
  it("returns a plausible number of GB stations", () => {
    const count = getStationCount();
    expect(count).toBeGreaterThan(2400);
    expect(count).toBeLessThan(3000);
  });
});

describe("getStationByCRS", () => {
  it("returns a station for a valid CRS code", () => {
    const station = getStationByCRS("KGX");
    expect(station).toBeDefined();
    expect(station?.name).toContain("Kings Cross");
  });

  it("is case-insensitive", () => {
    const upper = getStationByCRS("KGX");
    const lower = getStationByCRS("kgx");
    const mixed = getStationByCRS("Kgx");
    expect(upper).toEqual(lower);
    expect(upper).toEqual(mixed);
  });

  it("returns undefined for an invalid CRS code", () => {
    expect(getStationByCRS("ZZZ")).toBeUndefined();
    expect(getStationByCRS("")).toBeUndefined();
  });

  it("returns a station with all expected fields", () => {
    const station = getStationByCRS("LDS");
    expect(station).toBeDefined();
    expect(station).toHaveProperty("name");
    expect(station).toHaveProperty("crs");
    expect(station).toHaveProperty("tiploc");
    expect(station).toHaveProperty("lat");
    expect(station).toHaveProperty("lon");
    expect(typeof station?.lat).toBe("number");
    expect(typeof station?.lon).toBe("number");
    expect(station?.crs).toBe("LDS");
  });
});

describe("searchStations", () => {
  it("returns empty array for empty query", () => {
    expect(searchStations("")).toEqual([]);
    expect(searchStations("  ")).toEqual([]);
  });

  it("finds stations by partial name", () => {
    const results = searchStations("King");
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((s) => s.name);
    expect(names.some((n) => n.includes("King"))).toBe(true);
  });

  it("finds King's Cross when searching 'King'", () => {
    const results = searchStations("King", 20);
    const names = results.map((s) => s.name);
    expect(names.some((n) => n.includes("Kings Cross"))).toBe(true);
  });

  it("finds stations by CRS code", () => {
    const results = searchStations("LDS");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].crs).toBe("LDS");
    expect(results[0].name).toContain("Leeds");
  });

  it("is case-insensitive for names", () => {
    const upper = searchStations("LEEDS");
    const lower = searchStations("leeds");
    const mixed = searchStations("Leeds");
    expect(upper.length).toBeGreaterThan(0);
    expect(upper[0].crs).toBe(lower[0].crs);
    expect(upper[0].crs).toBe(mixed[0].crs);
  });

  it("is case-insensitive for CRS codes", () => {
    const upper = searchStations("KGX");
    const lower = searchStations("kgx");
    expect(upper.length).toBeGreaterThan(0);
    expect(upper[0].crs).toBe(lower[0].crs);
  });

  it("handles 'Kings Cross' without apostrophe", () => {
    const results = searchStations("kings cross");
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((s) => s.name);
    expect(names.some((n) => n.includes("Kings Cross"))).toBe(true);
  });

  it("handles 'St Pancras' search", () => {
    const results = searchStations("st pancras");
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((s) => s.name);
    expect(names.some((n) => n.includes("Pancras"))).toBe(true);
  });

  it("handles London terminal aliases", () => {
    const paddington = searchStations("paddington");
    expect(paddington.length).toBeGreaterThan(0);
    expect(
      paddington.some((s) => s.name.includes("Paddington")),
    ).toBe(true);

    const euston = searchStations("euston");
    expect(euston.length).toBeGreaterThan(0);
    expect(euston.some((s) => s.name.includes("Euston"))).toBe(true);
  });

  it("disambiguates same-named stations", () => {
    // "Charing Cross" appears as both London and Glasgow
    const results = searchStations("charing cross", 20);
    const names = results.map((s) => s.name);
    expect(names.some((n) => n.includes("London"))).toBe(true);
    expect(names.some((n) => n.includes("Glasgow"))).toBe(true);
  });

  it("respects the limit parameter", () => {
    const limited = searchStations("a", 3);
    expect(limited.length).toBeLessThanOrEqual(3);

    const moreLimited = searchStations("a", 1);
    expect(moreLimited.length).toBe(1);
  });

  it("returns more results with a higher limit", () => {
    const few = searchStations("man", 3);
    const many = searchStations("man", 20);
    expect(many.length).toBeGreaterThanOrEqual(few.length);
  });

  it("ranks exact CRS match first", () => {
    const results = searchStations("LDS");
    expect(results[0].crs).toBe("LDS");
  });

  it("ranks name-prefix matches before contains matches", () => {
    const results = searchStations("brad");
    // "Bradford" should come before stations that merely contain "brad"
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase().startsWith("brad")).toBe(true);
  });

  it("finds stations with word-boundary matches", () => {
    // "Cross" should match "Kings Cross", "New Cross", etc.
    const results = searchStations("cross", 20);
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((s) => s.name.includes("Cross")),
    ).toBe(true);
  });
});
