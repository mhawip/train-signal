# Review: signal accuracy and the agent workflow

**Date:** 2026-11-16
**Asked for by:** Matt
**Scope:** (1) why the app gives pessimistic, unusable recommendations and what to do
about it; (2) whether the agent and loop workflow is good enough to run again.
**Drives:** Phase 7 in `agent/PLAN.md` and Q8 to Q15 in `agent/QUESTIONS.md`.

Every number here was measured on 2026-11-16 from the committed data, the raw files in
`data/raw/`, the live site, or the cited source. The two scripts that produced the
signal numbers are in `pipeline/analysis/review-2026-11-*.js`.

---

## 1. Summary

1. **The 2026 measurements are fine. The pipeline reads them wrongly.** Each row in the
   yellow-train file is one cell the scanner could hear, including weak distant ones.
   The pipeline treats every row as "your signal" and then takes the worst tenth. With
   the thresholds left exactly as they are, switching to the strongest cell and the
   typical value moves EE from 8% of track nodes usable (as shipped) to 86%.
2. **No new dataset is needed first, and the thresholds do not need tuning first.** The
   existing thresholds (-89 and -99 dBm) sit within 1 to 6 dB of what Ofcom's
   in-carriage study implies (about -83 and -98 dBm). What they are applied to is wrong.
3. **There is a ground truth to calibrate against, in both directions.** Ofcom's June
   2026 in-carriage study found good performance on 17% to 42% of main-line tests by
   network, and no signal on roughly 5% to 13%. On the two main lines checked, the app
   shows "no mobile data expected" for 62% to 97% of the route on EE, O2 and Three.
4. **The results page no longer shows a recommendation at all.** The headline "best
   window" and the text table were both removed in PR #70 on 11 September. CI stayed
   green because no test checks that either exists.
5. **The loop did what it was told.** Every accuracy gate measured one kind of error
   only (never promise signal that is not there). A model that says "no signal"
   everywhere passes all of them. The workflow needs a two-sided scorecard and a human
   checkpoint at each phase end. The file-based loop itself is sound.
6. **The live service is degrading.** The weekly timetable refresh has failed 14 weeks
   running and is now disabled. The timetable is from 12 August. Any journey after the
   13 December timetable change already returns "No service found".

---

## 2. What a user sees today

Production, 2026-11-16, Leeds to London Kings Cross, EE, Tuesday 24 November 14:40:

- Every measured stretch reads "No mobile data expected". Two short stretches read
  "Mobile data may be available here (estimated)". Nothing reads good.
- There is no headline. The page is a heading, a colour strip and a list of stretches.
- The last stretch says "Via High Speed 1, Thameslink Canal Tunnels - Southbound, East
  Coast Main Line...". Those are line names picked up from nearby track, not tunnels
  on this route.
- A confidence label reads "Limited data", which means "few measurements" but sits next
  to "No mobile data expected" and reads as a contradiction.
- The same search for 15 December returns "No service found".

Distance-weighted share of the route, from the committed data:

| Route | Network | Good | Limited | None | No data |
|---|---|---|---|---|---|
| Leeds to Kings Cross (294 km) | EE | 0% | 9% | 83% | 8% |
| | O2 | 0% | 17% | 77% | 6% |
| | Three | 0% | 20% | 62% | 18% |
| | Vodafone | 9% | 16% | 26% | 50% |
| Paddington to Bristol (185 km) | EE | 2% | 5% | 93% | 0% |
| | O2 | 1% | 2% | 97% | 0% |
| | Three | 1% | 7% | 92% | 0% |
| | Vodafone | 2% | 5% | 85% | 8% |

Ofcom's in-carriage study measured good performance on 70% of EE tests between London
and Bristol (section 4).

---

## 3. Why the answer is pessimistic

### 3.1 What the raw file is

`Global_View_4G.zip` holds 7,390,564 rows from four measurement trains (NMT, PLPR2,
PLPR3, TRU) over 46 dates, 6 March to 2 May 2026: 88 train-days. Ofcom confirmed in an
FOI reply (6 October 2026) that this survey was run by the Department for Transport and
Network Rail and is not Ofcom's. There is no data dictionary in the repo.

Each row is **one cell (PCI) on one carrier (EARFCN) heard in one second**. It is a
scanner log, not a phone log:

