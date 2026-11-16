## Current state

**v1 is shipped (2026-08-27).** All scope items from `specs/brief.md` section 5 are
implemented, tested, and accessibility-reviewed (72+ tasks, 46+ PRs). Phase 6 acceptance
pass (signal accuracy, edge cases, responsive/zoom, accessibility) found zero bugs
requiring fixes beyond the pass itself. DW-20 (Connected Nations data merge) is complete
(2026-09-10): 5,768 previously no-data nodes filled with Ofcom modelled coverage,
bringing signal node count from 10,270 to 15,900. DW-21 (tunnel marking + graph
interpolation) is complete (2026-09-10): pipeline and UI support for `source: "tunnel"`
and `source: "interpolated"` added; run `npx tsx pipeline/p5-04-interpolate-coverage.ts`
to update signal-segments.json.

**Review, 2026-11-16: the answer is not useful yet, and the service is degrading.**
`specs/review-2026-11-signal-and-workflow.md` found that the pipeline misreads the
2026 measurements (it pools every cell the scanner heard and takes the worst tenth),
that the results page no longer shows a recommendation, and that the weekly timetable
refresh has never succeeded. **Phase 7 below is open.** Start with 7A. Questions Q8 to
Q15 are waiting on Matt.

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
| P6-01 | End-to-end QA: signal accuracy on major routes | qa |
| P6-02 | End-to-end QA: edge cases and resilience | qa |
| P6-03 | End-to-end QA: responsive and zoom | qa |
| P6-04 | End-to-end QA: accessibility final pass | accessibility-specialist |
| P6-05 | Update current-state header and declare v1 shipped | product-manager |

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

## Phase 6 — v1 acceptance and ship

**Goal:** Verify the complete product against the brief's success criteria and ship v1.
No new features. No scope expansion.

**What this phase is not:** It is not a place to add features deferred to v2 (accounts,
saved journeys, live disruption, sharing links, map views, non-GB journeys, onboard
wifi). Each of those is defensible alone. Together they destroy the product. They stay
out.

**What DW-20 means for v1:** The Connected Nations data merge (DW-20) is blocked on Q7.
The product is complete without it — lines with no yellow-train measurements show
"No data" honestly. DW-20 is a data-quality enhancement, not a v1 blocker. When Q7
unblocks, DW-20 runs independently of Phase 6.

### P6-01 — End-to-end QA: signal accuracy on major routes
- **owner:** qa
- **status:** done
- **depends:** —
- **why:** The failure that matters most is telling someone they will have signal when they will not. A final cross-check of signal verdicts on well-known routes catches false positives before real users rely on the product.
- **acceptance:**
  - [x] Test at least 6 routes: ECML (KGX-EDB), WCML (EUS-GLC), GWR (PAD-BRI), CrossCountry (BHM-MAN), TransPennine (LDS-MAN), Chiltern (MYB-BHM)
  - [x] For each route and each of the 4 networks, compare the signal verdict to mastdatabase.co.uk rail notspots map
  - [x] No false positive found: no segment shows "voice" or "video" where mastdatabase or common experience says no signal
  - [x] Any new false positive filed as a high-severity bug in PLAN.md
  - [x] Document results in `agent/JOURNAL.md` with route, network, and pass/fail per segment

### P6-02 — End-to-end QA: edge cases and resilience
- **owner:** qa
- **status:** done
- **depends:** —
- **why:** Edge cases that only emerge in a finished product — same origin and destination, beyond-horizon dates, midnight crossings, direct URLs, rapid resubmission, browser back/forward — could break the user experience in ways unit tests do not catch.
- **acceptance:**
  - [x] Origin and destination the same: form shows a clear error, does not submit
  - [x] Date beyond 8-week horizon: form shows a clear error, does not submit
  - [x] Date in the past: form shows a clear error, does not submit
  - [x] Journey crossing midnight (e.g. late-night service): times display correctly, signal segments are contiguous
  - [x] Direct URL to results page with valid params: page renders correctly without visiting the form first
  - [x] Direct URL to results page with missing params: shows the "No journey selected" message, not a crash
  - [x] Direct URL to results page with garbage params: shows appropriate error, not a crash
  - [x] Browser back button from results returns to the form with fields preserved
  - [x] Browser refresh on results page re-renders correctly
  - [x] Rapid double-submit of the form: no duplicate navigation or error
  - [x] No JavaScript errors in the browser console during any of the above
  - [x] No API keys visible in client-side network requests

