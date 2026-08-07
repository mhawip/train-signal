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

## OpenStreetMap / OpenRailwayMap (future)

| Field | Value |
|---|---|
| URL | https://www.openstreetmap.org / https://www.openrailwaymap.org |
| Data | Track geometry, tunnel boundaries |
| Licence | Open Data Commons Open Database License v1.0 (ODbL-1.0) |
| Attribution | "(c) OpenStreetMap contributors" -- must appear in the app |
| Share-alike | Yes. Derived databases must be ODbL-licensed. |
| Notes | Not yet integrated. ODbL share-alike applies to derived databases, not to "produced works" (the app itself). |

---

## UI attribution requirements

The following attribution text must appear in the application (e.g. in a footer or
"About data" page):

1. "Station data derived from uk-railway-stations by David Wheatley (ODbL 1.0) and NaPTAN (OGL v3.0, Department for Transport)"
2. When signal data is integrated: "Signal measurements from Ofcom open data"
3. When map data is integrated: "(c) OpenStreetMap contributors"
