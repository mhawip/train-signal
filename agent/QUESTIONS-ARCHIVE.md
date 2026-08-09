# Questions archive

Full detail for questions marked resolved in `agent/QUESTIONS.md`, moved here so the live
file stays short. `QUESTIONS.md` is read in full by every loop iteration; this file is
not — read it only when you need the history behind an answer.

`QUESTIONS.md` keeps a one-line index of everything archived here.

---

## Q1 — Rail Data Marketplace API key

**Status:** resolved 2026-08-08 — `DARWIN_API_KEY` confirmed present in `.env.local` by
Matt. Tools are permission-blocked from reading `.env.local` directly (by design, so
secrets never enter context), but PowerShell confirmed the file exists and was written
2026-08-08 21:16, consistent with Matt's report. Not independently verified that the key
is *valid* — that will surface the first time P1-01 calls the live API.
**Filed:** 2026-08-04 (setup)
**Blocked:** P1-01 (rail data integration) — now unblocked

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

**Answer:** confirmed present in `.env.local`, 2026-08-08.

---

## Q2 — Network Rail SCHEDULE feed credentials

**Status:** resolved 2026-08-08 — `NR_FEEDS_USER` / `NR_FEEDS_PASS` confirmed present in
`.env.local` by Matt. Same verification basis as Q1 above: file existence and timestamp
confirmed, contents not read (blocked by design). Not independently verified valid until
P1-02 exercises the feed.
**Filed:** 2026-08-04 (setup)
**Blocked:** P1-02 (8-week timetable) — now unblocked

You chose an 8-week planning horizon, which needs Network Rail's SCHEDULE feed rather
than Darwin's 48-hour timetable.

1. Register at <https://datafeeds.networkrail.co.uk> (free)
2. Note your username and password — this feed uses basic auth, not an API key

Put them in `.env.local` as `NR_FEEDS_USER` and `NR_FEEDS_PASS`, and add them to Vercel.

**Answer:** confirmed present in `.env.local`, 2026-08-08.

---

## Q3 — GitHub repository

**Status:** resolved 2026-08-05 — <https://github.com/mhawip/train-signal>
**Filed:** 2026-08-04 (setup)
**Blocked:** P0-02 (remote repo and CI) — now done

**Answer:** GitHub account is **`mhawip`**, personal. Repository name **`train-signal`**,
public. Commit identity is `mhawip@users.noreply.github.com` since the repo is public and
commit emails are scrapeable.

Verified 2026-08-08: the `origin` remote is set and P0-02 through P2-01 have all shipped
via this repo, so this question is closed — no action needed. Note for the record: the
`gh` CLI is still not installed on this machine, so PR creation from here goes through
plain git/HTTPS rather than `gh`. That's working fine and isn't blocking anything, so it
isn't being re-opened as a question — flagging only in case it becomes relevant later.

---

## Q4 — Vercel project

**Status:** resolved 2026-08-09 — production live at
<https://train-signal-drab.vercel.app/>
**Filed:** 2026-08-04 (setup)
**Blocked:** P0-05 (deployment) — now unblocked; remaining acceptance criteria (preview
deployments, a11y suite against preview URL) still need verifying by devops

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

**Answer:** production URL is <https://train-signal-drab.vercel.app/>. Environment
variables have been added there too.

**Troubleshooting trail (all 2026-08-09):**

1. First report: deployment status **"Ready Stale"**, no visible "Production Branch"
   setting under Settings → Git, domain confirmed assigned to Production, Root Directory
   confirmed correct. Independently verified the URL returned a genuine HTTP 404 (direct
   fetch, not an auth wall) — meant no successful deployment was aliased to the domain.

2. **Diagnosis:** "Ready Stale" indicates the deployment succeeded but wasn't the one
   currently aliased — production was pointing at an older build while a newer one from
   `main` sat unpromoted.

3. **Fix attempt 1:** promoted the latest deployment to Production via the Deployments
   tab. This triggered a real build, which then failed with:

   > No Output Directory named "public" found after the Build completed. Configure the
   > Output Directory in your Project Settings. Alternatively, configure
   > vercel.json#outputDirectory.

4. **Root cause:** no `vercel.json` in the repo and `package.json`'s `build` script is
   plain `next build` — so this was a Vercel project-settings problem, not a repo
   problem. This error is what Vercel shows when **Framework Preset** is set to "Other"
   (static) instead of "Next.js" — it expects a plain `public/` folder rather than
   running Next's own build output handling. Almost certainly a leftover from the very
   first import, before the app code existed and before Vercel could autodetect the
   framework.

5. **Fix:** Settings → General → Framework Preset → changed to **Next.js** → redeployed.
   Confirmed working 2026-08-09.

---

## Q5 — RDM yellow-train product: verify schema at sign-in

**Status:** resolved 2026-08-09 — Matt verified the RDM product contains current (July
2026) data with 5G measurements, RSRP/RSRQ/SINR, MCC/MNC, and operator fields. Data
source recommendation in `specs/signal-model.md` updated to RDM product.
**Filed:** 2026-08-08 (P2-00)
**Blocks:** nothing immediately — P2-01 proceeded with Ofcom data and confirmed it
viable; this only determined whether to retarget the upcoming P2-03 pipeline at RDM
instead

P2-00 evaluated the RDM "NWR Yellow Train Mobile Network Measurements" product from
publicly available information. The conclusion was that the Ofcom download (5.6 GB CSVs)
was the safer choice because the RDM product was suspected to be the same 2018--19
underlying data, just re-hosted or lightly processed by Network Rail. The "5G" in the
description was thought to predate UK 5G deployment and refer to schema capability, not
actual measurements.

Checklist in `specs/signal-model.md` ("What Matt needs to verify at sign-in"):

1. What dates does the data cover? (If post-2019, it's a game-changer.)
2. Does it actually contain 5G signal measurements?
3. What format and approximate size?
4. Are RSRP/RSRQ/SINR present? Is MCC/MNC or an operator field present?

**Answer:** (Matt, 2026-08-09)
I see no reason to believe the RDM Yellow Train dataset does not include up-to-date 5G
measurements. The date of the file is the 29th July 2026. And when I open the 5G part of
the dataset I can see entries dated for this year. On question 4, yes all of
RSRP/RSRQ/SINR and MCC/MNC and operator fields are present. It's a CSV file and seems
to be smaller than the Ofcom one. Please update 'specs/signal-model.md' to say that my
recommendation is to use the RMD product.

**Action taken:** Updated `specs/signal-model.md` data source recommendation to RDM
product. A pipeline retargeting task will be filed to rebuild `data/signal-segments.json`
from the RDM data.
