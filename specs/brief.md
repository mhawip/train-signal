# Project Brief — Train Signal

**Status:** Approved
**Date:** 2026-08-04
**Owner:** Matt Hamilton

## Decisions taken

| Decision | Choice | Date |
|---|---|---|
| Signal data | Ofcom yellow-train measurements, cross-checked against mastdatabase | 2026-08-04 |
| Rail data | Rail Data Marketplace (Darwin) + Network Rail SCHEDULE | 2026-08-04 |
| Planning horizon | 8 weeks — the meeting-booking use case requires it | 2026-08-04 |
| Hosting | Vercel, agents deploy autonomously | 2026-08-04 |
| Git workflow | Feature branches, PRs, auto-merge on green CI | 2026-08-04 |
| v1 scope | GB rail, per-network (EE/O2/Vodafone/Three) | 2026-08-04 |
| Data pipeline | Agents download and process the full 5.6 GB locally | 2026-08-04 |

---

## 1. The problem

You're booking a meeting next Tuesday. You know you'll be on the 14:12 from Leeds to
London. Can you take a Teams call at 15:00? Right now the only way to find out is to
guess, or to have made the journey enough times to remember where the signal dies.

Getting it wrong is expensive: a dropped call with a client, an interview you had to
abandon, twenty minutes of "sorry, you're breaking up".

## 2. What we're building

A web app that answers one question: **"During my train journey, when can I take a
call?"**

The user enters where they're travelling from, where to, and when. The app returns a
visual timeline of the journey showing — minute by minute — where they'll have signal
good enough for a voice call, good enough for a video call, or no usable signal at all.

That's the whole product. Nothing else.

## 3. Who it's for

People who work while they travel and need to schedule around connectivity. Commuters,
consultants, salespeople, anyone whose calendar and railcard are in conflict.

The design assumption is that they are booking a meeting *right now*, in another tab,
and want an answer in under fifteen seconds.

## 4. Success criteria

1. A user can go from landing on the site to seeing a signal timeline in under 15
   seconds, without instructions.
2. The result is accurate enough to be trusted — when we say "no signal", there is no
   signal.
3. The whole app meets **WCAG 2.2 Level AAA**, verified by automated and manual audit.
4. It works on a phone, on a train, on a bad connection.

## 5. Scope — v1

### In scope

- **GB National Rail journeys only.** Origin, destination, date and time.
- **Per-network results.** The user selects EE, O2, Vodafone or Three. Results are
  tailored to their network, because the differences are large and material.
- **Three-band signal verdict** along the journey:
  - *Voice and video* — good enough for a Teams call
  - *Voice only* — a phone call will hold, video will not
  - *No usable signal* — do not schedule anything here
- **Journey timeline visualisation** showing calling points, times, and the signal
  bands between them.
- **"Best window to book"** — the app explicitly surfaces the longest continuous
  stretch of good signal, with clock times, because that is the actual thing the user
  came for.
- **Tunnels called out explicitly**, by name, as guaranteed dead zones.

### Out of scope for v1

- Non-GB journeys. (Data availability elsewhere is far worse.)
- Saved journeys, accounts, sharing links.
- Underground / metro / tram networks.
- Live disruption or delay adjustment.
- Onboard wifi quality. (Different problem, different data, worth doing later.)

### Explicit non-goals

- We are not building a journey planner. We do not compete with Trainline. If the user
  needs to find a train, they find it elsewhere and tell us which one.
- We do not promise accuracy we cannot support. Where data is thin, we say so.

## 6. Data sources — the research

This is the part that determines whether the product is credible or a toy.

### 6.1 Signal data — recommended: Ofcom "Yellow Train" measurement data

**This is the find.** Since October 2017 Ofcom has mounted measurement antennas on four
of Network Rail's yellow engineering trains and recorded actual mobile signal strength
across the rail network in England, Scotland and Wales. They publish it openly:

| Dataset | Format | Size |
|---|---|---|
| GSM/2G yellow trains signal measurements | CSV | 1.4 GB |
| UMTS/3G yellow trains signal measurements | CSV | 2.0 GB |
| LTE/4G yellow trains signal measurements | CSV | 2.2 GB |

Source: <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2>

**Why this beats every alternative:**

- It is *measured*, not modelled. Operator coverage maps are predictions and are
  known to be optimistic. This is what a receiver actually saw.
- It is measured **on the railway**, at train roof height. Coverage maps tell you about
  a 200 m square; they don't tell you that the line runs through a cutting.
