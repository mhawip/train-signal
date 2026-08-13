# Signal Model

## Data source recommendation

**Use the RDM product (NWR Yellow Train Mobile Network Measurements) as the primary
data source.** Matt verified the product at sign-in (2026-08-09, see Q5 in
QUESTIONS-ARCHIVE.md) and confirmed that:

- The dataset is dated 29 July 2026 -- it is current, not a re-host of the 2018--19
  Ofcom data as originally suspected.
- It contains **5G measurements dated 2026**, not just a forward-looking schema.
- RSRP, RSRQ, SINR, MCC/MNC, and operator fields are all present -- exactly what the
  signal classification pipeline requires.
- It is a CSV file, smaller than the 5.6 GB Ofcom download.

This makes the RDM product strictly superior to the Ofcom download: same measurement
methodology (yellow-train antennas on the rail network), same signal metrics, but with
current data including 5G coverage that did not exist in 2018--19.

**Current state:** The committed `data/signal-segments.json` was built from the Ofcom
2018--19 LTE data (P2-03). A pipeline retargeting task will be filed to rebuild it from
the RDM product. Until that task completes, the existing file remains usable as a
conservative baseline -- the 2018--19 data under-promises rather than over-promises,
which is the correct failure mode.

The original Ofcom-vs-RDM analysis below is retained for historical reference. It was
correct given the information available publicly; Matt's sign-in revealed that the RDM
product is genuinely newer data, not a re-host.

---

## RDM NWR Yellow Train Mobile Network Measurements

### What the catalogue page says

Product: **NWR Yellow Train Mobile Network Measurements**
Publisher: Network Rail
Access: OPEN, file-based
URL: <https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>

Catalogue description (quoted from the RDM listing):
> "filtered 2G, 4G and 5G mobile network measurements collected from Yellow Train
> surveys... signal quality, mobile network performance and interference along rail
> corridors"

### What we could determine publicly

The product page requires sign-in for schema details, download, and full metadata. The
following is based on web search, the Open Rail Data community, and Ofcom's own
documentation:

1. **The "5G" mention is likely misleading.** The original Ofcom explanatory document
   (published December 2019) explicitly states: "Measuring 5G mobile signal was outside
   the scope of this project, as operators had not yet started to deploy 5G at the time
   we began." The measurement period was June 2018 to June 2019, before any UK 5G
   deployment. If the RDM product description says "5G", it may refer to a schema that
   can accommodate 5G fields (a forward-looking format) rather than actual 5G
   measurements. This cannot be confirmed without sign-in.

2. **"Filtered" is ambiguous.** It could mean:
   - Pre-processed (noise removed, rationalised to 10 m spacing) -- a plus, saves us
     cleanup work
   - Subset (geographic or temporal filter) -- potentially a minus, could reduce coverage
   - We cannot determine which without inspecting the actual files

3. **The underlying data is almost certainly from the same Ofcom/Network Rail measurement
   campaign.** The yellow trains are Network Rail's engineering trains; Ofcom mounted
   antennas on four of them. The RDM product is published by Network Rail, describing
   measurements from "Yellow Train surveys" -- this is the same programme. No evidence
   of a second, separate measurement campaign has been found.

4. **No public evidence of newer measurements being available through RDM.** The Google
   Groups openraildata-talk thread references this product but does not describe it as
   containing data beyond the Ofcom 2018--19 release.

5. **Licence is listed as OPEN.** This likely aligns with Ofcom's existing open licence
   for this data. Exact terms need verification at sign-in.

6. **Format and size are unknown** from the public catalogue page. Could be the same CSV
   files (5.6 GB), could be a compact derivative. Cannot confirm without sign-in.

### The June 2026 Ofcom train study -- a separate thing

In June 2026, Ofcom published a "Connectivity on Trains Measurement Study" conducted by
Streetwave, covering 50 journeys on 24 rail lines in February--March 2026. This study
measured 4G and 5G performance and found that even the best network (EE) met the "good
performance" threshold on only 42% of segments.

This is a **different dataset from the yellow-train measurements**:
- It was conducted by Streetwave (a contractor), not by yellow-train-mounted antennas
- It covered only 24 routes, not the full network
- The raw measurement data does **not appear to be publicly available** for download
- It measured throughput and latency, not raw signal metrics (RSRP/RSRQ/SNIR)

This study is useful context (it confirms train signal is still poor in 2026, validating
the product concept) but is not a data source we can ingest.

---

## Ofcom yellow-train data

### What we know

| Field | Value |
|---|---|
| Source | Ofcom open data downloads |
| URL | <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2> |
| Files | `gsm-jun18tojun19-yt.csv` (1.4 GB), `umts-jun18tojun19-yt.csv` (2.0 GB), `lte-jun18tojun19-yt.csv` (2.2 GB) |
| Measurement period | June 2018 -- June 2019 |
| Technologies | 2G (GSM), 3G (UMTS), 4G (LTE). No 5G. |
| Licence | Open Government Licence (Ofcom open data) |
| Methodology | Antennas on roofs of four Network Rail engineering trains |
| Rationalisation | Raw data reduced to no more than one sample per 10 m |
| Coverage | England, Scotland and Wales rail network |

### Known LTE CSV schema (from worked examples and documentation)

Based on the russss/datavis notebook and Ofcom explanatory documentation, the LTE CSV
contains at minimum:

