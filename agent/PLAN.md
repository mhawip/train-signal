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

### DW-09 — Accessibility constraints: departure selection page and route search form
- **owner:** accessibility-specialist
- **status:** in-progress
- **depends:** —
- **why:** Two novel interaction patterns need AAA constraints set before design starts.
  First: a new intermediate "choose departure" page that sits between the search form and
  the results page, presenting a short list of nearby trains for the user to pick from.
  Second: a progressive-reveal form that shows origin, destination, and network first,
  then offers the user a choice to add a specific journey time — revealing date and time
  fields conditionally. Both patterns have accessibility implications (focus management,
  conditional field reveal, page-level semantics) that must be resolved before the
  designer builds anything.
- **acceptance:**
  - [ ] `specs/accessibility.md` updated with AAA constraints for the departure selection
        page: how focus is managed on page load, whether the list is links or a radio
        group + submit, page title format, screen-reader announcement strategy
  - [ ] `specs/accessibility.md` updated with AAA constraints for the progressive-reveal
        form: technique for hiding/showing fields (aria-expanded, aria-controls, inert,
        or equivalent), ensuring hidden fields are removed from tab order, how the reveal
        trigger is labelled, keyboard interaction
  - [ ] Constraints documented before design work begins (DW-10 depends on this)

### DW-10 — Design: departure selection page and route search form
- **owner:** designer
- **status:** todo
- **depends:** DW-09
- **why:** Matt has approved two UX changes. First: when a user submits the journey
  form, instead of going directly to results, they land on a departure selection page
  showing 1 train before and 4 trains after their requested time (no hour cap — covers
  low-frequency routes). This makes the selected train explicit rather than silently
  substituting one. Second: the search form should show origin, destination, and network
  first, then offer a "Find a specific journey time" option that reveals date and time
  fields. This supports a future route-overview mode. For now the form always needs a
  time to produce results; the route-only path is a placeholder for later.
- **acceptance:**
  - [ ] Departure selection page designed as real components:
    - Recap header showing origin → destination and the date
    - List of up to 5 departures (1 before + 4 after requested time), each showing
      departure time, destination arrival time, and a clear call to action
    - Graceful handling of edge cases: fewer than 5 available (e.g. last train of day,
      first train), zero trains on this route/date
    - Follows the AAA constraints set in DW-09
  - [ ] Journey form redesigned:
    - Origin, destination, and network always visible
    - A clearly labelled control that reveals date and time fields ("Find a specific
      journey time" or similar plain English)
    - Progressive enhancement: the revealed fields are accessible and functional without
      JavaScript (consider a two-step form or a server-side conditional)
    - Follows the AAA constraints set in DW-09
  - [ ] Both screens reviewed in browser at 320 px and 1280 px, both colour schemes
  - [ ] `specs/design-system.md` updated with any new tokens or component decisions

### DW-11 — Implement departure selection flow
- **owner:** developer
- **status:** todo
- **depends:** DW-10
- **why:** The design from DW-10 requires a new server-rendered `/departures` page and
  changes to the multi-result lookup logic in both Darwin and SCHEDULE libraries.
- **acceptance:**
  - [ ] New `app/departures/page.tsx` server component; URL pattern
        `/departures?from=CRS&to=CRS&date=YYYY-MM-DD&time=HH:MM&network=...`
  - [ ] Darwin lookup extended to return up to 5 services (1 before + 4 at/after
        requested time). Time-before search may require a second Darwin call with an
        earlier `timeOffset` or scanning the response window.
  - [ ] SCHEDULE lookup extended to return up to 5 matches on the same basis
  - [ ] Departure selection page renders the list server-side; each departure is a link
        to `/results?...&time=<actual-departure-time>` — no JavaScript required
  - [ ] Focus management on page load follows the DW-09 constraints
  - [ ] `JourneyForm.tsx` `handleSubmit` updated to navigate to `/departures` instead
        of `/results`
  - [ ] The existing `/results` URL still works directly (bookmarks, back navigation)
  - [ ] `npm run verify` green

### DW-12 — Implement route search form progressive reveal
- **owner:** developer
- **status:** todo
- **depends:** DW-10, DW-11
- **why:** The redesigned form from DW-10 shows origin, destination, and network first,
  then reveals date and time fields via a user-triggered control. DW-11 must land first
  so the form has a working destination to submit to.
- **acceptance:**
  - [ ] `JourneyForm.tsx` restructured: origin, destination, network always rendered;
        date and time fields revealed by the "Find a specific journey time" control
  - [ ] Progressive enhancement: works without JavaScript (server-side conditional or
        a two-step form approach per the DW-09 constraints)
  - [ ] Hidden fields are genuinely removed from tab order when not revealed
  - [ ] Validation still fires correctly — fields only validated if revealed/active
  - [ ] URL state preserved: form pre-fills from params including the reveal state
  - [ ] `npm run verify` green

### DW-13 — Accessibility review of DW-11 and DW-12
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** DW-11, DW-12
- **why:** Both a new intermediate page in the journey flow and a progressive-reveal
  form are novel UI patterns that require independent accessibility review per the
  project's non-negotiables. Self-certification by the developer is not sufficient here.
- **acceptance:**
  - [ ] Departure selection page reviewed against all applicable WCAG 2.2 AAA criteria,
        specifically: focus management (2.4.3), page title (2.4.2), link purpose (2.4.9),
        consistent navigation (3.2.3)
  - [ ] Progressive-reveal form reviewed against: labels (1.3.1, 2.4.6), keyboard
        (2.1.1), focus visible (2.4.13), error identification (3.3.1), status messages
        (4.1.3)
  - [ ] Axe-core passes on both pages with no violations
  - [ ] Any issues filed as new DW tasks; blocker issues block merge

### DW-04 — Retarget signal pipeline at RDM product
- **owner:** data-engineer
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
