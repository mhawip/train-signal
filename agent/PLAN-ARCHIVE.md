# Backlog archive

Full detail for tasks marked `done` in `agent/PLAN.md`, moved here so the live backlog
stays short. `PLAN.md` is read in full by every loop iteration; this file is not — read
it only when you need the history behind a decision (e.g. why a task was done a
particular way, or its full original acceptance criteria).

`PLAN.md` keeps a one-line index of everything archived here, so dependency checks
(`depends: P0-06`) never require opening this file.

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