P6-03 is done — see index above.

P6-04 is done — see index above.

P6-05 is done — see index above.

---

## Phase 7 — Useful answers

**Goal:** A journey search ends in a recommendation a person can act on. It is checked
against real in-carriage results in both directions. The service keeps itself running.

**Read first:** `specs/review-2026-11-signal-and-workflow.md`. Section numbers below
refer to it. It holds the evidence and the design decisions. Do not re-derive them.

**Rules for this phase**
- Owners are the four agent names in `.claude/agents/`: `product`, `designer`,
  `developer`, `infra`.
- Do not change a threshold, percentile or band rule by hand. Cut points come from
  P7-12 and are judged by P7-11.
- P7-04, P7-05 and P7-06 change the loop's own instructions. Open those PRs, do not
  auto-merge them, and file a question asking Matt to review.
- A task that depends on a question waits for the answer. Take other work meanwhile.

**Not in this phase:** passing times for stations a train does not call at, an
allowance by train class, a peak-time caveat (review section 5, last paragraph).

### 7A — Keep the service running

### P7-01 — Timetable refresh that works unattended
- **owner:** infra
- **status:** todo
- **depends:** Q8
- **why:** The weekly refresh failed 14 weeks running (no secrets) and is now disabled.
  The timetable is from 12 August. Journeys after 13 December return "No service
  found". The workflow also pushes to `main`, which six required checks forbid.
- **acceptance:**
  - [ ] `tsx` is a devDependency; the workflow runs it with `npx --no-install tsx`
  - [ ] The workflow does not push to `main`. It replaces `schedule-index.json.gz` on a
        release tagged `data-latest`, then calls the Vercel deploy hook
  - [ ] A `prebuild` script downloads that asset into `data/`, checks it unzips and
        parses, and falls back to the committed copy with a logged warning
  - [ ] Workflow re-enabled; a manual run is green; a second run is also green
  - [ ] Production: Leeds to Kings Cross on a weekday after 13 December returns a train
  - [ ] About page shows the timetable date. A date later than the timetable covers
        gets a plain-English "our timetable is out of date" message, built from the
        existing notice pattern
  - [ ] If this design proves unworkable, record why in the journal and file a
        question. Never weaken branch protection

### P7-02 — Tests that cannot go quietly stale
- **owner:** developer
- **status:** todo
- **depends:** —
- **why:** `e2e/results.spec.ts` pins 14 August 2026 and checks only for accessibility
  violations. After a timetable refresh it will test the "No service found" page and
  still pass. No test checks that a result has a recommendation: PR #70 removed it
  with green CI.
- **acceptance:**
  - [ ] A committed fixture journey can be served to the results page under a
        server-only test flag. No test depends on the live timetable or today's date
  - [ ] Each results-state e2e test asserts which state it is on (the `h1`, plus one
        band row or the error heading) before running axe
  - [ ] "No service found" and "No route found" each have their own test
  - [ ] A `test.fixme` naming P7-17 asserts that the headline section exists
  - [ ] Unit test: a date outside the timetable returns null, not an exception

### P7-03 — Housekeeping
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** Stale state misleads a loop that starts with no memory.
- **acceptance:**
  - [ ] PR #67 closed with a one-line reason
  - [ ] Remote branches whose PRs are merged or closed are deleted (67 at review time)
  - [ ] `.claude/settings.json` path rules no longer point at the OneDrive folder

### 7B — Guard rails for the loop

### P7-04 — Runner hardening
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** The runner inherits whatever model the session defaults to, records no cost,
  and its prompt stages every file in the folder into a public repo.
- **acceptance:**
  - [ ] `ralph.ps1` takes `-Model` (default `opus`) and passes `--model` on every call
  - [ ] Output captured as JSON. One row per iteration appended to
        `agent/logs/metrics.csv`: start, task ID, result, exit code, minutes, turns,
        cost. The prompt's final line is `RESULT task=<id> status=<done|blocked|none>`
  - [ ] Console and log encoding set to UTF-8; an em dash in a log reads correctly
  - [ ] On `main` with a non-empty `git status --porcelain`, the runner lists the files
        and stops without running
  - [ ] `agent/prompts/ralph.md` step 5 stages named paths. `git add -A` is gone from
        the prompt and the README
  - [ ] PR opened, not auto-merged; question filed for Matt to review and run `-Once`

