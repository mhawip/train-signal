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

### Q7: Ofcom Connected Nations per-pixel per-operator coverage data

**Status:** open
**Filed:** 2026-08-25
**Filed by:** data-engineer (P5-03)

**Context:** P5-03 integrates Ofcom Connected Nations modelled 4G voice coverage to fill
the 53% of track-graph nodes that have no yellow-train measurements. The pipeline script
is implemented and ready to run.

**Problem:** The publicly downloadable Connected Nations 2025 data
(`202507_mobile_coverage_r01.zip`) contains only aggregated statistics at the
parliamentary constituency and local authority level (e.g. "X% of premises covered by
N operators"). It does **not** contain per-pixel per-operator coverage data.

The pipeline needs a CSV with one row per 100m grid cell per operator, indicating
whether that cell has 4G voice outdoor coverage. This data exists -- it powers the
Ofcom coverage checker and the Connected Nations report -- but is not published as a
bulk download.

**Options:**
1. Register for the **Ofcom Connected Nations API** (contact
   cnapisupport@ofcom.org.uk). The API provides per-postcode per-operator coverage.
   Rate limit: 100 calls/min, 50k/month. We have ~21k track nodes, so querying the
   nearest postcode for each is feasible within the rate limit.
2. Submit an **FOI request** to Ofcom for the underlying 100m grid coverage data.
3. Query the **individual operator coverage checker APIs** (EE, O2, Three, Vodafone)
   for track-adjacent locations.
4. Accept the 53% gap and rely solely on measured data.

**Question for Matt:** Which approach should we take to obtain per-operator coverage
data for the track graph? The Ofcom API (option 1) is the most straightforward but
requires registration. Would you be willing to register and provide API credentials?

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
