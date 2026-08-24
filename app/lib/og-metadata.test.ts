import { describe, it, expect } from "vitest";
import {
  buildOgTitle,
  buildResultsDescriptionWithWindow,
  buildResultsDescriptionNoWindow,
  buildRouteOverviewDescription,
  buildDeparturesDescription,
  formatDurationOg,
} from "./og-metadata";
import type { BestWindowSummary } from "./og-metadata";

// ---------------------------------------------------------------------------
// Forbidden phrases from specs/accessibility.md section 14.3
// ---------------------------------------------------------------------------

const FORBIDDEN_PHRASES = [
  "you will have signal",
  "guaranteed signal",
  "perfect for a call",
  "ideal time to call",
  "green",
  "amber",
  "red",
];

/**
 * Check that a string does not contain any forbidden phrase.
 * "good signal" is forbidden unless preceded by "expected".
 */
function assertNoForbiddenPhrases(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    expect(lower).not.toContain(phrase);
  }
  // "good signal" is allowed only if preceded by "expected"
  if (lower.includes("good signal")) {
    expect(lower).toContain("expected good signal");
  }
  // "no signal" is allowed only as part of "no signal expected" or similar hedge
  if (lower.includes("no signal")) {
    expect(
      lower.includes("no signal expected") || lower.includes("no signal likely")
    ).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// formatDurationOg
// ---------------------------------------------------------------------------

describe("formatDurationOg", () => {
  it("formats minutes under an hour", () => {
    expect(formatDurationOg(45)).toBe("45 min");
  });

  it("formats exact hours", () => {
    expect(formatDurationOg(120)).toBe("2 hr");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationOg(70)).toBe("1 hr 10 min");
  });
});

// ---------------------------------------------------------------------------
// buildOgTitle
// ---------------------------------------------------------------------------

