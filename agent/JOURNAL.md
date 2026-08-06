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

---

## 2026-08-06T09:45:00Z — P0-02 — devops

**Did:** Built the full CI pipeline and local quality gates.

Files created:
- `.github/workflows/ci.yml` -- six parallel jobs: typecheck, lint, unit, a11y,
  lighthouse, secret-scan. All use Node 22 with npm cache. The a11y job builds the app
  first (`npm run build && npm run start` via playwright webServer in CI mode). Lighthouse
  uses `@lhci/cli autorun` against the built app. Secret scanning uses the official
  gitleaks action.
- `.lighthouserc.json` -- accessibility score must be 1.0, performance must be >= 0.8.
  Single run against localhost:3000, results uploaded to temporary public storage.
- `.githooks/pre-commit` -- rejects staged files over 10 MB. Uses `git cat-file -s` to
  check the staged blob size, not the working-tree size. Prints the offending filenames.

Files edited:
- `playwright.config.ts` -- webServer command now uses `npm run build && npm run start`
  when `process.env.CI` is set, `npm run dev` otherwise. This means CI tests run against
  the production build, catching issues that only appear in built output.
- `package.json` -- added `"prepare": "git config core.hooksPath .githooks"` so the
  pre-commit hook is wired automatically on `npm install`.
- `agent/PLAN.md` -- P0-02 marked done (except the required-status-checks acceptance
  criterion, which cannot be completed until the first CI run succeeds).

**Verify:** Pass. `npm run verify` runs typecheck, lint, unit tests, and Playwright a11y
tests -- all green. Lighthouse is CI-only (requires `@lhci/cli` which is not a project
dependency -- it runs via `npx` in the workflow). The local verify script matches CI for
the four checks that can run locally.

**Learned:**
- Required status checks cannot be added to branch protection until the check names have
  reported at least once. The `gh api` call to set them must happen after the first
  successful CI run on a PR or push to main. This is a GitHub API constraint, not a
  workflow issue.
- The Lighthouse CI preset name is `lighthouse:no-pwa` (not `lighthouse:no-psd` as
  sometimes referenced). The config uses the correct name.
- The `gitleaks/gitleaks-action@v2` action needs `fetch-depth: 0` on checkout to scan
  the full history. Without it, it only scans the shallow clone.
- Running CI jobs in parallel (not sequential steps in one job) keeps the pipeline fast
  while giving clear per-check status in the GitHub UI. Each job name matches the
  required status check context exactly.

**Next:** Once this PR merges and CI runs green, add required status checks to branch
protection using:
```
gh api repos/mhawip/train-signal/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":false,"contexts":["typecheck","lint","unit","a11y","lighthouse","secret-scan"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```
P0-02 completion unblocks P0-05 (Vercel deployment). P0-04 (design system) and P1-03
(station reference data) were already unblocked by P0-03.

---

## 2026-08-06T10:00:00Z — P0-02 — orchestrator

**Did:** Merged stale PR #4 (P0-03, which the previous iteration had committed but not
merged). Took P0-02 as the next highest-priority task (journal had identified it as
critical; without CI, autonomous work is unsafe). Dispatched to devops agent, which
built the full CI pipeline. Confirmed `npm run verify` passes locally. Merged PR #5.

**Verify:** Pass. `npm run verify` green on the branch before merge.

**Learned:**
- When a previous iteration leaves a PR open but marked done in PLAN.md, check for
  open PRs early — PR #4 was unmerged and needed to be closed before meaningful work
  could proceed.
- Required status checks cannot be added until the CI workflow has reported at least
  once. The next step is to wait for the first CI run on a subsequent PR, then run the
  `gh api` command documented in the P0-02 journal entry to enable branch protection.
- The Lighthouse CI step uses `npx @lhci/cli autorun` (not installed as a project dep).
  This means it will always download on each CI run. Acceptable for now.

