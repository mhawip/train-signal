/**
 * Loading state for the departures page.
 *
 * Shown while the page component suspends during async data fetch
 * (Darwin API, SCHEDULE lookup). Uses a plain text indicator -- no
 * spinner animation (2.2.2, 2.3.3).
 *
 * role="status" announces the message to screen readers without
 * stealing focus (4.1.3). aria-live="polite" is redundant with
 * role="status" but spelled out for clarity.
 */
export default function DeparturesLoading() {
  return (
    <main id="main-content">
      <h1>Loading</h1>
      <p role="status" aria-live="polite">
        Finding trains for your journey...
      </p>
    </main>
  );
}
