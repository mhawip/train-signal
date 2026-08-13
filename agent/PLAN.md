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
| P2-02 | Track geometry and tunnels | data-engineer |
| P2-03 | Full signal pipeline | data-engineer |
| P2-04 | Signal bands on the timeline | developer |
| DW-05 | Accessibility review of P2-04 signal bands | accessibility-specialist |
| P2-05 | "Best window to book" | developer |
| P0-05 | Vercel deployment | devops |
| DW-03 | Header/footer landmarks and skip link | developer |
| P3-01 | Cross-validation against known notspots | qa |
| P3-02 | Confidence and honesty pass | product-manager |
| P3-03 | Manual accessibility audit | accessibility-specialist |
| P3-04 | Performance | developer |
| P1-01 | Darwin LDBWS integration | data-engineer |
| P1-02 | Network Rail SCHEDULE timetable | data-engineer |

---

# Phase 0 — Foundations

Nothing here is user-visible. All of it determines whether the rest goes well.

P0-00 through P0-06 are done — see the index above.

---

# Phase 1 — Journey spine

Get a real journey on screen. No signal data yet — prove the timetable and timeline work
first.

P1-01 through P1-07 are done — see the index above.

---

# Phase 2 — Signal

The part that makes it a product rather than a worse Trainline.

P2-02, P2-03, P2-04, and P2-05 are done — see the index above.

---

# Phase 3 — Truth and polish

P3-01 is done — see the index above.


P3-03 is done — see the index above.

P3-04 is done — see the index above.

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.

### DW-02 — Results page: wire up NR SCHEDULE journey data when P1-02 lands
- **owner:** developer
- **status:** todo
- **depends:** P1-02
- **why:** The results page now calls Darwin for today's journeys (P1-01 done). Future-date
  journeys still show the fixture. Once SCHEDULE (P1-02) is integrated, wire up future-date
  journeys and remove the fixture notice entirely.
- **acceptance:**
  - [ ] Results page fetches NR SCHEDULE data for future-date journeys
  - [ ] `JourneyTimeline` receives real `Journey` data for all dates within 8-week horizon
  - [ ] Fixture notice removed (both today and future dates now show real data)
  - [ ] Error state handled (no service found / out of horizon)


### DW-04 — Retarget signal pipeline at RDM product
- **owner:** data-engineer
- **status:** todo
- **depends:** —
- **why:** Matt verified the RDM "NWR Yellow Train Mobile Network Measurements" product
  (Rail Data Marketplace) on 2026-08-09. It is dated July 2026, contains 5G measurements
  from this year, has all required fields (RSRP/RSRQ/SINR, MCC/MNC, operator), and is
  smaller than the Ofcom CSVs. Matt explicitly recommends using the RDM product. The
  current `data/signal-segments.json` was built from the 2018–19 Ofcom data. The RDM
  data is materially newer and includes 5G — it is the better source.
- **acceptance:**
  - [ ] `pipeline/p2-03-build-signal.ts` updated to accept the RDM CSV format; any
        column-name or schema differences from the Ofcom format handled
  - [ ] RDM data downloaded to `data/raw/` (gitignored) and pipeline re-run
  - [ ] `data/signal-segments.json` regenerated from RDM data and committed (under 10 MB)
  - [ ] `specs/signal-model.md` updated with RDM schema, column names, and row counts
  - [ ] Row counts logged at each stage (same as P2-03)
  - [ ] Re-runnable to byte-identical output
  - [ ] `npm run verify` green

### DW-07 — Validation script uses wrong CRS code for Newark
- **owner:** qa
- **status:** todo
- **severity:** low
- **depends:** —
- **why:** The P3-01 validation script (`pipeline/p3-01-validate-notspots.ts`) uses CRS
  code "NEW" for Newark on the ECML route, but "NEW" maps to Newcastle. This produces
  invalid 400+ km paths for the RET-to-NEW and NEW-to-GRA segments, making those two
  segments untestable. The product itself is unaffected (it uses timetable calling points,
  not hand-coded CRS codes).
- **acceptance:**
  - [ ] Replace "NEW" with "NNG" (Newark North Gate) in the ECML route definition
  - [ ] Re-run the script and confirm RET-to-NNG and NNG-to-GRA produce sensible paths
  - [ ] Document any new findings from the corrected segments

### DW-08 — Automate weekly SCHEDULE data refresh via GitHub Actions
- **owner:** devops
- **status:** todo
- **depends:** P1-02
- **why:** `data/schedule-index.json.gz` covers 8 weeks from the date the pipeline ran.
  Without weekly refresh the window shrinks and future-date lookups eventually fail.
  `pipeline/p1-02-build-schedule.ts` exists and is re-runnable; it just needs a
  scheduled workflow to drive it automatically.
- **acceptance:**
  - [ ] GitHub Actions workflow runs `pipeline/p1-02-build-schedule.ts` on a weekly
        schedule (e.g. every Sunday night)
  - [ ] Workflow reads `NR_FEEDS_USER` and `NR_FEEDS_PASS` from Actions secrets
  - [ ] If the output file changes, commits and pushes to `main` automatically
  - [ ] Workflow failure sends a visible notification (Actions default email is fine)
  - [ ] `npm run verify` still green after the workflow is added

### DW-06 — Investigate local Windows build failure
- **owner:** devops
- **status:** todo
- **depends:** —
- **why:** `npm run build` fails locally on Windows with `<Html> should not be imported
  outside of pages/_document` during prerendering of `/500`. CI (Ubuntu, clean install)
  is consistently green. Likely a Windows path/env interaction or non-standard NODE_ENV
  (`development` is set in environment before build runs, triggering Next.js warning).
  This prevents running `npm run verify` locally, which slows down the dev loop.
- **acceptance:**
  - [ ] Root cause identified and documented
  - [ ] `npm run build` succeeds locally on Windows
  - [ ] `npm run verify` succeeds locally on Windows