**Next:** P0-02 done. Three unblocked todos remain: P0-00 (competitive analysis,
product-manager), P0-04 (design system, designer), P1-03 (station reference data,
data-engineer). P0-04 is the next most important — the design system must exist before
component primitives (P0-06) and the visual timeline (P1-06) can be built. P0-00
(competitive analysis) also has no dependencies and should run in parallel or next.

---

## 2026-08-06T10:30:00Z — P0-04 — designer

**Did:** Built the complete design system as CSS custom properties in `app/globals.css`
and documented every decision in `specs/design-system.md`.

What was built:

- **Palette:** Single-hue value ramp (not traffic-light). Signal quality maps to
  lightness, which degrades to greyscale by construction. Both light and dark schemes
  defined with every text/background pair computed at WCAG AAA ratios.

- **Signal bands:** Four treatments (voice+video, voice-only, no signal, tunnel), each
  with three redundant non-colour cues: fill pattern (solid / 45-degree hatching / dense
  crosshatch / solid dark), icon (checkmark / phone / X / tunnel), and text label.
  Patterns defined as CSS `repeating-linear-gradient` specifications. Band boundaries
  use visible borders (2px) achieving 3:1 against adjacent fills.

- **Key palette decisions:**
  - Light: `#1a1a1a` on `#ffffff` (17.40:1). Band fills range from `#d4e8d7` (sage)
    through `#f0e4c0` (cream) and `#dcdcdc` (grey) to `#2d2d2d` (near-black tunnel).
    All text-on-band pairs exceed 12:1.
  - Dark: `#e8e8e8` on `#121212` (15.29:1). Band fills inverted. Weakest pair is
    `#e8e8e8` on `#4a4a4a` (no-signal) at 7.23:1, which passes.
  - Band borders: `#5c5c5c` (light) and `#999999` (dark) provide 3:1+ against all
    adjacent band fills. Tunnel gets `#7a7a7a` in light mode (3.21:1 vs tunnel fill).

- **Typography:** System font stack, 6-step rem scale (0.75-2rem), line-height 1.5
  (body) / 1.3 (headings), max-width 40rem for 80-character lines.

- **Spacing:** 4px-base scale (0.25rem to 3rem), 6 steps.

- **Interactive targets:** `--target-min: 2.75rem` (44px) documented with enforcement
  strategy per element type.

- **Focus indicators:** `#0044cc` (light, 7.78:1 vs page) and `#6699ff` (dark, 6.75:1
  vs page), 2px solid with 2px offset.

- **Low confidence:** Dashed border overlay + "(low confidence)" text label. Not a
  fourth band — an overlay on any band.

- **Contrast matrix:** Full computed table in design-system.md section 8, covering every
  text/background pair and every non-text element pair, with the WCAG relative luminance
  formula applied. No eyeballed values.

**Verify:** Pass. `npm run verify` green — typecheck, lint, 1 unit test, 1 Playwright
a11y test all pass.

**Learned:**

- Achieving 3:1 between all adjacent band fills AND 7:1 text on each band is
  mathematically impossible when you have four bands spanning the full lightness range.
  The solution is to use borders as the non-text contrast boundary between bands, not
  the fills themselves. This is the correct interpretation of 1.4.11: the border is the
  graphical boundary.

- A single border colour cannot serve both light fills and dark fills at 3:1. The tunnel
  band needs its own lighter border (`#7a7a7a` in light mode) while the three lighter
  bands share `#5c5c5c`. In dark mode, `#999999` works for all bands.

- The greyscale equivalents of the three lighter bands (good ~224, ok ~227, none ~220)
  are too similar to distinguish by value alone. This is by design — pattern and label
  are the primary differentiators, not lightness. The hatching vs crosshatch vs solid
  distinction works in greyscale because it is a texture difference, not a value
  difference.

- `#595959` on white gives exactly 7.00:1 — the darkest permissible muted/placeholder
  text. Any lighter and it fails AAA body text contrast.

**Next:** P0-04 done unblocks P0-06 (accessible component primitives, developer) and
contributes to P1-06 (visual timeline). P0-06 is the next highest-priority unblocked
task — form controls need to exist before the journey form (P1-04) can be built.
