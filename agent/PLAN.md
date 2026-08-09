# Backlog

The single source of truth for what happens next. Every loop iteration reads this first
and writes to it last.

**Status values:** `todo` · `in-progress` · `in-review` · `blocked` · `done`

**Rules**
- Take the highest-priority `todo` whose `depends` are all `done`.
- Mark `in-progress` and commit *before* starting, so two loops can't collide.
- Accessibility constraints come before design; design comes before implementation.
  The dependencies enforce this. Don't route around them.
- Discovered work gets filed here, not done inline. One unit of work per iteration —
  but small, tightly-coupled discovered-work items (same file or feature, no independent
  value on their own) may be bundled into a single task rather than filed as separate
  tasks that would each pay their own dispatch/verify/PR overhead. Don't bundle unrelated
  work just to save iterations.
- **Completed tasks are moved to `agent/PLAN-ARCHIVE.md`**, not deleted. When you mark a
  task `done`, cut its full entry from this file, paste it into the archive (same
  format), and leave a one-line pointer in the "Completed" index below. This keeps the
  file every loop reads in full from growing without bound. Only open the archive when
  you need the history — dependency checks only need the index.

---

## Completed (full detail in `agent/PLAN-ARCHIVE.md`)

| ID | Title | Owner |
|---|---|---|
| P0-00 | Competitive analysis: train-signal.vercel.app | product-manager |
| P0-01 | Accessibility constraints document | accessibility-specialist |
| P0-02 | Repository, CI and quality gates | devops |
| P0-03 | Next.js application skeleton | developer |
| P0-04 | Design system | designer |
| P0-06 | Accessible component primitives | developer |
| P1-03 | Station reference data | data-engineer |
| P1-04 | Journey form | developer |
| P1-05 | Journey timeline, text-equivalent first | developer |
| P1-06 | Visual timeline | developer |
| P1-07 | Accessibility review of Phase 1 | accessibility-specialist |
| DW-01 | ESLint rule relaxation for tabIndex on role="region" | accessibility-specialist |
| P2-00 | Evaluate RDM yellow-train product | data-engineer |
| P2-01 | Thin vertical slice: one route, one operator | data-engineer |

---

# Phase 0 — Foundations

Nothing here is user-visible. All of it determines whether the rest goes well.

P0-00, P0-01, P0-02, P0-03, P0-04 and P0-06 are done — see the index above.

### P0-05 — Vercel deployment
- **owner:** devops
- **status:** todo
- **depends:** P0-02, P0-03
- **why:** Deploy early so deployment is never the risky unknown.
- **note (2026-08-09):** QUESTIONS.md Q4 resolved — production is live at
  <https://train-signal-drab.vercel.app/> after fixing a Framework Preset misconfiguration
  (was set to "Other", causing a "public/ output directory not found" build error; changed
  to "Next.js"). Full trail in `agent/QUESTIONS-ARCHIVE.md` Q4. Env vars are confirmed
  added in Vercel. Remaining acceptance items below are not yet verified — needs a devops
  pass to confirm preview deployments and the a11y suite actually run against them.
- **acceptance:**
  - [x] `main` auto-deploys to production
  - [ ] PRs produce preview deployments
  - [ ] a11y suite runs against the preview URL, not just locally
  - [x] Environment variables configured, nothing `NEXT_PUBLIC_`-prefixed

---

# Phase 1 — Journey spine

Get a real journey on screen. No signal data yet — prove the timetable and timeline work
first.

P1-03 through P1-07 are done — see the index above.

### P1-01 — Darwin LDBWS integration
- **owner:** data-engineer
- **status:** blocked
- **blocked-on:** QUESTIONS.md Q1 (Darwin API key)
- **depends:** P0-03
- **why:** Live calling points for today's journeys.
- **acceptance:**
  - [ ] Server-side only; key never reaches the client
  - [ ] Origin + destination → services with full calling points and times
  - [ ] Typed responses, errors handled without inventing data
  - [ ] Rate limiting and caching respected
  - [ ] Tests against recorded fixtures, not the live API

### P1-02 — Network Rail SCHEDULE timetable
- **owner:** data-engineer
- **status:** blocked
- **blocked-on:** QUESTIONS.md Q2 (Network Rail credentials)
- **depends:** P0-03
- **why:** The 8-week horizon. The core use case is booking a meeting for a future date,
  which live boards can't serve.
- **acceptance:**
  - [ ] SCHEDULE feed ingested and parsed
  - [ ] Journey lookup for any date up to 8 weeks ahead
  - [ ] Refresh strategy defined and automated
  - [ ] Handles Sunday timetables and engineering variations
  - [ ] Derived data compact enough to query fast

---

# Phase 2 — Signal

The part that makes it a product rather than a worse Trainline.

### P2-02 — Track geometry and tunnels
- **owner:** data-engineer
- **status:** todo
- **depends:** P1-03
- **why:** Maps a journey to a line on the ground, and gives named tunnels as certain
  dead zones. "Standedge Tunnel, 3 minutes, no signal" is far more trustworthy than an
  unexplained gap.
- **acceptance:**
  - [ ] GB railway geometry extracted from OSM
  - [ ] Tunnels extracted with names, coordinates and lengths
  - [ ] Station-pair → track segment resolution
  - [ ] ODbL attribution recorded and surfaced in the app
  - [ ] Committed compact; raw extracts gitignored

