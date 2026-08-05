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

**Corrected 2026-08-05.** The original instructions named a product that does not exist.
There is no catalogue entry called "LDBWS" or "Live Departure Board Web Service
(LDBWS) — Public" — `LDBWS` appears only in product *descriptions*, which is why
searching for it by name is unhelpful.

The catalogue actually lists five separate departure-board products, all free:

- Live Arrival Board
- Live Next Departures Board
- Live Fastest Departures Board ← **not this one**
- Live Arrival and Departure Boards
- **Live Departure Board** ← this is the one we want

Steps, verified against the live site:

1. Sign in at <https://raildata.org.uk>. **Product pages render blank when signed
   out**, which makes browsing while logged out look broken.
2. Data product catalogue (at `/dashboard/dataProducts` — "dashboard" appears in the
   path even when signed out)
3. Search `Live Departure Board`
4. Subscribe to **Live Departure Board**, accept the licence — free, instant
5. Dashboard → My subscriptions → open the product → Specification / API tab → copy
   the **Consumer key**. That string is the value for `DARWIN_API_KEY`.

Avoid *Live Fastest Departures Board* — different product, won't authenticate against
the standard departure-board endpoint.

Cost: the catalogue labels this **OPEN**, the free tier. Darwin SOAP APIs are free to
5 million requests per 4-week railway period; we will not get close.

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

**Status:** done 2026-08-05 — <https://github.com/mhawip/train-signal>
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

**Status:** open — ready to do, repo now exists
**Filed:** 2026-08-04 (setup)
**Blocks:** P0-05 (deployment)

1. <https://vercel.com/signup> — **sign up with GitHub**, which saves connecting the
   accounts separately later
2. Add New → Project → import `mhawip/train-signal`
3. Next.js is detected automatically; accept the defaults
4. Before the first deploy, expand **Environment Variables** and add `DARWIN_API_KEY`,
   `NR_FEEDS_USER`, `NR_FEEDS_PASS` — same values as `.env.local`. Set each for
   Production, Preview and Development.
5. Leave **Deployment Protection** off. It puts preview URLs behind auth, and the
   accessibility suite runs against previews — if those need a login the a11y checks
   silently can't reach them, which looks like everything passing.

The first deploy will fail. That is expected: there is no Next.js app yet, only the
agent scaffolding. P0-03 builds the skeleton, P0-05 confirms the deploy goes green.

Confirm the production URL here once it's live so the agents can reference it in tests.

**Answer:**
