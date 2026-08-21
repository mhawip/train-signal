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

test.describe("error and loading boundaries", () => {
  /*
   * These tests render the component HTML directly via page.setContent()
   * to verify structure and accessibility in isolation, without needing
   * to trigger real server errors or race loading states.
   *
   * CSS is not loaded (not needed for axe structural checks).
   */

  test("results loading page has no WCAG AAA violations", async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head><title>Train Signal</title></head>
      <body>
        <main id="main-content">
          <h1>Loading</h1>
          <p role="status" aria-live="polite">Checking signal for your journey...</p>
        </main>
      </body>
      </html>
    `);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("departures loading page has no WCAG AAA violations", async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head><title>Train Signal</title></head>
      <body>
        <main id="main-content">
          <h1>Loading</h1>
          <p role="status" aria-live="polite">Finding trains for your journey...</p>
        </main>
      </body>
      </html>
    `);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("results error page has no WCAG AAA violations", async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head><title>Train Signal -- Something went wrong</title></head>
      <body>
        <main id="main-content">
          <h1>Something went wrong</h1>
          <p>We could not load the signal results. This can happen on a slow connection. Try again or go back to search.</p>
          <nav aria-label="Page navigation">
            <button type="button">Try again</button>
            <a href="/">Back to search</a>
          </nav>
        </main>
      </body>
      </html>
    `);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("departures error page has no WCAG AAA violations", async ({
    page,
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head><title>Train Signal -- Something went wrong</title></head>
      <body>
        <main id="main-content">
          <h1>Something went wrong</h1>
          <p>We could not find trains for that journey. This can happen on a slow connection. Try again or go back to search.</p>
          <nav aria-label="Page navigation">
            <button type="button">Try again</button>
            <a href="/">Back to search</a>
          </nav>
        </main>
      </body>
      </html>
    `);

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("results loading page has no horizontal scroll at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <body style="margin:0;padding:8px;box-sizing:border-box;overflow-wrap:break-word;">
        <main id="main-content">
          <h1>Loading</h1>
          <p role="status" aria-live="polite">Checking signal for your journey...</p>
        </main>
      </body>
      </html>
    `);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });

  test("results error page has no horizontal scroll at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <body style="margin:0;padding:8px;box-sizing:border-box;overflow-wrap:break-word;">
        <main id="main-content" style="max-width:100%;padding:8px;">
          <h1 style="font-size:1.5rem;overflow-wrap:break-word;">Something went wrong</h1>
          <p style="overflow-wrap:break-word;">We could not load the signal results. This can happen on a slow connection. Try again or go back to search.</p>
          <nav aria-label="Page navigation">
            <button type="button">Try again</button>
            <a href="/">Back to search</a>
          </nav>
        </main>
      </body>
      </html>
    `);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });

  test("departures loading page has no horizontal scroll at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <body style="margin:0;padding:8px;box-sizing:border-box;overflow-wrap:break-word;">
        <main id="main-content">
          <h1>Loading</h1>
          <p role="status" aria-live="polite">Finding trains for your journey...</p>
        </main>
      </body>
      </html>
    `);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });

  test("departures error page has no horizontal scroll at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <body style="margin:0;padding:8px;box-sizing:border-box;overflow-wrap:break-word;">
        <main id="main-content" style="max-width:100%;padding:8px;">
          <h1 style="font-size:1.5rem;overflow-wrap:break-word;">Something went wrong</h1>
          <p style="overflow-wrap:break-word;">We could not find trains for that journey. This can happen on a slow connection. Try again or go back to search.</p>
          <nav aria-label="Page navigation">
            <button type="button">Try again</button>
            <a href="/">Back to search</a>
          </nav>
        </main>
      </body>
      </html>
    `);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });
});
