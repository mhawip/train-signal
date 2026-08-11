import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("accessibility", () => {
  test("home page has no WCAG AAA violations", async ({ page }) => {
    await page.goto("/");

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

  test("accessibility statement page has no WCAG AAA violations", async ({
    page,
  }) => {
    await page.goto("/accessibility");

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