### P7-05 — One vocabulary, current facts
- **owner:** product
- **status:** todo
- **depends:** —
- **why:** Four agents exist but the backlog, README, `CLAUDE.md` and the prompt name
  seven. Several files still call the data a 2018-19 snapshot, which is the stale
  reason the model was kept conservative.
- **acceptance:**
  - [ ] `agent/PLAN.md` rules, `agent/README.md`, `CLAUDE.md` and
        `agent/prompts/ralph.md` name only the four roles. Reviews go to `designer`,
        test tasks to `product`
  - [ ] `CLAUDE.md` non-negotiable 2, `.claude/agents/developer.md`,
        `.claude/agents/infra.md` and the header of `app/lib/signal.ts` describe the
        data as it is: measured 2026, measured 2018-19, estimated
  - [ ] `specs/data-sources.md`: the RDM section is current, with licence and
        attribution as shown on the product page (question for Matt if sign-in is
        needed)
  - [ ] The commit trailer in the prompt matches the pinned model
  - [ ] PR opened, not auto-merged; question filed for Matt to review

### P7-06 — Two-sided accuracy, evidence, demo gate, health check
- **owner:** product
- **status:** todo
- **depends:** Q9
- **why:** Every accuracy gate so far measured one kind of error. A model that says
  "no signal" everywhere passed them all, and v1 was declared shipped.
- **acceptance:**
  - [ ] The accuracy rule in review section 7.3 item 2 replaces the one-sided wording
        in `product.md`, `infra.md` and `developer.md`
  - [ ] `ralph.md`: a behaviour criterion passes on a test added or command output
        quoted in the journal. Reading the code is not a pass
  - [ ] `ralph.md` step 1 adds a health check: scheduled workflow runs that failed in
        the last 8 days, PRs open over 3 days, timetable older than 10 days. Each
        finding becomes a task or question before other work
  - [ ] `ralph.md`: when a phase's last task is done, write `agent/DEMO.md`, file a
        question and create `agent/PAUSE`
  - [ ] `ralph.md` step 7: anything Matt must do by hand gets a question that stays
        open until an agent has verified the result
  - [ ] `specs/brief.md` success criterion 2 reworded as Matt approves in Q9
  - [ ] PR opened, not auto-merged; question filed for Matt to review

### 7C — Signal model

### P7-07 — Calibration targets from Ofcom's in-carriage study
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** Review section 4. It is the only measured ground truth for what a phone in
  the carriage gets, and it lets us test both kinds of error.
- **acceptance:**
  - [ ] `data/calibration/ofcom-trains-2026.json`: Table 1 (24 lines, four networks,
        Wi-Fi), Tables 2, 3, 4 and 11, each with its page number, plus source URL and
        retrieval date
  - [ ] Table 1 is transcribed from the rendered PDF page. Text extraction scrambles
        its columns. Check: each network's lowest and highest line equal Table 2 (EE 9
        and 82, Three 4 and 48, O2 4 and 73, Vodafone 6 and 68), and the four rows in
        review section 4 match
  - [ ] `pipeline/eval/lines.ts`: each line as ordered CRS codes including the "via"
        points. Each resolves on the track graph. Lengths checked where the report
        gives one (Basingstoke to Coventry 117 miles, Victoria to East Croydon 10)
  - [ ] `specs/data-sources.md` entry: used for calibration only

### P7-08 — Track shape and tunnel names
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** Review sections 3.6 and 3.7. Edges have a length but no shape, so signal
  cannot be placed along them. Tunnels carry the line's name, not their own.
- **acceptance:**
  - [ ] Every graph edge stores its shape, simplified to 10 m, as an encoded polyline.
        Added size at most 3 MB. Node IDs and topology unchanged
  - [ ] `pointsAlongPath(nodeIds, stepM)` returns positions with cumulative distance.
        Test: Newark North Gate to Grantham is 23.7 km within 2%
  - [ ] Tunnel name read from `tunnel:name` (see `p2-02-extract-osm.js:257`), falling
        back to `name` only when that is not the line name. Ways with the same tunnel
        name that touch are merged. Tunnels under 100 m dropped
  - [ ] Present with plausible lengths: Standedge (about 4.9 km), Severn (7.0 km), Box
        (about 2.9 km), Chipping Sodbury (about 4.0 km), Stoke, Gasworks, Copenhagen
  - [ ] Tunnels are matched to a path by shape within 30 m. Leeds to Kings Cross lists
        no High Speed 1 or Thameslink tunnels

