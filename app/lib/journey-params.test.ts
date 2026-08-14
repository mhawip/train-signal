import { describe, it, expect } from "vitest";
import {
  parseJourneyParams,
  buildResultsUrl,
  buildDeparturesUrl,
  getTodayISO,
  getMaxDateISO,
  isValidNetwork,
  NETWORKS,
} from "./journey-params";

describe("parseJourneyParams", () => {
  it("returns empty strings for missing params", () => {
    const params = parseJourneyParams(new URLSearchParams());
    expect(params).toEqual({ from: "", to: "", date: "", time: "", network: "" });
  });

  it("extracts all five fields", () => {
    const sp = new URLSearchParams("from=KGX&to=EDB&date=2026-09-01&time=09:30&network=EE");
    const params = parseJourneyParams(sp);
    expect(params).toEqual({ from: "KGX", to: "EDB", date: "2026-09-01", time: "09:30", network: "EE" });
  });
});

describe("buildResultsUrl", () => {
  it("builds a /results URL with all params", () => {
    const url = buildResultsUrl({ from: "KGX", to: "EDB", date: "2026-09-01", time: "09:30", network: "EE" });
    expect(url).toMatch(/^\/results\?/);
    expect(url).toContain("from=KGX");
    expect(url).toContain("to=EDB");
    expect(url).toContain("network=EE");
  });

  it("omits empty params", () => {
    const url = buildResultsUrl({ from: "KGX", to: "", date: "", time: "", network: "" });
    expect(url).toContain("from=KGX");
    expect(url).not.toContain("to=");
  });
});

describe("buildDeparturesUrl", () => {
  it("builds a /departures URL with all params", () => {
    const url = buildDeparturesUrl({ from: "LDS", to: "KGX", date: "2026-08-14", time: "10:00", network: "EE" });
    expect(url).toMatch(/^\/departures\?/);
    expect(url).toContain("from=LDS");
    expect(url).toContain("to=KGX");
    expect(url).toContain("date=2026-08-14");
    expect(url).toContain("time=10%3A00");
    expect(url).toContain("network=EE");
  });

  it("omits empty params", () => {
    const url = buildDeparturesUrl({ from: "LDS", to: "", date: "", time: "", network: "" });
    expect(url).toContain("from=LDS");
    expect(url).not.toContain("to=");
  });
});

describe("getTodayISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(getTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getMaxDateISO", () => {
  it("returns a date 56 days from today", () => {
    const today = new Date(getTodayISO());
    const max = new Date(getMaxDateISO());
    const diff = (max.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(56);
  });
});

describe("isValidNetwork", () => {
  it("accepts valid networks", () => {
    for (const n of NETWORKS) {
      expect(isValidNetwork(n)).toBe(true);
    }
  });

  it("rejects invalid networks", () => {
    expect(isValidNetwork("Sprint")).toBe(false);
    expect(isValidNetwork("")).toBe(false);
  });
});
