"use client";

import Link from "next/link";

/**
 * Error boundary for the departures page.
 *
 * Catches server errors (e.g. failed Darwin API call, SCHEDULE
 * lookup failure) and shows a plain-English message with retry and
 * back-to-search options.
 *
 * WCAG: reuses existing patterns (ts-back-link, ts-results-nav,
 * main landmark, h1). No new visual treatment or interaction.
 */
export default function DeparturesError({
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
        We could not find trains for that journey. This can happen on a slow
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
