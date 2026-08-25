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

### P5-03 — Ofcom Connected Nations 2025: pipeline integration
- **owner:** data-engineer
- **status:** in-progress
- **depends:** P5-02
- **why:** The yellow trains did not traverse every line in the March–May 2026 window.
  53% of graph nodes have zero measurements. For these nodes the product currently shows
  "no data", which is honest but unhelpful — particularly on secondary routes where
  users still need guidance. Ofcom Connected Nations 2025 publishes modelled 4G voice and
  data coverage at 100 m grid-square resolution for each operator, submitted annually
  under regulatory obligation and audited by Ofcom. It is more reliable than raw operator
  coverage maps (which the brief rightly calls optimistic) but less accurate than
  measured yellow-train data. It fills no-data nodes only; it never overrides a measured
  classification.
- **acceptance:**
  - [ ] Ofcom Connected Nations 2025 geographic coverage data downloaded to `data/raw/`
        (gitignored); source URL and licence recorded in `specs/signal-model.md`
  - [ ] New pipeline script `pipeline/p5-03-build-connected-nations.ts` created: reads
        the Connected Nations 100 m grid data, snaps each cell centroid to the nearest
        graph node within 200 m, and for each operator writes a "modelled" coverage
        record (band: "voice" if voice coverage present; "none" if not; source: "modelled")
  - [ ] `data/signal-segments.json` format extended: each per-operator entry gains a
        `source` field — `"measured"` (from RDM yellow-train data), `"modelled"` (from
        Connected Nations), or `"no-data"`. Existing RDM entries are all `"measured"`.
        New modelled entries populate only nodes where all four operators currently have
        `< 3` measurements (i.e. the `"no-data"` tier). Measured entries are never
        replaced.
  - [ ] Modelled entries do not carry a band above "voice" — Connected Nations data
        distinguishes "coverage" from "no coverage" but not voice vs video. A modelled
        "voice" result means "the operator's coverage model says this area is served";
        it says nothing about throughput.
  - [ ] Node counts logged: how many nodes gained modelled data, per operator, per band
  - [ ] `specs/signal-model.md` updated: Connected Nations schema documented, merge
        logic documented, limitations documented (modelled not measured, voice ceiling,
        no 5G coverage data in Connected Nations)
  - [ ] `npm run verify` green

### P5-04 — Accessibility constraints: measured vs modelled signal display
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** P5-03
- **why:** P5-03 introduces a new information category — modelled coverage — that must
  be distinguishable from measured coverage in the UI. This affects visual timeline
  design (1.4.1, 1.3.3), text timeline content (3.1.5), and honesty (brief non-negotiable
  #2). Constraints must be written before design begins.
- **acceptance:**
  - [ ] New section added to `specs/accessibility.md` covering the measured/modelled
        distinction
  - [ ] Visual treatment for modelled segments specified (must differ from measured by
        pattern and/or icon, not colour alone — WCAG 1.4.1)
  - [ ] Text timeline wording for modelled segments specified; must read at lower-secondary
        level (WCAG 3.1.5); must not claim accuracy the data does not have
        ("Ofcom coverage maps suggest voice may be available" is acceptable;
        "voice signal expected" is not — that phrase is reserved for measured data)
  - [ ] Legend update specified: existing two-source legend (measured, no data) must
        become three-source (measured, estimated, no data)
  - [ ] `npm run verify` green

### P5-05 — Design: measured vs modelled signal display
- **owner:** designer
- **status:** todo
- **depends:** P5-04
- **why:** Visual and interaction design for the modelled coverage tier before
  implementation begins.
- **acceptance:**
  - [ ] Visual timeline: modelled segments have a distinct fill that works in greyscale
        (WCAG 1.4.1), does not require colour to interpret (1.3.3), and is clearly
        distinguishable from both measured-voice and no-data fills
  - [ ] Legend updated to three entries; legend is accessible and visible at all
        breakpoints
  - [ ] Text timeline: wording for modelled rows specified and matches the approved
        copy from P5-04
  - [ ] Design token or class name proposed for the modelled visual state
  - [ ] `npm run verify` green

### P5-06 — Implement measured vs modelled signal display
- **owner:** developer
- **status:** todo
- **depends:** P5-05
- **why:** Wire the new `source` field from `data/signal-segments.json` into the
  timeline UI. Modelled segments need distinct visual treatment and distinct text.
- **acceptance:**
  - [ ] `app/lib/signal.ts`: `SegmentSignal` type gains `source: "measured" | "modelled" | "no-data"`
        field; populated from the `source` field in `signal-segments.json`
  - [ ] Visual timeline: modelled segments rendered with the design-approved fill/pattern;
        aria-hidden (the text table carries the semantic content)
  - [ ] Text timeline: modelled rows include the wording approved in P5-04; source is
        stated explicitly in the table cell
  - [ ] Legend updated to three entries; legend text matches P5-04 approved copy
  - [ ] No existing test broken; new unit tests for the `source` field population
  - [ ] `npm run verify` green

### P5-07 — Accessibility review of P5-06
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** P5-06
- **why:** The modelled/measured distinction introduces new patterns not seen in the
  existing UI. Independent review required before shipping.
- **acceptance:**
  - [ ] All WCAG 2.2 AAA criteria from `specs/accessibility.md` section written in P5-04
        verified against the built output
  - [ ] Greyscale render confirms modelled and measured fills are distinguishable without
        colour
  - [ ] Screen reader walkthrough confirms modelled segments are announced with source
        attribution, not just band
  - [ ] Any violations fixed and re-verified before closing the task
  - [ ] `npm run verify` green

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.

DW-04 is done — see index above.