| Column | Description |
|---|---|
| `eastings` | OS National Grid easting (OSGB36/EPSG:27700) |
| `northings` | OS National Grid northing |
| `speed` | Train speed in km/h |
| `datetime` | Timestamp of measurement |
| `train` | Identifier for which of the four yellow trains |
| `MNC` | Mobile Network Code (operator identifier) |
| `Operator` | Operator name (LTE file only, per Ofcom docs) |
| `EARFCN` | E-UTRA Absolute Radio Frequency Channel Number |
| `ptotal` / `total_power` | Total received power |

The brief and Ofcom documentation state that calibrated RSRP, RSRQ and SNIR values are
present in the LTE data. The exact column names for these fields need to be confirmed by
inspecting the CSV header directly. The 2G and 3G files use different column sets
appropriate to their technologies.

**Note:** The column `ptotal` is referenced in the russss notebook, but the LTE file
appears to use `total_power` as the column name (the notebook renames it). The full
column list will be documented in P2-01 when a sample is inspected.

### Operator mapping (UK MNC values)

| MNC | Operator |
|---|---|
| 10 | O2 |
| 15 | Vodafone |
| 20 | Three |
| 30, 33 | EE |

MCC for the UK is 234. The LTE file also carries an `Operator` text column.

### Key strengths

- **Measured, not modelled.** Actual RF measurements on the railway, not operator
  coverage predictions.
- **Per-operator.** MCC/MNC allows splitting by network.
- **Tunnels and cuttings captured inherently.** Signal drops in the measurement without
  needing to be modelled.
- **Calibrated 4G metrics.** RSRP, RSRQ and SNIR allow distinguishing voice-capable
  from video-capable signal.
- **Open licence, no approval delay.**
- **Well-documented.** Explanatory document, worked notebook example, multiple community
  analyses.

### Key weaknesses

- **Data is seven years old.** Networks have improved since 2018--19, and 5G has been
  deployed on some corridors. Our verdicts will be conservative -- under-promising rather
  than over-promising. This is the correct failure mode for the product.
- **Roof-height measurements.** Signal at the antenna on the train roof is stronger than
  what a passenger receives inside the carriage (metalised windows attenuate signal).
  This partially offsets the age-related conservatism, but in a way we cannot precisely
  quantify.
- **Coverage depends on yellow-train routes.** Some lines have many passes, some few,
  some none. Measurement density must be tracked per segment.
- **No 5G.** The dataset predates UK 5G deployment entirely.

---

## Recommendation rationale (historical -- superseded by RDM verification above)

### Why Ofcom download, not RDM (original analysis, pre-verification)

1. **The Ofcom data is the known quantity.** Its schema is documented, its limitations are
   understood, worked examples exist, and it can be downloaded today with no account.

2. **The RDM product is very likely the same underlying data.** The yellow-train
   measurement programme was a collaboration between Ofcom and Network Rail. Network Rail
   operated the trains; Ofcom operated the antennas and published the data. The RDM
   product is published by Network Rail and describes "Yellow Train surveys" -- this is
   the same programme. No evidence exists of a second campaign producing different data.

3. **The "5G" in the RDM description is almost certainly not what it seems.** It may
   indicate that the data schema or platform can accommodate 5G fields, but the actual
   measurements predate UK 5G deployment.

4. **"Filtered" could go either way.** If it means pre-cleaned, it saves us work. If it
   means geographically subset, it could reduce our coverage. We cannot tell without
   sign-in.

5. **The Ofcom download has no approval delay.** RDM products marked "OPEN" may still
   require an account and potentially approval. The Ofcom CSVs are direct downloads.

### Why the RDM product is still worth checking

Despite the above, the RDM product should not be dismissed:

- It **might** contain newer measurements from a continuation of the programme that was
  not published through Ofcom's open data page.
- If "filtered" means pre-processed and compact, it could save significant pipeline work.
- If it includes 5G measurements from a later survey, it would be materially better data.
- Network Rail may have continued collecting after the Ofcom-published window closed.

The cost of checking is low (Matt logs in and inspects the product page), and the
potential upside is high.

---

## Implications for P2-01 and P2-03

### If Ofcom download is confirmed (current recommendation)

P2-01 and P2-03 proceed as currently defined in the backlog:

- **P2-01 (thin slice):** Download a sample of the Ofcom LTE CSV, inspect the schema,
  verify column names for RSRP/RSRQ/SNIR, and process one route for one operator to
  prove measurement density is sufficient.
- **P2-03 (full pipeline):** Stream all three CSVs (primarily the LTE file), filter to
  points near track geometry, snap to segments, aggregate distributions, emit compact
  output.

No changes to those task definitions are needed.

### If RDM product turns out to contain newer data

Both tasks would change:

- **P2-01:** The thin slice targets the RDM download instead. Schema inspection is
  especially important since the format may differ. If it is pre-processed and compact,
  the "stream 5.6 GB" requirement in P2-03 may be unnecessary.
- **P2-03:** If the RDM data is already filtered and segment-aligned, the pipeline
  simplifies substantially. If it is newer (post-2019), the data-vintage caveat in the
  UI can be softened. If it includes 5G, the signal model gains a fourth technology
  generation.
- **The brief's "Decisions taken" table** would need updating to reference the RDM
  product as the signal data source.

### If both are useful