### P7-09 — Measured signal grid from the 2026 survey
- **owner:** infra
- **status:** todo
- **depends:** —
- **why:** Review sections 3.1 to 3.5. This is the main fix: strongest cell per place,
  per pass, read with the right network.
- **acceptance:**
  - [ ] New `pipeline/build-signal-grid.ts`, deterministic, streams both zips. Start
        from `pipeline/analysis/review-2026-11-grid-and-routes.js`
  - [ ] Row rules, each with a logged count: network from `mnc` (10 and 02 are O2, 15
        Vodafone, 20 Three, 30 to 33 EE), name column ignored; exact duplicates
        dropped; `rsrp` of -30 or above, or below -150, dropped; under 5 km/h dropped.
        4G counts within half a point of review section 3.5
  - [ ] Unit: pass (train and date) by cell (0.002 degrees latitude, 0.003 longitude)
        by network by technology. Value: strongest `rsrp` over all carriers and cells,
        with that row's `sinr`. Strongest `WB_Rsrp` kept alongside
  - [ ] Per cell across passes: median, minimum, pass count, first and last date. 4G
        and 5G are separate layers, never pooled
  - [ ] `data/signal-grid.json` at most 3 MB, arrays not per-cell objects, format
        described at the top of the script
  - [ ] Journal reproduces the table in review section 3.3 within 2 points
  - [ ] Carrier inventory in the journal: network, carrier, band, rows. Licensed
        carriers that never appear are listed
  - [ ] Unit tests: duplicate row, wrong operator name, zero `rsrp`, two cells on one
        carrier, two carriers, two passes

### P7-10 — Older measured layer from the 2018-19 survey
- **owner:** infra
- **status:** todo
- **depends:** P7-09
- **why:** The 2026 survey covers about half the network. Liverpool Street to Norwich
  has six measured cells. The 2018-19 file is already in `data/raw/`.
- **acceptance:**
  - [ ] First record what one row is: rows per position, time and network, and how
        many carriers and cells. Journal it before choosing the statistic
  - [ ] Same unit and statistic using `cal_rsrp`. Layer `m2019` added to the grid
        file. Never used where a 2026 value exists
  - [ ] Journal: route gained, and for cells with both layers how often the 2019 band
        is the same as, below or above the 2026 band

### P7-11 — Scorecard that fails in both directions
- **owner:** infra
- **status:** todo
- **depends:** P7-07, P7-08, P7-09
- **why:** Review section 7.3 item 1. Without it any tuning drifts, as it did.
- **acceptance:**
  - [ ] `npm run eval:signal` prints a table, writes `pipeline/out/eval.json`, and
        exits non-zero when a gate fails
  - [ ] For each Ofcom line and network: predicted share of the route by distance in
        each band, from the grid, the path shape and the calibration file
  - [ ] Gates, starting tolerances: (a) mean predicted good share over the 24 lines
        within 8 points of Ofcom's mean per network (42, 21, 20, 17); (b) mean
        absolute error per line at most 15 points per network; (c) predicted no-data
        share between 2% and 20% per network; (d) each named tunnel of 500 m or more
        on those lines is no-data for its length within 300 m
  - [ ] Reported, not gated: rank correlation per network, share of each line with
        measured evidence
  - [ ] Golden journeys: 10 fixture journeys on each network. Headline text and band
        minutes are snapshotted in `pipeline/eval/golden/` and the diff is printed
  - [ ] CI job `signal-eval` runs when `data/**`, `pipeline/**`, `app/lib/signal*` or
        `app/lib/best-window*` change. It may fail without blocking until P7-12 lands

### P7-12 — Calibrate the bands to in-carriage results
- **owner:** infra
- **status:** todo
- **depends:** P7-10, P7-11
- **why:** Review section 4. Replaces the guessed "10 to 30 dB" carriage loss and the
  hand-set thresholds with a fit to what phones in carriages measured.
