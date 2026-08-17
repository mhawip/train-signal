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
| DW-02 | Results page: wire up NR SCHEDULE journey data | developer |
| DW-07 | Validation script uses wrong CRS code for Newark | qa |
| DW-08 | Automate weekly SCHEDULE data refresh via GitHub Actions | devops |
| DW-09 | Accessibility constraints: departure selection page and route search form | accessibility-specialist |
| DW-10 | Design: departure selection page and route search form | designer |
| DW-11 | Implement departure selection flow | developer |
| DW-12 | Implement route search form progressive reveal | developer |
| DW-13 | Accessibility review of DW-11 and DW-12 | designer |
| DW-06 | Fix local Windows verify: Playwright hang and build failure | infra |
| DW-14 | Ship design iteration: accordion form, optional network, worst-case signal | developer |

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

### DW-15 — Design: route overview results and no-network disclaimer
- **owner:** designer
- **status:** todo
- **depends:** DW-14
- **why:** Two new results-page states need accessibility constraints and visual design
  before implementation can begin.
- **state 1 — route overview (no time entered):**
  The user enters only origin + destination (and optionally a network). The form submits
  without a departure time. Results show signal for the *most common stopping pattern*
  between those two stations (derived from SCHEDULE data — the stopping pattern that
  appears most frequently across all scheduled services). Timeline shows stop-to-stop
  segments proportionally by scheduled duration, with no clock times (since there is no
  specific departure). Heading should make the "typical journey" framing clear.
- **state 2 — no-network disclaimer:**
  When no network is selected, results show worst-case signal across all four operators.
  A small inline notice on the results page should explain this and offer a link back to
  the search page (pre-filled with current from/to/date/time params, with the network
  accordion open) so the user can refine by network without re-entering everything.
- **acceptance:**
  - [ ] Accessibility constraints written (WCAG 2.2 AAA) for both states before any
        implementation begins — same rigour as DW-09
  - [ ] Visual design specified for both states: component layout, copy, typography,
        all interactive states
  - [ ] Back-link URL pattern for the no-network disclaimer specified (params to include)
  - [ ] Self-certification checklist completed
  - [ ] No open accessibility questions at time of hand-off to developer

### DW-16 — Implement route overview results (no time → most common stopping pattern)
- **owner:** developer
- **status:** todo
- **depends:** DW-15
- **why:** Currently the form forces time entry before submitting (reveals accordion and
  prompts). Route overview mode skips time entirely and shows signal for the most typical
  journey on the route.
- **scope:**
  - `JourneyForm`: allow submission without time — when date/time accordion is closed,
    submit directly rather than forcing it open with a prompt
  - New server function (e.g. `findTypicalJourney(from, to)` in `schedule.ts`): scans
    SCHEDULE data to count stopping patterns between the two stations; returns the most
    frequent one as a `Journey` object (without specific departure time — use sentinel
    values or nullable times as the designer specifies)
  - `results/page.tsx`: detect no `time` param → call `findTypicalJourney` instead of
    `findScheduledJourney`/`fetchDepartures`; render route overview variant of the page
  - Timeline component: handle null/absent clock times — show stop names and proportional
    segment bars without the time column
  - Heading, context text, and "typical journey" framing as designed in DW-15
- **acceptance:**
  - [ ] Submitting with only origin + destination (no time) reaches a results page
  - [ ] Most common stopping pattern is selected (unit test: given a fixture with known
        pattern counts, returns the correct one)
  - [ ] Timeline renders correctly with no clock times
  - [ ] Results page heading makes "typical journey" framing clear (per DW-15 design)
  - [ ] Specific-train path (with time) still works as before
  - [ ] `npm run verify` green

### DW-17 — Implement no-network disclaimer with back-to-search link
- **owner:** developer
- **status:** todo
- **depends:** DW-15
- **why:** When no network is selected the results already show worst-case signal, but
  the current notice is minimal. Needs the full treatment designed in DW-15: clear
  explanation, accessible styling, and a link back to the search page pre-filled so
  the user can add their network without re-entering the journey.
- **scope:**
  - Replace the current "across all networks" paragraph in `results/page.tsx` with the
    designed component (notice/callout as specified in DW-15)
  - Back-link URL: `/?from=...&to=...&date=...&time=...&network=open` (or whatever
    param pattern DW-15 specifies to pre-open the network accordion)
  - `JourneyForm`: if URL contains the network-open signal, reveal the network accordion
    on load (currently only done if `network` param has a value)
- **acceptance:**
  - [ ] No-network notice matches DW-15 design
  - [ ] Link returns user to search form with all current journey params pre-filled
  - [ ] Network accordion is open when user arrives via the back-link
  - [ ] Notice not shown when a network is selected
  - [ ] `npm run verify` green

### DW-04 — Retarget signal pipeline at RDM product
- **owner:** infra
- **status:** blocked
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
- **blocked because:** RDM CSV not yet downloaded to `data/raw/`. The pipeline
  script cannot be updated without knowing the exact column names, and the output
  cannot be regenerated without the data. See Q6 in QUESTIONS.md.
