# Data Sources

This document records every external dataset used by Train Signal, its licence,
required attribution, and any share-alike obligations.

---

## Station reference data (`data/stations.json`)

### Primary source: UK Railway Stations (davwheat)

| Field | Value |
|---|---|
| URL | https://github.com/davwheat/uk-railway-stations |
| Data | Station names, CRS codes, lat/lon coordinates |
| Licence | Open Data Commons Open Database License v1.0 (ODbL-1.0) |
| Attribution | "Contains data from uk-railway-stations by David Wheatley, licensed under ODbL 1.0" |
| Share-alike | Yes. Any publicly-used derivative database must also be licensed under ODbL or a compatible licence. |
| Upstream source | Derived from Trainline EU's stations dataset. |
| Download date | 2026-08-07 |
| Record count | 2,608 GB passenger stations |

**ODbL obligations:** The ODbL share-alike clause means that if we distribute the
derived `stations.json` as a standalone database, it must carry an ODbL-compatible
licence. Bundling it within the application as a lookup table for the app's own
functionality (rather than republishing the database for reuse) is generally considered
a "produced work" under ODbL Section 4.3, which does not trigger share-alike. We
include attribution regardless.

### Enrichment source: NaPTAN (National Public Transport Access Nodes)

| Field | Value |
|---|---|
| URL | https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv |
| Data | TIPLOC codes for railway stations (extracted from ATCOCode field) |
| Licence | Open Government Licence v3.0 (OGL v3.0) |
| Attribution | "Contains public sector information licensed under the Open Government Licence v3.0" |
| Share-alike | No. OGL v3.0 permits free reuse with attribution. |
| Publisher | Department for Transport |
| Download date | 2026-08-07 |
| Record count | ~2,660 active RLY entries |

---

## Ofcom yellow-train signal measurements (future: `data/signal/`)

| Field | Value |
|---|---|
| URL | https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/data-downloads2 |
| Data | GSM/UMTS/LTE signal measurements from Network Rail engineering trains |
| Licence | Open Government Licence (Ofcom open data) |
| Attribution | "Contains Ofcom data, Crown copyright" |
| Share-alike | No |
| Measurement period | Approximately June 2018 -- June 2019 |
| Notes | Data is at train roof height on actual track. Not yet integrated. |

---

## Network Rail SCHEDULE feed (future)

| Field | Value |
|---|---|
| URL | https://datafeeds.networkrail.co.uk |
| Data | Timetable schedules, 8-week horizon |
| Licence | Open Government Licence v2.0 with Network Rail amendments |
| Attribution | Required; exact wording per NR data terms |
| Share-alike | No |
| Notes | Requires Network Rail Data Feeds credentials (Q2 in QUESTIONS.md). |

---

## OpenStreetMap — track geometry and tunnels

| Field | Value |
|---|---|
| URL | https://www.openstreetmap.org |
| API | Overpass API (https://overpass-api.de/api/interpreter) |
| Data | GB railway ways (`railway=rail`, `railway=light_rail`, excluding sidings/yards) and tunnels (`tunnel=yes`) |
| Licence | Open Data Commons Open Database License v1.0 (ODbL-1.0) |
| Attribution | "(c) OpenStreetMap contributors" -- must appear in the app |
| Share-alike | Yes. Derived databases must be ODbL-licensed. |
| Download date | 2026-08-09 |
| Status | **Integrated (P2-02).** |
| GB bounding box | 49.8,-8.2,60.9,2.2 |
| Record counts | 3,537 tunnels (3,045 named), 21,626 graph nodes, 28,467 graph edges, 2,608 stations snapped |
| Pipeline script | `pipeline/p2-02-extract-osm.js` |

**Derived outputs (committed):**
- `data/tunnels.json` (610 KB) -- tunnel objects with OSM way ID, name, coordinates, length
- `data/track-graph.json` (1.5 MB) -- simplified railway graph (nodes + edges with distances)
- `data/station-nodes.json` (101 KB) -- maps station CRS codes to nearest graph node

**ODbL obligations:** The derived datasets (`tunnels.json`, `track-graph.json`,
`station-nodes.json`) are derived from OpenStreetMap data and are therefore subject
to ODbL share-alike. If distributed as standalone databases, they must carry an
ODbL-compatible licence. Within the application as internal lookup data (a "produced
work" under ODbL Section 4.3), share-alike does not apply to the application itself,
but attribution is still required. Attribution text "(c) OpenStreetMap contributors"
must appear in the app footer (planned for DW-03 when header/footer landmarks land).

---

## RDM NWR Yellow Train Mobile Network Measurements (under evaluation)

| Field | Value |
|---|---|
| URL | https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview |
| Publisher | Network Rail |
| Data | "filtered 2G, 4G and 5G mobile network measurements collected from Yellow Train surveys" |
| Licence | Listed as OPEN in the RDM catalogue; exact terms require sign-in to confirm |
| Attribution | Unknown until licence terms are verified |
| Share-alike | Unknown until licence terms are verified |
| Status | **Not yet integrated. Under evaluation (P2-00).** |

**Current assessment (August 2026):** This product likely contains the same underlying
data as the Ofcom yellow-train download (June 2018 -- June 2019 measurements), possibly
re-hosted or lightly pre-processed by Network Rail. The "5G" in the description is likely
a schema capability rather than actual 5G measurements, since the original programme
predated UK 5G deployment. Full details require sign-in -- see the verification checklist
in `specs/signal-model.md`.

If this product turns out to contain genuinely newer measurements or useful
pre-processing, it may replace or supplement the Ofcom download as the primary signal
data source.

---

## UI attribution requirements

The following attribution text must appear in the application (e.g. in a footer or
"About data" page):

1. "Station data derived from uk-railway-stations by David Wheatley (ODbL 1.0) and NaPTAN (OGL v3.0, Department for Transport)"
2. When signal data is integrated: "Signal measurements from Ofcom open data"
3. "(c) OpenStreetMap contributors" (integrated P2-02; attribution must appear when DW-03 adds footer)