- One second for one network has a mean of 2.9 rows, and 13 at the 99th percentile.
- The scanner steps through carriers. On the one train-day examined in detail, a
  single second typically held one of a network's carriers. A 3 to 5 second window
  typically held three. So a fair "strongest cell" needs a few seconds of data, which
  is about 200 m of track at speed.
- Across all rows the median SINR is -9 dB. Only 20% to 26% of rows have SINR of 0 dB or
  better. Most rows are cells a phone would never be served by.

A phone uses the strongest suitable cell. So the question for each stretch of track is
"how strong is the strongest cell here", not "how strong is the average thing the
scanner could detect".

### 3.2 A stack of conservative choices

Each choice below was defended in `specs/signal-model.md` as "the safe direction".
Stacked, they remove the signal. Share of track-graph nodes classed as usable (good or
limited) for EE, thresholds unchanged at -89 and -99 dBm:

| Step | Method | EE usable |
|---|---|---|
| Shipped today | 4G and 5G rows pooled per node, 10th percentile, RSRQ rule | 8% |
| Remove 5G pooling | 4G rows only, otherwise the same | 16% |
| Remove RSRQ rule | The RSRQ thresholds were written for a different column | 21% |
| Strongest cell | Best row per second instead of all rows, 10th percentile | 39% |
| Typical value | Best row per second, median | 86% |

The last row for the other networks: O2 86%, Three 82%, Vodafone 84%.

This table compares methods on the same footing as today's pipeline: nodes, the
operator name column, per-second samples. Section 3.3 has the cleaner figures.

Why each is wrong rather than merely cautious:

- **Pooling all cells.** In one second the file lists every cell heard on every
  carrier scanned. Where two cells share a carrier they differ by a median 5.5 dB, and
  a network's carriers differ by more. The pooled 10th percentile reports the weakest
  cell on the weakest carrier. A phone would be on the strongest.
- **Pooling 5G into 4G.** 93% of 5G rows have SINR below 0 dB. A phone with weak 5G
  uses 4G. Pooling lets weak 5G rows drag a strong 4G location down.
- **10th percentile on top.** The thresholds already carry the allowance for the
  carriage. Taking the worst tenth as well counts the same caution twice.
- **RSRQ rule.** It was calibrated on the 2018-19 column and applied to a column with a
  different definition.

### 3.3 What the measurements say when read properly

Strongest 4G cell per pass per grid cell of about 200 m, operator taken from the
network code, duplicates and invalid rows removed, median across passes. About
40,000 cells per network have 2026 data: roughly 7,000 to 8,500 km of route, about
half the network.

| Network | Median at the roof | -95 dBm or better | -105 dBm or better | Below -110 dBm |
|---|---|---|---|---|
| EE | -80 dBm | 85% | 94% | 4% |
| O2 | -82 dBm | 83% | 95% | 2% |
| Three | -84 dBm | 78% | 92% | 5% |
| Vodafone | -84 dBm | 78% | 93% | 4% |

For scale: Ofcom counts 4G data as available at -115 dBm outdoors and -105 dBm
in-car (Connected Nations 2024, "About this data"). The app's "no data" line is -99
dBm, applied to the worst tenth of everything the scanner heard.

### 3.4 The same two routes, raw

Grid cells with 2026 data along the path (approximate corridor):

| Route | Network | Median at the roof | -85 or better | -95 or better | App says none |
|---|---|---|---|---|---|
| Leeds to Kings Cross | EE | -71 dBm | 84% | 96% | 83% |
| | O2 | -74 dBm | 81% | 97% | 77% |
| | Three | -78 dBm | 71% | 93% | 62% |
| | Vodafone | -87 dBm | 45% | 72% | 26% |
| Paddington to Bristol | EE | -72 dBm | 87% | 98% | 93% |
| | O2 | -75 dBm | 79% | 95% | 97% |
| | Three | -77 dBm | 74% | 94% | 92% |
| | Vodafone | -75 dBm | 78% | 92% | 85% |

Two other routes show the coverage gap. Liverpool Street to Norwich has 6 measured
cells in 182 km. Edinburgh to Glasgow Queen Street has about 40 in 74 km. The 2026
survey covers about half the network. The 2018-19 Ofcom survey covered more of it.

