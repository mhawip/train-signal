# Questions for Matt

Agents add questions here when a decision is genuinely his. Filing a question **never
blocks the loop** — the agent moves to other work and picks this up once answered.

To answer: edit the question, add your answer under **Answer:**, and change status to
`answered`. The next loop will pick it up.

**Resolved questions are moved to `agent/QUESTIONS-ARCHIVE.md`**, not deleted — same
pattern as `PLAN.md`/`PLAN-ARCHIVE.md`. This file is read in full every loop iteration,
so once a question is resolved, cut its full entry, paste it into the archive, and leave
a one-line pointer in the index below.

---

## Open questions

All eight were filed by the 2026-11-16 review. Evidence is in
`specs/review-2026-11-signal-and-workflow.md`.

## Q8 — Secrets for the weekly timetable refresh

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** P7-01

The refresh workflow has failed every week since 16 August because the repository has
no Actions secrets. GitHub has now disabled it. The timetable in production is from
12 August, and searches after 13 December return "No service found".

**Needed from Matt** (GitHub, Settings, Secrets and variables, Actions):
1. `NR_FEEDS_USER` and `NR_FEEDS_PASS`: the Network Rail data feeds login already in
   `.env.local`.
2. `VERCEL_DEPLOY_HOOK_URL`: create a deploy hook for `main` in the Vercel project
   (Settings, Git, Deploy Hooks) and paste its URL.

**Recommendation:** add all three. P7-01 then moves the data off `main` (which is
protected) onto a release asset and redeploys weekly.

**Answer:**

## Q9 — Accuracy rule: calibrated in both directions

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** P7-06, P7-15

The brief's success criterion 2 reads: "when we say 'no signal', there is no signal."
The agents turned that into "conservative verdicts are correct". Every accuracy check
then tested one kind of error. The app now says "no mobile data expected" for most of
the East Coast and Great Western main lines, where Ofcom measured good performance on
up to 70% of in-carriage tests.

**Options:**
1. Keep the one-sided rule. The app stays safe and unhelpful.
2. Calibrated rule. Both errors are defects. Bands are fitted to Ofcom's 2026
   in-carriage results and checked by a scorecard in CI. Language stays "likely" and
   "expected". Thin evidence is labelled, not rounded down.

**Recommendation:** option 2. Proposed wording for the brief: "The result is accurate
enough to be trusted. When we say 'no mobile data', there usually is none. When we say
'good', it usually is. We test both against Ofcom's in-carriage measurements."

This changes what the product promises, so it is Matt's call.

**Answer:**

## Q10 — Which networks to show

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** P7-15

**Part 1: no network chosen.** Today the page shows the worst of the four networks at
each point. No user has that experience, and it guarantees a bad-looking answer.

Options: (a) make the network field required; (b) show all four side by side, with one
line on which brands use which network; (c) keep the worst case.

**Recommendation:** (b). It is honest and it answers a real question: "which SIM
should I use on this trip?"

**Part 2: Vodafone and Three.** They merged in 2025 and now share a radio network
(Ofcom's study confirms this). A customer of either may get more than that network's
own rows show.

Options: (a) keep them separate and say so on the about page; (b) show each as the
better of the two; (c) merge them into one choice.

**Recommendation:** (a) for now. P7-09's carrier inventory will show how far sharing
has gone in the data. Revisit after that.

**Answer:**

## Q11 — Documentation for the yellow-train data

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** nothing. It raises confidence in P7-09 and P7-12.

The 2026 file has no data dictionary in the repo. Ofcom says the survey was run by the
Department for Transport and Network Rail, not by Ofcom.

**Needed from Matt:** sign in to the Rail Data Marketplace product page, save any
documentation into `data/raw/` (not committed), and ask the publisher's contact:
1. What is the difference between `rsrp` and `WB_Rsrp`? They differ by a median 8 dB.
2. Are the values corrected for antenna gain and cable loss?
3. What did "filtered" remove, and what does `reading_count` count?
4. Which carriers were scanned for each network? Vodafone has half the rows.
5. Why do the operator name and `mnc` disagree on 9% of rows?
6. Will the product be refreshed, and how often?

**Answer:**

## Q12 — Ask Ofcom for the per-test data behind its trains study

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** nothing. It would improve P7-12 a great deal.

Ofcom's June 2026 study published totals per line. The per-test records (position,
signal, speed, pass or fail, for each network) would let us fit the bands point by
point instead of line by line. The report does not say whether they are available.

**Recommendation:** email open.data@ofcom.org.uk asking for the dataset under Ofcom's
open data policy. If refused, make a Freedom of Information request. Ofcom released
the 2018-19 yellow-train data the same way.

**Answer:**

## Q13 — Your own journey logs (optional)

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** nothing

Two or three logged trips on routes you know would give a check that is independent of
Ofcom. An Android phone with a free logging app (for example G-NetTrack Lite) records
signal and position to a file. On an iPhone, noting the clock times when a video
stream stalls is enough.

**Recommendation:** worth doing on your next two train trips. Put the files in
`data/raw/user-logs/` and file a task.

**Answer:**

## Q14 — Guard rails before the loop runs unattended again

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** nothing in the backlog. Do these before starting `ralph.ps1`.

1. **Move `human_msgs.txt` out of the repo folder.** It is untracked and holds notes
   from another project. The loop's `git add -A` would publish it. The repo is public.
2. **Pin the model.** The runner does not set one, so `claude -p` uses your default.
   Until P7-04 lands, add `--model opus` to the `claude -p` call in `ralph.ps1` by
   hand, or check your default before starting.
3. **Protect the loop's own rules.** Add a CODEOWNERS file so PRs touching `agent/`,
   `.claude/`, `.github/` or `CLAUDE.md` need your review, and turn on "require review
   from code owners" for `main`.
4. **Make `signal-eval` a required check** once P7-12 says it is ready.
5. **Sandbox.** The loop runs with all permission prompts off, web access, push rights
   and auto-merge to production, on your main Windows profile. Options: (a) a dev
   container or WSL user with only this repo and a repo-scoped GitHub token; (b) a
   separate Windows account; (c) accept the risk.

**Recommendation:** do 1 to 4. For 5, option (a).

**Answer:**

## Q15 — Ofcom coverage API terms

**Status:** open
**Filed:** 2026-11-16 (review)
**Blocks:** P7-14

The repo is public and commits values derived from the Ofcom coverage API. Ofcom's
FOI reply of 6 August 2026 says API use is "subject to certain restrictions on the
extent to which data can be accessed and the purpose(s) of use". The terms were
accepted when you registered.

**Needed from Matt:** confirm from the terms of use (linked from the developer portal)
that storing derived per-location bands in a public repository is allowed, and what
attribution is required.

**Recommendation:** if the terms are unclear, email cnapisupport@ofcom.org.uk. If
storing is not allowed, P7-14 keeps the derived file out of git and fetches it at
build time.

**Answer:**

---

## Resolved (full detail in `agent/QUESTIONS-ARCHIVE.md`)

| ID | Title | Resolved |
|---|---|---|
| Q1 | Rail Data Marketplace API key | 2026-08-08 |
| Q2 | Network Rail SCHEDULE feed credentials | 2026-08-08 |
| Q3 | GitHub repository | 2026-08-05 |
| Q4 | Vercel project | 2026-08-09 |
| Q5 | RDM yellow-train product: verify schema at sign-in | 2026-08-09 |
| Q6 | Download RDM yellow-train CSV to data/raw/ | 2026-08-24 |
| Q7 | Ofcom Connected Nations per-pixel per-operator coverage data | 2026-08-27 |