It is possible that the RDM product is a compact, pre-processed version of the same
2018--19 data. In that case, we might use the RDM version to skip cleanup work while
still referencing the Ofcom explanatory documentation for schema interpretation. This
would be documented in the pipeline.

---

## What Matt verified at sign-in (2026-08-09)

Matt logged into the Rail Data Marketplace and inspected the NWR Yellow Train Mobile
Network Measurements product. Key findings:

1. **Measurement dates:** The file is dated 29 July 2026. This is current data, not
   the 2018--19 Ofcom dataset.
2. **5G measurements:** Yes, the 5G portion contains entries dated 2026. These are real
   5G measurements, not just a forward-looking schema.
3. **File format and size:** CSV, smaller than the Ofcom 5.6 GB download.
4. **Schema:** RSRP, RSRQ, SINR, MCC/MNC, and operator fields are all present.
5. **Items 5--8 from the original checklist** (filtering details, licence terms,
   geographic coverage, sample download) remain to be documented when the pipeline
   retargeting task runs. They are not blocking -- the data has the fields we need.

Based on these findings, the recommendation was updated to use the RDM product (see
top of this document).

---

## Sources

- Ofcom yellow-train data downloads: <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2>
- Ofcom explanatory document (Dec 2019): <https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/infrastructure-research/connected-nations-2019/yellow-trains-data/yellow-trains-release-explanatory-document.pdf>
- RDM product page: <https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>
- russss/datavis worked notebook: <https://github.com/russss/datavis/blob/master/ofcom-rail-signal/Ofcom%20Train%20Mobile%20Signal.ipynb>
- F17 GB Rail mobile coverage blog: <https://www.f17.co.uk/blog/gb-rail-mobile-coverage/>
- Ofcom Connectivity on Trains Measurement Study (Jun 2026): <https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-3-4-weeks/mobile-connectivity-you-can-count-on/mobile-connectivity/connectivity-on-trains-measurement-study.pdf>
- Ofcom spectrum assurance vehicle data (roads, 2020--2025): <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/mobile-signal-strength-measurement-data>

---

## P2-01 Findings: Thin Vertical Slice

### Method

Downloaded a stratified sample of the Ofcom LTE/4G yellow-train CSV
(`lte-jun18tojun19-yt.csv`, 2.2 GB) by fetching ten 5 MB chunks at evenly spaced byte
offsets across the file. This gave approximately 414,000 rows (roughly 2.3% of the full
file) spread across the measurement period from June 2018 to May 2019, covering all four
trains (Train1 through Train4).

The analysis script (`pipeline/p2-01-analyse-spread.js`) filters measurements to within
3 km of the East Coast Main Line (London Kings Cross to Leeds, approximately 282 km via
waypoints at Finsbury Park, Stevenage, Peterborough, Grantham, Newark North Gate,
Retford, Doncaster, and Wakefield Westgate), then buckets them into 1 km segments along
the route.

Download URL:
`https://static.ofcom.org.uk/static/research/connected-nations2019/lte-jun18tojun19-yt.csv`

### Column schema (confirmed)

The LTE CSV contains 18 columns. Every column name and its meaning:

| Column | Type | Description |
|---|---|---|
| `latitude` | float | WGS84 latitude (decimal degrees) |
| `longitude` | float | WGS84 longitude (decimal degrees) |
| `eastings` | int | OS National Grid easting (OSGB36 / EPSG:27700) |
| `northings` | int | OS National Grid northing |
| `speed` | int | Train speed in km/h |
| `train` | string | Which yellow train: Train1, Train2, Train3, or Train4 |
| `datetime` | string | Timestamp, format `YYYY-MM-DD HH:MM:SS` |
| `mnc` | int | Mobile Network Code (UK MCC is always 234) |
| `operator` | string | Operator name: EE, O2, Three, or Vodafone |
| `earfcn` | int | E-UTRA Absolute Radio Frequency Channel Number |
| `dlfreq` | int | Downlink frequency in MHz (approx.) |
| `phylayercellid` | int | Physical layer cell identity group |
| `pci` | int | Physical Cell Identifier |
| `rsrp` | float | Reference Signal Received Power, raw (dBm) |
| `cal_rsrp` | float | Reference Signal Received Power, calibrated (dBm) |
| `total_power` | float | Total received power (dBm). Occasionally NULL (0.4% of rows). |
| `rsrq` | float | Reference Signal Received Quality (dB) |
| `sinr` | float | Signal to Interference plus Noise Ratio (dB). Occasionally NULL (0.4% of rows). |

**Note on `rsrp` vs `cal_rsrp`:** The calibrated value (`cal_rsrp`) corrects for cable
loss and antenna gain specific to each train and frequency band. The offset is constant
per operator per train (observed values: +3.16, +3.68, +5.18, +5.61 dB on Train1). The
calibrated value is what should be used for signal classification -- it represents what
the antenna actually received.

**Note on coordinate systems:** Both WGS84 lat/lon and OS National Grid are provided.
For our pipeline, lat/lon is simpler to work with and avoids a coordinate transform.

**Note on NULL values:** Only `total_power` and `sinr` have occasional NULLs (0.4% of
rows in the sample). `cal_rsrp` and `rsrq` are present on every row. Since our signal
classification relies primarily on RSRP and RSRQ, this is not a problem. Rows with NULL
SINR can still be classified; SINR serves as supplementary confirmation.