- **acceptance:**
  - [ ] Roof-to-phone allowance per network: model median on the 24 lines minus
        Ofcom's in-carriage median. Recorded
  - [ ] No-data cut: phone -120 dBm plus the allowance. Good cut per network:
        least-squares fit of predicted good share to Table 1 over the 24 lines
  - [ ] Candidates compared by leave-one-line-out error: `rsrp` or `WB_Rsrp`; with or
        without `sinr` of 0 or better; with or without 5G raising a cell. Table in the
        journal. Best one chosen
  - [ ] `data/signal-calibration.json`: cut points, allowance, chosen metric, fit
        statistics, date. No threshold constants left in code
  - [ ] P7-11 gates pass. Tolerances tightened to the achieved leave-one-out error
        plus 3 points. CI job now blocks, and a question asks Matt to make it required
  - [ ] If a network's rank correlation for the good band is under 0.5, say so in
        `specs/signal-model.md` and in the P7-15 task. For that network the page
        describes signal, and any speed claim is Ofcom's network-wide figure. Do not
        force a fit
  - [ ] `specs/signal-model.md` becomes "Current model", at most 200 lines. The old
        file moves unchanged to `specs/history/signal-model-2026-08.md`

### P7-13 — App reads the grid
- **owner:** developer
- **status:** todo
- **depends:** P7-08, P7-12
- **why:** Review sections 3.6 and 3.8. The app classifies whole legs from sparse
  nodes. It should place measured signal along the real path.
- **acceptance:**
  - [ ] Journey profile: sample the path every 100 m; look up the cell, then its eight
        neighbours if empty; take the first tier with a value (measured 2026, measured
        2018-19, estimated, none); classify with the calibration file; tunnels
        override; merge equal neighbours into stretches with distance and clock time
        (linear in distance within a leg)
  - [ ] 5G can raise a stretch, never lower it
  - [ ] Each stretch carries its tier and pass count. One pass is shown as weaker
        evidence than several
  - [ ] Removed once unused: `classifySegment`, `classifySegmentWorstCase`,
        `data/signal-segments.json`, `pipeline/p2-03-build-signal.ts`,
        `pipeline/p5-03*`, `pipeline/p5-04*` and their tests
  - [ ] Unit tests on a fixture grid: band edges, tier order, tunnel override, empty
        cells, 5G rule
  - [ ] Data loaded at start totals at most 8 MB. Load time logged once
  - [ ] Golden snapshots updated and shown in the PR. Scorecard green
  - [ ] Existing timeline components render the new stretches. Any visual change gets
        a `designer` review task

### P7-14 — Estimated layer rebuilt
- **owner:** infra
- **status:** todo
- **depends:** P7-09, Q15
- **why:** Review section 3.7. The current layer gives all four networks the same
  answer and counts "no record" as "no coverage".
- **acceptance:**
  - [ ] One live API response saved as a fixture with the key removed. Field names and
        value meanings confirmed against it
  - [ ] Per network, the outdoor and indoor data fields with their grade. A 404 is "no
        data"
  - [ ] Positions: grid cells on track with no measured value. Nearest postcode within
        1 km, distance recorded, cache reused
  - [ ] Grade-to-band mapping learned from cells that have both a 2026 measurement and
        an estimate. Agreement table per network in the journal. Under 60% agreement,
        estimates are capped at limited
  - [ ] Gaps of at most 1 km between measured cells in the same band take that band,
        tier "estimated". No other interpolation
  - [ ] Scorecard still green. Liverpool Street to Norwich no longer shows identical
        results for all four networks

### 7D — The recommendation

### P7-15 — Constraints and design for the recommendation
- **owner:** designer
- **status:** todo
- **depends:** Q9, Q10
- **why:** The brief says "The sentence is the product". The page has no sentence.
  Constraints come before design, and design before code.
- **acceptance:**
  - [ ] `specs/accessibility.md` and `specs/design-system.md` cover: the headline
        recommendation (reuse the reviewed `BestWindow` pattern), the list of
        stretches to avoid, the four-network comparison for when no network is chosen,
        and a label for each evidence tier
  - [ ] The confidence label "Limited data" is replaced. It reads as a signal band
  - [ ] All band and tier wording is hedged and at lower-secondary reading level
  - [ ] Review of the PR #70 interface (`UnifiedTimeline`, `GranularSignalBar`)
        against `specs/accessibility.md`: is the text table still required and
        present, is the colour strip redundant and hidden from assistive technology,
        heading order, target sizes. Each finding filed as a task

### P7-16 — Window finder
- **owner:** developer
- **status:** todo
- **depends:** P7-13
- **why:** Review section 3.8. Today's finder needs whole legs of unbroken signal. On
  a long leg that is all or nothing.
