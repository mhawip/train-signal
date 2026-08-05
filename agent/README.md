# The autonomous development system

This directory is the machinery that lets a team of agents build Train Signal without a
human in the loop for routine decisions.

## The idea

Each iteration ("loop") starts with **a completely fresh context**. The agent knows
nothing except what it reads from disk. So everything that matters must be written down.

That constraint is the point. It forces state into files, which means work is
resumable, auditable, and parallelisable, and no decision is trapped in a conversation
that has scrolled away.

This is the "Ralph loop" pattern: run the same prompt at a fresh agent repeatedly, let
it pick the highest-value piece of work, do it, record it, and exit. Progress
accumulates on disk, not in context.

## The files

| File | Role |
|---|---|
| `PLAN.md` | The backlog. Ordered, owned, with acceptance criteria. **The loop's first read and last write.** |
| `JOURNAL.md` | Append-only. What each loop actually did, including what failed. |
| `QUESTIONS.md` | Escalations to Matt. Asking does not block — move to other work. |
| `prompts/ralph.md` | The loop prompt. Identical every iteration. |
| `ralph.ps1` | The runner. |

## The roles

Defined in `.claude/agents/`. Each loop dispatches to whichever role the task calls for.

| Role | Owns |
|---|---|
| `product-manager` | Scope, priority, acceptance criteria, deciding when to ask Matt |
| `accessibility-specialist` | AAA constraints, review of every UI change, axe configuration |
| `designer` | Design system, layout, visual language — within a11y constraints |
| `developer` | Implementation |
| `qa` | Test strategy, finding bugs, filing them back into `PLAN.md` |
| `data-engineer` | Ofcom and rail data pipelines |
| `devops` | CI, Vercel, GitHub Actions, secrets |

**Handoffs happen through `PLAN.md`,** not through direct messaging. When the developer
finishes a UI task, it does not "hand to" the accessibility specialist — it marks its
task done and files a review task owned by `accessibility-specialist`. The next loop
picks it up. This keeps handoffs durable across context resets.

## Ordering rule

The accessibility specialist sets constraints **before** the designer designs, and the
designer designs **before** the developer builds. Retrofitting AAA compliance does not
work; it has to be upstream. `PLAN.md` dependencies enforce this.

## Running it

```powershell
./agent/ralph.ps1
```

Runs continuously. `-Once` for a single iteration, `-MaxIterations <n>` to cap it.
Stop it at any time with Ctrl-C — state is on disk, nothing is lost.

## Watching it

- `agent/JOURNAL.md` — what happened
- `agent/QUESTIONS.md` — anything waiting on you
- GitHub PRs — every change, with CI results

## When it goes wrong

The loop is designed to fail safe: it leaves the repo green, journals the failure, and
exits. If a task fails three times it is marked `blocked` with the reason, and the loop
moves on rather than grinding against it.

If loops are thrashing, read `JOURNAL.md` — the pattern is usually obvious, and the fix
is usually a clearer acceptance criterion in `PLAN.md`.