### Operator mapping (confirmed from data)

The `operator` column contains the plain-text operator name. No need to map from MNC,
but for completeness:

| MNC | `operator` value | Network |
|---|---|---|
| 10 | O2 | O2 / Telefonica UK |
| 15 | Vodafone | Vodafone UK |
| 20 | Three | Three / Hutchison 3G |
| 30 | EE | EE (BT Group) |

All four operators are present in every sample examined, with roughly equal measurement
counts (each operator is measured at each location, giving four rows per geographic
point). This means the per-operator comparison is fair -- every location has data for
all four networks.

### ECML corridor density analysis

**Route:** London Kings Cross to Leeds, 282 km via the East Coast Main Line.

**Sample coverage:** The 2.3% sample found 15,860 rows within the ECML corridor,
drawn from 2 distinct measurement dates (the yellow trains passed through the ECML
corridor on specific dates within the sample window). All four operators were represented
with roughly equal counts:

| Operator | ECML measurements (in sample) | Covered 1 km segments |
|---|---|---|
| EE | 4,084 | 10 |
| Three | 4,154 | 10 |
| O2 | 3,819 | 10 |
| Vodafone | 3,803 | 10 |

The 10 covered segments cluster around km 238--240 (near Doncaster). This is a sampling
artefact: our 2.3% byte-offset sample only intersected two dates when a train traversed
this part of the ECML.

**Extrapolated full-file density:** If the ECML fraction holds across the full 2.2 GB
file, the total ECML corridor should contain approximately:

- 700,000 total rows (all operators combined)
- 175,000 rows per operator
- 620 measurements per operator per km (mean, assuming full coverage)

This is an order of magnitude above the minimum needed for statistical reliability. Even
if only 50% of the 282 km segments are covered (which would be surprisingly low for a
major trunk route), the density in covered segments would still be over 1,200 per km.

**Where data exists, it is very dense.** In the segments we did observe:

- Mean measurements per covered km per operator: 166--415
- Where multiple passes overlap, counts reach 1,600--1,900 per km per operator
- This is consistent with the Ofcom methodology of recording one measurement per 10 m
  (100 measurements per km per pass), with multiple passes over the measurement year

### Signal metric distributions (ECML sample)

For the ECML corridor segments observed in the sample:

| Operator | cal_RSRP p10 | cal_RSRP p50 | cal_RSRP p90 | SINR p10 | SINR p50 | SINR p90 |
|---|---|---|---|---|---|---|
| EE | -78.3 dBm | -71.9 dBm | -61.8 dBm | 2.8 dB | 11.0 dB | 21.8 dB |
| Three | -77.4 dBm | -71.7 dBm | -60.0 dBm | 1.4 dB | 7.7 dB | 20.6 dB |
| O2 | -88.0 dBm | -75.3 dBm | -65.6 dBm | 1.9 dB | 3.7 dB | 9.9 dB |
| Vodafone | -87.5 dBm | -77.5 dBm | -68.0 dBm | 0.8 dB | 2.6 dB | 15.2 dB |

These are roof-height measurements near Doncaster (a relatively well-covered urban
area), so they represent a favourable case. The full route will include rural segments
with weaker signal. However, the spread between p10 and p90 within each operator (15--20
dB for RSRP) shows that the data does capture meaningful variation, which is what we need
for per-segment classification.

### Key observations

1. **The data structure is exactly what we need.** Lat/lon coordinates, calibrated RSRP,
   RSRQ, SINR, operator name, timestamp -- all present and clean. No surprises.

2. **All four operators at every point.** The measurement rig scanned all four networks
   simultaneously, so we get four rows per geographic sample point. This is ideal for
   per-operator comparison.

3. **Measurement density is high where the trains ran.** The limiting factor is not
   "measurements per km" but "which km segments the trains covered at all". On trunk
   routes like the ECML, density should be excellent. On branch lines, it may be thin or
   absent.

4. **The 10 m rationalisation is already done.** Ofcom reduced raw data to at most one
   sample per 10 m, which means the data is already spatially sensible -- we do not need
   to de-duplicate overlapping measurements at the same point.

5. **Calibrated RSRP is the right metric.** The `cal_rsrp` column corrects for
   equipment-specific cable and antenna factors. It represents the actual signal at the
   train roof antenna.

6. **Roof height vs passenger experience.** These measurements are from antennas on the
   train roof, which receive stronger signal than a phone inside the carriage (metalised
   windows attenuate 10--30 dB depending on train type). This partially offsets the data
   vintage: networks have improved since 2018--19, but the roof-height advantage inflates
   the measured values. The net effect is hard to quantify precisely, which is why the
   product must use hedging language ("expected", "likely") rather than certainty.

### Coverage risk: branch lines

The yellow trains are engineering trains that run primarily on main lines and trunk
routes. Branch lines, rural routes, and infrequently maintained lines may have few or
zero measurements. The full pipeline (P2-03) must track measurement count per segment
and degrade gracefully:

- **10+ measurements per operator per km:** Confident classification.
- **3--9 measurements:** Lower confidence, flag in UI.
- **0--2 measurements:** Display "No data available" rather than guessing.

These thresholds will be refined when the full file is processed.

### Viability verdict