### 3.5 Faults in how rows are read

| Fault | Size | Effect |
|---|---|---|
| Operator name trusted over network code | 9.3% of 4G rows, 13% of 5G rows disagree | Cells are counted for the wrong network. Example: 128,594 rows on Vodafone's 800 MHz carrier carry Vodafone's code and the name "EE". In each large group the code fits the carrier and the name does not, so the code looks right. P7-09 confirms with a carrier inventory. |
| Garbled operator name `O2 (TelefÃ³nica UK)` not recognised | 264,686 4G rows, 201,105 5G rows | Dropped. O2 loses about 14% of its 4G rows. |
| `rsrp = 0` rows kept | 103,033 rows (1.4%) | Read as 0 dBm, an impossible value. |
| Exact duplicate rows | 9.5% | Double counted. |
| Header has 24 names for 25 fields | every row | Harmless today, but `reading_count` is not the column the header says. |
| 5G file has almost no Vodafone (under 600 rows) and little Three (59,263) | whole file | Missing 5G for those networks means "not scanned", not "no 5G". |
| Vodafone has about half the 4G rows of the others | whole file | Some Vodafone carriers were probably not on the scanner's list. Needs a carrier inventory (P7-09). |

### 3.6 Geometry throws most of the data away

The track graph was simplified by merging every node that is not a junction or
station. Edges carry only a length. The pipeline snaps a measurement to the nearest
**node** within 500 m and drops it otherwise.

- 56% of moving rows are dropped (4,142,374 of 7,335,290).
- The graph has 35,878 km of track. By edge length, 25,269 km of it (70%) lies more
  than 500 m along the line from the node at either end, so it can rarely receive a
  measurement.
- Median edge length is 162 m, but one edge in ten is over 3.6 km and the longest is
  131 km. The app paints a node's verdict along the whole edge that leaves it. On Leeds
  to Kings Cross one node's value covers 23.7 km.

So even a correct statistic would be placed in the wrong spot.

### 3.7 The estimated layers carry no information

- **Coverage map layer.** `p5-03a` reads `VoiceOutdoor` and treats any value above 0
  as covered. The API returns 0 (none), 3 (limited) or 4 (likely), so "limited" counts
  as covered, and it is the voice field, not data. Of 7,090 postcodes with data, 7,089
  are "covered" on all four networks. 348 postcodes returned 404 and were written as
  "no coverage" on all four. 43% of nodes had no postcode within the default radius,
  mostly rural track. The result is the same answer for every network: that is why
  Liverpool Street to Norwich shows identical figures for all four.
- **Interpolation.** It spreads the mis-read measured values up to 5 km along the
  graph.
- **Tunnels.** `pipeline/p2-02-extract-osm.js:257` reads the OSM `name` tag, which
  holds the line name. The tunnel's own name is in `tunnel:name`, and the raw extract
  already on disk has 1,029 of them, including Standedge, Stoke, Severn, Chipping
  Sodbury, Gasworks and Copenhagen. Long tunnels are split into short ways and were
  not merged, which is why Standedge shows as 596 m and 665 m pieces. Every way tagged
  tunnel counts, however short.

### 3.8 The page loses what is left

- **No headline.** `BestWindow` was rendered until PR #70. It is now imported nowhere.
  `findBestWindow` only feeds the link-preview text.
- **No table.** The text-equivalent table (`JourneyTimeline`) was also dropped from the
  page in PR #70. The brief (section 8) calls it the primary accessible
  representation. The replacement has visible text for everything but has not had the
  independent review that non-negotiable 1 requires.
- **Whole legs only.** `findBestWindow` works on station-to-station legs. A leg is
  "none" if none is the most common band, ties included. A non-stop leg of 80 km gets
  one verdict.
- **Worst of four.** With no network chosen the page shows the worst network at each
  point. No user has that experience.

---

## 4. Ground truth: Ofcom's in-carriage study

"Connectivity on Trains Measurement Study", commissioned by Ofcom, delivered by
Streetwave, published 3 June 2026. 50 journeys on 24 lines, 18 February to 10 March
2026, phones on a table in the middle carriage, one per network.

- **Good Performance** means at least 5 Mbit/s down, 1.5 Mbit/s up and 50 ms latency
  in the same test. The report describes that as enough to stream video and make video
  calls. This is the definition to adopt for the "good" band.