- **Tunnels, cuttings and embankments are captured inherently.** We don't have to model
  them — the measurement simply drops. This directly answers your tunnels requirement.
- It is **per-operator**: records carry MCC/MNC, so we can split EE / O2 / Vodafone /
  Three, which v1 requires.
- It includes calibrated 4G RSRP, RSRQ and SNIR — enough to distinguish "voice will
  hold" from "video will hold", which is exactly our three-band output.
- Open licence, authoritative source, free.

**Known weaknesses, to be stated honestly in the UI:**

- The published dump covers roughly June 2018 – June 2019. 4G has improved since and 5G
  has arrived. Our bands will be **conservative** — we may say "voice only" where
  there's now video-capable signal. Under-promising is the right failure mode here.
- Coverage depends on where the yellow trains ran. Some lines have many passes, some
  few. We must track measurement density per segment and degrade our confidence
  claim where it's thin.

**Supplementary sources:**

- **Ofcom Connected Nations** current coverage data (per-operator, geographic grid) —
  used to sanity-check and freshness-correct the 2018–19 measurements.
  <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-20252>
- **OpenStreetMap / OpenRailwayMap** — railway track geometry (to map a route to a
  line on the ground) and explicit `tunnel=yes` tagging, giving us named tunnels with
  precise start/end points. This lets us say "Standedge Tunnel, 3 minutes, no signal"
  rather than just showing a gap.
- **mastdatabase.co.uk rail not-spots** (David Wheatley / @lightspeed2398) — the source
  you supplied. Excellent cross-check for our output. Presented as an interactive map
  with no published data file, so we treat it as **validation, not ingestion**: if our
  model disagrees with it badly on a known route, our model is wrong. Contacting the
  author about data reuse is worth doing, with attribution.

**Pipeline approach:** the 5.6 GB is a *one-time, offline* cost. We stream-filter the
raw CSVs down to a compact derived dataset — signal profile per track segment, per
operator — of a few megabytes, committed to the repo. The pipeline script lives in the
repo so the derivation is reproducible and auditable. End users never touch the raw
data.

### 6.2 Train data — Rail Data Marketplace (as you chose)

- **Live Departure Board Web Service (LDBWS) via Rail Data Marketplace** — free, and
  critically, **the free tier is approved instantly**. `GetDepBoardWithDetails` returns
  services with their full calling-point list and times, which is precisely the spine
  our timeline hangs on. Limitation: it is a live board, so it only looks a couple of
  hours ahead.
- **Because the core use case is booking a meeting for a future date**, live boards
  alone are insufficient. We additionally need scheduled timetable data. Options are
  the Darwin Timetable feed (daily zip, 48-hour horizon) or Network Rail's SCHEDULE
  feed (8-week horizon, free registration). **Recommendation: Network Rail SCHEDULE**
  for the planning horizon, with LDBWS layered on for journeys happening today.
- Licence: Open Government Licence 2.0 with NRE amendments. Attribution required.

Registration is free and instant, but **it is an account you must create yourself** —
see section 10.

## 7. Design direction

The interface is two screens' worth of content, and no more.

**Screen one — the question.** Origin, destination, date, time, network. Five fields.
No hero image, no marketing copy, no cookie banner.

**Screen two — the answer.** A vertical timeline of the journey. Calling points marked
with their times. The line between them rendered in signal bands. Above it, in plain
language and large type, the headline answer:

> **Best window: 14:35 – 15:20**
> 45 minutes of good signal between York and Doncaster. Suitable for a video call.

The timeline is the supporting evidence. The sentence is the product.

## 8. Accessibility — WCAG 2.2 AAA

You said this is paramount. AAA is a genuinely high bar and it constrains the design
from the first pixel, so it is a **design input, not a QA gate**. Concretely:

- **1.4.6 Contrast (Enhanced)** — 7:1 for body text, 4.5:1 for large text. This
  materially restricts the palette. A conventional red/amber/green signal chart will
  fail. The palette gets designed against this constraint first.
- **1.4.1 Use of Colour** — the signal bands must be distinguishable **without colour**.
  Non-negotiable, and it's the single biggest design risk in the product. Bands will
  carry pattern *and* label *and* icon, not just hue.
- **3.1.5 Reading Level** — content must be understandable at lower-secondary reading
  level. No jargon. "No signal" not "sub-threshold RSRP". This governs every string in
  the app.
