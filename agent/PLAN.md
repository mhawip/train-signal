## Current state

**v1 is complete.** All scope items from `specs/brief.md` section 5 are implemented,
tested, and accessibility-reviewed (72 tasks, 46 PRs). The only open item is DW-04
(RDM data upgrade), which is blocked on Matt downloading the CSV (Q6). The product
ships with 2018-19 Ofcom data; the UI states the vintage and errs conservative. See
journal entry 2026-08-18T14:30Z for the full assessment.

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

### P4-02 — Accessibility constraints: Open Graph metadata on results pages
- **owner:** accessibility-specialist
- **status:** in-progress
- **depends:** —
- **why:** Adding `<meta>` tags has no visual impact, but the OG description will be
  read by screen readers in some contexts (social media embeds, link previews in
  messaging apps). The copy must meet WCAG 3.1.5 reading level and the honesty rules
  (never "you will have signal"). This task sets the constraints before implementation.
- **acceptance:**
  - [ ] Copy templates for OG title and description documented in `specs/accessibility.md`
        (new section): reading level verified, hedged language confirmed, no jargon
  - [ ] OG description template uses "expected" or "likely", never promises signal
  - [ ] Guidance on what to do when no best window exists (the description must not
        invent a positive framing)
  - [ ] Character limits documented (OG title 60 chars, OG description 155 chars)

### P4-03 — Open Graph metadata on results and departures pages
- **owner:** developer
- **status:** todo
- **depends:** P4-02
- **why:** When a user finds their best window and pastes the results URL into a Teams
  chat, calendar invite, or email, the link currently previews as a bare URL with no
  context. Adding Open Graph title and description makes these links immediately useful:
  "Leeds to London signal -- Best window likely 14:35-15:20 (video call)". This is the
  natural end of the "booking a meeting in another tab" workflow the brief describes.
- **acceptance:**
  - [ ] Results page `generateMetadata` returns `openGraph.title` and
        `openGraph.description` following the templates from P4-02
  - [ ] Route-overview results page returns appropriate OG metadata (no clock times,
        station-to-station framing)
  - [ ] Departures page `generateMetadata` returns appropriate OG metadata
  - [ ] OG description includes the best-window summary when one exists
  - [ ] OG description handles no-best-window case honestly (per P4-02 constraints)
  - [ ] No OG image (avoid committing binary assets; text preview is sufficient)
  - [ ] Verified: pasting a results URL into a markdown-capable tool (or inspecting
        the HTML `<head>`) shows the expected title and description
  - [ ] Self-certified AAA per developer checklist (meta tags only, no visual change)
  - [ ] `npm run verify` green

### P4-04 — Update vintage notice and attribution when RDM data lands
- **owner:** developer
- **status:** blocked
- **depends:** DW-04
- **why:** When DW-04 ships, the signal data will be from July 2026, not 2018-19. The
  results page vintage notice ("Signal data is based on Ofcom rail measurements from
  2018 and 2019") and the footer attribution ("Ofcom yellow-train mobile signal
  measurements, 2018-19") will become inaccurate. Showing stale vintage text next to
  current data is a credibility problem -- the honest direction.
- **acceptance:**
  - [ ] Results page vintage notice updated to reflect the RDM data date (e.g. "2026")
  - [ ] Footer attribution updated to name the RDM source and its date
  - [ ] If the RDM data includes 5G, the vintage notice mentions this (e.g. "including
        4G and 5G measurements")
  - [ ] Language remains hedged ("expected", "likely") -- newer data does not justify
        stronger claims
  - [ ] Accessibility statement updated if the data-source description changes
  - [ ] `npm run verify` green
- **blocked because:** DW-04 has not yet shipped; the exact RDM data vintage and
  coverage details are not known until the pipeline runs.

### P4-05 — Re-validate signal output against known notspots after RDM data
- **owner:** qa
- **status:** blocked
- **depends:** DW-04
- **why:** The P3-01 cross-validation ran against 2018-19 Ofcom data. The RDM data is
  from 2026 and includes 5G. Signal verdicts will change. The validation must re-run to
  confirm the new data still skews conservative and does not introduce false positives
  (optimistic verdicts where signal is actually poor). A false positive -- telling
  someone they will have signal when they will not -- is the highest-severity failure
  this product can have.
- **acceptance:**
  - [ ] `pipeline/p3-01-validate-notspots.ts` re-run against the regenerated
        `data/signal-segments.json`
  - [ ] All 5 major routes re-checked (ECML, Transpennine, GWR, CrossCountry,
        Edinburgh-Glasgow)
  - [ ] Any new false positives (known notspot now showing "voice" or "video")
        investigated and filed as high-severity bugs
  - [ ] Direction of error confirmed: still conservative (under-promise, not
        over-promise)
  - [ ] Findings appended to `specs/signal-model.md` under a new "P4-05 RDM
        re-validation" section
  - [ ] If false positives are found, signal thresholds in `specs/signal-model.md`
        reviewed and adjusted before the data ships
- **blocked because:** DW-04 has not yet shipped; the new signal data does not exist yet.

---

## Discovered work

Bugs and follow-ups get filed here by whoever finds them.



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