- **Share of tests meeting it:** EE 42% (range 9 to 82 by line), Three 21% (4 to 48),
  O2 20% (4 to 73), Vodafone 17% (6 to 68).
- **Per line (Table 1), rows read with confidence:** London to Bristol EE 70, O2 18,
  Three 47, Vodafone 38. London to Norwich 64, 29, 21, 15. Edinburgh to Glasgow via
  Falkirk 62, 29, 4, 23. Edinburgh to Inverness 39, 45, 14, 19. The rest of the table
  must be transcribed from the PDF page by eye: text extraction scrambles the columns.
- **Why tests failed (Table 3), as a share of failed tests:** no signal (phone RSRP
  below -120 dBm) EE 9%, Three 17%, O2 8%, Vodafone 8%. Weak signal (-105 to -120) 47%,
  55%, 50%, 41%. Poor signal quality 25%, 13%, 27%, 26%. Vodafone also fell back to 2G
  on 6%.
- **So across all tests, no signal was roughly** 5% (EE), 6% (O2), 7% (Vodafone) and
  13% (Three). Signal of -105 dBm or better at the phone was roughly 67%, 54%, 54% and
  43%.
- **In the carriage, median signal was -101 to -108 dBm.** At the roof the 2026 survey
  medians are -80 to -84 dBm. The carriage and the phone together cost about 20 to 25
  dB. The route mixes differ, so P7-12 must redo this on the same 24 lines.
- **Signal strength predicts speed weakly.** RSRP explained under 8% of the variation
  in download speed. Given signal of -105 dBm or better, the pass rate was about 63% on
  EE, 49% on Three, 37% on O2 and 31% on Vodafone. Latency was the most common reason
  for failing.
- **Other facts that matter here:** performance was worse at peak times. Median signal
  varied by 5 to 10 dB between train classes. Vodafone and Three share their radio
  network. The report does not say whether the underlying data is available.

What this gives us:

1. A target for the **good** band per network and per line (96 numbers).
2. A target for the **no data** band (5% to 13% on main lines).
3. A measured carriage allowance, replacing the "10 to 30 dB" guess.
4. An honest limit: we can predict where signal is present and strong. We can predict
   speed only loosely, and less well on O2 and Vodafone.

With a 22 dB allowance, the study's phone thresholds become about -83 dBm (adequate)
and -98 dBm (no signal) at the roof. The pipeline's -89 and -99 dBm are already close.

---

## 5. Recommended model

Decisions for Phase 7. P7-12 may change numbers, not the shape.

1. **Position.** Signal lives in a grid of about 200 m cells, keyed by location, not on
   graph nodes. Track edges keep their shape. A journey is sampled every 100 m along
   the real path and looked up in the grid.
2. **Statistic.** For each pass (train and date), cell and network: the strongest cell
   heard, over all carriers. Across passes: the median. Keep the pass count. About half
   of cells have one pass, which is a confidence fact, not a band.
3. **Operator.** From the network code. 10 and 02 are O2, 15 is Vodafone, 20 is Three,
   30 to 33 are EE.
4. **Technology.** 4G and 5G are separate layers. 5G can raise a verdict. It can never
   lower one.
5. **Bands.** Cut points come from a calibration file fitted to section 4, per network.
   Starting values before fitting: no data below -98 dBm at the roof, good at -83 dBm
   or better.
6. **Which column.** Use `rsrp`. `WB_Rsrp` reads a median 8 dB higher and does not tell
   cells apart: where two cells share a carrier, the two columns agree on which is
   stronger only 53% of the time. It behaves like total power on the carrier. P7-12
   tests both against the Ofcom lines and keeps whichever predicts better.
7. **Evidence tiers, in order.** Measured 2026. Measured 2018-19 where 2026 is absent.
   Estimated from Ofcom's predictions. Tunnel. No data. Each tier is named to the user.
   A lower tier never overrides a higher one.
8. **Estimates.** Use the API's graded data fields per network. Learn what each grade
   means on the railway from the cells that have both a measurement and an estimate.
   A 404 is "no data".