- **1.4.8 Visual Presentation** — max 80 characters per line, no justified text, 1.5
  line spacing, resizable to 200% with no horizontal scrolling.
- **2.5.5 Target Size** — 44×44 CSS pixels minimum for every interactive element.
- **3.3.6 Error Prevention** — submissions reversible or confirmed.
- **2.2.3 No Timing / 3.2.5 Change on Request** — nothing auto-refreshes or moves
  under the user.
- Full keyboard operation, visible focus indicators meeting enhanced contrast, screen
  reader tested, and a **text-equivalent of the timeline** — a plain table of segments
  and verdicts — because a purely visual timeline cannot be made AAA-accessible on its
  own.

**Verification:** automated axe-core checks at AAA ruleset in CI on every pull request,
plus a dedicated accessibility agent reviewing every UI change, plus manual screen
reader passes at milestones. Automated tooling catches perhaps a third of AAA issues;
the agent review and manual passes cover the rest.

## 9. Technical approach

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Server components keep the client bundle small; API routes hide our keys |
| Hosting | Vercel, auto-deploy on push to `main` | Your choice; serverless functions let us keep API credentials server-side |
| Repo | GitHub, public | Your choice |
| Testing | Vitest (unit), Playwright + axe-core (e2e + a11y) | a11y assertions run as real tests, not a checklist |
| Data pipeline | Node/TypeScript scripts, output committed | Reproducible, auditable, no runtime dependency on 5.6 GB |
| CI | GitHub Actions — typecheck, test, a11y, Lighthouse | The gate the agents cannot merge past |

## 10. What I need from you

Two accounts must be created by you personally — I can't create accounts or enter
credentials on your behalf:

1. **Rail Data Marketplace** — <https://raildata.org.uk>. Register, then subscribe to
   *Live Departure Board Web Service (LDBWS) — Public*. Free, instant approval.
   I'll need the API key.
2. **Network Rail Open Data** — <https://datafeeds.networkrail.co.uk> for the SCHEDULE
   feed, if we go with the 8-week planning horizon. Free registration.

Plus confirmation on:

3. **GitHub** — repository name and whether it goes under your personal account or an
   organisation.
4. **Vercel** — connected to that GitHub account.

Everything else the agents can do unattended.

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Yellow train data is 2018–19 and stale | High | Present bands conservatively; cross-check against current Connected Nations; state the vintage in the UI |
| Sparse measurement coverage on minor lines | High | Track measurement density; show reduced confidence rather than inventing a verdict |
| WCAG AAA proves impossible for the timeline | Medium | Text-equivalent table is the primary accessible representation from day one, not a retrofit |
| Mapping a named journey to track geometry is fiddly | Medium | Start with major routes, expand; fail honestly on routes we can't resolve |
| 5.6 GB download and processing | Low | One-time offline cost, streamed not loaded |
| Users read a prediction as a promise | Medium | Language throughout is "expected"/"likely"; we never say "you will have signal" |

## 12. Phasing

- **Phase 0 — Foundations.** Repo, CI, Vercel, agent system, design system built to AAA
  from the start, accessible component primitives.
- **Phase 1 — Journey spine.** Rail data integration. User enters a journey, gets a
  timeline of stops and times. No signal data yet. Fully accessible.
- **Phase 2 — Signal.** Data pipeline over the Ofcom yellow train data. Signal bands on
  the timeline. Per-network. The "best window" headline.
- **Phase 3 — Truth and polish.** Tunnel naming, confidence indicators, cross-validation
  against mastdatabase, manual a11y audit, performance.

---

## Sources

- Ofcom mobile signal measurement data downloads — <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2>
- Ofcom Connected Nations 2025 — <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-20252>
- Ofcom, Connectivity on Trains Measurement Study — <https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-3-4-weeks/mobile-connectivity-you-can-count-on/mobile-connectivity/connectivity-on-trains-measurement-study.pdf>
- National Rail Darwin data feeds — <https://www.nationalrail.co.uk/developers/darwin-data-feeds/>
- Rail Data Marketplace — <https://raildata.org.uk/helpAndInformation/aboutRDM>
- mastdatabase.co.uk railway coverage not-spots — <https://mastdatabase.co.uk/gb/railway-coverage-notspots/>
- Worked example of processing the Ofcom rail signal data — <https://github.com/russss/datavis/blob/master/ofcom-rail-signal/Ofcom%20Train%20Mobile%20Signal.ipynb>
