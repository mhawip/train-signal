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

### Q6 — Download RDM yellow-train CSV to data/raw/

**Asked:** 2026-08-13
**Status:** answered

DW-04 (retarget signal pipeline at RDM product) is blocked until the Rail Data
Marketplace CSV is available locally. The pipeline cannot be updated or re-run without
the actual file, because the RDM column names may differ from the Ofcom schema and
cannot be determined without inspecting the header.

**What is needed:** Log into [Rail Data Marketplace](https://raildata.org.uk), navigate
to the "NWR Yellow Train Mobile Network Measurements" product, and download the CSV to
`data/raw/`. The file should be placed there as-is (the filename will be documented in
the pipeline). The `data/raw/` directory is gitignored so the raw file will not be
committed.

Once downloaded, DW-04 can proceed unattended.

**Answer:**
I have now downloaded the 3 files, 1 for 2G, one for 4G, and one for 5G into the data/raw folder. Please update the question and mark as resolved on the next loop run. 

---

## Resolved (full detail in `agent/QUESTIONS-ARCHIVE.md`)

| ID | Title | Resolved |
|---|---|---|
| Q1 | Rail Data Marketplace API key | 2026-08-08 |
| Q2 | Network Rail SCHEDULE feed credentials | 2026-08-08 |
| Q3 | GitHub repository | 2026-08-05 |
| Q4 | Vercel project | 2026-08-09 |
| Q5 | RDM yellow-train product: verify schema at sign-in | 2026-08-09 |
