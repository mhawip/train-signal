import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("results page accessibility", () => {
  test("has no WCAG AAA violations", async ({ page }) => {
    await page.goto(
      "/results?from=LDS&to=KGX&date=2026-08-14&time=14%3A12&network=EE"
    );

    const results = await new AxeBuilder({ page })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag2aaa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
        "best-practice",
      ])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
