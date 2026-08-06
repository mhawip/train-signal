import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("component primitives accessibility", () => {
  test("components demo page has no WCAG AAA violations", async ({ page }) => {
    await page.goto("/components-demo");

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