- **acceptance:**
  - [ ] `findWindows(stretches, { lengths: [30, 60] })`, pure, replaces
        `findBestWindow`
  - [ ] For each length that fits: the start minute with the most good minutes (ties:
        fewer no-data minutes, then earlier). Returns good, limited and no-data
        minutes, the longest no-data gap, and the weakest evidence tier used
  - [ ] No-data runs of 60 seconds or less are short dips: counted, not excluded
  - [ ] Also returns the longest unbroken good run, and every no-data stretch of 2
        minutes or more with clock times and tunnel name
  - [ ] No good signal anywhere: returns the best limited window, flagged
  - [ ] Route-overview mode returns minutes from departure, not clock times
  - [ ] Tests: two-hour non-stop leg with mixed bands; no good anywhere; all no-data;
        midnight crossing; journey under 30 minutes

### P7-17 — Recommendation on the results page
- **owner:** developer
- **status:** todo
- **depends:** P7-15, P7-16
- **why:** This is the feature the product exists for.
- **acceptance:**
  - [ ] Results open with the recommendation built to P7-15: best window for a
        30-minute call with clock times and stations, how much of it is good, the
        longest gap, then the stretches to avoid
  - [ ] No network chosen: the comparison agreed in Q10
  - [ ] The link-preview description uses the same sentence
  - [ ] Wording is "likely" or "expected". A window resting on older or estimated
        evidence says so
  - [ ] The `test.fixme` from P7-02 is enabled and passes
  - [ ] `designer` review task filed

### P7-18 — Demo gate
- **owner:** product
- **status:** todo
- **depends:** P7-14, P7-17
- **why:** Review section 7.3 item 4. A person checks the output before the phase is
  called done.
- **acceptance:**
  - [ ] `agent/DEMO.md`: for the 10 golden journeys on each network, the old headline
        and band shares beside the new; the scorecard; what is still uncertain
  - [ ] Question filed for Matt. `agent/PAUSE` created
  - [ ] After approval: the about page and vintage notice match the evidence tiers,
        and the current-state header above is updated

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.

DW-04 is done — see index above.

### DW-20 — Run P5-03 Connected Nations pipeline once per-pixel data is available
- **owner:** data-engineer
- **status:** done
- **depends:** Q7 (resolved 2026-08-27)
- **why:** `pipeline/p5-03-build-connected-nations.ts` is implemented but requires
  per-operator 4G voice coverage data at per-pixel (100 m grid) or per-postcode
  resolution, which is not publicly downloadable. Once Matt provides access (via
  Ofcom CN API credentials or another route), this task runs the pipeline and updates
  `data/signal-segments.json` with modelled entries for the ~11k currently no-data nodes.
- **acceptance:**
  - [x] Pipeline runs successfully against the obtained data
  - [x] Console output logs per-operator node counts gained (logged by the script)
  - [x] `data/signal-segments.json` contains nodes with `source: "modelled"`
  - [x] No existing `source: "measured"` entries modified
  - [ ] `npm run verify` green — pending PR CI

### DW-21 — Signal gap-fill: tunnel marking + graph interpolation
- **owner:** data-engineer
- **status:** done
- **depends:** DW-20 (done)
- **why:** After DW-20, 5,726 nodes (26.5% of the graph) still show "No data". Two
  sub-categories: tunnel nodes (physically no signal) and non-tunnel gaps (spatially
  isolated, neighbours carry enough evidence for an honest estimate). Filling both
  honestly removes "No data" on all routes where neighbouring evidence exists.
- **acceptance:**
  - [x] `pipeline/p5-04-interpolate-coverage.ts` created (Phase A tunnel marking,
        Phase B graph interpolation)
  - [x] `app/lib/signal.ts` extended: `SignalSource` includes `"interpolated"`;
        `OperatorSignal.source` includes `"tunnel"` and `"interpolated"`;
        `classifySegment` tracks `hasInterpolated`; `SOURCE_RANK` updated
  - [x] `app/components/JourneyTimeline.tsx` updated: interpolated display strings
  - [x] `app/components/VisualTimeline.tsx` updated: interpolated reuses modelled CSS
  - [x] `specs/signal-model.md` documents P5-04 algorithm and thresholds
  - [ ] Pipeline run: `npx tsx pipeline/p5-04-interpolate-coverage.ts` (pending)
  - [ ] `npm run verify` green