9. **Gaps.** Bridge at most 1 km, and only between measured cells in the same band.
10. **Recommendation.** Score windows of a meeting length (30 and 60 minutes) by
    minutes of good signal, at stretch resolution. Report the best window, how much of
    it is good, the longest gap in it, and the stretches to avoid with clock times and
    tunnel names. Dips of a minute or less are counted, not treated as breaks.
11. **No network chosen.** Show all four side by side. Do not show the worst.
12. **Language.** Keep "likely" and "expected". Bands describe signal. Any claim about
    speed is tied to the network-level Ofcom result.

Later, not in Phase 7: passing times at stations a train does not call at (the
timetable has them, the index drops them), which would fix timing on long non-stop
legs. Allowance by train class. A caveat for peak-time trains.

---

## 6. Datasets and proxies

| Source | Verdict | Why |
|---|---|---|
| RDM yellow train 2026 | Keep as primary. Fix processing. | In hand, current, measured, per network. |
| Ofcom yellow train 2018-19 LTE | Add as second measured tier. | Already in `data/raw/`. Wider coverage. Networks rarely get worse. |
| Ofcom in-carriage study 2026 | Calibration and validation only. | Aggregates only. Ask Ofcom for the per-test data (Q12). |
| Ofcom coverage API | Keep for gaps, rebuilt. | Per network. Bulk grid is not released (FOI reply 6 August 2026). Check the terms for republishing derived data (Q15). |
| mastdatabase not-spots | Validation only. | No reuse licence. |
| Ookla open tiles | No. | Not per network. Non-commercial licence. |
| Opensignal, nPerf, Streetwave data | No. | Commercial. |
| OpenCelliD mast positions | Not now. | A distance-to-mast model is weaker than the measurements we hold. |
| Train class allowance (DfT study cited by Ofcom) | Later. | 5 to 10 dB between classes is real but second order. |
| Matt's own journey logs | Optional, useful. | Two or three logged trips give an independent check (Q13). |

---

## 7. The workflow

### 7.1 What works

State on disk, one task per iteration, small PRs, required CI checks, a pause file,
usage-limit handling, and a journal that is candid. On 24 August the journal recorded
that the East Coast result was "almost certainly too conservative". The system saw the
problem. It had no rule that made the problem a defect.

### 7.2 What failed

| Finding | Evidence |
|---|---|
| Accuracy gates measured one direction only | P3-01, P4-05, P5-02 and P6-01 all pass on "zero false positives". `product.md`: "Conservative verdicts are correct here; optimistic ones are defects." |
| The rationale for caution went stale and stayed | "The data is seven years old" justified conservative thresholds. The data became 2026 in DW-04. `CLAUDE.md`, `developer.md` and `signal.ts` still say 2018-19. |
| No outcome test | Nothing asserts that a results page shows a recommendation. PR #70 removed it with green CI. |
| QA by reading code | P6-02 passed 11 behaviour checks by "static analysis of source code" with no verify run. |
| A human action was lost | The refresh workflow needs two GitHub secrets. Its own comment says it will fail until Matt adds them. No open question recorded that. 14 failures in 14 weeks, then auto-disabled. |
| The refresh could not have worked anyway | It pushes to `main`, which has six required status checks. |
| A test is about to go quietly wrong | `e2e/results.spec.ts` pins 14 August 2026 and asserts only that the page has no accessibility violations. It can show a result only while the timetable still covers that date. After a refresh it will test the "No service found" page and still pass. |
| Process bypass | PR #70 was an interactive session. It added components and removed the table without the independent review rule 1 requires. |
| Loop could publish stray files | Step 5 runs `git add -A`. `human_msgs.txt`, untracked in the repo root, holds notes from an unrelated project. The repo is public. |
| Model not pinned | `ralph.ps1` calls `claude -p` with no `--model`. The orchestrator runs on whatever the session default is. |
| No cost or outcome record | `--output-format text`. 94 logs: 47 clean exits, 26 failures, 24 usage-limit hits, 38 near-empty. No per-task cost. |
| Two vocabularies | Four agent files (`product`, `designer`, `developer`, `infra`). `PLAN.md`, `README.md`, `CLAUDE.md` and step 6 of the prompt still name seven roles. |
| Specs became journals | `specs/signal-model.md` is 1,720 lines, mostly superseded. `specs/data-sources.md` says the RDM data is "not yet integrated". |
| Unsandboxed | `--dangerously-skip-permissions` with web access, push rights and auto-merge to production, on the main Windows profile. |
| Loose ends | PR #67 open since 27 August. 67 remote branches left over. `settings.json` paths point at the old OneDrive folder. |

