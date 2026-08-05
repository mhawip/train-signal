# Journal

Append-only. One entry per loop iteration.

The next iteration starts with no memory of this one. This file is how work carries
forward. Be honest — an entry that hides a failure costs the next five iterations. The
**Learned** field is the most valuable: write down what surprised you.

Format:

```markdown
## <ISO timestamp> — <task-id> — <role>
**Did:** what actually changed
**Verify:** pass/fail, and what failed
**Learned:** anything the next loop would waste time rediscovering
**Next:** what this unblocked
```

---

## 2026-08-04 — setup — orchestrator

**Did:** Established the project from scratch. Researched data sources, wrote
`specs/brief.md`, and built the agent system: seven role definitions in
`.claude/agents/`, the Ralph loop prompt and runner in `agent/`, `PLAN.md` seeded with
four phases, and `CLAUDE.md` as the ground rules.

**Verify:** n/a — no application code yet.

**Learned:**

- The key data find is Ofcom's **yellow-train measurement data**: real mobile signal
  recorded from antennas on Network Rail engineering trains, per-operator via MCC/MNC,
  2G/3G/4G, published openly. It beats operator coverage maps decisively because it is
  *measured on the railway at roof height* rather than modelled, so tunnels and cuttings
  appear in the data without needing to be simulated. 5.6 GB total.
- Its weakness is vintage — roughly June 2018 to June 2019. Networks have improved. The
  model must therefore skew conservative, and the UI must state the vintage.
- Ofcom's Connected Nations pages are poorly structured for machine reading; the
  datasets listed vary by year and the older pages surface stale links. The signal
  measurement data lives on the general data-downloads page, not the year-specific ones.
- `gh` CLI is **not installed** on this machine. The PR workflow needs it —
  `winget install GitHub.cli`. Filed as Q3.
- Rail Data Marketplace free tier is approved instantly, which is better than expected.
  Network Rail SCHEDULE is a separate registration with basic auth, not an API key.
- Darwin LDBWS only looks ~2 hours ahead. Matt chose an 8-week horizon, so Network Rail
  SCHEDULE is required — LDBWS alone cannot serve the core use case of booking a meeting
  for a future date.

**Next:** P0-01 (accessibility constraints) is the first task and has no dependencies.
P0-02, P0-05, P1-01 and P1-02 are blocked on Q1–Q4 in `QUESTIONS.md` — all four need
Matt to create accounts, which agents cannot do. Plenty of unblocked work regardless:
P0-01, P0-03, P0-04, P0-06, P1-03, P2-01, P2-02.

---

## 2026-08-05T17:15:00Z — P0-01 — accessibility-specialist

**Did:** Wrote `specs/accessibility.md` — 987 lines of product-specific WCAG 2.2 AAA
constraints. The document covers every applicable criterion with concrete, implementation-
level guidance for this product's two screens and handful of states.

Key decisions made in the document:

- **Signal-band treatment without colour (1.4.1):** Each band carries three redundant
  non-colour cues — fill pattern (solid / 45° diagonal hatching / dense crosshatch),
  icon (checkmark / phone handset / X mark), and inline text label. Tunnels get a
  distinct dark solid fill plus tunnel-entrance icon and the tunnel name. Verification
  is greyscale render: if any two bands are indistinguishable in greyscale, the design
  fails.

- **Text-equivalent table is always visible, not a toggle.** At narrow widths the visual
  timeline may be hidden; the table must not be. It is the accessible representation of
  the result, not a fallback. HTML structure specified: `<table>`, `<caption>`,
  `<th scope="col/row">`, six columns.

- **Visual timeline marked `aria-hidden="true"`** — the table carries the content for
  screen readers; the visual is decorative relative to it. This avoids duplicate
  announcements.

- **Contrast ratios stated against named surfaces:** body text must be ≥ #595959 on
  white. Signal band label text within each band's fill must also achieve 7:1. The
  designer must supply a contrast matrix before any implementation begins.

- **Reading level (3.1.5):** Target Flesch-Kincaid Grade 6–8. Specific acceptable and
  unacceptable copy examples given for every user-visible string category.

- **Testing honesty:** A table of every AAA criterion maps it to either axe-core
  (automated) or manual verification — and is explicit that axe-core catches roughly
  a third of AAA issues. Manual checks specified: greyscale render, keyboard-only
  navigation, 200%/400% zoom, screen reader pass.

**Verify:** n/a — documentation-only task; no application code exists yet (P0-03 not
started). No `npm run verify` target yet.

**Learned:**
- The visual timeline vs. table tension resolves cleanly with `aria-hidden="true"` on
  the timeline: the table is the primary accessible representation; the visual is
  progressive enhancement. This decision must be stated early so the developer builds
  it that way, not as a retrofit.
- "Large text" for WCAG 1.4.6 purposes is ≥ 18pt (24px) regular or ≥ 14pt (18.67px)
  bold. The document states this explicitly so the designer computes the right threshold
  for each element in the type scale.
- The 80-character line-length requirement (1.4.8) constrains the headline result ("Best
  window: 14:35–15:20...") — if the window description runs long it must wrap, not
  overflow. Designer needs to account for this in the type scale.

**Next:** P0-01 done unblocks P0-03 (Next.js skeleton, owner: developer). P0-03 is the
next highest-priority unblocked task and itself unblocks P0-02, P0-04, and P1-03.
