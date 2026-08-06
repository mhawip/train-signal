# Journal

Append-only. One entry per loop iteration.

The next iteration starts with no memory of this one. This file is how work carries
forward. Be honest — an entry that hides a failure costs the next five iterations. The
**Learned** field is the most valuable: write down what surprised you.

Format:

```markdown
## <ISO timestamp> — <task-id> — <role>
**Did:** what actually changed
**Verify:** pass/fail, and what failed
**Learned:** anything the next loop would waste time rediscovering
**Next:** what this unblocked
```

---

## 2026-08-04 — setup — orchestrator

**Did:** Established the project from scratch. Researched data sources, wrote
`specs/brief.md`, and built the agent system: seven role definitions in
`.claude/agents/`, the Ralph loop prompt and runner in `agent/`, `PLAN.md` seeded with
four phases, and `CLAUDE.md` as the ground rules.

**Verify:** n/a — no application code yet.

**Learned:**

- The key data find is Ofcom's **yellow-train measurement data**: real mobile signal
  recorded from antennas on Network Rail engineering trains, per-operator via MCC/MNC,
  2G/3G/4G, published openly. It beats operator coverage maps decisively because it is
  *measured on the railway at roof height* rather than modelled, so tunnels and cuttings
  appear in the data without needing to be simulated. 5.6 GB total.
- Its weakness is vintage — roughly June 2018 to June 2019. Networks have improved. The
  model must therefore skew conservative, and the UI must state the vintage.
- Ofcom's Connected Nations pages are poorly structured for machine reading; the
  datasets listed vary by year and the older pages surface stale links. The signal
  measurement data lives on the general data-downloads page, not the year-specific ones.
- `gh` CLI is **not installed** on this machine. The PR workflow needs it —
  `winget install GitHub.cli`. Filed as Q3.
- Rail Data Marketplace free tier is approved instantly, which is better than expected.
  Network Rail SCHEDULE is a separate registration with basic auth, not an API key.
- Darwin LDBWS only looks ~2 hours ahead. Matt chose an 8-week horizon, so Network Rail
  SCHEDULE is required — LDBWS alone cannot serve the core use case of booking a meeting
  for a future date.

**Next:** P0-01 (accessibility constraints) is the first task and has no dependencies.
P0-02, P0-05, P1-01 and P1-02 are blocked on Q1–Q4 in `QUESTIONS.md` — all four need
Matt to create accounts, which agents cannot do. Plenty of unblocked work regardless:
P0-01, P0-03, P0-04, P0-06, P1-03, P2-01, P2-02.

---

## 2026-08-05T17:15:00Z — P0-01 — accessibility-specialist

**Did:** Wrote `specs/accessibility.md` — 987 lines of product-specific WCAG 2.2 AAA
constraints. The document covers every applicable criterion with concrete, implementation-
level guidance for this product's two screens and handful of states.

Key decisions made in the document:

- **Signal-band treatment without colour (1.4.1):** Each band carries three redundant
  non-colour cues — fill pattern (solid / 45° diagonal hatching / dense crosshatch),
  icon (checkmark / phone handset / X mark), and inline text label. Tunnels get a
  distinct dark solid fill plus tunnel-entrance icon and the tunnel name. Verification
  is greyscale render: if any two bands are indistinguishable in greyscale, the design
  fails.

- **Text-equivalent table is always visible, not a toggle.** At narrow widths the visual
  timeline may be hidden; the table must not be. It is the accessible representation of
  the result, not a fallback. HTML structure specified: `<table>`, `<caption>`,
  `<th scope="col/row">`, six columns.

- **Visual timeline marked `aria-hidden="true"`** — the table carries the content for
  screen readers; the visual is decorative relative to it. This avoids duplicate
  announcements.

- **Contrast ratios stated against named surfaces:** body text must be ≥ #595959 on
  white. Signal band label text within each band's fill must also achieve 7:1. The
  designer must supply a contrast matrix before any implementation begins.