describe("buildOgTitle", () => {
  it("uses full station names when they fit within 60 chars", () => {
    const title = buildOgTitle(
      "Leeds",
      "London Kings Cross",
      "LDS",
      "KGX",
      "signal — Train Signal",
    );
    expect(title).toBe("Leeds to London Kings Cross signal — Train Signal");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("falls back to CRS codes when full names exceed 60 chars", () => {
    // "Edinburgh Waverley to London Kings Cross signal — Train Signal" is 63 chars
    const title = buildOgTitle(
      "Edinburgh Waverley",
      "London Kings Cross",
      "EDB",
      "KGX",
      "signal — Train Signal",
    );
    expect(title).toBe("EDB to KGX signal — Train Signal");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("uses full names for route-overview suffix", () => {
    const title = buildOgTitle(
      "Leeds",
      "London Kings Cross",
      "LDS",
      "KGX",
      "route signal — Train Signal",
    );
    // "Leeds to London Kings Cross route signal — Train Signal" = 55 chars
    expect(title).toBe(
      "Leeds to London Kings Cross route signal — Train Signal",
    );
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("falls back to CRS codes for route-overview with long names", () => {
    const title = buildOgTitle(
      "Edinburgh Waverley",
      "London Kings Cross",
      "EDB",
      "KGX",
      "route signal — Train Signal",
    );
    expect(title).toBe("EDB to KGX route signal — Train Signal");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("uses full names for departures suffix", () => {
    const title = buildOgTitle(
      "Leeds",
      "London Kings Cross",
      "LDS",
      "KGX",
      "departures — Train Signal",
    );
    expect(title).toBe(
      "Leeds to London Kings Cross departures — Train Signal",
    );
    expect(title.length).toBeLessThanOrEqual(60);
  });
});

// ---------------------------------------------------------------------------
// Results page: with best window (Template A)
// ---------------------------------------------------------------------------

describe("buildResultsDescriptionWithWindow", () => {
  const videoWindow: BestWindowSummary = {
    startStation: "Doncaster",
    endStation: "Peterborough",
    durationMinutes: 45,
    quality: "video",
  };

  const voiceWindow: BestWindowSummary = {
    startStation: "Doncaster",
    endStation: "Peterborough",
    durationMinutes: 45,
    quality: "voice",
  };

  it("includes video quality phrasing for video windows", () => {
    const desc = buildResultsDescriptionWithWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
      videoWindow,
    );
    expect(desc).toContain("Expected voice and video signal");
    expect(desc).toContain("Best window: Doncaster to Peterborough, 45 min");
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("uses voice-only phrasing for voice windows", () => {
    const desc = buildResultsDescriptionWithWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
      voiceWindow,
    );
    expect(desc).toContain("Expected voice signal");
    expect(desc).not.toContain("voice and video");
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("stays within 155 chars with long station names", () => {
    const longWindow: BestWindowSummary = {
      startStation: "Edinburgh Waverley",
      endStation: "Newcastle Central",
      durationMinutes: 90,
      quality: "video",
    };
    const desc = buildResultsDescriptionWithWindow(
      "Edinburgh Waverley",
      "London Kings Cross",
      "14 August 2026",
      longWindow,
    );
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("contains no forbidden phrases", () => {
    const desc = buildResultsDescriptionWithWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
      videoWindow,
    );
    assertNoForbiddenPhrases(desc);
  });
});

// ---------------------------------------------------------------------------
// Results page: no best window (Template B)
// ---------------------------------------------------------------------------

describe("buildResultsDescriptionNoWindow", () => {
  it("uses honest framing about no clear window", () => {
    const desc = buildResultsDescriptionNoWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    expect(desc).toContain("No clear window for a video call");
    expect(desc).toContain("Signal varies");
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("contains no forbidden phrases", () => {
    const desc = buildResultsDescriptionNoWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    assertNoForbiddenPhrases(desc);
  });

  it("does not invent a positive framing", () => {
    const desc = buildResultsDescriptionNoWindow(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    const lower = desc.toLowerCase();
    expect(lower).not.toContain("best");
    expect(lower).not.toContain("good");
    expect(lower).not.toContain("great");
    expect(lower).not.toContain("strong");
  });

  it("stays within 155 chars with long station names", () => {
    const desc = buildResultsDescriptionNoWindow(
      "Edinburgh Waverley",
      "London Kings Cross",
      "14 August 2026",
    );
    expect(desc.length).toBeLessThanOrEqual(155);
  });
});

// ---------------------------------------------------------------------------
// Route overview (Template C)
// ---------------------------------------------------------------------------

describe("buildRouteOverviewDescription", () => {
  it("uses route-level framing without claiming a specific window", () => {
    const desc = buildRouteOverviewDescription("Leeds", "London Kings Cross");
    expect(desc).toContain("Typical signal for");
    expect(desc).toContain("likely");
    expect(desc).not.toContain("best window");
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("contains no forbidden phrases", () => {
    const desc = buildRouteOverviewDescription("Leeds", "London Kings Cross");
    assertNoForbiddenPhrases(desc);
  });

  it("stays within 155 chars with long station names", () => {
    const desc = buildRouteOverviewDescription(
      "Edinburgh Waverley",
      "London Kings Cross",
    );
    expect(desc.length).toBeLessThanOrEqual(155);
  });
});

// ---------------------------------------------------------------------------
// Departures page (Template D)
// ---------------------------------------------------------------------------

describe("buildDeparturesDescription", () => {
  it("includes station names and date", () => {
    const desc = buildDeparturesDescription(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    expect(desc).toContain("Choose a train from Leeds to London Kings Cross");
    expect(desc).toContain("14 August 2026");
    expect(desc).toContain("expected signal");
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it("makes no signal quality claim", () => {
    const desc = buildDeparturesDescription(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    const lower = desc.toLowerCase();
    // Should not claim signal is good/bad/available -- just says "check your expected signal"
    expect(lower).not.toContain("voice");
    expect(lower).not.toContain("video");
    expect(lower).not.toContain("no signal");
  });

  it("contains no forbidden phrases", () => {
    const desc = buildDeparturesDescription(
      "Leeds",
      "London Kings Cross",
      "14 August 2026",
    );
    assertNoForbiddenPhrases(desc);
  });

  it("stays within 155 chars with long station names", () => {
    const desc = buildDeparturesDescription(
      "Edinburgh Waverley",
      "London Kings Cross",
      "14 August 2026",
    );
    expect(desc.length).toBeLessThanOrEqual(155);
  });
});
