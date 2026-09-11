import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the data — Train Signal",
  description:
    "How Train Signal measures and estimates mobile data coverage on GB rail journeys.",
};

/**
 * About the data page.
 *
 * Explains the signal data sources, classification method, confidence tiers,
 * and known caveats in plain English (WCAG 3.1.5, Grade 6--8 reading level).
 * Linked from the footer on every page.
 */
export default function AboutPage() {
  return (
    <main id="main-content">
      <h1>About the data</h1>

      <h2>Where the data comes from</h2>
      <p>
        Signal readings come from the{" "}
        <strong>
          Network Rail Yellow Train Mobile Network Measurements (2026)
        </strong>
        , published on the Rail Data Marketplace. Antennas fitted to Network
        Rail engineering trains recorded 4G and 5G signal strength as they
        travelled across the GB rail network between March and May 2026. The
        data covers EE, O2, Three, and Vodafone.
      </p>
      <p>
        Measurements were taken from the roof of each train, which receives
        stronger signal than a phone inside the carriage. Windows in modern
        rolling stock can reduce signal by 10 to 30 dB. This means our
        readings are likely to be optimistic compared to what you will
        experience in your seat. We use cautious thresholds to account for
        this.
      </p>

      <h2>How we classify coverage</h2>
      <p>
        We put each section of track into one of three bands based on the
        signal strength at the 10th percentile — that is, the level met or
        exceeded 90% of the time at that location:
      </p>
      <ul>
        <li>
          <strong>Good mobile data</strong> — strong enough for fast browsing,
          video streaming, and video calls (RSRP at or above &minus;89 dBm)
        </li>
        <li>
          <strong>Mobile data</strong> — enough for browsing, messaging, and
          email, but not video streaming (RSRP between &minus;99
          and &minus;89 dBm)
        </li>
        <li>
          <strong>No mobile data</strong> — signal too weak for a reliable
          data connection (RSRP below &minus;99 dBm)
        </li>
      </ul>
      <p>
        We also check signal quality (RSRQ). Heavy interference can make a
        connection unreliable even when raw signal strength looks good. Where
        interference is high, we downgrade the band to reflect the real
        experience.
      </p>

      <h2>Confidence levels</h2>
      <p>Each result shows how confident we are in the coverage estimate:</p>
      <ul>
        <li>
          <strong>High</strong> — ten or more measurements at that location.
          The estimate is reliable.
        </li>
        <li>
          <strong>Low</strong> — three to nine measurements. The estimate is
          plausible but based on limited data.
        </li>
        <li>
          <strong>Estimated (coverage map)</strong> — no yellow-train
          measurements here. The result is based on Ofcom Connected Nations
          2025 operator coverage predictions. These are the operator&rsquo;s
          own forecasts, which may be optimistic.
        </li>
        <li>
          <strong>Estimated (interpolated)</strong> — no measurements or
          coverage map data at this exact location. We estimated the result
          from nearby sections using a distance-weighted average. The further
          away the evidence, the less weight it carries. We cap all
          interpolated results at &ldquo;mobile data&rdquo; — we never claim
          good data from an estimate.
        </li>
        <li>
          <strong>No data</strong> — not enough nearby information to make an
          honest estimate. We show this rather than guess.
        </li>
      </ul>

      <h2>Tunnels</h2>
      <p>
        Tunnel locations come from OpenStreetMap. Sections of track inside a
        known tunnel are marked as &ldquo;no mobile data&rdquo; — signal
        cannot pass through the rock and soil above. This is a physical fact,
        not an estimate.
      </p>

      <h2>What these results are and are not</h2>
      <p>
        Results show <em>expected</em> coverage based on past measurements.
        They are not a guarantee. Coverage can vary by train type, time of
        day, and network changes since the measurements were taken. Use this
        as a guide when planning work on the move, not as a definite answer.
      </p>
      <p>
        The data covers the GB national rail network. It does not include
        London Underground, light rail, trams, or private railways.
      </p>

      <h2>Data sources and licences</h2>
      <ul>
        <li>
          Signal data: RDM NWR Yellow Train Mobile Network Measurements, 2026
          (4G + 5G) — Network Rail, Open licence
        </li>
        <li>
          Modelled coverage: Ofcom Connected Nations 2025 — Open Government
          Licence v3
        </li>
        <li>
          Track geometry: OpenStreetMap contributors — Open Database Licence
          (ODbL)
        </li>
        <li>
          Station data: NaPTAN — Open Government Licence v3
        </li>
        <li>
          Timetable data: Network Rail SCHEDULE feed — Open licence
        </li>
      </ul>

      <nav aria-label="Page navigation" className="ts-results-nav">
        <Link href="/" className="ts-back-link">
          Back to search
        </Link>
      </nav>
    </main>
  );
}
