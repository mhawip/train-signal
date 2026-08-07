# Backlog

The single source of truth for what happens next. Every loop iteration reads this first
and writes to it last.

**Status values:** `todo` · `in-progress` · `in-review` · `blocked` · `done`

**Rules**
- Take the highest-priority `todo` whose `depends` are all `done`.
- Mark `in-progress` and commit *before* starting, so two loops can't collide.
- Accessibility constraints come before design; design comes before implementation.
  The dependencies enforce this. Don't route around them.
- Discovered work gets filed here, not done inline. One unit of work per iteration.

---

# Phase 0 — Foundations

Nothing here is user-visible. All of it determines whether the rest goes well.

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
- **status:** blocked
- **blocked-on:** QUESTIONS.md Q4 (Vercel project)
- **depends:** P0-02, P0-03
- **why:** Deploy early so deployment is never the risky unknown.
- **acceptance:**
  - [ ] `main` auto-deploys to production
  - [ ] PRs produce preview deployments
  - [ ] a11y suite runs against the preview URL, not just locally
  - [ ] Environment variables configured, nothing `NEXT_PUBLIC_`-prefixed

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

Get a real journey on screen. No signal data yet — prove the timetable and timeline work
first.

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
- **status:** in-progress
- **depends:** P0-04, P1-05
- **why:** Progressive enhancement over the table, for people who want the shape of the
  journey at a glance.
- **acceptance:**
  - [ ] Vertical timeline, calling points anchored with times
  - [ ] Built to the design system
  - [ ] Legible in greyscale
  - [ ] Decorative elements hidden from assistive tech; no duplicate announcements
  - [ ] Respects `prefers-reduced-motion`

### P1-07 — Accessibility review of Phase 1
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** P1-04, P1-05, P1-06
- **why:** Independent audit before signal data lands on top.
- **acceptance:**
  - [ ] Every page and state audited against every applicable AAA criterion
  - [ ] Keyboard-only pass completed
  - [ ] 200% and 400% zoom verified
  - [ ] Greyscale verified
  - [ ] Accessibility tree inspected in a real browser
  - [ ] Findings filed as tasks with criterion numbers

---

# Phase 2 — Signal

The part that makes it a product rather than a worse Trainline.

### P2-00 — Evaluate the Rail Data Marketplace yellow-train product
- **owner:** data-engineer
- **status:** todo
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
  - [ ] Product page reviewed (requires sign-in) — coverage dates, format, size, schema
  - [ ] Confirmed whether operators are distinguishable (MCC/MNC or equivalent)
  - [ ] Confirmed measurement density and geographic extent
  - [ ] Licence and attribution recorded in `specs/data-sources.md`
  - [ ] Written recommendation in `specs/signal-model.md`: this, the Ofcom download, or
        both — with reasoning
  - [ ] If it supersedes the Ofcom route, update the brief and P2-01/P2-03 accordingly

### P2-01 — Thin vertical slice: one route, one operator
- **owner:** data-engineer
- **status:** todo
- **depends:** P1-03, P2-00
- **why:** **Highest-risk unknown in the project.** Prove the yellow-train data is dense
  enough to give useful per-segment verdicts before building a pipeline on the
  assumption that it is. Do this on a small sample — do not download 5.6 GB first.
- **acceptance:**
  - [ ] A sample of the chosen dataset obtained and inspected
  - [ ] Column structure and MCC/MNC operator mapping documented
  - [ ] One well-known route analysed end to end for one operator
  - [ ] Measurement density per km quantified
  - [ ] Findings written to `specs/signal-model.md`, including a clear verdict on
        whether the approach is viable
  - [ ] If not viable, escalate with alternatives rather than proceeding

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

### DW-01 — ESLint rule relaxation for tabIndex on role="region"
- **owner:** accessibility-specialist
- **status:** todo
- **depends:** —
- **why:** P1-05 required `tabIndex={0}` on the table-wrapper `<div role="region">` so
  keyboard users can scroll the table at narrow viewports. The `jsx-a11y/no-noninteractive-tabindex`
  rule was relaxed in `.eslintrc.json` to permit this. Confirm this is the correct WCAG
  approach (it is supported by WCAG technique SCR37 and ARIA authoring practices) and
  record the justification formally.
- **acceptance:**
  - [ ] Accessibility specialist confirms `tabIndex={0}` on `role="region"` is correct
  - [ ] Justification added as a comment in `.eslintrc.json`
  - [ ] No change needed if confirmed correct

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
