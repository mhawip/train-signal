# Competitive Analysis — train-signal.vercel.app

**Date:** 2026-08-06
**Analyst:** product-manager

## What they built

A real-time train signal visualisation tool with two data modes:

1. **Measured mode** — Ookla speedtest tiles (~600 m resolution, crowdsourced, all
   networks combined). Signal bands based on download speed: good (10+ Mbps), ok
   (2-10 Mbps), poor (0.5-2 Mbps), none (<0.5 Mbps).

2. **Modelled mode** — OpenCelliD mast positions combined with OS Terrain 50
   line-of-sight diffraction calculations, calibrated -25 dB against Ofcom drive-test
   data. Bands based on predicted RSRP: good (>-95 dBm), ok (-95 to -105 dBm),
   poor (-105 to -115 dBm), none (<=-115 dBm).

The interface is a dark-themed, map-first layout built with vanilla JavaScript and
Leaflet.js. The left panel shows a colour-coded route on an OpenStreetMap/OpenTopoMap
base. The right panel shows a vertical timeline with signal bands as a colour gradient
alongside calling points and times. There is a live-tracking feature that follows the
train's scheduled position in real time.

The user enters origin and destination by CRS code, picks a date, selects a network
(EE/O2, Vodafone, Three — note EE and O2 appear combined as "EEO2"), and searches for
services. The map then renders a colour-coded route with hoverable detail showing
serving masts and terrain profiles.

There is no "best window" recommendation. No text-equivalent table. No accessibility
statement or WCAG targeting. No formal data provenance disclosure.

**They do not use the Ofcom yellow-train measurement data at all.**

## Routes tested

Testing was performed via WebFetch analysis of the deployed application. Observations
are based on the tool's declared behaviour, data source descriptions, and UI structure
rather than full interactive walkthroughs of specific route results.

### Observations on data and routing

1. **Ookla data is crowdsourced and road/home-biased.** The tool itself acknowledges
   "Speeds are area-typical, not on-train." This is a fundamental limitation: a
   speedtest run by someone in a house next to the railway tells you nothing about what
   happens inside a cutting or when the train is moving at 125 mph. Our yellow-train
   data is measured on the railway, at roof height, at speed.

2. **Modelled mode uses estimated mast positions.** OpenCelliD positions are
   crowdsourced and can be hundreds of metres off. The tool acknowledges this:
   "mast positions are estimates" and "treat as indicative, not per-site accurate."

3. **Tunnel handling is binary but unnamed.** Tunnels force signal to "none" but are
   not individually named. Our brief calls for named tunnels with durations
   ("Standedge Tunnel, 3 minutes, no signal"), which is materially more useful.

4. **Route failures are hard stops.** If the routing engine cannot map a service to
   track geometry, the tool shows "ROUTING FAILED" and refuses to display anything.
   This likely affects minor lines and services with limited mapping data.

5. **Network granularity is limited.** EE and O2 appear combined as "EEO2", which
   obscures real differences between networks — EE's 4G coverage was historically
   denser than O2's in rural areas. Our per-operator approach using MCC/MNC from the
   yellow-train data gives genuinely separate verdicts.

### Key data source differences

| Dimension | Their approach | Our approach |
|---|---|---|
| Signal source | Ookla tiles (crowdsourced, off-track) | Ofcom yellow-train (measured, on-track, at roof height) |
| Mast data | OpenCelliD (crowdsourced positions) | Ofcom measurements + mastdatabase cross-check |
| Network separation | Combined (EEO2) | Per-operator via MCC/MNC |
| Tunnels/cuttings | Separate tunnel dataset overlaid | Captured inherently in measurements |
| Data vintage | Ookla: undisclosed | Ofcom: 2018-19 (stated openly) |
| Confidence language | Minimal, inconsistent | Required at every level by our brief |

## Where they are genuinely better

1. **Live tracking.** Their real-time train position feature — showing where you are
   now on the timeline with delay information — is genuinely useful for someone already
   on a train. Our v1 scope does not include this, and it is out of scope for good
   reason (different use case: planning vs in-journey), but it is worth noting that some
   users will want it.

2. **Two data modes.** Offering both measured and modelled views, with a toggle, lets
   technically-minded users compare. For our audience (someone booking a meeting in
   another tab), this is complexity rather than value, but it shows engineering depth.

3. **Terrain profile visualisation.** The hover-to-see-terrain-and-mast-lines feature
   is technically impressive and educational. It answers "why is signal bad here?" which
   our product deliberately does not attempt to answer (we answer "when is signal bad?").

4. **Potentially more current data.** Their Ookla data may be more recent than our
   2018-19 measurements, though they do not disclose its vintage. However, recency is
   undercut by the off-track, crowdsourced nature of the data — a 2025 speedtest from
   someone's garden 200 metres from the railway is less relevant to on-train signal than
   a 2018 measurement taken on the train.

5. **Map view for spatial thinkers.** Some users genuinely think in geography rather
   than time. A map showing "signal dies in the Pennines" is intuitive for those users.
   Our timeline-first approach is better for the planning use case but sacrifices this
   spatial intuition. This is a deliberate and correct trade-off, not an oversight.

## Accessibility assessment

The competitor has significant accessibility failures at every WCAG level.

### WCAG Level A failures

- **1.1.1 Non-text Content:** The map, signal polylines, and terrain SVG have no
  alternative text. The Leaflet map renders to a div with no fallback content.