- **Reading level (3.1.5):** Target Flesch-Kincaid Grade 6–8. Specific acceptable and
  unacceptable copy examples given for every user-visible string category.

- **Testing honesty:** A table of every AAA criterion maps it to either axe-core
  (automated) or manual verification — and is explicit that axe-core catches roughly
  a third of AAA issues. Manual checks specified: greyscale render, keyboard-only
  navigation, 200%/400% zoom, screen reader pass.

**Verify:** n/a — documentation-only task; no application code exists yet (P0-03 not
started). No `npm run verify` target yet.

**Learned:**
- The visual timeline vs. table tension resolves cleanly with `aria-hidden="true"` on
  the timeline: the table is the primary accessible representation; the visual is
  progressive enhancement. This decision must be stated early so the developer builds
  it that way, not as a retrofit.
- "Large text" for WCAG 1.4.6 purposes is ≥ 18pt (24px) regular or ≥ 14pt (18.67px)
  bold. The document states this explicitly so the designer computes the right threshold
  for each element in the type scale.
- The 80-character line-length requirement (1.4.8) constrains the headline result ("Best
  window: 14:35–15:20...") — if the window description runs long it must wrap, not
  overflow. Designer needs to account for this in the type scale.

**Next:** P0-01 done unblocks P0-03 (Next.js skeleton, owner: developer). P0-03 is the
next highest-priority unblocked task and itself unblocks P0-02, P0-04, and P1-03.

---

## 2026-08-06T09:23:00Z — P0-03 — developer

**Did:** Shipped the Next.js application skeleton. The previous iteration had set up all
the files (app/page.tsx, app/layout.tsx, app/globals.css, app/page.test.ts,
e2e/accessibility.spec.ts, package.json, tsconfig.json, vitest.config.ts,
playwright.config.ts, next.config.ts, .eslintrc.json) but had not committed them.
This iteration assessed the state, ran verify, confirmed everything passed, and shipped.

What was built:
- Next.js 15 App Router, React 19, TypeScript strict (`"strict": true`, `noEmit`)
- `eslint-plugin-jsx-a11y` at `plugin:jsx-a11y/strict`, `@typescript-eslint/no-explicit-any: error`
- Vitest 3 with include pattern `**/*.test.{ts,tsx}`, excludes `.next` and `e2e`
- Playwright + `@axe-core/playwright` testing the home page against wcag2a, wcag2aa, wcag2aaa, wcag21a, wcag21aa, wcag22aa, best-practice
- `globals.css` grounded in the accessibility constraints: 1.5 line-height, `max-width: 40rem` (~80ch), `prefers-reduced-motion` media query, `:focus-visible` at #0044cc (≥3:1 contrast per 2.4.13), no justified text
- `npm run verify` = typecheck + lint + test + test:a11y, all in sequence

**Verify:** Pass. Typecheck clean, lint clean (deprecation warning on `next lint` — not an error), 1 unit test passed, 1 a11y test passed.

**Learned:**
- `next lint` prints a deprecation notice ("will be removed in Next.js 16") but still exits 0 and reports no errors. Not a blocker for now; worth switching to the ESLint CLI before it becomes one.
- The Playwright a11y test runs chromium only for now. CI will want to run this headlessly; the playwright.config.ts already sets `forbidOnly: !!process.env.CI` and `retries: 2` in CI, which is correct.
- The `webServer` config in playwright.config.ts uses `npm run dev` (not `npm run build && npm run start`). In CI, `next build` + `next start` is more representative. Worth noting for the devops CI task (P0-02).

**Next:** P0-03 done unblocks P0-02 (CI/quality gates, owner: devops), P0-04 (design system, owner: designer), and P1-03 (station reference data, owner: data-engineer). P0-02 is the highest priority next: without CI gates, autonomous work is unsafe.
