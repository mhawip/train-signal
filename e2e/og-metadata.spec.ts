import { test, expect } from "@playwright/test";

test.describe("Open Graph metadata", () => {
  test("results page has og:title and og:description", async ({ page }) => {
    await page.goto(
      "/results?from=LDS&to=KGX&date=2026-08-14&time=14%3A12&network=EE",
    );

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');

    await expect(ogTitle).toHaveAttribute("content", /.+/);
    await expect(ogDescription).toHaveAttribute("content", /.+/);

    // Title must be 60 chars or fewer
    const titleContent = await ogTitle.getAttribute("content");
    expect(titleContent!.length).toBeLessThanOrEqual(60);

    // Description must be 155 chars or fewer
    const descContent = await ogDescription.getAttribute("content");
    expect(descContent!.length).toBeLessThanOrEqual(155);

    // Title should contain "Train Signal"
    expect(titleContent).toContain("Train Signal");

    // Description should use hedge language
    expect(descContent).toMatch(/expected|likely|varies/i);

    // No og:image should be present
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(0);
  });

  test("route overview results page has og:title and og:description", async ({
    page,
  }) => {
    await page.goto("/results?from=LDS&to=KGX&network=EE");

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');

    await expect(ogTitle).toHaveAttribute("content", /.+/);
    await expect(ogDescription).toHaveAttribute("content", /.+/);

    const titleContent = await ogTitle.getAttribute("content");
    expect(titleContent).toContain("route signal");
    expect(titleContent!.length).toBeLessThanOrEqual(60);

    const descContent = await ogDescription.getAttribute("content");
    expect(descContent).toContain("likely");
    expect(descContent!.length).toBeLessThanOrEqual(155);
  });

  test("departures page has og:title and og:description", async ({ page }) => {
    await page.goto(
      "/departures?from=LDS&to=KGX&date=2026-08-14&time=14%3A00",
    );

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');

    await expect(ogTitle).toHaveAttribute("content", /.+/);
    await expect(ogDescription).toHaveAttribute("content", /.+/);

    const titleContent = await ogTitle.getAttribute("content");
    expect(titleContent).toContain("departures");
    expect(titleContent).toContain("Train Signal");
    expect(titleContent!.length).toBeLessThanOrEqual(60);

    const descContent = await ogDescription.getAttribute("content");
    expect(descContent).toContain("expected signal");
    expect(descContent!.length).toBeLessThanOrEqual(155);
  });
});