### 7.3 What to change

1. **A scorecard that fails in both directions** (`npm run eval:signal`, P7-11), run in
   CI when data, pipeline or signal code changes. This is the main fix. With it the
   loop can tune safely. Without it any tuning drifts.
2. **Replace the one-sided rule** in `product.md`, `infra.md` and `developer.md` with:

   > A verdict is wrong if it promises signal that is not there. It is equally wrong
   > if it denies signal that is. Both are defects, and neither is fixed by accepting
   > the other. The test is the scorecard from `npm run eval:signal`. Where evidence
   > is thin, say so in the evidence label. Do not move the band.

3. **Evidence for acceptance.** A behaviour criterion passes on a test added or a
   command output quoted in the journal. Reading the code is not a pass.
4. **Demo gate at each phase end.** The loop writes `agent/DEMO.md` with real output
   for the golden journeys and the scorecard, files a question, and stops until Matt
   answers. "v1 shipped" would not have been declared.
5. **Health check in the orient step.** Failing scheduled workflows, PRs open over
   three days, timetable older than ten days. Each becomes a task or a question.
6. **Human actions stay open until verified.** Secrets, accounts and settings changes
   get a question that closes only when the agent has checked the result.
7. **Runner.** Pin the model. Record cost, turns and task per iteration. Refuse to
   start on a dirty tree. Stage named paths, never `git add -A`.
8. **Protect the guard rails.** PRs that touch `agent/`, `.claude/`, `.github/` or
   `CLAUDE.md` need Matt's review and are never auto-merged (Q14).
9. **Sandbox the loop** in a container or a separate low-privilege account (Q14).
10. **Specs state the present.** History moves to `specs/history/`.
11. **Tests use fixtures**, not live timetable dates, and assert what state they are on
    before checking accessibility.

---

## 8. What is still uncertain

- **Column meanings.** No data dictionary. `rsrp` against `WB_Rsrp`, antenna gain,
  cable loss, what "filtered" removed, what `reading_count` counts. Q11 asks Matt to
  get the documentation. P7-12 does not depend on it, because it fits to in-carriage
  results rather than to physics.
- **Scanner SINR.** The strongest cell per 200 m has median SINR of about +4 dB and is
  0 dB or better in 61% to 69% of cells. That is plausible for a roof antenna but
  unproven. Treat SINR as a candidate input, not a rule.
- **Speed.** Section 4, last point. If no metric ranks the 24 lines well for a
  network, say so and keep the band about signal.
- **Vodafone and Three.** They share a radio network. The scanner appears to record
  one network code per cell. Either network's customers may get more than its own rows
  show (Q10).
- **Table 1.** Only four rows are transcribed with confidence. P7-07 does the rest.
- **The route figures in 3.4** use straight lines between graph nodes and miss some
  cells. P7-08 gives real geometry.

---

## 9. Sources

- Ofcom, Connectivity on Trains Measurement Study (Streetwave), 3 June 2026:
  <https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-3-4-weeks/mobile-connectivity-you-can-count-on/mobile-connectivity/connectivity-on-trains-measurement-study.pdf>
- Ofcom, About this data: Mobile coverage (Connected Nations 2024), signal strength
  thresholds:
  <https://ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/infrastructure-research/connected-nations-2024/data-downloads/about-this-data-mobile-coverage-202409.pdf>
- Ofcom FOI reply 02234179, 6 August 2026, pixel-level predicted coverage:
  <https://www.ofcom.org.uk/siteassets/resources/documents/about-ofcom/foi/2026/august/predicted-mobile-coverage-data-at-pixel-level-granularity.pdf>
- Ofcom FOI reply 02286126, 6 October 2026, yellow train measurement equipment:
  <https://www.ofcom.org.uk/siteassets/resources/documents/about-ofcom/foi/2026/october/yellow-train-measurement-equipment.pdf>
- RDM product page:
  <https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>
- API value meanings (0 none, 3 limited, 4 likely) are from Ofcom's API documentation
  as summarised in search results. Confirm against a live response in P7-14.