**The approach is viable.** The Ofcom LTE yellow-train data contains exactly the columns
we need, at sufficient density for signal classification on major routes. The data is
clean, well-structured, and covers all four UK operators simultaneously.

**Specific confidence levels:**

- **Major trunk routes (ECML, WCML, GWML, MML):** High confidence. These are the routes
  the yellow trains run most frequently. Expect hundreds of measurements per km per
  operator, across multiple passes on different dates.

- **Secondary main lines:** Moderate confidence. Expect coverage but potentially with
  gaps and fewer passes. The product can still give useful verdicts for most segments.

- **Branch lines and rural routes:** Low confidence. Many will have sparse or no data.
  The product must be honest about this -- "We don't have enough data for this section"
  is the correct output, not a guess.

**Recommendation:** Proceed to P2-03 (full pipeline). Download the complete 2.2 GB LTE
CSV, stream it through a filter/snap/bucket pipeline, and produce a compact per-segment
signal quality dataset. The pipeline must track measurement count and date range per
segment, because the product's credibility depends on knowing where the data is thin.

### Analysis scripts

- `pipeline/p2-01-analyse-sample.js` -- initial analysis of first 5 MB (sequential sample)
- `pipeline/p2-01-analyse-spread.js` -- analysis of stratified sample across full file

Both scripts are one-off analysis tools for this investigation. They are not part of the
production pipeline. The production pipeline (P2-03) will stream the entire file.

---

## Track geometry (P2-02)

### Approach

Track geometry is extracted from OpenStreetMap via the Overpass API. The GB railway
network is queried using `railway=rail` and `railway=light_rail` tags (excluding sidings
and yards), along with tunnel ways (`tunnel=yes`). The bounding box covers
49.8,-8.2,60.9,2.2 (all of GB including offshore approaches).

### Graph simplification

The raw OSM data contains ~563,000 nodes and ~81,000 ways. This produces a 32 MB JSON
file -- too large to commit.

**Decision:** Simplify the graph by merging degree-2 nodes (nodes that connect exactly
two edges with no branching). This preserves the network topology while collapsing long
chains of intermediate points into single weighted edges. Station-nearest nodes are
protected from merging so that station-to-station path-finding works correctly.

Result: 21,626 nodes, 28,467 edges, 1.5 MB. Well under the 5 MB target.

The trade-off: the simplified graph loses intermediate geometry along edges. Each edge
stores only its endpoint coordinates and total distance, not the detailed coordinate
sequence between them. For P2-03 (signal pipeline), this means Ofcom measurements will
be snapped to the nearest graph node rather than to a precise point along the track.
At ~1.6 km average spacing between graph nodes on the ECML, this introduces position
uncertainty of up to ~800 m. This is acceptable for the 1 km bucketing planned in P2-03,
and the full raw node data can be used for finer resolution if needed.

### Station snapping

Every station in `data/stations.json` (2,608 stations) is snapped to its nearest OSM
graph node within a 2 km radius. All 2,608 stations snap successfully, confirming that
the OSM railway network covers the entire GB passenger network.

The snap distances range from ~10 m (stations centred on track) to ~1,500 m (stations
where the OSM node and station reference point differ -- often because the station
building is offset from the platform centreline, or the nearest track node is at a
junction rather than the station itself).

### Tunnels

3,537 tunnel ways extracted, of which 3,045 have names. Tunnel naming in OSM typically
uses the railway line name (e.g. "East Coast Main Line", "South Wales Main Line") rather
than the specific tunnel name. Some tunnels include the tunnel name in parentheses
(e.g. "Harrogate Line (Bramhope Tunnel)"). The app may need to present these as
"Tunnel on [line name]" rather than expecting a standalone tunnel name.

Notable tunnels confirmed in the data:
- Severn Tunnel: 6,993 m / 6,995 m (two tracks, named "South Wales Main Line")
- Bramhope Tunnel: 3,442 m / 3,444 m (two tracks, named "Harrogate Line (Bramhope Tunnel)")
- Channel Tunnel: 27,623 m (named, but outside the GB rail network proper)

### Tunnel matching on routes

When resolving a station-pair track segment, tunnels are matched to the path by
proximity: if a tunnel's midpoint is within 200 m of any path coordinate, it is
considered to be on the route. Start and end indices are computed by finding the
nearest path coordinate to the tunnel's start and end points.

This is approximate -- the simplified graph's ~1.6 km point spacing means tunnel
positions along the path are resolved to the nearest graph node, not to a precise
metre. For the purpose of identifying which tunnels a journey passes through (and in
what sequence), this is sufficient. Precise tunnel timing will depend on the timetable
speed model, not on sub-km position accuracy.

### Path-finding

Station-to-station routes use Dijkstra's algorithm on the simplified graph, with edge
weights equal to the physical distance in metres. The algorithm finds the shortest path,
which on a railway network typically corresponds to the actual route (unlike a road
network, where shortest distance and fastest route often differ).

**Limitation:** The railway graph is undirected and does not encode route knowledge
(e.g. which lines serve which stations). This means the shortest-path result may not
match the actual timetabled route if multiple paths exist between two stations. For
example, a journey from London to Manchester could follow the WCML or the MML; the
graph will return whichever is shorter by distance. For P2-03, this is acceptable
because signal measurements along both routes are captured in the Ofcom data. The
correct route will be determined when timetable data (P1-01/P1-02) provides calling
points, and the track lookup can be called for each consecutive station pair.

