# Signal Model

## Data source recommendation

**Use the Ofcom yellow-train CSV download as the primary data source.** The RDM "NWR
Yellow Train Mobile Network Measurements" product is worth investigating further (Matt
should check what it actually contains when he logs in), but the evidence available
publicly suggests it is likely a re-hosted or lightly processed version of the same
2018--19 Ofcom dataset rather than a materially newer collection. The Ofcom download is
the known quantity, is well-documented, and can be obtained today without any account
approval delay.

If the RDM product turns out to contain genuinely newer measurements (post-2019), it
becomes the clear winner and the pipeline should target it instead. The verification
checklist is in the final section of this document.

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

## Recommendation rationale

### Why Ofcom download, not RDM (for now)

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

## What Matt needs to verify at sign-in

When Matt logs into the Rail Data Marketplace and views the NWR Yellow Train Mobile
Network Measurements product page, please check and record:

1. **Measurement dates.** What period does the data cover? Is it the same June 2018 --
   June 2019 as the Ofcom download, or does it include newer measurements?

2. **Does it actually contain 5G measurements?** The description says "5G" but the
   original programme predates UK 5G. Is 5G present in the data, or just in the schema?

3. **File format and size.** Is it CSV? Parquet? Something else? How large are the files?
   If significantly smaller than 5.6 GB, that suggests pre-processing or subsetting.

4. **Schema / column list.** What columns are in the files? Specifically:
   - Are RSRP, RSRQ, SNIR/SINR present? (essential for our signal classification)
   - Is MCC/MNC or an operator field present? (essential for per-network results)
   - What coordinate system -- lat/lon or OS eastings/northings?

5. **What does "filtered" mean?** Is there documentation explaining what filtering was
   applied? Noise removal? Geographic subsetting? Rationalisation to 10 m spacing?

6. **Licence terms.** The catalogue says "OPEN" -- what are the exact licence terms?
   Any attribution requirements?

7. **Geographic coverage.** Does it cover the same England/Scotland/Wales extent as the
   Ofcom download?

8. **Can you download a sample file?** Even a small one would let P2-01 inspect the
   schema without downloading everything.

Record the answers in this file or in `specs/data-sources.md`. If the data is newer than
2018--19 and contains the signal metrics we need, update the recommendation above.

---

## Sources

- Ofcom yellow-train data downloads: <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2>
- Ofcom explanatory document (Dec 2019): <https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/infrastructure-research/connected-nations-2019/yellow-trains-data/yellow-trains-release-explanatory-document.pdf>
- RDM product page: <https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>
- russss/datavis worked notebook: <https://github.com/russss/datavis/blob/master/ofcom-rail-signal/Ofcom%20Train%20Mobile%20Signal.ipynb>
- F17 GB Rail mobile coverage blog: <https://www.f17.co.uk/blog/gb-rail-mobile-coverage/>
- Ofcom Connectivity on Trains Measurement Study (Jun 2026): <https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-3-4-weeks/mobile-connectivity-you-can-count-on/mobile-connectivity/connectivity-on-trains-measurement-study.pdf>
- Ofcom spectrum assurance vehicle data (roads, 2020--2025): <https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/mobile-signal-strength-measurement-data>
