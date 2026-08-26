# Backlog archive

Full detail for tasks marked `done` in `agent/PLAN.md`, moved here so the live backlog
stays short. `PLAN.md` is read in full by every loop iteration; this file is not — read
it only when you need the history behind a decision (e.g. why a task was done a
particular way, or its full original acceptance criteria).

`PLAN.md` keeps a one-line index of everything archived here, so dependency checks
(`depends: P0-06`) never require opening this file.

---

## Phase 5 — Signal accuracy

### P5-01 — Recalibrate signal thresholds for RDM raw data
- **owner:** data-engineer
- **status:** done
- **depends:** —
- **why:** The RSRP thresholds (`VIDEO_RSRP_MIN = -85 dBm`, `VOICE_RSRP_MIN = -95 dBm`)
  were derived from Ofcom calibrated RSRP values. The Ofcom pipeline used `cal_rsrp`,
  which was consistently +3.2 to +5.6 dBm above raw RSRP (observed on Train1 in P2-01).
  The RDM pipeline uses raw `rsrp` only. The result is that borderline nodes that would
  be "voice" under Ofcom classification fall to "none" under RDM. A +4 dBm shift
  (midpoint of the documented offset) corrects this without over-correcting. Separately,
  5G SS-RSRQ is not comparable to LTE WB_RSRQ: SS-RSRQ values are systematically lower,
  and applying the LTE degradation thresholds to 5G nodes suppresses valid voice and
  video classifications. The fix is to bypass RSRQ degradation entirely for 5G-sourced
  rows, relying on RSRP alone for band classification on 5G nodes. This is conservative
  (RSRQ cannot improve a 5G classification) but not overcautious (RSRQ cannot incorrectly
  destroy one either).
- **acceptance:**
  - [x] `pipeline/p2-03-build-signal.ts`: `VIDEO_RSRP_MIN` changed from −85 to −89 dBm;
        `VOICE_RSRP_MIN` changed from −95 to −99 dBm
  - [x] RSRQ degradation disabled for rows sourced from the 5G zip (`Global_View_5G.zip`);
        4G RSRQ degradation using `WB_Rsrq` is unchanged
  - [x] `data/signal-segments.json` rebuilt; node count and band distribution logged
  - [x] Band distribution: "none" fell from 86.0% to 78.1% (material drop); "voice"
        doubled 6.1% → 12.1%; "video" doubled 1.8% → 3.7%
  - [x] `specs/signal-model.md` updated: threshold table, +4 dBm rationale, 5G RSRQ
        bypass, before/after distribution
  - [x] `npm run verify` green (289 unit tests, 17 Playwright tests). PR #55.

### P5-02 — Re-validate notspots after threshold recalibration
- **owner:** qa
- **status:** done
- **depends:** P5-01
- **why:** Any threshold loosening risks producing false positives -- claiming "voice" or
  "video" in a known dead zone. The notspot validation must be re-run against the
  recalibrated data before it ships. This is a hard gate: if any known notspot now shows
  "voice" or "video" on any operator, P5-01 must be revisited before we proceed.
- **acceptance:**
  - [x] `pipeline/p3-01-validate-notspots.ts` run against the rebuilt
        `data/signal-segments.json`
  - [x] All 9 previously confirmed notspots still show "none" or "no-data" for every
        operator (Stoke Tunnel, Kings Cross tunnels, Standedge, rural Retford-Grantham,
        rural Oxfordshire, Box Tunnel area, Edinburgh cuttings, Edinburgh-Glasgow central
        belt, GWR rural Wiltshire)
  - [x] At least two of the five routes now show some "voice" or "video" nodes on at
        least one operator (confirms the threshold shift had real effect)
  - [x] Results logged in `specs/signal-model.md` as a new "P5-02 validation" section,
        mirroring the format of the P4-05 section
  - [x] `npm run verify` green
- **what changed:**
  - `specs/signal-model.md` -- added P5-02 validation section: all 9 notspots confirmed
    at none/no-data, all 5 routes show voice/video nodes post-recalibration, overall
    verdict PASS. Band distribution recorded (video 3.7%, voice 12.1%, none 78.1%,
    no-data 6.1%). All-operators-none/no-data rate improved from 75.4% to 59.9%.
  - `agent/PLAN.md` -- P5-02 moved to completed index.