- **1.3.1 Info and Relationships:** No semantic HTML structure. Content is divs inside
  divs. No landmark regions (main, nav, aside). Form inputs lack associated label
  elements.
- **2.1.1 Keyboard:** No visible focus indicators. Map is not keyboard-operable.
  Signal detail requires mouse hover.
- **4.1.2 Name, Role, Value:** No ARIA labels or roles on interactive elements.

### WCAG Level AA failures

- **1.4.1 Use of Colour:** Signal bands are distinguished by colour alone (green,
  yellow, orange, red). No patterns, icons, or inline text labels on the map or
  timeline gradient. A colour-blind user cannot distinguish "good" from "poor".
- **1.4.3 Contrast (Minimum):** Secondary text uses opacity values (0.55, 0.6, 0.65)
  that push light text on dark backgrounds below the 4.5:1 minimum. Panel borders
  are approximately 2.5:1.

### WCAG Level AAA failures (what we must beat, not merely match)

- **1.4.6 Contrast (Enhanced):** Even where AA contrast is met, the 7:1 AAA threshold
  is not targeted.
- **1.4.8 Visual Presentation:** Font sizes go as low as 11px with no responsive
  scaling. Line spacing appears to be 1.4, not the 1.5 required.
- **2.5.5 Target Size:** Input elements and controls do not appear to meet the 44x44px
  minimum.
- **3.1.5 Reading Level:** Technical language ("RSRP", "dBm", "diffraction loss")
  throughout. No plain-English alternative.
- **No text-equivalent table.** There is no way to access the signal information
  without the visual timeline and map. A screen reader user gets nothing useful.

### Summary

Their accessibility is not a concern they have addressed. This is not a competitive
weakness to exploit — it is the norm in this space, and our AAA commitment is a genuine
differentiator for users who need it. But it also means there is no accessibility bar
to merely "match"; we must set the standard from scratch.

## Our differentiation

### 1. Data: on-track beats off-track

This is the single strongest argument. Their Ookla data measures what a phone sees
in a house, garden, or car near the railway. Our Ofcom yellow-train data measures what
an antenna sees on the train, at roof height, moving at line speed. Tunnels and
cuttings — the features that actually kill calls — are captured inherently in our data
because the measurement equipment went through them. Their data requires a separate
tunnel overlay that cannot capture cuttings, embankments, or lineside obstructions.

The weakness we must own: our data is 2018-19. Signal infrastructure has improved since
then. Our bands will be conservative (we may say "voice only" where video now works),
and we must say this clearly in the UI. This is the right failure mode — under-promising
is far better than a dropped call — but we cannot pretend the data is current.

### 2. Design: "when" beats "where"

Their product answers "where will I have signal?" with a map. Our product answers
"when can I take a call?" with a clock time. The user's actual question is not
geographic — it is temporal. "Can I do a 3pm call?" does not require knowing that the
signal dies near Berwick-upon-Tweed; it requires knowing that the signal dies at
14:47 and returns at 15:12.

The "Best window: 14:35-15:20" headline is the product. The timeline is supporting
evidence. Their map gives you data; our sentence gives you a decision.

### 3. Accessibility: AAA is a different product

At AAA, we are not building the same product with better compliance. We are building
a product that works for everyone, including the users their product excludes entirely:
screen reader users, keyboard-only users, users with colour vision deficiency, users
who need large text. The text-equivalent table is not a checkbox — it is a first-class
view of the data.

### 4. Honesty: stated confidence beats unstated confidence

They present signal verdicts with no confidence indication and an undisclosed data
vintage. We will state our data vintage, show measurement density, and use hedged
language ("expected", "likely") throughout. This is not a weakness to minimise — it is
a trust signal. A product that says "we are less sure about this stretch" is more
trustworthy than one that presents everything with equal confidence.

## Things to revisit

### Nothing changes the brief

After reviewing the competitor, the brief's core bets are confirmed:

1. **The "when" framing is correct.** Their map-first approach demonstrates the
   alternative, and it serves a different (more exploratory, less task-oriented) use
   case. Our planning-meeting use case is better served by clock times.

2. **Yellow-train data is the right source.** They do not use it. This is surprising
   and represents a genuine data advantage for us, despite the vintage issue.

3. **AAA accessibility is a real differentiator**, not a nice-to-have. Their product
   is unusable for a meaningful population of potential users.

4. **The "best window" concept has no competitor.** They do not attempt it. This
   validates it as a differentiating feature.

### Observations worth recording

- **Live tracking is out of scope and should stay out of scope for v1.** It serves an
  in-journey use case, not a planning use case. If we ever add it, it would be a v2
  feature. Do not let its presence in the competitor create pressure to include it.

- **Their EE/O2 combination is a data quality problem we should highlight.** Our
  per-operator separation via MCC/MNC is a material advantage. The UI should make this
  clear — "Results for EE specifically, not a combined estimate."

- **Their four-band system (good/ok/poor/none) vs our three-band system
  (video+voice/voice-only/none).** Our framing is better because it maps to user
  decisions: "Can I do a video call? Can I do a phone call? Should I not schedule
  anything?" Their "poor" band is ambiguous — poor enough for what? This validates
  our three-band approach.

- **Data vintage disclosure is a feature.** They hide it; we state it. This should be
  prominent in the UI, not buried in a footnote. Something like: "Based on signal
  measurements recorded on this line in [month/year]. Actual signal may be better
  than shown."

### No questions for Matt

Nothing observed changes the product direction or raises issues requiring Matt's input.
The competitor validates our approach rather than challenging it.
