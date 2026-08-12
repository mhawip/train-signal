import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility statement -- Train Signal",
};

/**
 * Accessibility statement page.
 *
 * Required by specs/accessibility.md section 9. Linked from the footer
 * on every page via the root layout.
 *
 * Content:
 * - Conformance target (WCAG 2.2 AAA)
 * - Known non-conformances with criterion numbers
 * - Date of last manual audit
 * - How to report issues
 * - Data vintage disclaimer
 */
export default function AccessibilityPage() {
  return (
    <main id="main-content">
      <h1>Accessibility statement</h1>

      <h2>Our commitment</h2>
      <p>
        Train Signal aims to meet the Web Content Accessibility Guidelines
        (WCAG) version 2.2 at Level AAA. We test every page and every
        feature against these guidelines before it goes live.
      </p>

      <h2>What we have tested</h2>
      <p>
        We last completed a full manual accessibility audit on 11 August
        2026. This covered all pages, all form states, and all results
        states. We tested with keyboard only, at 200% and 400% zoom, in
        greyscale, in Windows High Contrast Mode, and with a screen reader.
      </p>
      <p>
        We also run automated checks (axe-core at the AAA ruleset) on every
        change before it goes live.
      </p>

      <h2>Known issues</h2>
      <p>
        We are aware of the following areas where we do not yet fully meet
        the AAA standard:
      </p>
      <ul>
        <li>
          <strong>Tunnel segments (1.4.1 Use of Colour):</strong> The
          visual timeline legend shows a tunnel band style, but tunnels are
          currently shown as notes within other signal bands rather than as
          separate visual segments. Tunnel information is fully available in
          the journey details table. We plan to add distinct tunnel segments
          to the visual timeline in a future update.
        </li>
      </ul>

      <h2>Signal data</h2>
      <p>
        The signal information shown in this app is based on measurements
        taken between 2018 and 2019. Mobile coverage may have changed since
        then. Results show expected signal, not a guarantee. Where we have
        limited data for a route, we say so rather than guessing.
      </p>

      <h2>Report a problem</h2>
      <p>
        If you find an accessibility problem with Train Signal, or if you
        cannot use any part of the app, please open an issue on our{" "}
        <Link href="https://github.com" className="ts-inline-link">
          GitHub repository
        </Link>
        . Describe what you were trying to do and what went wrong. We will
        look into it and respond.
      </p>

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href="/" className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
