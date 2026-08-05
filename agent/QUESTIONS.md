# Questions for Matt

Agents add questions here when a decision is genuinely his. Filing a question **never
blocks the loop** — the agent moves to other work and picks this up once answered.

To answer: edit the question, add your answer under **Answer:**, and change status to
`answered`. The next loop will pick it up.

---

## Q1 — Rail Data Marketplace API key

**Status:** account created 2026-08-05 — key to be pasted into `.env.local` by Matt
**Filed:** 2026-08-04 (setup)
**Blocks:** P1-01 (rail data integration)

Darwin's Live Departure Board Web Service needs an API key, and accounts can only be
created by you — I can't register on your behalf.

1. Go to <https://raildata.org.uk> and create an account
2. Open the Data Product Catalogue, search for `LDBWS`
3. Subscribe to **Live Departure Board Web Service (LDBWS) — Public** (free, approved
   instantly)
4. Copy the API key

Put it in `.env.local` as `DARWIN_API_KEY=...` (gitignored), and add it to the Vercel
project's environment variables.

**Answer:**

---

## Q2 — Network Rail SCHEDULE feed credentials

**Status:** account created 2026-08-05 — credentials to be pasted into `.env.local` by Matt
**Filed:** 2026-08-04 (setup)
**Blocks:** P1-02 (8-week timetable)

You chose an 8-week planning horizon, which needs Network Rail's SCHEDULE feed rather
than Darwin's 48-hour timetable.

1. Register at <https://datafeeds.networkrail.co.uk> (free)
2. Note your username and password — this feed uses basic auth, not an API key

Put them in `.env.local` as `NR_FEEDS_USER` and `NR_FEEDS_PASS`, and add them to Vercel.

**Answer:**

---

## Q3 — GitHub repository

**Status:** answered (awaiting `gh` install)
**Filed:** 2026-08-04 (setup)
**Blocks:** P0-02 (remote repo and CI)

**Answer:** GitHub account is **`mhawip`**, personal. Repository name **`train-signal`**,
public — decided by default to match the directory; say if you'd prefer something more
public-facing and it can be renamed cheaply before there's any traffic.

Commit identity is set to `mhawip@users.noreply.github.com` rather than a personal
address, since the repo is public and commit emails are scrapeable.

Remaining: `gh` CLI is not installed on this machine. Once
`winget install GitHub.cli` and `gh auth login` are done, the remote and PR workflow can
be set up unattended.

---

## Q4 — Vercel project

**Status:** open
**Filed:** 2026-08-04 (setup)
**Blocks:** P0-05 (deployment)

Once the GitHub repo exists, connect it at <https://vercel.com/new>. Import the repo,
accept the Next.js defaults, and add the environment variables from Q1 and Q2.

Confirm the production URL here once it's live so the agents can reference it in tests.

**Answer:**
