import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag2aaa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

test.describe("results page accessibility", () => {
  test("specific-train results have no WCAG AAA violations", async ({ page }) => {
    await page.goto(
      "/results?from=LDS&to=KGX&date=2026-08-14&time=14%3A12&network=EE"
    );

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("route overview results have no WCAG AAA violations", async ({ page }) => {
    await page.goto("/results?from=LDS&to=KGX&network=EE");

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("route overview without network has no WCAG AAA violations", async ({ page }) => {
    await page.goto("/results?from=LDS&to=KGX");

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