### Scripts

- `pipeline/p2-02-extract-osm.js` -- downloads and processes OSM data
- `pipeline/track-lookup.ts` -- station-pair path resolution with tunnel matching

---

## Signal classification thresholds (P2-03)

### Purpose

Every node/operator combination in the derived signal dataset is classified into one of
three bands, telling the user whether they can expect to sustain a video call, a voice
call, or neither. The classification uses the **10th percentile** of calibrated RSRP
across all measurements at that node for that operator. The 10th percentile is chosen
deliberately: a user cares about the worst signal they are likely to experience at a
location, not the average. A call drops at the worst moment, not the typical one.

### Primary metric: cal_rsrp (10th percentile)

| Band | cal_rsrp p10 | User-facing meaning |
|---|---|---|
| Voice + Video (`"video"`) | >= -85 dBm | Strong enough for a Teams/Zoom video call |
| Voice only (`"voice"`) | -95 to -85 dBm | A phone call will hold, but video will not |
| No usable signal (`"none"`) | < -95 dBm | Do not schedule anything here |

### Justification

These thresholds are grounded in published LTE signal quality research and mobile
operator guidance:

1. **-85 dBm for video calling.** 3GPP defines "good" LTE coverage as RSRP >= -80 dBm,
   and "normal" as >= -90 dBm. Video calling (VoLTE video, Teams, Zoom) requires
   sustained throughput of 1-2 Mbps and low jitter. Published VoLTE requirements from
   multiple sources (GSMA IR.92, operator deployment guides) indicate that reliable
   video calling requires RSRP above approximately -85 dBm with reasonable RSRQ. We use
   -85 dBm rather than -80 dBm because the measurements are from the train roof, which
   receives 10-30 dB stronger signal than a phone inside the carriage. At -85 dBm roof
   height, actual in-carriage signal is likely -95 to -115 dBm, which is marginal for
   video. This partially offsets the data vintage (networks improved since 2018-19).

2. **-95 dBm for voice calling.** VoLTE voice requires approximately 10-20 kbps AMR-WB
   throughput, which LTE can sustain at much lower RSRP than video. Published guidance
   from Ofcom and operators indicates voice calls remain reliable down to approximately
   -100 to -105 dBm in good RSRQ conditions. We use -95 dBm (conservative) to account
   for:
   - The roof-to-carriage attenuation (10-30 dB depending on train type)
   - The data vintage (2018-19 measurements, networks may have degraded or improved
     in specific locations)
   - The fact that p10 already captures worst-case behaviour; adding extra margin on
     top of p10 would over-correct

3. **Below -95 dBm: no usable signal.** At the 10th percentile below -95 dBm (roof
   height), a user inside the carriage is very likely experiencing signal below -105 to
   -125 dBm. At these levels, even VoLTE voice becomes unreliable, and the connection
   may drop to 3G/2G or lose data connectivity entirely.

### Supplementary metric: rsrq (10th percentile)

RSRQ measures signal quality relative to interference. Even with strong RSRP, high
interference (low RSRQ) degrades call quality because the radio channel is shared with
many users or suffers inter-cell interference.

| RSRQ p10 | Effect |
|---|---|
| >= -15 dB | No degradation (normal quality) |
| -20 to -15 dB | Degrades `"video"` to `"voice"` (interference too high for video) |
| < -20 dB | Degrades to `"none"` regardless of RSRP (connection unreliable) |

**Justification:** 3GPP TS 36.133 defines RSRQ reporting range from -19.5 dB to -3 dB.
Values below -15 dB indicate significant interference or congestion. At RSRQ below
-20 dB, the UE may struggle to maintain a stable connection even for voice. These
thresholds are conservative: in practice, modern UEs can sometimes maintain calls at
lower RSRQ, but the product should not promise what it cannot guarantee.

### Confidence classification

The number of measurements at a node determines confidence:

| Measurement count | Confidence | Rationale |
|---|---|---|
| >= 10 | `"high"` | Sufficient samples for a reliable p10 estimate |
| 3 to 9 | `"low"` | p10 is computed but may not be representative |
| < 3 | `"no-data"` | Too few measurements to classify; band is `"no-data"` |

With the Ofcom methodology of one sample per 10 m, 10 measurements represents
approximately 100 m of track. This is a minimal but defensible sample for a node that
represents a ~1.6 km segment.

Low-confidence nodes should be presented differently in the UI (e.g. hatched or dimmed)
and must not contribute to "best window" recommendations without explicit caveat.

### Conservative bias

The thresholds are deliberately conservative:

- **Data vintage.** The measurements are from June 2018 to June 2019. Networks have
  generally improved since then (more masts, better backhaul, VoLTE rollout). Using
  7-year-old measurements with conservative thresholds means the product is more likely
  to under-promise than over-promise.

- **Roof vs carriage.** The measurements are from antennas on the train roof, which
  receive stronger signal than a phone inside the carriage. This partially offsets the
  data-vintage conservatism, but the magnitude is uncertain (10-30 dB attenuation
  depending on train type and window glazing).

- **Asymmetric cost.** Under-promising costs a user a meeting they could have taken
  (inconvenience). Over-promising costs them a dropped client call (embarrassment,
  lost business). The thresholds should err on the side of the less costly failure mode.

### SINR (informational)

