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
