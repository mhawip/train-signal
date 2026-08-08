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