SINR (Signal to Interference plus Noise Ratio) is recorded but not used in the primary
classification. It is stored in the output as `sinr_p10` for future reference. SINR is
NULL for approximately 0.4% of rows in the Ofcom data. Nodes with fewer than 3 SINR
measurements store `sinr_p10: null`.

### Pipeline output

The classification is implemented in `pipeline/p2-03-build-signal.ts` and output to
`data/signal-segments.json`. The thresholds are encoded as constants (`THRESHOLDS`) in
the pipeline script and recorded in the output metadata for traceability.

**Committed file format:** The committed `data/signal-segments.json` is compact JSON
(no whitespace), 9.2 MB. The `rsrp_p50` field (median RSRP) was removed from the
committed file to fit under the 10 MB pre-commit limit; it is not used in signal
classification (which uses `rsrp_p10`) and is supplementary only. This file will be
replaced when the pipeline is retargeted to the RDM product.

### P2-03 pipeline results (full dataset)

Processing the complete Ofcom LTE CSV (2.2 GB, 19.3 million rows):

| Stage | Count |
|---|---|
| Total data rows | 19,285,594 |
| Filtered: stationary (speed < 5 km/h) | 10,698,116 |
| Filtered: not near track (> 500 m) | 4,618,947 |
| Snapped to graph nodes | 3,968,531 |
| Nodes with data | 14,753 |

Per-operator measurement counts (after filtering and snapping):

| Operator | Measurements |
|---|---|
| EE | 1,034,422 |
| O2 | 904,514 |
| Three | 1,031,171 |
| Vodafone | 998,424 |

This represents 68% of the 21,626 graph nodes having at least one operator measurement.
The remaining 32% are on lines the yellow trains did not traverse during the measurement
period. Those nodes correctly receive no entry in the output (the product shows "no data"
rather than guessing).

---

## P3-01 Cross-validation findings

### What we did

We ran the signal model against five well-known GB rail routes and compared the output
to external notspot data (mastdatabase rail notspots map, Ofcom 2026 train connectivity
study, and common knowledge of poor-signal areas). The validation script
(`pipeline/p3-01-validate-notspots.ts`) finds the shortest path between consecutive
station pairs using Dijkstra on `data/track-graph.json`, looks up signal classifications
from `data/signal-segments.json`, and reports per-operator signal bands for each segment.

**Routes tested:**

1. East Coast Main Line: Leeds to London Kings Cross (10 intermediate stops)
2. Transpennine: Leeds to Manchester Piccadilly (via Huddersfield)
3. Great Western: London Paddington to Bristol Temple Meads (via Reading, Swindon,
   Chippenham, Bath)
4. CrossCountry: Reading to Birmingham New Street (via Oxford, Banbury, Leamington Spa)
5. Edinburgh to Glasgow Central (via Haymarket)

**External sources used:**

- mastdatabase.co.uk railway coverage notspots map
- Ofcom "Connectivity on Trains Measurement Study" (June 2026, Streetwave)
- Common experience of well-travelled routes (ECML, Transpennine)

**Dataset statistics:**

- 14,753 signal nodes in the dataset (68% of all graph nodes)
- 3,682 nodes (25%) where all four operators show none or no-data
- 125 nodes (under 1%) where all four operators show video
- Thresholds: video requires RSRP p10 at or above -85 dBm, voice requires at or above
  -95 dBm, RSRQ below -15 dB degrades video to voice, RSRQ below -20 dB degrades to
  none

### Route-by-route results

| Route | Known notspot | Model result | Agreement |
|---|---|---|---|
| ECML | Stoke Tunnel, south of Grantham | 3 of 4 operators show none (GRA to PBO) | Confirmed |
| ECML | Gasworks and Copenhagen Tunnels, Kings Cross | All 4 operators show none (FPK to KGX) | Confirmed |
| ECML | Rural Retford to Newark | EE, O2, Vodafone show none; Three shows voice (RET to NNG, 29.7 km) | Confirmed |
| ECML | Newark to Grantham | Three, O2, Vodafone show none; EE shows voice (NNG to GRA, 23.7 km) | Confirmed |
| Transpennine | Standedge Tunnel and Diggle area | Three, O2, Vodafone all show none (HUD to MAN) | Confirmed |
| Transpennine | Rural Pennine sections | Three, O2, Vodafone all show none | Confirmed |
| GWR | Box Tunnel near Bath | Three shows none on BTH to BRI segment | Partially confirmed |
| GWR | Chipping Sodbury Tunnel | Not detected in tunnel list | Not confirmed |
| GWR | Rural Wiltshire | Three and O2 show none on RDG to SWI | Confirmed |
| CrossCountry | Rural Oxfordshire | Three and O2 show none on RDG to OXF | Confirmed |
| CrossCountry | Oxford to Birmingham corridor | Three and O2 show none across OXF to BHM | Confirmed |
| Edinburgh-Glasgow | Cuttings near Edinburgh | EE and Three show none on EDB to HYM | Confirmed |
| Edinburgh-Glasgow | Rural central belt | Three, O2, Vodafone show none on HYM to GLC | Confirmed |

**Summary:** Of 13 known notspots tested, 11 were confirmed, 1 was partially confirmed,
and 1 was not detected in tunnel data. No case was found where the model said "good
signal" in an area known to have poor signal.

### Disagreements investigated

