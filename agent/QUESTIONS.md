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

## Resolved (full detail in `agent/QUESTIONS-ARCHIVE.md`)

| ID | Title | Resolved |
|---|---|---|
| Q1 | Rail Data Marketplace API key | 2026-08-08 |
| Q2 | Network Rail SCHEDULE feed credentials | 2026-08-08 |
| Q3 | GitHub repository | 2026-08-05 |
| Q4 | Vercel project | 2026-08-09 |

---

## Q5 — RDM yellow-train product: verify schema at sign-in

**Status:** open
**Filed:** 2026-08-08 (P2-00)
**Blocks:** nothing immediately — P2-01 proceeded with Ofcom data and confirmed it
viable; this only determines whether to retarget the upcoming P2-03 pipeline at RDM
instead

P2-00 evaluated the RDM "NWR Yellow Train Mobile Network Measurements" product from
publicly available information. The conclusion is that the Ofcom download (5.6 GB CSVs)
is the safer choice because the RDM product is almost certainly the same 2018–19
underlying data, just re-hosted or lightly processed by Network Rail. The "5G" in the
description predates UK 5G deployment and likely refers to schema capability, not actual
measurements.

However, this could be wrong, and the cost of checking is low. When you next log into
the Rail Data Marketplace, please view the product page at:
<https://raildata.org.uk/dataProduct/P-8e7dbe99-011d-431e-85ad-06efc77217fc/overview>

and answer the checklist in `specs/signal-model.md` ("What Matt needs to verify at
sign-in"). The key questions are:

1. What dates does the data cover? (If post-2019, it's a game-changer.)
2. Does it actually contain 5G signal measurements?
3. What format and approximate size?
4. Are RSRP/RSRQ/SINR present? Is MCC/MNC or an operator field present?

Record the answers in `specs/signal-model.md`. If the data turns out to be newer or
richer than the Ofcom download, update the recommendation there and file a task to
retarget P2-01 and P2-03 at the RDM product.

**Answer:**
