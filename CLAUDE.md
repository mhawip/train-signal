# Train Signal

A web app that tells you when during a train journey you'll have good enough mobile
signal to take a call.

**Read [specs/brief.md](specs/brief.md) first.** It is the source of truth for what we
are building and why. If this file and the brief disagree, the brief wins.

## The one-sentence product

The user enters a GB rail journey and their mobile network; the app returns a timeline
showing when they can take a voice call, a video call, or nothing at all — and names the
single best window to book a meeting in.

## Non-negotiables

These are not preferences. Work that breaches them does not merge.

1. **WCAG 2.2 Level AAA.** Every page, every state, every component. This is a design
   input, not a QA gate. See [specs/accessibility.md](specs/accessibility.md). Every
   change is checked against every applicable criterion — always. What varies is only
   *who* checks it: novel UI gets an independent `accessibility-specialist` review;
   small reuse of already-reviewed patterns may be self-certified by the developer
   against the same criteria. See the self-certification section in
   [.claude/agents/developer.md](.claude/agents/developer.md).
2. **Never claim accuracy we don't have.** The signal data is a 2018–19 measurement
   snapshot. Language is always "expected" or "likely", never "you will have signal".
   Where measurement density is low, we say so rather than inventing a verdict.
3. **Plain English.** WCAG 3.1.5 requires lower-secondary reading level. "No signal",
   not "sub-threshold RSRP". This applies to every user-visible string.
4. **Simplicity is the feature.** Landing to answer in under 15 seconds. Any addition
   that slows that down is wrong, however clever.

## Architecture

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, strict mode |
| Hosting | Vercel, auto-deploy on push to `main` |
| Testing | Vitest (unit), Playwright + axe-core (e2e + a11y) |
| Rail data | Network Rail SCHEDULE feed (8-week horizon) + Darwin LDBWS (today) |
| Signal data | Ofcom yellow-train measurements, pre-processed to a compact derived set |
| CI | GitHub Actions — typecheck, lint, unit, a11y, Lighthouse |

Secrets live in Vercel environment variables and are only ever read server-side. No API
key ever reaches the client bundle.

## Repository layout

```
specs/          Source of truth. Brief, PRD, accessibility constraints, ADRs.
agent/          The autonomous development system. Backlog, journal, loop runner.
.claude/agents/ Agent role definitions.
app/            Next.js application.
data/           Derived datasets (committed). Raw data is gitignored.
pipeline/       Scripts that turn raw open data into data/. Reproducible.
```

## How work happens here

Development is autonomous, run by a team of agents (product manager, designer,
accessibility specialist, developer, QA, data engineer, devops) coordinating through
files rather than conversation.

- **[agent/PLAN.md](agent/PLAN.md)** is the backlog and the single source of truth for
  what happens next.
- **[agent/JOURNAL.md](agent/JOURNAL.md)** is the append-only record of what was done.
- **[agent/QUESTIONS.md](agent/QUESTIONS.md)** is where agents escalate to Matt. Adding
  a question here does not block other work — pick up something else.

Full protocol: [agent/README.md](agent/README.md).

## Git workflow

Feature branches, PRs, auto-merge on green CI. Never commit directly to `main`.
Branch naming: `<role>/<task-id>-<short-slug>`, e.g. `dev/P1-03-journey-form`.

## Commands

```bash
npm run dev          # local dev server
npm run test         # unit tests
npm run test:a11y    # Playwright + axe-core AAA suite
npm run typecheck    # tsc --noEmit
npm run lint
npm run verify       # everything CI runs, in one command
```

`npm run verify` must pass before any PR is opened. No exceptions.