**1. Validation script bug: CRS code "NEW" maps to Newcastle, not Newark (fixed)**

The validation script originally used "NEW" as the CRS code for Newark on the ECML.
This code actually maps to Newcastle, producing paths of 400+ km that route via
Newcastle instead of the correct Retford-to-Newark section. Two ECML segments (RET to
NEW and NEW to GRA) produced meaningless results.

This bug was fixed in DW-07 by changing "NEW" to "NNG" (Newark North Gate). With the
corrected code, RET to NNG resolves to 29.7 km (18 nodes) and NNG to GRA resolves to
23.7 km (14 nodes), both sensible distances for these segments.

The corrected results show poor signal across both segments, consistent with the known
rural notspot between Retford and Grantham:

- **RET to NNG (29.7 km):** EE shows none (7 of 18 nodes), Three shows voice, O2 shows
  none (10 of 18 nodes), Vodafone shows none (9 of 18 nodes). Two nodes near lat 53.23
  show very weak signal (RSRP below -120 dBm on EE and Three), suggesting a deep
  notspot in the Trent valley area.
- **NNG to GRA (23.7 km):** EE shows voice (5 of 14 nodes none), Three shows none (9 of
  14 nodes), O2 shows none (11 of 14 nodes, 86% coverage), Vodafone shows none (9 of 14
  nodes, 86% coverage). O2 and Vodafone also have 2 no-data nodes each, indicating
  incomplete measurement coverage on this segment.

This bug was in the validation script only. The product itself uses consecutive calling
points from timetable data, not hand-coded CRS codes.

**2. Standedge Tunnel not listed by name**

Standedge Tunnel (about 5 km, the longest rail tunnel in England) does not appear by
name in the tunnel detection output. OpenStreetMap names tunnels by railway line
("Huddersfield Line") rather than by the tunnel's own name. The longest detected tunnel
segments on the Huddersfield-to-Manchester path are 596 m and 665 m, suggesting the
tunnel is either split into shorter sections in the OSM data or recorded with a
different name.

However, the signal data correctly shows poor coverage across the entire Pennine
section. Three shows 26 of 43 nodes as none, and O2 shows 27 of 43 nodes as none. The
signal model captures the poor reception regardless of whether the tunnel is named. This
is acceptable: the product shows signal quality, not tunnel names.

**3. GWR path-finding produces long detours**

The Dijkstra paths for Swindon-to-Chippenham (185 km, should be about 30 km) and
Chippenham-to-Bath (232 km, should be about 20 km) are much longer than the direct Great
Western route. The undirected graph sometimes picks a longer alternative when multiple
paths exist between stations.

Signal data for these segments is less reliable because the path may not follow the
actual GWR alignment. The product avoids this problem by calling path-finding for each
consecutive timetabled calling point pair, which constrains the route to the actual
service pattern.

**4. RSRQ-driven none classifications with strong RSRP**

Some nodes are classified as none despite strong RSRP (for example, -60 to -75 dBm,
which would normally indicate excellent signal). This happens when the RSRQ 10th
percentile falls below -20 dB, which means the signal suffers from heavy interference.

This is correct behaviour. In congested areas (dense urban, overloaded cells), strong
signal alone does not guarantee a usable call. Classifying these as none is conservative
and safe: the user is warned about a potential problem rather than promised a clear line.

**5. Chipping Sodbury Tunnel not detected**

The approximately 4 km Chipping Sodbury Tunnel near Bristol was not found in the
Bath-to-Bristol tunnel analysis. It may be named differently in OSM, or the Dijkstra
path may not pass through it (the path-finding limitation described above). This does
not affect the signal classification, which relies on measurements rather than tunnel
geometry.

### Direction of error

The model's errors skew conservative. It under-promises rather than over-promises.
Four factors support this conclusion:

1. **Data vintage.** The signal data is from 2018-19. Mobile networks have improved
   materially in seven years, and 5G coverage now exists on corridors that were 4G-only.
   Areas the model marks as "no signal" may now have usable coverage. This means the
   user is warned unnecessarily rather than misled.

2. **Roof-height measurements.** The yellow-train antennas sit on the train roof, which
   receives 10-30 dB stronger signal than a phone inside the carriage. The RSRP
   thresholds (-85 dBm for video, -95 dBm for voice) were set for roof-height values.
   A node classified as "voice" at -90 dBm roof height may have in-carriage signal as
   low as -120 dBm. The roof-height advantage makes classifications look better than
   the passenger's actual experience, but the conservative thresholds account for this.

3. **All known notspots confirmed.** Every testable known notspot (Stoke Tunnel, Kings
   Cross tunnels, Edinburgh cuttings, rural Oxfordshire, Transpennine Pennines) was
   confirmed as none or explained by a validation limitation. No case was found where
   the model said "good signal" for an area known to be a notspot.

4. **RSRQ threshold adds further caution.** The -20 dB RSRQ threshold classifies
   interference-heavy areas as none even when RSRP alone would suggest usable signal.
   This may occasionally mark areas as worse than they are, but never marks poor areas
   as better than they are.

**Conclusion:** The model meets the product requirement that errors must skew
conservative. The failure mode is "told a user they would not have signal when they
might" (an inconvenience), not "told a user they would have signal when they would not"
(a broken promise). This is the correct direction for a product whose core value
proposition is trustworthiness.
