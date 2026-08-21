"use client";

import Link from "next/link";

/**
 * Error boundary for the results page.
 *
 * Catches server errors (e.g. failed Darwin API call, signal data
 * lookup failure) and shows a plain-English message with retry and
 * back-to-search options. Users on flaky train connections will hit
 * this regularly -- the message must be reassuring, not alarming.
 *
 * WCAG: reuses existing patterns (ts-back-link, ts-results-nav,
 * main landmark, h1). No new visual treatment or interaction.
 */
export default function ResultsError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content">
      <h1>Something went wrong</h1>
      <p>
        We could not load the signal results. This can happen on a slow
        connection. Try again or go back to search.
      </p>
      <nav aria-label="Page navigation" className="ts-results-nav">
        <button onClick={reset} className="ts-back-link" type="button">
          Try again
        </button>{" "}
        <Link href="/" className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