### P2-03 — Full signal pipeline
- **owner:** data-engineer
- **status:** todo
- **depends:** P2-01, P2-02
- **why:** The derived dataset the product runs on.
- **acceptance:**
  - [ ] Streams the full Ofcom data without loading it into memory
  - [ ] Filters to points near track, snaps to segments
  - [ ] Aggregates per segment per operator to a **distribution**, not a mean —
        10th percentile matters more than average
  - [ ] Measurement count and date range preserved per segment
  - [ ] Thresholds documented and justified in `specs/signal-model.md`
  - [ ] Output a few MB, committed; raw gitignored
  - [ ] Re-runnable to byte-identical output
  - [ ] Row counts logged at each stage

### P2-04 — Signal bands on the timeline
- **owner:** developer
- **status:** todo
- **depends:** P2-03, P1-06
- **why:** The answer the user came for.
- **acceptance:**
  - [ ] Three bands rendered on both table and visual timeline
  - [ ] Low confidence visibly distinct — never presented as a confident verdict
  - [ ] Tunnels named inline
  - [ ] Greyscale-legible
  - [ ] Language is "expected"/"likely", never "you will have signal"
  - [ ] Data vintage stated in the UI

### P2-05 — "Best window to book"
- **owner:** developer
- **status:** todo
- **depends:** P2-04
- **why:** The actual product. The sentence people came for; the timeline is evidence.
- **acceptance:**
  - [ ] Longest continuous good-signal stretch identified, with clock times
  - [ ] Stated as a plain sentence, large and unmissable, above the timeline
  - [ ] Distinguishes video-capable from voice-only windows
  - [ ] Handles "no good window on this journey" honestly and helpfully
  - [ ] Reading level checked against WCAG 3.1.5

---

# Phase 3 — Truth and polish

### P3-01 — Cross-validation against known notspots
- **owner:** qa
- **status:** todo
- **depends:** P2-04
- **why:** Our credibility rests on being right. External disagreement is the cheapest
  signal that we aren't.
- **acceptance:**
  - [ ] Output compared against mastdatabase rail notspots on major routes
  - [ ] Disagreements investigated and documented
  - [ ] Direction of error established — must skew conservative, not optimistic
  - [ ] Findings in `specs/signal-model.md`

### P3-02 — Confidence and honesty pass
- **owner:** product-manager
- **status:** todo
- **depends:** P2-04, P3-01
- **why:** The failure that hurts is a confident wrong answer. This is the deliberate
  check that we haven't drifted into one for the sake of a cleaner interface.
- **acceptance:**
  - [ ] Every claim in the UI traced to what the data actually supports
  - [ ] Sparse-data routes degrade to "we don't know", not a guess
  - [ ] Vintage and limitations discoverable without being oppressive
  - [ ] Attribution present for all sources

### P3-03 — Manual accessibility audit
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** P2-05
- **why:** Automated tooling catches perhaps a third of AAA issues. This is the rest.
- **acceptance:**
  - [ ] Full manual pass against every applicable AAA criterion
  - [ ] Screen reader testing documented
  - [ ] Reading level verified across all copy
  - [ ] Any non-compliance documented honestly with justification
  - [ ] Accessibility statement published in the app

### P3-04 — Performance
- **owner:** developer
- **status:** todo
- **depends:** P2-05
- **why:** People load this on a train, on a bad connection — exactly when signal is
  poor. A slow app about bad signal is an embarrassment.
- **acceptance:**
  - [ ] Lighthouse performance budget met on throttled mobile
  - [ ] Client JS minimised; server components used wherever possible
  - [ ] Station data loads without blocking first paint
  - [ ] Works on a slow 3G connection

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.

### DW-02 — Results page: wire up real journey data when P1-01/P1-02 land
- **owner:** developer
- **status:** todo
- **depends:** P1-01, P1-02
- **why:** The results page currently renders fixture data only. Once LDBWS (P1-01)
  and/or SCHEDULE (P1-02) are integrated, the results page needs to fetch real calling
  points and pass them to `JourneyTimeline`.
- **acceptance:**
  - [ ] Results page reads journey params from URL and fetches real timetable data
  - [ ] `JourneyTimeline` receives real `Journey` data
  - [ ] Fixture notice removed
  - [ ] Error and loading states handled

### DW-03 — Header/footer landmarks and skip link
- **owner:** developer
- **status:** todo
- **depends:** —
- **why:** `specs/accessibility.md` section 2.2 (1.3.1) specifies that landmarks must
  include `<header>` and `<footer>`; section 3.13 (2.4.1) requires a skip link as the
  first focusable element on every page. The current `app/layout.tsx` wraps children in
  `<body>` with no header or footer, so the home page also has no skip link (there is no
  repeated block to skip). Not a strict AAA violation on its own (no single criterion
  mandates specific landmark types), but our own spec requires them, and a `<footer>` is
  needed for attribution and the future accessibility statement link (P3-03).

  Filed as one task rather than two: the landmarks and the skip link are the same piece
  of work on the same file, and splitting them across separate dispatch/verify/PR cycles
  would only duplicate overhead for no benefit — see the bundling rule above.
- **acceptance:**
  - [ ] `app/layout.tsx` includes a `<header>` with site name/identity and a `<footer>`
        with attribution placeholder; both appear on every page
  - [ ] Home page has a skip link as the first focusable element, bypassing the header
  - [ ] Results page skip link ("Skip to journey details") still works and also bypasses
        the header
  - [ ] Both skip links meet 44px target size (2.5.5)
  - [ ] axe AAA tests still pass
