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

### DW-13 — Accessibility review of DW-11 and DW-12
- **owner:** designer
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

### DW-06 — Fix local Windows verify: Playwright hang and build failure
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** Two related Windows-only issues are actively blocking the ralph loop from
  completing full `npm run verify` runs locally. Without this fix, every developer
  iteration must skip Playwright and rely on CI — slowing the feedback loop and making
  local work less safe.
  1. **Playwright hangs:** `npm run test:a11y` never exits. The webServer starts `npm run dev`,
     but the process hangs indefinitely rather than timing out. Observed in DW-07 and
     every DW-11 iteration since. Diagnosis options: port 3000 already in use, dev server
     not signalling readiness on Windows, or the Playwright HTML reporter hanging on
     cleanup. CI (Ubuntu) is green.
  2. **Build failure:** `npm run build` fails locally with `<Html> should not be imported
     outside of pages/_document` during `/500` prerender. Likely `NODE_ENV=development`
     set in the local shell before build runs, triggering a Next.js warning that becomes
     an error. CI is green because it runs in a clean env.
- **acceptance:**
  - [ ] Root cause of Playwright hang identified; `npm run test:a11y` exits cleanly
        locally on Windows (pass or fail — not hang)
  - [ ] Root cause of build failure identified; `npm run build` succeeds locally
  - [ ] `npm run verify` completes locally on Windows with all checks either passing or
        reporting a real failure (not hanging)
  - [ ] Findings documented in journal; fix committed if code change needed


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