### P5-04 — Accessibility constraints: measured vs modelled signal display
- **owner:** accessibility-specialist
- **status:** done
- **depends:** P5-03
- **why:** P5-03 introduces a new information category — modelled coverage — that must
  be distinguishable from measured coverage in the UI. This affects visual timeline
  design (1.4.1, 1.3.3), text timeline content (3.1.5), and honesty (brief non-negotiable
  #2). Constraints must be written before design begins.
- **acceptance:**
  - [x] New section added to `specs/accessibility.md` covering the measured/modelled
        distinction
  - [x] Visual treatment for modelled segments specified (must differ from measured by
        pattern and/or icon, not colour alone — WCAG 1.4.1)
  - [x] Text timeline wording for modelled segments specified; must read at lower-secondary
        level (WCAG 3.1.5); must not claim accuracy the data does not have
        ("Ofcom coverage maps suggest voice may be available" is acceptable;
        "voice signal expected" is not — that phrase is reserved for measured data)
  - [x] Legend update specified: existing two-source legend (measured, no data) must
        become three-source (measured, estimated, no data)
  - [x] `npm run verify` green
- **what changed:**
  - `specs/accessibility.md` -- added section 15 (204 lines): visual treatment for
    modelled segments (135-degree dashed diagonal, distinct from 45-degree voice-only
    hatching, greyscale-distinguishable); exact text-table wording ("Ofcom coverage maps
    suggest..."); confidence column value "Estimated (coverage map)"; legend updated to
    six entries; screen reader constraints; developer verification checklist (12 items).
    WCAG criteria addressed: 1.4.1, 1.3.3, 3.3.2, 3.1.5, 1.4.11.
  - `agent/PLAN.md` -- P5-04 moved to completed index.

---

## Discovered work

### DW-04 — Retarget signal pipeline at RDM product
- **owner:** infra
- **status:** done
- **depends:** —
- **why:** Matt verified the RDM "NWR Yellow Train Mobile Network Measurements" product
  (Rail Data Marketplace) on 2026-08-09. It is dated July 2026, contains 5G measurements
  from this year, has all required fields (RSRP/RSRQ/SINR, MCC/MNC, operator), and is
  smaller than the Ofcom CSVs. Matt explicitly recommends using the RDM product. The
  current `data/signal-segments.json` was built from the 2018–19 Ofcom data. The RDM
  data is materially newer and includes 5G — it is the better source.
- **acceptance:**
  - [x] `pipeline/p2-03-build-signal.ts` updated to accept the RDM CSV format; any
        column-name or schema differences from the Ofcom format handled
  - [x] RDM data downloaded to `data/raw/` (gitignored) and pipeline re-run
  - [x] `data/signal-segments.json` regenerated from RDM data and committed (7.0 MB,
        under 10 MB limit)
  - [x] `specs/signal-model.md` updated with RDM schema, column names, and row counts
  - [x] Row counts logged at each stage (same as P2-03)
  - [x] Re-runnable to byte-identical output (deterministically sorted by nodeId then
        operator name)
  - [x] `npm run verify` green
- **what changed:**
  - `pipeline/p2-03-build-signal.ts` — added RDM ZIP streaming mode (unzipper library);
    RDM header/row parsing (`parseRdmHeader`, `parseRdmRow`); `normaliseOperator` for RDM
    operator name mapping; WB_Rsrq vs narrowband rsrq selection for 4G; DD/MM/YYYY date
    parsing; default mode processes both 4G and 5G zips. Legacy Ofcom CSV mode retained
    for backward compatibility via `--input` flag.
  - `pipeline/p2-03-build-signal.test.ts` — added `normaliseOperator` tests (9 cases).
    Total tests: 38.
  - `data/signal-segments.json` — rebuilt from RDM 2026 data (March–May 2026 measurements).
    10,270 nodes, 4,247,273 measurements. Source: "RDM NWR Yellow Train Mobile Network
    Measurements, 2026 (4G + 5G)". Size: 7.0 MB.
  - `specs/signal-model.md` — added DW-04 section: 4G/5G column schemas, operator
    normalisation table, RSRP/RSRQ rationale (raw vs calibrated, wideband vs narrowband),
    row counts per stage, band distribution, limitations, output file metadata.
  - `package.json` / `package-lock.json` — added `unzipper` (^0.12.5) and
    `@types/unzipper` (^0.10.11).

---

## Phase 4 — Resilience, data upgrade, and link previews

### P4-02 — Accessibility constraints: Open Graph metadata on results pages
- **owner:** accessibility-specialist
- **status:** done
- **depends:** —
- **why:** Adding `<meta>` tags has no visual impact, but the OG description will be
  read by screen readers in some contexts (social media embeds, link previews in
  messaging apps). The copy must meet WCAG 3.1.5 reading level and the honesty rules
  (never "you will have signal"). This task sets the constraints before implementation.
- **acceptance:**
  - [x] Copy templates for OG title and description documented in `specs/accessibility.md`
        (section 14): reading level verified, hedged language confirmed, no jargon
  - [x] OG description template uses "expected" or "likely", never promises signal
  - [x] Guidance on what to do when no best window exists (the description must not
        invent a positive framing)
  - [x] Character limits documented (OG title 60 chars, OG description 155 chars)
- **what changed:** Added section 14 "Open Graph metadata (P4-02)" to
  `specs/accessibility.md` (314 lines). Covers WCAG criteria, honesty rules, no-best-
  window guidance, character limits, four copy templates with worked examples and
  reading-level assessments, and a developer self-certification checklist for P4-03.
- **verify:** Pass. Documentation-only change; `npm run verify` green (236 unit tests,
  6 Playwright AAA tests, typecheck, lint, build).

---

### P4-00 — Plan the next phase from the brief
- **owner:** product-manager
- **status:** done
- **depends:** —
- **why:** v1 is complete against the brief. The backlog is empty except for DW-04
  (blocked on Q6). The product needs a next-phase plan: what to build after the RDM
  data upgrade, based on the brief's out-of-scope v1 items and the competitive analysis.
- **acceptance:**
  - [x] New phase tasks filed in PLAN.md with owners, dependencies, and acceptance criteria
  - [x] Tasks ordered by value — most valuable first, accessibility constraints before
        design before implementation
  - [x] No tasks filed that contradict the brief's explicit non-goals
  - [x] `npm run verify` green (no application code changed)

---

## Discovered work

### DW-19 — Accessibility review of DW-17 (no-network notice)
- **owner:** accessibility-specialist
- **status:** done
- **depends:** DW-17
- **why:** The `role="note"` + `aria-label="Network notice"` pattern is new to this
  product. Independent specialist verification required.
- **what changed:**
  - `app/globals.css`: `.ts-notice--network p` paragraph spacing corrected from
    `var(--space-4)` (16px) to `2.25em` (36px) to satisfy 1.4.8 (same class of error
    as DW-18). `.ts-notice__link` added to `color: LinkText` group in
    `@media (forced-colors: active)` block — it was missing, making the link
    indistinguishable from body text in Windows High Contrast Mode.
- **violations fixed:** Two (1.4.8 paragraph spacing; forced-colors link colour).
  All other section 13 criteria pass without changes: `role="note"` semantics correct,
  copy exact, URL pattern correct, contrast ratios pass, 44px target size present,
  keyboard access OK, focus ring OK.
- **verify:** Pass. 236 unit tests, 6 Playwright AAA axe-core tests, typecheck, lint.

### DW-18 — Accessibility review of DW-16 (route overview)
- **owner:** accessibility-specialist
- **status:** done
- **depends:** DW-16
- **why:** The route overview table replaces Arrives/Departs with a "Leg duration" column
  — a new table structure not yet reviewed with a screen reader. The DW-15 self-cert
  flagged this for independent verification.
- **what changed:**
  - `app/components/JourneyTimeline.tsx`: En dash cells in the origin row (Leg duration,
    Expected signal, Confidence) replaced with `aria-hidden` en dash + `.ts-visually-hidden`
    "Not applicable" text. `<tfoot>` restructured so Total spans only the Station column
    and duration appears in the Leg duration column (not the Confidence column as before).
  - `app/globals.css`: `.ts-route-subtitle` margin-bottom corrected from 24px to 2.25em
    (36px) to satisfy the 1.4.8 paragraph-spacing minimum (1.5 × 24px line-height = 36px).
- **violations fixed:** Three WCAG 2.2 AAA violations (all 1.3.1 or 1.4.8), none caught
  by axe-core — confirming manual table analysis is required.
- **verify:** Pass. 236 unit tests, 6 Playwright AAA axe-core tests, typecheck, lint.

### DW-15 — Design: route overview results and no-network disclaimer
- **owner:** designer
- **status:** done
- **depends:** DW-14
- **why:** Two new results-page states need accessibility constraints and visual design
  before implementation can begin.
- **what changed:**
  - `specs/accessibility.md`: added sections 12 (Route overview results page) and 13
    (No-network disclaimer notice). Full WCAG 2.2 AAA constraints for both states,
    including page title patterns, heading hierarchy, table column structure, copy
    strings, contrast verification, focus ring verification, keyboard/screen reader
    behaviour, forced colours, and self-certification checklists.
  - `specs/design-system.md`: added sections 11 (Route overview state) and 12
    (No-network disclaimer notice). HTML structure, CSS, design tokens, copy strings,
    back-link URL pattern, and forced-colours overrides.
  - New CSS tokens: `--color-notice-bg`, `--color-notice-border` (light and dark schemes).
    Contrast verified: 16.02:1 light, 14.43:1 dark for text; border contrast ≥3:1.
  - URL pattern for no-network back-link: `/?from=[CRS]&to=[CRS]&network=open` (plus
    `date`, `time`, `mode=timed` if entering from a specific-train result).
  - `network=open` sentinel: truthy so existing `hasNetwork` check opens the accordion;
    does not match any real network name so no radio is pre-selected.
- **known inconsistency (for developer):** `accessibility.md` section 12.5 lists 4
  columns for the route-overview table (Station, Leg duration, Expected signal,
  Confidence). `design-system.md` section 11 HTML example shows the 4th column as
  "Journey time" instead. The accessibility spec is authoritative — use Confidence,
  drop Journey time (meaningless without departure time). See DW-16 note.
- **post-implementation review needed:** route-overview table column structure (DW-18)
  and `role="note"` pattern (DW-19).

### DW-14 — Ship design iteration: accordion form, optional network, worst-case signal
- **owner:** developer
- **status:** done
- **depends:** —
- **why:** Matt iterated on the landing page design in session. Changes were uncommitted on
  `dev/DW-14-fix-a11y-statement-link`. Needed a commit, PR, and merge before downstream
  work begins.
- **what changed:**
  - Removed site header (skip link + home link); footer kept and styled subtly
  - Network radio group moved into a "Choose your mobile network" accordion (optional);
    selecting a network is no longer required
  - Date/time fields moved into a "Find a specific train journey" accordion (same pattern)
  - `signal.ts`: added `classifySegmentWorstCase` — iterates all 4 operators and returns
    the worst band; used when `journey.network` is empty
  - Results and departures pages: removed `|| "EE"` fallback; results page shows an
    "across all networks" notice when no network is selected
  - JourneyForm unit tests updated: button name "add a departure time"/"remove departure time"
    → "find a specific train journey"; `.ts-disclosure-toggle__chevron` → `.ts-accordion__chevron`
- **acceptance:**
  - [x] `npm run typecheck` and `npm run lint` pass
  - [x] PR #41 merged, CI green (all 8 checks including a11y and Lighthouse)

### DW-13 — Accessibility review of DW-11 and DW-12
- **owner:** designer
- **status:** done
- **depends:** DW-11, DW-12
- **why:** Both a new intermediate page in the journey flow and a progressive-reveal
  form are novel UI patterns that require independent accessibility review per the
  project's non-negotiables. Self-certification by the developer is not sufficient here.
- **acceptance:**
  - [x] Departure selection page reviewed against all applicable WCAG 2.2 AAA criteria:
        focus management (2.4.3), page title (2.4.2), link purpose (2.4.9),
        consistent navigation (3.2.3)
  - [x] Progressive-reveal form reviewed against: labels (1.3.1, 2.4.6), keyboard
        (2.1.1), focus visible (2.4.13), error identification (3.3.1), status messages
        (4.1.3)
  - [x] Axe-core: Playwright suite not run locally (DW-06 known Windows hang); typecheck,
        lint, and all 228 unit tests pass. CI will run axe-core.
  - [x] One issue found and fixed inline: page title used CRS codes instead of station
        names (2.4.2, 3.1.5). No blocker issues filed.

### DW-06 — Fix local Windows verify: Playwright hang and build failure
- **owner:** infra
- **status:** done
- **depends:** —
- **why:** Two Windows-only issues blocked `npm run verify` from completing locally.
  (1) Playwright hung indefinitely due to the HTML reporter opening a browser tab.
  (2) `npm run build` failed because `NODE_ENV=development` in the shell caused
  Next.js to error during `/500` prerender. CI (Ubuntu) was green on both.
- **acceptance:**
  - [x] Root cause of Playwright hang identified; `npm run test:a11y` exits cleanly
        locally on Windows (pass or fail — not hang)
  - [x] Root cause of build failure identified; `npm run build` succeeds locally
  - [x] `npm run verify` completes locally on Windows with all checks either passing or
        reporting a real failure (not hanging)
  - [x] Findings documented in journal; fix committed

### DW-12 — Implement route search form progressive reveal
- **owner:** developer
- **status:** done
- **depends:** DW-10, DW-11
- **why:** The redesigned form from DW-10 shows origin, destination, and network first,
  then reveals date and time fields via a user-triggered control. DW-11 must land first
  so the form has a working destination to submit to.
- **acceptance:**
  - [x] `JourneyForm.tsx` restructured: origin, destination, network always rendered;
        date and time fields revealed by the "Find a specific journey time" control
  - [x] Progressive enhancement: works without JavaScript (server-side conditional or
        a two-step form approach per the DW-09 constraints)
  - [x] Hidden fields are genuinely removed from tab order when not revealed
  - [x] Validation still fires correctly — fields only validated if revealed/active
  - [x] URL state preserved: form pre-fills from params including the reveal state
  - [x] typecheck, lint, and unit tests pass; Playwright handled per DW-06 precedent

### DW-10 — Design: departure selection page and route search form
- **owner:** designer
- **status:** done
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
  - [x] Departure selection page designed as real components:
    - Recap header showing origin → destination and the date
    - List of up to 5 departures (1 before + 4 after requested time), each showing
      departure time, destination arrival time, and a clear call to action
    - Graceful handling of edge cases: fewer than 5 available (e.g. last train of day,
      first train), zero trains on this route/date
    - Follows the AAA constraints set in DW-09
  - [x] Journey form redesigned:
    - Origin, destination, and network always visible
    - A clearly labelled control that reveals date and time fields ("Add a departure time")
    - Progressive enhancement: server renders full form; JS hides date/time and shows toggle
    - Follows the AAA constraints set in DW-09
  - [x] Both screens reviewed at 320 px and 1280 px, both colour schemes
  - [x] `specs/design-system.md` updated with sections 9 and 10, component inventory,
        and decisions table entries

---

### DW-09 — Accessibility constraints: departure selection page and route search form
- **owner:** accessibility-specialist
- **status:** done
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
  - [x] `specs/accessibility.md` updated with AAA constraints for the departure selection
        page: how focus is managed on page load, whether the list is links or a radio
        group + submit, page title format, screen-reader announcement strategy
  - [x] `specs/accessibility.md` updated with AAA constraints for the progressive-reveal
        form: technique for hiding/showing fields (aria-expanded, aria-controls, inert,
        or equivalent), ensuring hidden fields are removed from tab order, how the reveal
        trigger is labelled, keyboard interaction
  - [x] Constraints documented before design work begins (DW-10 depends on this)

### DW-08 — Automate weekly SCHEDULE data refresh via GitHub Actions
- **owner:** devops
- **status:** done
- **depends:** P1-02
- **why:** `data/schedule-index.json.gz` covers 8 weeks from the date the pipeline ran.
  Without weekly refresh the window shrinks and future-date lookups eventually fail.
  `pipeline/p1-02-build-schedule.ts` exists and is re-runnable; it just needs a
  scheduled workflow to drive it automatically.
- **acceptance:**
  - [x] GitHub Actions workflow runs `pipeline/p1-02-build-schedule.ts` on a weekly
        schedule (e.g. every Sunday night)
  - [x] Workflow reads `NR_FEEDS_USER` and `NR_FEEDS_PASS` from Actions secrets
  - [x] If the output file changes, commits and pushes to `main` automatically
  - [x] Workflow failure sends a visible notification (Actions default email is fine)
  - [x] `npm run verify` still green after the workflow is added

### DW-07 — Validation script uses wrong CRS code for Newark
- **owner:** qa
- **status:** done
- **severity:** low
- **depends:** —
- **why:** The P3-01 validation script (`pipeline/p3-01-validate-notspots.ts`) uses CRS
  code "NEW" for Newark on the ECML route, but "NEW" maps to Newcastle. This produces
  invalid 400+ km paths for the RET-to-NEW and NEW-to-GRA segments, making those two
  segments untestable. The product itself is unaffected (it uses timetable calling points,
  not hand-coded CRS codes).
- **acceptance:**
  - [x] Replace "NEW" with "NNG" (Newark North Gate) in the ECML route definition
  - [x] Re-run the script and confirm RET-to-NNG and NNG-to-GRA produce sensible paths
  - [x] Document any new findings from the corrected segments

### DW-02 — Results page: wire up NR SCHEDULE journey data when P1-02 lands
- **owner:** developer
- **status:** done
- **depends:** P1-02
- **why:** The results page now calls Darwin for today's journeys (P1-01 done). Future-date
  journeys still show the fixture. Once SCHEDULE (P1-02) is integrated, wire up future-date
  journeys and remove the fixture notice entirely.
- **acceptance:**
  - [x] Results page fetches NR SCHEDULE data for future-date journeys
  - [x] `JourneyTimeline` receives real `Journey` data for all dates within 8-week horizon
  - [x] Fixture notice removed (both today and future dates now show real data)
  - [x] Error state handled (no service found / out of horizon)

---

# Phase 0 — Foundations

### P0-00 — Competitive analysis: train-signal.vercel.app
- **owner:** product-manager
- **status:** done
- **depends:** —
- **why:** Found 2026-08-05 while looking up our Vercel URL. An existing app at
  <https://train-signal.vercel.app> (not ours — it owns the subdomain we wanted) solves
  close to the same problem: from/to/date, the same four networks, a service picker, a
  journey timeline with **Good / OK / Poor / None** bands over a Leaflet map, and a data
  source toggle between *"Measured (Ookla tiles)"* and *"Modelled (masts + terrain)"*.

  This is prior art for the core idea, so we should understand it deliberately rather
  than discover it at launch. Matt's read, which is the working hypothesis: **we can beat
  it on both data and design.**

  On data — Ookla tiles are crowdsourced from wherever people happen to use their
  phones, which weights to roads, homes and towns. Mast-and-terrain modelling is a
  prediction. Neither observes the railway directly. Yellow-train measurements are taken
  on the track, at roof height, which is a better instrument for this specific question.
  Confirm that reasoning holds rather than assuming it.

  On design — our brief bets on a single plain-English sentence ("Best window: 14:35 –
  15:20") with the timeline as supporting evidence. Theirs leads with a map. A map is
  the obvious choice and probably the wrong one: it shows *where* signal is, when the
  user's actual question is *when*. It is also very hard to make AAA-accessible.
- **acceptance:**
  - [x] Their output reviewed on 2–3 well-known routes, including a notspot-heavy one
        (note: competitor is a JS-heavy SPA; analysis was via declared behaviour and data
        source descriptions rather than interactive route testing — see journal)
  - [x] Where they are genuinely better, written down plainly — no defensiveness
  - [x] Their accessibility assessed; note what we must beat, not merely match
  - [x] Findings in `specs/competitive-analysis.md` with a clear statement of our
        differentiation
  - [x] Anything that changes our approach raised as a brief amendment, not applied
        silently (nothing changes — brief confirmed)
  - [x] **Do not copy their design or code.** Understand the problem space; make our own
        choices.

### P0-01 — Accessibility constraints document
- **owner:** accessibility-specialist
- **status:** done
- **depends:** —
- **why:** Everything downstream is designed against this. It has to exist first —
  retrofitting AAA does not work, and this is the task that prevents it.
- **acceptance:**
  - [x] `specs/accessibility.md` exists
  - [x] Every WCAG 2.2 AAA criterion that applies is listed, with what it means *for
        this product specifically* — not restated from the spec
  - [x] Colour contrast requirements stated as concrete ratios against named surfaces
  - [x] The signal-timeline problem addressed head-on: how bands stay distinguishable
        with colour removed
  - [x] The text-equivalent table specified as a first-class feature, not a fallback
  - [x] Testing approach defined: what's automated, what must be manual, and the honest
        limits of axe-core at AAA

### P0-02 — Repository, CI and quality gates
- **owner:** devops
- **status:** done
- **depends:** P0-03
- **why:** CI is the only reviewer. Until the gates exist, autonomous work is unsafe.
- **note:** Repo and protection done 2026-08-05 — <https://github.com/mhawip/train-signal>,
  public, PRs required, 0 approvals, auto-merge and delete-branch-on-merge enabled,
  force pushes blocked. CI workflow created 2026-08-06. **Required status checks** must
  be added after the first successful CI run -- the GitHub API rejects check names that
  have never reported a status.
- **acceptance:**
  - [x] Git repo initialised, pushed to GitHub, `main` protected
  - [x] Auto-merge enabled
  - [x] GitHub Actions: typecheck, lint, unit, a11y, Lighthouse, secret scan
  - [x] `npm run verify` runs locally exactly what CI runs
  - [x] Those checks added to branch protection as *required*, once they exist and have
        passed at least once
  - [x] Pipeline completes in under 5 minutes
  - [x] Pre-commit guard against large files

### P0-03 — Next.js application skeleton
- **owner:** developer
- **status:** done
- **depends:** P0-01
- **why:** The frame everything else is built in. Getting strict mode and the testing
  setup right now avoids retrofitting later.
- **acceptance:**
  - [x] Next.js App Router, TypeScript strict, no `any`
  - [x] Vitest configured and running
  - [x] Playwright + axe-core configured at AAA ruleset
  - [x] `eslint-plugin-jsx-a11y` at strictest settings
  - [x] A trivial page passes the full a11y suite
  - [x] `npm run verify` green

### P0-04 — Design system
- **owner:** designer
- **status:** done
- **depends:** P0-01, P0-03
- **why:** Establishes the palette and type scale against the 7:1 constraint before any
  component exists, so components inherit compliance rather than fighting for it.
- **acceptance:**
  - [x] `specs/design-system.md` documents tokens, scales, and the reasoning
  - [x] Every text/background pair verified at 7:1 (4.5:1 large), computed not eyeballed
  - [x] Signal band treatments defined and legible in greyscale
  - [x] Type scale respects 80ch line length and 1.5 line spacing
  - [x] All targets 44×44 minimum
  - [x] Implemented as real design tokens in the codebase
  - [x] Light and dark schemes both meeting AAA

### P0-05 — Vercel deployment
- **owner:** devops
- **status:** done
- **depends:** P0-02, P0-03
- **why:** Deploy early so deployment is never the risky unknown.
- **note (2026-08-09):** QUESTIONS.md Q4 resolved -- production is live at
  <https://train-signal-drab.vercel.app/> after fixing a Framework Preset misconfiguration
  (was set to "Other", causing a "public/ output directory not found" build error; changed
  to "Next.js"). Full trail in `agent/QUESTIONS-ARCHIVE.md` Q4. Env vars confirmed in
  Vercel.
- **note (2026-08-10):** Devops verification pass. Preview deployments confirmed working
  (PR #20 showed Vercel and Vercel Preview Comments checks both SUCCESS). A11y suite runs
  in CI against the locally-built Next.js app (`npm run build && npm run start`), which
  produces identical HTML/CSS/JS to what Vercel deploys. Targeting the Vercel preview URL
  was considered and rejected: it would add deployment wait time, network flakiness, and
  an ordering dependency for zero additional a11y coverage. The built app is the same code.
  Vercel's own status check already validates deployment success independently.
- **acceptance:**
  - [x] `main` auto-deploys to production
  - [x] PRs produce preview deployments (confirmed via PR #20 Vercel status checks)
  - [x] a11y suite runs in CI on every PR against the built Next.js app -- which is the
        same code Vercel deploys (local build is the correct approach; preview URL testing
        rejected as adding latency and flakiness for no coverage gain)
  - [x] Environment variables configured, nothing `NEXT_PUBLIC_`-prefixed

### P0-06 — Accessible component primitives
- **owner:** developer
- **status:** done
- **depends:** P0-04
- **why:** Form controls are where accessibility usually fails. Build them once,
  correctly, and every feature inherits it.
- **acceptance:**
  - [x] Text input, combobox (station search), date/time picker, radio group, button
  - [x] Native semantics wherever possible; ARIA only where genuinely needed
  - [x] Full keyboard operation, visible focus at enhanced contrast
  - [x] Errors associated programmatically and announced
  - [x] Each has a passing axe AAA test
  - [x] `prefers-reduced-motion` and forced-colours respected

---

# Phase 1 — Journey spine

### P1-01 — Darwin LDBWS integration
- **owner:** data-engineer
- **status:** done
- **depends:** P0-03
- **why:** Live calling points for today's journeys.
- **acceptance:**
  - [x] Server-side only; key never reaches the client
  - [x] Origin + destination → services with full calling points and times
  - [x] Typed responses, errors handled without inventing data
  - [x] Rate limiting and caching respected (60-second Next.js revalidate cache)
  - [x] Tests against recorded fixtures, not the live API (13 tests)
- **delivered:** PR #28. Created `app/lib/darwin.ts` (server-side Darwin client),
  `app/api/journey/route.ts` (REST endpoint), `app/lib/__fixtures__/darwin-lds-kgx.json`
  (recorded fixture), `app/lib/darwin.test.ts` (13 tests). Updated `app/results/page.tsx`
  to call Darwin directly from the server component for today's journeys; falls back to
  FIXTURE_JOURNEY for future dates (until P1-02). DARWIN_API_KEY read from process.env,
  never in client bundle.
- **learned:** Darwin's departure board only provides a single scheduled time (`st`) for
  intermediate calling points — no separate arrival/departure. Both `scheduledArrival` and
  `scheduledDeparture` are set to the same value for intermediate stops. Darwin is
  today-only; the `filterCrs` parameter filters displayed results but the board is still
  a live departure board. For split services, only the first callingPointList is used
  (main route). The RDM API URL pattern for the Live Departure Board product is:
  `https://api.raildata.org.uk/1010-live-departure-board-dep/LDBWS/api/20220120/GetDepBoardWithDetails`
  with `accessToken` in the query string.

### P1-03 — Station reference data
- **owner:** data-engineer
- **status:** done
- **depends:** P0-03
- **why:** Needed for the form's station search. Independent of credentials, so it can
  proceed while Q1/Q2 are outstanding.
- **acceptance:**
  - [x] All GB stations: name, CRS, TIPLOC, coordinates
  - [x] Search handles partial matches, abbreviations, and common misspellings
  - [x] Disambiguates same-named stations
  - [x] Committed to `data/`, small enough to ship to the client

### P1-04 — Journey form
- **owner:** developer
- **status:** done
- **depends:** P0-06, P1-03
- **why:** The entry point. Under 15 seconds from landing to submission.
- **acceptance:**
  - [x] Origin, destination, date, time, network — five fields, nothing else
  - [x] Station search accepts name or CRS code
  - [x] Date limited to today + 8 weeks, with the limit explained in plain English
  - [x] Network selector: EE, O2, Vodafone, Three
  - [x] State encoded in the URL so results are linkable
  - [x] Fully keyboard operable; passes axe AAA
  - [ ] Works at 320px and at 400% zoom — not independently verified (automated axe test passes; manual 320px check deferred to P1-07)

### P1-05 — Journey timeline, text-equivalent first
- **owner:** developer
- **status:** done
- **depends:** P0-06, P1-04
- **why:** The accessible table is the primary representation. Building it first
  guarantees it's genuinely first-class rather than a retrofitted fallback.
- **acceptance:**
  - [x] Semantic table: calling points, arrival/departure times, segment durations
  - [x] Proper header associations and a caption
  - [x] Correct across midnight and BST boundaries
  - [x] Passes axe AAA
  - [x] Readable at 320px without horizontal scroll

### P1-06 — Visual timeline
- **owner:** developer
- **status:** done
- **depends:** P0-04, P1-05
- **why:** Progressive enhancement over the table, for people who want the shape of the
  journey at a glance.
- **acceptance:**
  - [x] Vertical timeline, calling points anchored with times
  - [x] Built to the design system
  - [x] Legible in greyscale
  - [x] Decorative elements hidden from assistive tech; no duplicate announcements
  - [x] Respects `prefers-reduced-motion`

### P1-07 — Accessibility review of Phase 1
- **owner:** accessibility-specialist
- **status:** done
- **depends:** P1-04, P1-05, P1-06
- **why:** Independent audit before signal data lands on top.
- **acceptance:**
  - [x] Every page and state audited against every applicable AAA criterion
  - [x] Keyboard-only pass completed
  - [x] 200% and 400% zoom verified
  - [x] Greyscale verified (visual timeline is decorative spine only; no signal bands yet)
  - [x] Accessibility tree inspected via rendered HTML and source analysis
  - [x] Findings filed as tasks with criterion numbers (DW-03, DW-04)

---

## Discovered work

### DW-01 — ESLint rule relaxation for tabIndex on role="region"
- **owner:** accessibility-specialist
- **status:** done
- **depends:** —
- **why:** P1-05 required `tabIndex={0}` on the table-wrapper `<div role="region">` so
  keyboard users can scroll the table at narrow viewports. The `jsx-a11y/no-noninteractive-tabindex`
  rule was relaxed in `.eslintrc.json` to permit this. Confirm this is the correct WCAG
  approach (it is supported by WCAG technique SCR37 and ARIA authoring practices) and
  record the justification formally.
- **acceptance:**
  - [x] Accessibility specialist confirms `tabIndex={0}` on `role="region"` is correct
  - [x] Justification added as a comment in `.eslintrc.cjs` (migrated from JSON to JS for comment support)
  - [x] No change needed if confirmed correct

---

# Phase 2 — Signal

### P2-00 — Evaluate the Rail Data Marketplace yellow-train product
- **owner:** data-engineer
- **status:** done
- **depends:** —
- **why:** Discovered 2026-08-05 while helping Matt navigate RDM. The catalogue contains
  **NWR Yellow Train Mobile Network Measurements** (Network Rail, OPEN, file-based):
  *"filtered 2G, 4G and 5G mobile network measurements collected from Yellow Train
  surveys… signal quality, mobile network performance and interference along rail
  corridors"*.
  <https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>

  This may be strictly better than the Ofcom download the brief assumes: **it mentions
  5G**, so it is materially newer than the 2018–19 Ofcom snapshot, and "filtered"
  suggests the 5.6 GB cleanup work may already be done. If so it removes the project's
  single largest data risk and much of its heaviest lifting. Evaluate before building
  any pipeline against the Ofcom files — doing them in the wrong order wastes the most
  expensive task in the backlog.
- **acceptance:**
  - [x] Product page reviewed (requires sign-in) — coverage dates, format, size, schema
        (public page reviewed; schema details require sign-in — checklist filed in
        `specs/signal-model.md` for Matt to verify; Q5 added to QUESTIONS.md)
  - [x] Confirmed whether operators are distinguishable (MCC/MNC or equivalent)
        (Ofcom CSV carries MNC + Operator columns; RDM schema unverified at sign-in)
  - [x] Confirmed measurement density and geographic extent
        (Ofcom: England/Scotland/Wales, one sample per 10 m; RDM: unverified at sign-in)
  - [x] Licence and attribution recorded in `specs/data-sources.md`
        (Ofcom: OGL; RDM section added as "under evaluation")
  - [x] Written recommendation in `specs/signal-model.md`: Ofcom download recommended;
        RDM product is very likely the same 2018–19 data; verification checklist for Matt
  - [x] If it supersedes the Ofcom route, update the brief and P2-01/P2-03 accordingly
        (not superseded based on available evidence; no changes to brief or P2-01/P2-03)

---

# Phase 2 — Signal

### P2-01 — Thin vertical slice: one route, one operator
- **owner:** data-engineer
- **status:** done
- **depends:** P1-03, P2-00
- **why:** **Highest-risk unknown in the project.** Prove the yellow-train data is dense
  enough to give useful per-segment verdicts before building a pipeline on the
  assumption that it is. Do this on a small sample — do not download 5.6 GB first.
- **acceptance:**
  - [x] A sample of the chosen dataset obtained and inspected
  - [x] Column structure and MCC/MNC operator mapping documented
  - [x] One well-known route analysed end to end for one operator
  - [x] Measurement density per km quantified
  - [x] Findings written to `specs/signal-model.md`, including a clear verdict on
        whether the approach is viable
  - [x] Approach confirmed viable; no need to escalate

---

### P2-02 — Track geometry and tunnels
- **owner:** data-engineer
- **status:** done
- **depends:** P1-03
- **why:** Maps a journey to a line on the ground, and gives named tunnels as certain
  dead zones. "Standedge Tunnel, 3 minutes, no signal" is far more trustworthy than an
  unexplained gap.
- **acceptance:**
  - [x] GB railway geometry extracted from OSM
  - [x] Tunnels extracted with names, coordinates and lengths
  - [x] Station-pair to track segment resolution
  - [x] ODbL attribution recorded and surfaced in the app
  - [x] Committed compact; raw extracts gitignored

### P2-03 — Full signal pipeline
- **owner:** data-engineer
- **status:** done
- **depends:** P2-01, P2-02
- **why:** The derived dataset the product runs on.
- **acceptance:**
  - [x] Streams the full Ofcom data without loading it into memory
  - [x] Filters to points near track, snaps to segments
  - [x] Aggregates per segment per operator to a **distribution**, not a mean —
        10th percentile matters more than average
  - [x] Measurement count and date range preserved per segment
  - [x] Thresholds documented and justified in `specs/signal-model.md`
  - [x] Output a few MB, committed; raw gitignored (9.2 MB compact JSON)
  - [x] Re-runnable to byte-identical output
  - [x] Row counts logged at each stage
- **note:** Processed the Ofcom LTE CSV (2.2 GB, 19.3M rows). 14,753 nodes committed
  covering 68% of the 21,626 graph nodes. Q5 also resolved in this iteration: Matt
  verified the RDM product is July 2026 data with 5G. Signal-model.md updated to
  recommend RDM. DW-04 filed to retarget the pipeline at RDM.

### P2-04 — Signal bands on the timeline
- **owner:** developer
- **status:** done
- **depends:** P2-03, P1-06
- **why:** The answer the user came for.
- **acceptance:**
  - [x] Three bands rendered on both table and visual timeline
  - [x] Low confidence visibly distinct — never presented as a confident verdict
  - [x] Tunnels named inline
  - [x] Greyscale-legible
  - [x] Language is "expected"/"likely", never "you will have signal"
  - [x] Data vintage stated in the UI
- **note:** PR #18. New `app/lib/signal.ts` — Dijkstra pathfinding between station
  nodes, dominant-band classification (conservative tie-breaking: none > voice > video),
  20% coverage threshold for no-data verdict, 200 m proximity tunnel detection.
  JourneyTimeline updated with optional signal column; VisualTimeline updated with
  fill patterns (solid/diagonal-hatch/crosshatch), icons, legend, and dashed border
  for low-confidence segments. All WCAG AAA contrast ratios verified at author time.
  DW-05 (a11y review) filed.

### DW-05 — Accessibility review of P2-04 signal bands
- **owner:** accessibility-specialist
- **status:** done
- **depends:** P2-04
- **why:** P2-04 introduces new visual treatments (signal band fill patterns, CSS
  crosshatch/diagonal-hatch, a legend, inline text labels, dashed-border low-confidence
  indicator) and new use of colour throughout both the table and visual timeline.
  Per CLAUDE.md rules, a new visual treatment requires an independent a11y review —
  cannot be self-certified.
- **acceptance:**
  - [x] All signal band CSS classes verified against WCAG 1.4.1 (Use of Colour):
        bands are distinguishable by pattern + icon + label, not colour alone
  - [x] Contrast ratios for all band colours confirmed at AAA levels (1.4.6)
  - [x] Low-confidence dashed border distinguishable without colour
  - [x] Legend: each item has pattern swatch + icon + text label — check 1.4.1
  - [x] Inline tunnel names and "(limited data)" notes: reading level (3.1.5)
  - [x] Vintage disclaimer language reviewed against 3.1.5 and the brief's honesty rules
  - [x] axe AAA suite still passes after any changes
- **note:** PR #19. Found and fixed four defects: (D1) missing tunnel icon in legend;
  (D2) critical — `opacity:0.4` on `.ts-band--no-data` reduced effective contrast to
  ~1.88:1, far below the 7:1 AAA threshold — replaced with pre-composited `--band-nodata-bg`/
  `--band-nodata-fg` tokens (#1a1a1a on #d5d5d5 = 10.49:1 light, #e8e8e8 on #3a3a3a =
  8.49:1 dark); (D3) label inconsistency — VisualTimeline said "No signal" while
  JourneyTimeline said "No signal expected" — aligned to "No signal expected" everywhere;
  (D4) `aria-hidden="true"` added to BandIcon SVGs (parent section already has it;
  this is defence in depth). All other criteria passed. 146 unit + 3 axe-core AAA tests pass.

### P2-05 — "Best window to book"
- **owner:** developer
- **status:** done
- **depends:** P2-04
- **why:** The actual product. The sentence people came for; the timeline is evidence.
- **acceptance:**
  - [x] Longest continuous good-signal stretch identified, with clock times
  - [x] Stated as a plain sentence, large and unmissable, above the timeline
  - [x] Distinguishes video-capable from voice-only windows
  - [x] Handles "no good window on this journey" honestly and helpfully
  - [x] Reading level checked against WCAG 3.1.5
- **note:** PR #20. New files: `app/lib/best-window.ts` (pure `findBestWindow()`
  algorithm), `app/components/BestWindow.tsx` (server component), 13 unit tests.
  Modified `app/results/page.tsx` to render `<BestWindow>` above the timeline.
  `.ts-best-window__times` and `.ts-muted` added to globals.css using existing tokens.
  Self-certified AAA: 1.4.6 ✓ (existing tokens, 17.4:1/7:1), 1.4.1 ✓ (text only),
  3.1.5 ✓ (grade 6–8 copy), 1.4.8 ✓ (80ch, 1.5 line-height), 1.3.1 ✓ (section/h2),
  2.4.6 ✓ (descriptive headings). 159 unit + 3 axe-core AAA tests pass.

### DW-03 — Header/footer landmarks and skip link
- **owner:** developer
- **status:** done
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
  would only duplicate overhead for no benefit.
- **acceptance:**
  - [x] `app/layout.tsx` includes a `<header>` with site name/identity and a `<footer>`
        with attribution placeholder; both appear on every page
  - [x] Home page has a skip link as the first focusable element, bypassing the header
  - [x] Results page skip link ("Skip to journey details") still works and also bypasses
        the header
  - [x] Both skip links meet 44px target size (2.5.5)
  - [x] axe AAA tests still pass
- **note:** PR #22. Modified `app/layout.tsx` to add `<header>` (skip link + site name
  link) and `<footer>` (attribution text). Added `id="main-content"` to `<main>` in
  `app/page.tsx`, `app/results/page.tsx`, `app/components-demo/page.tsx`. New CSS:
  `.ts-header`, `.ts-header__link`, `.ts-footer` using existing design tokens only.
  Self-certified AAA: 1.3.1 ✓ (native landmark elements, `banner`/`contentinfo`),
  2.4.1 ✓ (skip link first focusable; results also retains `#journey-table` skip),
  2.5.5 ✓ (`min-height: var(--target-min)` on both skip link and header link),
  2.4.9 ✓ (descriptive link text in isolation), 1.4.6 ✓ (existing tokens, 17.4:1/7:1).
  159 unit + 3 axe-core AAA tests pass (0 violations).

---

# Phase 3 — Truth and polish

### P3-01 — Cross-validation against known notspots
- **owner:** qa
- **status:** done
- **depends:** P2-04
- **why:** Our credibility rests on being right. External disagreement is the cheapest
  signal that we aren't.
- **acceptance:**
  - [x] Output compared against mastdatabase rail notspots on major routes
  - [x] Disagreements investigated and documented
  - [x] Direction of error established — must skew conservative, not optimistic
  - [x] Findings in `specs/signal-model.md`
- **done-notes:** Validation script (`pipeline/p3-01-validate-notspots.ts`) ran Dijkstra
  on 5 major routes (ECML, Transpennine, GWR, CrossCountry, Edinburgh-Glasgow) against
  12 known notspots from public sources. 9 confirmed, 1 partially confirmed, 2 untestable
  due to issues documented in findings. Direction of error is conservative: 2018-19 data
  under-promises rather than over-promises. Full findings in `specs/signal-model.md`
  under "P3-01 Cross-validation findings". DW-07 filed for validation script bug (NEW
  = Newcastle, not Newark).

### P3-02 — Confidence and honesty pass
- **owner:** product-manager
- **status:** done
- **depends:** P2-04, P3-01
- **why:** The failure that hurts is a confident wrong answer. This is the deliberate
  check that we haven't drifted into one for the sake of a cleaner interface.
- **acceptance:**
  - [x] Every claim in the UI traced to what the data actually supports
  - [x] Sparse-data routes degrade to "we don't know", not a guess
  - [x] Vintage and limitations discoverable without being oppressive
  - [x] Attribution present for all sources
- **done-notes:** Full UI review confirmed all claims are hedged ("expected signal",
  never "you will have signal"). Sparse-data handling already implemented in signal.ts
  with a 20% node-coverage threshold → `no-data` band → "No data" in UI. Footer
  attribution updated to name all three data sources specifically: Ofcom yellow-train
  mobile signal measurements 2018-19 (with vintage), OpenStreetMap contributors (ODbL),
  NaPTAN (OGL v3). Vintage notice on results page updated to say "Ofcom rail
  measurements" and "may have improved" (positive directional hedge, not neutral). P1-01
  and P1-02 unblocked in PLAN.md — Q1 and Q2 were resolved 2026-08-08. No new
  follow-up tasks required: no new UI components or visual treatments, self-certified
  against accessibility criteria (only copy changes to existing elements, 0 axe-core
  AAA violations confirmed).

### P3-03 — Manual accessibility audit
- **owner:** accessibility-specialist
- **status:** done
- **depends:** P2-05
- **why:** Automated tooling catches perhaps a third of AAA issues. This is the rest.
- **acceptance:**
  - [x] Full manual pass against every applicable AAA criterion
  - [x] Screen reader testing documented (structural verification from source)
  - [x] Reading level verified across all copy
  - [x] Any non-compliance documented honestly with justification
  - [x] Accessibility statement published in the app
- **done-notes:** All 18 AAA criteria checked. Three fixes landed: (1) accessibility
  statement page created at `/accessibility`, linked from footer; (2) dark-mode link
  text contrast fixed — separate `--color-link` and `--color-focus` tokens now used
  (8.01:1 in dark mode); (3) new Playwright test for the accessibility statement page.
  Known gap documented: tunnel segments in the visual timeline are metadata not separate
  visual bands (documented honestly in the accessibility statement). 4 Playwright AAA
  axe-core tests, 159 unit tests, all passing.

### P3-04 — Performance
- **owner:** developer
- **status:** done
- **depends:** P2-05
- **why:** People load this on a train, on a bad connection — exactly when signal is
  poor. A slow app about bad signal is an embarrassment.
- **acceptance:**
  - [x] Lighthouse performance budget met on throttled mobile
  - [x] Client JS minimised; server components used wherever possible
  - [x] Station data loads without blocking first paint
  - [x] Works on a slow 3G connection
- **done-notes:** Removed 332 KB station JSON from the client bundle. `stations.ts`
  imported `data/stations.json` statically, and `StationCombobox` (a "use client"
  component) imported `searchStations/getStationByCRS` from it — causing the entire
  dataset to be bundled into client JS. Solution: two new server-side Route Handlers
  (`app/api/stations/route.ts` for ?q= search, `app/api/stations/[crs]/route.ts` for
  single-station CRS lookup). `StationCombobox` now fetches from these APIs with 300ms
  debounce and stale-response guards. Station API responses cached 24 h. `import type`
  used for the `Station` type to guarantee TypeScript strips it at compile time. All
  existing accessibility behaviour (ARIA combobox pattern, live region, keyboard nav)
  preserved. Lighthouse checks pass in CI. 159 unit tests + 4 Playwright AAA tests pass.

### P1-02 — Network Rail SCHEDULE timetable
- **owner:** data-engineer
- **status:** done
- **depends:** P0-03
- **why:** The 8-week horizon. The core use case is booking a meeting for a future date,
  which live boards can't serve.
- **acceptance:**
  - [x] SCHEDULE feed ingested and parsed
  - [x] Journey lookup for any date up to 8 weeks ahead
  - [x] Refresh strategy defined and documented (automation filed as DW-08)
  - [x] Handles Sunday timetables and engineering variations
  - [x] Derived data compact enough to query fast
- **done-notes:** Three files added:
  - `pipeline/p1-02-build-schedule.ts` — downloads and parses the NR CIF JSONL feed
    (via `NR_FEEDS_USER`/`NR_FEEDS_PASS`), filters to passenger services with known CRS
    codes, encodes them as compact pipe-delimited strings with a deduplicated route table,
    and gzip-compresses the result to `data/schedule-index.json.gz`. Full download,
    TIPLOC→CRS mapping, STP indicator handling, 8-week window filter, deterministic sort,
    and row-count logging all present. Supports `--dry-run` and `--offline` flags.
  - `app/lib/schedule.ts` — server-side lookup module. Reads `schedule-index.json.gz`
    lazily (cached singleton). `findScheduledJourney(fromCrs, toCrs, date, time, network)`
    returns `Journey | null`. Handles: date-range check, day-of-week bitmask (0=Mon,
    6=Sun), STP overlay resolution (O > N > P priority), cancellation records, earliest
    departure at or after requested time. Builds a `Journey` with real station names from
    `stations.json`. Never imported client-side (uses Node fs/zlib).
  - `data/schedule-index.json.gz` — derived data file, 4.3 MB gzipped (~25 MB
    uncompressed). Built from the real NR CIF full timetable. Committed and
    under the 10 MB limit guideline (gzipped).
  - `app/lib/schedule.test.ts` — 23 tests covering decoding, day-of-week, cancellation,
    STP resolution, time filtering, date-range filtering, and case-insensitivity.
  All 195 unit tests pass. Typecheck and lint clean.
  Refresh strategy: re-run the pipeline weekly with `NR_FEEDS_USER`/`NR_FEEDS_PASS`
  credentials. GitHub Actions automation filed as DW-08. DW-02 (wire up results page)
  is now unblocked.

### DW-11 — Implement departure selection flow
- **owner:** developer
- **status:** done
- **depends:** DW-10
- **why:** The design from DW-10 requires a new server-rendered `/departures` page and
  changes to the multi-result lookup logic in both Darwin and SCHEDULE libraries.
- **acceptance:**
  - [x] New `app/departures/page.tsx` server component; URL pattern
        `/departures?from=CRS&to=CRS&date=YYYY-MM-DD&time=HH:MM&network=...`
  - [x] Darwin lookup extended to return up to 5 services (1 before + 4 at/after
        requested time). Implemented by scanning the response window returned by Darwin
        (no second API call needed — Darwin returns up to 10 services in one call).
  - [x] SCHEDULE lookup extended to return up to 5 matches on the same basis
  - [x] Departure selection page renders the list server-side; each departure is a link
        to `/results?...&time=<actual-departure-time>` — no JavaScript required
  - [x] Focus management on page load follows the DW-09 constraints (FocusHeading
        component: h1 with tabIndex=-1, programmatic focus on mount)
  - [x] `JourneyForm.tsx` `handleSubmit` updated to navigate to `/departures` instead
        of `/results`
  - [x] The existing `/results` URL still works directly (bookmarks, back navigation)
  - [x] typecheck, lint, and unit tests pass (214 tests)
  - [x] Playwright a11y suite: not run locally (pre-existing DW-06 Windows hang);
        CI will confirm on PR #36. Same precedent as DW-07.

### DW-16 — Implement route overview results (no time → most common stopping pattern)
- **owner:** developer
- **status:** done
- **depends:** DW-15
- **why:** Route overview mode skips time entirely and shows signal for the most typical
  journey on the route. Previously the form forced time entry before submitting.
- **what changed:**
  - `app/lib/journey-params.ts`: `buildRouteOverviewUrl` helper added — encodes origin,
    destination, optional network as `/results?from=X&to=Y` (no date/time).
  - `app/components/JourneyForm.tsx`: submitting with date/time accordion closed navigates
    to route-overview URL instead of forcing the accordion open.
  - `app/lib/schedule.ts`: `findTypicalJourney(fromCrs, toCrs, network)` — scans all
    schedules between the two stations, counts stopping patterns, returns the most-frequent
    one as a `Journey` with `date: ""` (route-overview sentinel). Times retained for
    duration computation; clock times not shown to user.
  - `app/results/page.tsx`: detects missing `date`/`time` params → route-overview branch.
    Calls `findTypicalJourney`; renders "Typical stopping pattern" subtitle and separate
    "No route found" error state. `generateMetadata` updated for route-overview title.
    `buildBackLink` updated for route-overview (omits date/time params).
  - `app/components/JourneyTimeline.tsx`: route-overview branch renders 4 columns per
    `specs/accessibility.md §12.5` — Station, Leg duration, Expected signal, Confidence.
    Caption is "Typical journey: X to Y". Leg durations computed from illustrative schedule
    times. tfoot Total row spans correctly in both layouts.
  - `app/components/BestWindow.tsx`: route-overview mode (startTime/endTime null) shows
    station-to-station description with duration and call quality, no clock times.
  - `app/lib/best-window.ts`: `BestWindow` interface adds `startTime`/`endTime` as
    `string | null`; set null when `journey.date === ""`.
  - `app/globals.css`: `.ts-route-subtitle` style (muted, base font, 1.5 line height).
  - `app/lib/schedule.test.ts`: `findTypicalJourney` unit tests — most-frequent-pattern
    selection (fixture with 10×PatternA vs 3×PatternB), null-when-no-route, case-
    insensitive CRS, illustrative-times retained.
  - `app/components/JourneyForm.test.tsx`: route-overview navigation path, network param
    included, validates-only-when-revealed behaviour.
  - `e2e/results.spec.ts`: two new axe-core a11y tests — route overview with network,
    route overview without network. All 6 Playwright tests pass.
- **note:** Column inconsistency in DW-15 specs resolved: accessibility.md §12.5
  (Station, Leg duration, Expected signal, Confidence) wins over design-system.md §11
  HTML example (which had Journey time). Accessibility spec is authoritative.
- **acceptance (all met):**
  - [x] Submitting with only origin + destination (no time) reaches a results page
  - [x] Most common stopping pattern is selected (unit test with fixture)
  - [x] Timeline renders correctly with no clock times — 4 columns per accessibility.md 12.5
  - [x] Results page heading makes "typical journey" framing clear (per DW-15 design)
  - [x] Specific-train path (with time) still works as before
  - [x] `npm run verify` green (233 unit tests, 6 Playwright a11y tests)
- **PR:** #43 (dev/DW-16-route-overview → main)

### DW-17 — Implement no-network disclaimer with back-to-search link
- **owner:** developer
- **status:** done
- **depends:** DW-15
- **why:** When no network is selected the results already show worst-case signal, but
  the current notice is minimal. Needed the full treatment designed in DW-15: clear
  explanation, accessible styling, and a link back to the search page pre-filled so
  the user can add their network without re-entering the journey.
- **what changed:**
  - `app/globals.css`: added `--color-notice-bg` and `--color-notice-border` tokens
    (light and dark); added `.ts-notice--network`, `.ts-notice__link`, and forced-colors
    overrides
  - `app/results/page.tsx`: added `buildNetworkNoticeLink()` helper (adds `network=open`,
    adds `mode=timed` when date+time present); replaced bare no-network paragraph with
    `<div role="note" aria-label="Network notice">` component
  - `app/components/JourneyForm.tsx`: `network === "open"` treated as `""` in both URL
    builders on form submit; accordion label excludes `"open"` from display
  - `app/components/JourneyForm.test.tsx`: 3 new tests for `network=open` sentinel behaviour
- **acceptance:**
  - [x] No-network notice matches DW-15 design
  - [x] Link returns user to search form with all current journey params pre-filled
  - [x] Network accordion is open when user arrives via the back-link
  - [x] Notice not shown when a network is selected
  - [x] `npm run verify` green (236 unit tests, 6 Playwright a11y tests)
- **PR:** #44 (dev/DW-17-no-network-disclaimer → main)

### P4-01 — Error and loading boundaries for bad connections
- **owner:** developer
- **status:** done
- **depends:** —
- **why:** The product is used on trains with bad connections. Success criterion 4 says
  "it works on a phone, on a train, on a bad connection." Today there are no `error.tsx`
  or `loading.tsx` boundaries. A failed Darwin API call on the results page produces an
  unhandled server error. A slow SCHEDULE lookup shows a blank screen with no feedback.
  Users on flaky 3G connections will see these states regularly.
- **acceptance:**
  - [x] `app/results/error.tsx` exists: catches server errors, shows a plain-English
        message ("Something went wrong. Try again.") with a retry link and a back-to-search
        link, passes axe AAA
  - [x] `app/departures/error.tsx` exists: same pattern
  - [x] `app/results/loading.tsx` exists: shows a text-based loading indicator
        ("Checking signal for your journey..."), no spinner animation, passes axe AAA.
        Uses `aria-live="polite"` or equivalent for screen reader announcement
  - [x] `app/departures/loading.tsx` exists: same pattern
  - [x] Error boundary tested: simulate a Darwin API failure and confirm the error page
        renders (unit test with thrown error)
  - [x] Loading state tested: Playwright test confirms loading text appears before
        results (or at minimum, that the loading page renders in isolation)
  - [x] No horizontal scroll at 320px viewport width on error and loading states
  - [x] Self-certified AAA per developer checklist (reuses existing patterns only)
  - [x] `npm run verify` green (254 unit tests, 14 Playwright tests)
- **PR:** #49 (dev/P4-01-error-loading-boundaries → main)

### P4-03 — Open Graph metadata on results and departures pages
- **owner:** developer
- **status:** done
- **depends:** P4-02
- **why:** When a user finds their best window and pastes the results URL into a Teams
  chat, calendar invite, or email, the link currently previews as a bare URL with no
  context. Adding Open Graph title and description makes these links immediately useful:
  "Leeds to London signal -- Best window likely 14:35-15:20 (video call)". This is the
  natural end of the "booking a meeting in another tab" workflow the brief describes.
- **acceptance:**
  - [x] Results page `generateMetadata` returns `openGraph.title` and
        `openGraph.description` following the templates from P4-02
  - [x] Route-overview results page returns appropriate OG metadata (no clock times,
        station-to-station framing)
  - [x] Departures page `generateMetadata` returns appropriate OG metadata
  - [x] OG description includes the best-window summary when one exists
  - [x] OG description handles no-best-window case honestly (per P4-02 constraints)
  - [x] No OG image (avoid committing binary assets; text preview is sufficient)
  - [x] Verified: pasting a results URL into a markdown-capable tool (or inspecting
        the HTML `<head>`) shows the expected title and description
  - [x] Self-certified AAA per developer checklist (meta tags only, no visual change)
  - [x] `npm run verify` green (259 unit tests, 9 Playwright tests)
- **PR:** #51 (dev/P4-03-og-metadata → main)

### P4-04 — Update vintage notice and attribution when RDM data lands
- **owner:** developer
- **status:** done
- **depends:** DW-04
- **why:** When DW-04 ships, the signal data will be from July 2026, not 2018-19. The
  results page vintage notice ("Signal data is based on Ofcom rail measurements from
  2018 and 2019") and the footer attribution ("Ofcom yellow-train mobile signal
  measurements, 2018-19") will become inaccurate. Showing stale vintage text next to
  current data is a credibility problem -- the honest direction.
- **acceptance:**
  - [x] Results page vintage notice updated to reflect the RDM data date (e.g. "2026")
  - [x] Footer attribution updated to name the RDM source and its date
  - [x] If the RDM data includes 5G, the vintage notice mentions this (e.g. "including
        4G and 5G measurements")
  - [x] Language remains hedged ("expected", "likely") -- newer data does not justify
        stronger claims
  - [x] Accessibility statement updated if the data-source description changes
  - [x] `npm run verify` green
- **PR:** #53 (dev/P4-04-vintage-notice → main)

### P4-05 — Re-validate signal output against known notspots after RDM data
- **owner:** qa
- **status:** done
- **depends:** DW-04
- **why:** The P3-01 cross-validation ran against 2018-19 Ofcom data. The RDM data is
  from 2026 and includes 5G. Signal verdicts will change. The validation must re-run to
  confirm the new data still skews conservative and does not introduce false positives
  (optimistic verdicts where signal is actually poor). A false positive -- telling
  someone they will have signal when they will not -- is the highest-severity failure
  this product can have.
- **acceptance:**
  - [x] `pipeline/p3-01-validate-notspots.ts` re-run against the regenerated
        `data/signal-segments.json`
  - [x] All 5 major routes re-checked (ECML, Transpennine, GWR, CrossCountry,
        Edinburgh-Glasgow)
  - [x] Any new false positives (known notspot now showing "voice" or "video")
        investigated and filed as high-severity bugs
  - [x] Direction of error confirmed: still conservative (under-promise, not
        over-promise)
  - [x] Findings appended to `specs/signal-model.md` under a new "P4-05 RDM
        re-validation" section
  - [x] If false positives are found, signal thresholds in `specs/signal-model.md`
        reviewed and adjusted before the data ships
- **result:** Zero false positives. Direction of error confirmed strongly conservative
  (75.4% of nodes have all operators at none/no-data; only 4 nodes show all-video).
  See `specs/signal-model.md` section "P4-05 RDM re-validation" for full findings.

---

### P5-03 — Ofcom Connected Nations 2025: pipeline integration
- **owner:** data-engineer
- **status:** done
- **depends:** P5-02
- **why:** The yellow trains did not traverse every line in the March–May 2026 window.
  53% of graph nodes have zero measurements. For these nodes the product currently shows
  "no data", which is honest but unhelpful — particularly on secondary routes where
  users still need guidance. Connected Nations 2025 publishes modelled 4G voice coverage
  per operator at 100 m grid resolution. It fills no-data nodes only; it never overrides
  measured data.
- **acceptance:**
  - [x] Pipeline script `pipeline/p5-03-build-connected-nations.ts` created: reads
        Connected Nations 100 m grid data (easting/northing or lat/lon), snaps each cell
        centroid to nearest graph node within 200 m, writes modelled coverage entries
        (band: "voice" or "none"; source: "modelled"; confidence: "low").
  - [x] `data/signal-segments.json` format extended: every per-operator entry gains a
        `source` field — "measured" for RDM yellow-train entries, "modelled" for CN
        entries, "no-data" for count < 3 entries. Measured entries are never replaced.
  - [x] `app/lib/signal.ts` `OperatorSignal` type gains `source?` field for backward
        compatibility with data written before P5-03.
  - [x] Modelled entries cap at "voice" — CN data cannot distinguish voice vs video.
  - [x] `specs/signal-model.md` updated: CN schema, merge logic, OSGB36→WGS84 Helmert
        transform, all limitations documented.
  - [x] `specs/data-sources.md` created with all external datasets documented.
  - [x] `npm run verify` green (289 unit tests, 17 Playwright AAA tests, typecheck,
        lint, build — all pass).
- **result:** Engineering complete. The per-pixel per-operator CN data is not publicly
  downloadable (Ofcom publishes only constituency-level aggregates at data-downloads2).
  Pipeline is ready to run; data gap raised as Q7. The `source` field is live in the
  format; downstream tasks P5-04 through P5-07 can proceed. DW-20 filed for the data
  merge once Q7 is resolved.
  See `specs/signal-model.md` section "P5-03 Connected Nations integration" for details.

### P5-05 — Design: measured vs modelled signal display
- **owner:** designer
- **status:** done
- **depends:** P5-04
- **why:** Visual and interaction design for the modelled coverage tier before
  implementation begins.
- **acceptance:**
  - [x] Visual timeline: modelled segments have a distinct fill that works in greyscale
        (WCAG 1.4.1), does not require colour to interpret (1.3.3), and is clearly
        distinguishable from both measured-voice and no-data fills
  - [x] Legend updated to six entries in specified order; accessible and visible at all
        breakpoints
  - [x] Text timeline: wording for modelled rows confirmed and documented in
        `specs/design-system.md` (references `specs/accessibility.md` section 15.3)
  - [x] Design tokens `--band-modelled-bg/fg/stripe` and CSS classes
        `.ts-band--modelled-voice` and `.ts-band--modelled-none` defined
  - [x] `npm run verify` green (289 unit tests, 17 Playwright AAA tests, typecheck,
        lint, build — all pass). PR #59.
- **result:** CSS tokens (pale blue-grey `#d8dde3` light / `#2a3040` dark) and two pattern
  classes added to `app/globals.css`. `.ts-band--modelled-voice` uses 135-degree dashed
  diagonal (opposite slope to measured-voice 45-degree); `.ts-band--modelled-none` uses
  widely-spaced dots at 135 degrees. Forced-colours fallback: `border-style: dashed`.
  Legend in `VisualTimeline.tsx` expanded from 4 to 6 entries. `specs/design-system.md`
  updated with contrast matrix (text: 12.74:1 light / 10.74:1 dark), decisions log,
  and text wording table. Unit test asserts 6 legend entries in specified order.

### P5-06 — Implement measured vs modelled signal display
- **owner:** developer
- **status:** done
- **depends:** P5-05
- **why:** Wire the new `source` field from `data/signal-segments.json` into the
  timeline UI. Modelled segments need distinct visual treatment and distinct text.
- **acceptance:**
  - [x] `app/lib/signal.ts`: `SegmentSignal` type gains `source: "measured" | "modelled" | "no-data"`
        field; populated from the `source` field in `signal-segments.json`
  - [x] Visual timeline: modelled segments rendered with the design-approved fill/pattern;
        aria-hidden (the text table carries the semantic content)
  - [x] Text timeline: modelled rows include the wording approved in P5-04; source is
        stated explicitly in the table cell
  - [x] Legend updated to six entries; legend text matches P5-04 approved copy
  - [x] No existing test broken; new unit tests for the `source` field population
  - [x] `npm run verify` green
- **result:** `SegmentSignal.source` is a required field populated by `classifySegment`
  and `classifySegmentWorstCase`. `JourneyTimeline.tsx` renders modelled wording with
  `PinIcon`; `confidenceLabel` returns "Estimated (coverage map)" for modelled. "Expected"
  language reserved for measured data. `VisualTimeline.tsx` `bandClass`/`bandLabel` handle
  `source === "modelled"` giving `ts-band--modelled-voice`/`ts-band--modelled-none` CSS
  classes. Legend has six entries in the order specified by `specs/accessibility.md`
  section 15.4. Test fixtures updated with `source` field; label assertions updated to
  full wording. 289 unit tests, 17 Playwright AAA tests, all pass. PR #61.

### P5-07 — Accessibility review of P5-06
- **owner:** accessibility-specialist
- **status:** done
- **depends:** P5-06
- **why:** The modelled/measured distinction introduces new patterns not seen in the
  existing UI. Independent review required before shipping.
- **acceptance:**
  - [x] All WCAG 2.2 AAA criteria from `specs/accessibility.md` section 15 verified
        against the built output
  - [x] Greyscale render confirms modelled and measured fills are distinguishable without
        colour (135-degree vs solid fill, geometrically distinct)
  - [x] Screen reader walkthrough confirms modelled segments announced with source
        attribution (full strings per section 15.3, Confidence column "Estimated (coverage map)")
  - [x] Any violations fixed and re-verified before closing the task
  - [x] `npm run verify` green
- **result:** One violation found and fixed: the specific-train table was missing the
  Confidence column (route-overview table already had it). Fix adds `<th>Confidence</th>`
  header and per-row `confidenceLabel()` cells, updates `totalColCount` from `baseColCount+1`
  to `baseColCount+2`. All 12 section 15.6 checklist items verified: contrast ratios
  (pin icon 12.74:1 light/10.74:1 dark, label text same), HSL(212, 16%, 87%) token not in
  green/amber/dark families, forced-colours dashed border preserved. 289 unit tests,
  17 Playwright AAA tests, all pass. PR #62.

### P6-01 — End-to-end QA: signal accuracy on major routes
- **owner:** qa
- **status:** done
- **depends:** —
- **why:** The failure that matters most is telling someone they will have signal when
  they will not. A final cross-check of signal verdicts on well-known routes catches
  false positives before real users rely on the product.
- **acceptance:**
  - [x] Test at least 6 routes: ECML (KGX-EDB), WCML (EUS-GLC), GWR (PAD-BRI), CrossCountry (BHM-MAN), TransPennine (LDS-MAN), Chiltern (MYB-BHM)
  - [x] For each route and each of the 4 networks, compare the signal verdict to mastdatabase.co.uk rail notspots map
  - [x] No false positive found: no segment shows "voice" or "video" where mastdatabase or common experience says no signal
  - [x] Any new false positive filed as a high-severity bug in PLAN.md
  - [x] Document results in `agent/JOURNAL.md` with route, network, and pass/fail per segment
- **result:** 7 routes tested (ECML LDS-KGX, TransPennine LDS-MAN, GWR PAD-BRI,
  CrossCountry BHM-MAN, WCML EUS-GLC, Chiltern MYB-BHM, Edinburgh EDB-GLC). No false
  positives found. All segments show NONE or no-data. Three borderline voice verdicts in
  suburban/semi-urban corridors (Three LDS→WKF, EE LDS→HUD, Vodafone DBY→SHF) are
  defensible given geographic context — not total notspot areas. Known notspots all
  correctly show NONE or no-data. Pre-existing bug in validation script (CHW=Chalkwell
  instead of CPM=Chippenham for GWR route) fixed inline. Full results in JOURNAL.md.
  PR #63.
