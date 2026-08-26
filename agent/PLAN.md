## Current state

**v1 is complete.** All scope items from `specs/brief.md` section 5 are implemented,
tested, and accessibility-reviewed (72 tasks, 46 PRs). Phase 4 (RDM data upgrade,
resilience, link previews) is also complete.

**Signal accuracy is the active focus.** Post-P4-05 re-validation identified that the
RDM 2026 data, while current, is excessively conservative — the ECML and other major
trunk routes show "no signal" for all operators, which contradicts real-world experience.
Two root causes are documented (uncalibrated RSRP, 5G SS-RSRQ mismatch). Phase 5
addresses both, and adds Ofcom Connected Nations modelled coverage as a second-tier
source for lines the yellow trains did not traverse. See journal entry 2026-08-24 and
`specs/signal-model.md` section "P4-05 RDM re-validation" for full analysis.

---

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
| DW-15 | Design: route overview results and no-network disclaimer | designer |
| DW-16 | Implement route overview results (no time → most common stopping pattern) | developer |
| DW-17 | Implement no-network disclaimer with back-to-search link | developer |
| DW-18 | Accessibility review of DW-16 (route overview) | accessibility-specialist |
| DW-19 | Accessibility review of DW-17 (no-network notice) | accessibility-specialist |
| P4-00 | Plan the next phase from the brief | product-manager |
| P4-01 | Error and loading boundaries for bad connections | developer |
| P4-02 | Accessibility constraints: Open Graph metadata on results pages | accessibility-specialist |
| P4-03 | Open Graph metadata on results and departures pages | developer |
| DW-04 | Retarget signal pipeline at RDM product | infra |
| P4-04 | Update vintage notice and attribution when RDM data lands | developer |
| P4-05 | Re-validate signal output against known notspots after RDM data | qa |
| P5-01 | Recalibrate signal thresholds for RDM raw data | data-engineer |
| P5-02 | Re-validate notspots after threshold recalibration | qa |
| P5-03 | Ofcom Connected Nations 2025: pipeline integration | data-engineer |
| P5-04 | Accessibility constraints: measured vs modelled signal display | accessibility-specialist |
| P5-05 | Design: measured vs modelled signal display | designer |
| P5-06 | Implement measured vs modelled signal display | developer |
| P5-07 | Accessibility review of P5-06 | accessibility-specialist |

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

## Phase 4 — Resilience, data upgrade, and link previews

Three goals, in priority order: (1) make the product survive bad connections — the
exact conditions it is used in; (2) land the RDM data upgrade when Matt unblocks it;
(3) make result URLs preview well when pasted in Teams/Slack/email, since that is
the natural end of the "booking a meeting in another tab" workflow.

**Explicitly not in this phase** (each reviewed and rejected):
- Saved journeys / accounts / social share buttons — brief says v2, requires accounts
- Live disruption or delay adjustment — different use case, different data, brief says v2
- Live in-journey tracking — in-journey not planning, brief says out of scope
- Map view — competitive analysis confirms timeline-first is correct for our use case
- Onboard wifi quality — different problem, different data, brief says later
- Non-GB journeys — data not available
- Structured data / JSON-LD — nice to have, not in success criteria, low user impact

P4-00 is done — see the index above.

P4-01 is done — see the index above.

P4-02 is done — see the index above.

P4-03 is done — see the index above.

P4-05 is done — see the index above.

---

## Phase 5 — Signal accuracy

**Goal:** Fix the excessive conservatism in the current signal model, then add Ofcom
Connected Nations modelled coverage as an honest second-tier source for lines the
yellow trains did not traverse.

**Background:** P4-05 re-validation found that 75.4% of all signal nodes show "none"
or "no-data" for every operator. The ECML (a major trunk route with known 4G/5G
coverage on all networks) shows "no signal" end-to-end. Two documented causes:

1. **Uncalibrated RSRP.** The Ofcom data had a calibrated `cal_rsrp` column (+3 to +6 dB
   above raw). RDM 2026 data has only raw `rsrp`. Thresholds were set against calibrated
   values, making them 3–6 dBm too conservative for the current dataset.
2. **5G SS-RSRQ mismatch.** The RSRQ degradation thresholds (−15 dB, −20 dB) were tuned
   for LTE wideband RSRQ (`WB_Rsrq`). 5G uses SS-RSRQ, which has a different scale and
   is systematically lower. Applying LTE thresholds to SS-RSRQ causes most 5G nodes to
   degrade from voice/video to "none" regardless of RSRP.

Fix the calibration errors first, re-validate, then — and only then — layer in
Connected Nations data to fill genuine no-data gaps. Never the other way around.

**Constraint on using modelled data:** Modelled data (Connected Nations) must never
override measured data (RDM yellow-train). It fills nodes with no measurements only.
Every UI surface that draws on modelled data must say so clearly — "estimated from
Ofcom coverage maps" is the minimum. This is a product honesty requirement, not just a
label. See WCAG 3.3.2 (labels or instructions) and the brief's non-negotiable #2.

P5-01 is done — see the index above.

P5-02 is done — see the index above.

P5-03 is done — see the index above.
**Note:** Per-pixel CN data not publicly downloadable; pipeline script ready but awaits
data via Q7. The `source` field is in the format and all downstream tasks can proceed.

P5-04 is done — see the index above.

P5-05 is done — see the index above.

P5-06 is done — see index above.

P5-07 is done — see index above.

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.

DW-04 is done — see index above.

### DW-20 — Run P5-03 Connected Nations pipeline once per-pixel data is available
- **owner:** data-engineer
- **status:** blocked
- **depends:** Q7 (Matt registers for Ofcom Connected Nations API or alternative)
- **why:** `pipeline/p5-03-build-connected-nations.ts` is implemented but requires
  per-operator 4G voice coverage data at per-pixel (100 m grid) or per-postcode
  resolution, which is not publicly downloadable. Once Matt provides access (via
  Ofcom CN API credentials or another route), this task runs the pipeline and updates
  `data/signal-segments.json` with modelled entries for the ~11k currently no-data nodes.
- **acceptance:**
  - [ ] Pipeline runs successfully against the obtained data
  - [ ] Console output logs per-operator node counts gained (logged by the script)
  - [ ] `data/signal-segments.json` contains nodes with `source: "modelled"`
  - [ ] No existing `source: "measured"` entries modified
  - [ ] `npm run verify` green
