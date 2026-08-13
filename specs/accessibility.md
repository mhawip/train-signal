# Accessibility Constraints -- Train Signal

**Status:** Active
**Owner:** Accessibility specialist
**WCAG target:** 2.2 Level AAA, every page, every state, every component
**Date:** 2026-08-05

This document is a design input, not a QA gate. The designer works within these
constraints; the developer implements against them. Nothing ships that violates them
without an explicit, documented escalation.

Where this document says "the designer must" or "the developer must", those are
requirements, not suggestions.

---

## Quick reference

The concrete numbers, for anyone who already knows the shape of the problem and just
needs the value. This is not a substitute for the full document — for a new component,
a new visual treatment, a new interaction pattern, or anything involving colour or the
signal bands, read the relevant full section below. But for a small change that reuses
an existing pattern unchanged (another labelled field, a landmark, a skip link built to
the pattern already specified here), this table plus the automated a11y suite is
normally enough to self-certify against — see `.claude/agents/developer.md`.

| Rule | Value |
|---|---|
| Body text contrast | 7:1 (1.4.6) |
| Large text contrast (≥24px, or ≥18.67px bold) | 4.5:1 (1.4.6) |
| Non-text / UI component contrast | 3:1 against adjacent colours (1.4.11) |
| Focus indicator | 2px, 3:1 against both adjacent colours, visible always (2.4.13) |
| Interactive target size | 44×44 CSS px minimum (2.5.5) |
| Line length | 80 characters max (1.4.8) |
| Line height / paragraph spacing | 1.5× / 1.5× line height (1.4.8) |
| Reading level | Flesch-Kincaid Grade 6–8 (3.1.5) |
| Colour | Never the only cue — pattern + icon + text label on every signal band (1.4.1) |
| Skip link | First focusable element on every page (2.4.1) |
| Landmarks required | `<main>`, `<header>`, `<footer>`, `<form>` (own convention, section 2.2) |
| Autocomplete | Required on personal-data fields; never `off` without a documented security reason (1.3.5) |
| Motion | Everything respects `prefers-reduced-motion`; nothing auto-plays, times out, or moves unprompted (2.2.x, 2.3.x) |
| Status changes (loading, results, errors) | `aria-live`, not focus-stealing (4.1.3) |
| Form errors | Named in text, adjacent to the field and in a summary, input preserved (3.3.1, 3.3.6) |

Automated tooling (axe-core at `wcag2aaa`) catches roughly a third of AAA issues — see
section 8 for exactly what it does and doesn't cover. It is necessary, never sufficient.

---

## Contents

1. [Product surfaces and their risks](#1-product-surfaces-and-their-risks)
2. [Perceivable](#2-perceivable)
3. [Operable](#3-operable)
4. [Understandable](#4-understandable)
5. [Robust](#5-robust)
6. [The timeline problem](#6-the-timeline-problem)
7. [The text-equivalent table](#7-the-text-equivalent-table)
8. [Testing approach](#8-testing-approach)
9. [Accessibility statement](#9-accessibility-statement)
10. [Departure selection page](#10-departure-selection-page)
11. [Progressive-reveal form](#11-progressive-reveal-form)

---

## 1. Product surfaces and their risks

The app has two screens and a small number of states. Every criterion below is evaluated
against all of them.

| Surface | Key states | Highest-risk criteria |
|---|---|---|
| Journey form (Screen 1) | Empty, partially filled, validation errors, submitting | 1.3.5, 2.5.5, 3.3.1--3.3.6, 2.4.6 |
| Results page (Screen 2) | Loading, populated, no-good-window, error | 1.4.1, 1.4.6, 1.4.8, 1.4.11, 1.1.1, 1.3.1 |
| Visual timeline | Populated, greyscale, high contrast, 200%/400% zoom | 1.4.1, 1.4.11, 1.1.1 |
| Text-equivalent table | Populated, 320px, 400% zoom | 1.3.1, 1.4.8 |
| Headline result ("Best window") | Populated, no-good-window | 3.1.5, 1.4.6 |
| Error states | Field errors, server errors, no results | 3.3.1, 3.3.3, 3.3.6 |

---

## 2. Perceivable

### 2.1 -- 1.1.1 Non-text Content (Level A)

Every non-text element must have a text alternative that serves the same purpose.

**For this product:**

- The visual timeline is decorative relative to the text-equivalent table, which carries
  the same information in an accessible structure. The visual timeline must be marked
  with `aria-hidden="true"` so screen readers do not encounter a confusing sequence of
  elements that duplicates the table. The table is the accessible representation.
- Signal band icons (see section 6) must have text alternatives via `aria-label` or
  visually hidden text. The icon alone is not sufficient.
- The legend for signal bands must use text labels, not colour swatches alone.
- Any decorative imagery (if introduced later) must have empty `alt=""`.

### 2.2 -- 1.3.1 Info and Relationships (Level A)

Structure conveyed visually must be conveyed programmatically.

**For this product:**

- **The text-equivalent table** must use `<table>`, `<thead>`, `<tbody>`, `<th>` with
  `scope` attributes, and `<caption>`. The developer must not build it from `<div>`
  elements.
- **Form fields** must use `<label>` elements associated via `for`/`id`. Grouping (e.g.
  the network radio buttons) must use `<fieldset>` and `<legend>`.
- **Headings** must follow a logical hierarchy: one `<h1>` per page, no skipped levels.
- **Landmarks** must be present: `<main>`, `<header>`, `<footer>`, `<nav>` (if
  navigation exists), `<form>`.
- **Validation errors** must be associated with their fields via `aria-describedby` and
  announced via `aria-live="polite"` or by moving focus to an error summary.

### 2.3 -- 1.3.2 Meaningful Sequence (Level A)

The DOM order must match the visual order. The developer must not use CSS to reorder
content in a way that contradicts the source order.

**For this product:** The headline result, then the text-equivalent table, then the
visual timeline. That order in the DOM, regardless of visual layout.

### 2.4 -- 1.3.3 Sensory Characteristics (Level A)

Instructions must not rely solely on shape, colour, size, visual location, or sound.

**For this product:** The form must not use placeholder text as the only label. Error
messages must not say "the field highlighted in red" -- they must name the field.

### 2.5 -- 1.3.4 Orientation (Level AA)

The app must not lock to portrait or landscape.

**For this product:** No orientation restrictions. The timeline and table must reflow in
both orientations.

### 2.6 -- 1.3.5 Identify Input Purpose (Level AA)

Input fields that collect personal data must have `autocomplete` attributes.

**For this product:** The form collects station names, a date, a time, and a network
choice. None of these map to the standard autocomplete tokens (which cover personal
identity data). However, if a future version collects name or email (e.g. for sharing
results), those fields must carry appropriate `autocomplete` values.

The developer must not set `autocomplete="off"` on any field unless there is a
documented security reason.

### 2.7 -- 1.3.6 Identify Purpose (Level AAA)

The purpose of UI components, icons, and regions must be programmatically identifiable.

**For this product:**

- All landmarks must use ARIA landmark roles or native HTML5 elements.
- Icons must have accessible names.
- The form's submit button must have a clear accessible name ("Search for signal" or
  similar, not "Go" or "Submit").

### 2.8 -- 1.4.1 Use of Colour (Level A)

Colour must not be the only visual means of conveying information.

**This is the single highest-risk criterion in the product.** The signal timeline is
inherently a colour-coded chart, and colour-coded charts fail this criterion by default.

**Requirements:**

Every signal band must be distinguishable with colour entirely removed. The designer
must provide **all three** of the following redundant cues for each band:

| Band | Required pattern | Required icon | Required label |
|---|---|---|---|
| Voice and video | Solid fill (no pattern) | Checkmark or strong-signal icon | "Voice and video" |
| Voice only | Diagonal hatching (45 degrees, visible at all zoom levels) | Phone icon | "Voice only" |
| No signal | Dense crosshatch or stipple | Cross/X icon | "No signal" |
| Tunnel | Solid dark fill distinct from "no signal" | Tunnel icon | Tunnel name |

**Verification:** Render the timeline in greyscale (CSS `filter: grayscale(1)` or
equivalent). If any two bands are not immediately distinguishable by pattern and label
alone, the design fails. This is a manual check; axe-core cannot verify it.

The legend must appear on the results page, always visible (not behind a toggle), and
must show pattern + icon + label for each band.

### 2.9 -- 1.4.2 Audio Control (Level A)

Not applicable. The product has no audio.

### 2.10 -- 1.4.3 Contrast (Minimum) (Level AA)

Superseded by 1.4.6 below. All requirements here are stated at the AAA enhanced level.

### 2.11 -- 1.4.4 Resize Text (Level AA)

Text must be resizable to 200% without loss of content or function.

**For this product:** At 200% zoom on a 1280px viewport (640px effective), the form and
results must reflow to a single column. No horizontal scrollbar. The text-equivalent
table must remain scrollable or reflow -- it must not clip.

### 2.12 -- 1.4.5 Images of Text (Level AA)

No images of text. All text must be real text.

**For this product:** The headline result and all labels must be rendered as text, never
as an image or canvas-rendered string.

### 2.13 -- 1.4.6 Contrast (Enhanced) (Level AAA)

Body text must achieve **7:1** contrast ratio against its background. Large text must
achieve **4.5:1**.

**Definition of "large text" for this product:**

- 18pt (24px) or above at normal weight, OR
- 14pt (approximately 18.66px) or above at bold weight (700+)

**Concrete requirements for the designer:**

| Text context | Minimum ratio | What this means |
|---|---|---|
| Body text on page background | 7:1 | If the page background is white (#FFFFFF), the darkest acceptable body text is #595959. If the background is off-white (#F5F5F5), body text must be #4A4A4A or darker. The designer must compute and record the exact values. |
| Large headings (24px+) on page background | 4.5:1 | Lighter greys are permitted. On #FFFFFF, text as light as #767676 passes. But note that the headline result ("Best window: ...") is the most important element on the page -- it should exceed 7:1 even though it qualifies as large text. |
| Body text on signal band backgrounds | 7:1 | Each band's background colour must be chosen so that its label text achieves 7:1 against it. This severely constrains the band palette. |
| Form field text on field backgrounds | 7:1 | Input text and placeholder text (if used) must both pass. Placeholder text at reduced opacity often fails -- the designer must verify the computed colour, not the token. |
| Error message text | 7:1 | Error messages must not rely on a light red that fails contrast. |
| Focus indicators | 3:1 against adjacent colours | Per 2.4.11 (below). The focus ring must contrast against both the element background and the page background. |

**The designer must deliver a contrast matrix** -- every text/background combination in
the design system, with computed ratios, verified with a tool that accounts for alpha
compositing (not just the token values).

### 2.14 -- 1.4.7 Low or No Background Audio (Level AAA)

Not applicable. The product has no audio.

### 2.15 -- 1.4.8 Visual Presentation (Level AAA)

**All of the following are requirements, not preferences.**

| Requirement | What it means for this product |
|---|---|
| Max 80 characters per line | The developer must set `max-width` on text containers. The headline result, table cells, and body text must all observe this. The designer must specify the container width in the type scale. |
| No justified text | `text-align: justify` must never appear in the stylesheet. |
| Line spacing at least 1.5 | `line-height: 1.5` minimum on all body text. |
| Paragraph spacing at least 1.5 times line spacing | If `line-height` is 1.5 (24px on 16px text), `margin-bottom` on paragraphs must be at least 36px. |
| Foreground and background colours user-selectable | The app must not override Windows High Contrast Mode or `forced-colors`. The developer must test in forced-colors mode and ensure all information remains visible. |
| Text resizable to 200% without horizontal scrolling | See 1.4.4 above. |

### 2.16 -- 1.4.9 Images of Text (No Exception) (Level AAA)

No images of text, no exceptions. Supersedes 1.4.5.

### 2.17 -- 1.4.10 Reflow (Level AA)

At 320px CSS width (equivalent to 400% zoom on 1280px), all content must reflow to a
single column with no horizontal scrolling.

**For this product:**

- The form must stack vertically.
- The text-equivalent table may scroll horizontally within its container (tables are
  exempt per the criterion), but the designer must minimise column count. A table with
  columns From, To, Depart, Arrive, Signal, Confidence is the maximum.
- The visual timeline must either reflow or be hidden at extreme zoom levels. If hidden,
  the text-equivalent table must be visible.
- The headline result must wrap naturally.

### 2.18 -- 1.4.11 Non-text Contrast (Level AA)

UI components and graphical objects must have **3:1** contrast against adjacent colours.

**For this product:**

- Form field borders must achieve 3:1 against the page background.
- The signal band boundaries on the visual timeline must achieve 3:1 against adjacent
  bands and against the page background.
- The hatching patterns specified for 1.4.1 must be visible at 3:1 contrast.
- Focus indicators must meet this threshold (and also meet 2.4.11).
- Icons within signal bands must achieve 3:1 against the band background.

### 2.19 -- 1.4.12 Text Spacing (Level AA)

Users must be able to override text spacing without loss of content. Specifically:

- Line height to 1.5 times font size
- Letter spacing to 0.12 times font size
- Word spacing to 0.16 times font size
- Paragraph spacing to 2 times font size

**For this product:** The developer must not set fixed heights on text containers. All
text containers must use `min-height` or no height constraint, so that overridden
spacing does not cause clipping or overlap.

### 2.20 -- 1.4.13 Content on Hover or Focus (Level AA)

Any content that appears on hover or focus must be dismissible (Escape), hoverable (the
user can move to the tooltip without it vanishing), and persistent (it stays until
dismissed or the trigger loses hover/focus).

**For this product:** If tooltips are used on the timeline (e.g. segment details on
hover), they must meet all three requirements. Prefer exposing information inline or in
the table rather than in tooltips.

---

## 3. Operable

### 3.1 -- 2.1.1 Keyboard (Level A)

All functionality must be operable via keyboard alone.

**For this product:**

- All form fields must be reachable and operable via Tab/Shift+Tab and arrow keys.
- The station search combobox must support arrow keys to navigate suggestions, Enter to
  select, and Escape to dismiss.
- The date and time inputs must be keyboard-operable. If custom controls are used
  instead of native `<input type="date">` and `<input type="time">`, they must
  implement the full ARIA combobox or dialog pattern with keyboard support.
- Any interactive element on the results page (e.g. toggling between table and timeline
  views, if such a toggle exists) must be keyboard-operable.

### 3.2 -- 2.1.2 No Keyboard Trap (Level A)

Focus must never become trapped in a component.

**For this product:** The station search combobox is the highest risk. When suggestions
are open, Escape must close them and return focus to the input. Tab must move focus
forward, not cycle within the suggestions.

### 3.3 -- 2.1.3 Keyboard (No Exception) (Level AAA)

All functionality, no exceptions. Supersedes 2.1.1.

**For this product:** Same as 2.1.1. There are no interactions in this product that
would be exempt under 2.1.1 but required under 2.1.3.

### 3.4 -- 2.2.1 Timing Adjustable (Level A)

No time limits on user actions.

**For this product:** No time limits exist. If server-side sessions are introduced
later, they must not expire the form state. This criterion is met by design.

### 3.5 -- 2.2.2 Pause, Stop, Hide (Level A)

Moving, blinking, or scrolling content must be pausable.

**For this product:** No content moves or animates. If a loading spinner is used while
fetching results, it must not flash or blink rapidly. A simple static "Searching..."
message is preferred over animation.

### 3.6 -- 2.2.3 No Timing (Level AAA)

Timing must not be an essential part of any activity.

**For this product:** No timeouts, no auto-submit, no session expiry. The form state
must persist indefinitely. Met by design.

### 3.7 -- 2.2.4 Interruptions (Level AAA)

Interruptions must be postponable or suppressible.

**For this product:** No interruptions exist. No notifications, no alerts, no banners
that appear unsolicited. Met by design.

### 3.8 -- 2.2.5 Re-authenticating (Level AAA)

Not applicable. The product has no authentication.

### 3.9 -- 2.2.6 Timeouts (Level AAA)

Users must be warned of any timeout that could cause data loss.

**For this product:** No timeouts exist. Met by design.

### 3.10 -- 2.3.1 Three Flashes or Below Threshold (Level A)

No content flashes more than three times per second.

**For this product:** No flashing content. Met by design.

### 3.11 -- 2.3.2 Three Flashes (Level AAA)

No content flashes more than three times per second, no exceptions.

**For this product:** Same as above. Met by design.

### 3.12 -- 2.3.3 Animation from Interactions (Level AAA)

Motion animation triggered by interaction must be disableable.

**For this product:** The developer must wrap any transitions or animations in a
`prefers-reduced-motion` media query. With reduced motion preferred, no element may
animate. This includes:

- Page transitions
- Form field focus transitions
- Loading indicators
- Timeline rendering animations (if any)

### 3.13 -- 2.4.1 Bypass Blocks (Level A)

A mechanism to bypass repeated blocks of content.

**For this product:** A skip link ("Skip to main content") must be the first focusable
element on every page. On the results page, a second skip link to the text-equivalent
table is recommended ("Skip to journey details table").

### 3.14 -- 2.4.2 Page Titled (Level A)

Each page must have a descriptive title.

**For this product:**

- Form page: "Train Signal -- Check your journey signal"
- Departure selection page: "Choose a departure: Leeds to London, 14 August 2026 --
  Train Signal" (see section 10.4)
- Results page: "Train Signal -- Leeds to London, 14 July 2026" (dynamic, including
  the journey)
- Error page: "Train Signal -- Something went wrong"

### 3.15 -- 2.4.3 Focus Order (Level A)

Focus order must be logical and match the visual layout.

**For this product:** On the form, focus order is: skip link, then fields in visual
order (origin, destination, network, then the reveal toggle, then date, time if
revealed), then submit button (see section 11.8 for full detail). On the departure
selection page: skip link, then `<h1>` (focused programmatically on load), then each
departure link in order, then navigation links (see section 10.6). On the results
page: skip link, then headline, then table, then timeline (if focusable elements exist
within it), then any navigation.

### 3.16 -- 2.4.4 Link Purpose (In Context) (Level A)

Superseded by 2.4.9 below.

### 3.17 -- 2.4.5 Multiple Ways (Level AA)

More than one way to reach each page.

**For this product:** The app has three screens (form, departure selection, results). The
form is the entry point. The departure selection page is reached via the form. The
results page is reached via the departure selection page and via a direct URL (since
state is encoded in the URL). Each page is reachable by at least two means (form
submission and direct URL). This is sufficient.

### 3.18 -- 2.4.6 Headings and Labels (Level AA)

Headings and labels must be descriptive.

**For this product:**

- Form labels: "From" (or "Origin station"), "To" (or "Destination station"), "Date",
  "Time", "Mobile network". Not "Field 1" or icons alone.
- Table column headers: "From", "To", "Departs", "Arrives", "Signal", "Confidence".
  Not abbreviations.
- Section headings on the results page must describe their content: "Your journey
  signal", "Journey details", not "Results" or "Data".

### 3.19 -- 2.4.7 Focus Visible (Level AA)

Superseded by 2.4.13 below.

### 3.20 -- 2.4.8 Location (Level AAA)

The user must always know where they are within the site.

**For this product:** With three screens (form, departure selection, results) this is
moderate-risk. The requirements are:

- The current page must be identifiable from the page title and heading.
- The departure selection page must clearly communicate that it is an intermediate step,
  not the results page (see section 10.4 and 10.5).
- If the results page includes a "Search again" or "New journey" link, the user must
  understand they will return to the form.
- Breadcrumbs are unnecessary given the simple linear flow, but the heading hierarchy
  must orient the user.

### 3.21 -- 2.4.9 Link Purpose (Link Only) (Level AAA)

Link text must make sense read out of context.

**For this product:**

- "Search again" or "Plan a new journey", never "Click here" or "Go back".
- Attribution links: "Ofcom mobile signal data", not "Source" or "Link".
- Any future external links must describe their destination.

### 3.22 -- 2.4.10 Section Headings (Level AAA)

Content must be organised with section headings.

**For this product:** The results page must have at least:

- `<h1>` -- the page title (e.g. "Leeds to London signal")
- `<h2>` -- "Best window" or the headline result
- `<h2>` -- "Journey details" (the table)
- `<h2>` -- "Journey timeline" (the visual, if visible)

### 3.23 -- 2.4.11 Focus Not Obscured (Minimum) (Level AA) and 2.4.12 (Enhanced, AAA)

The focused element must not be fully obscured by other content.

**For this product:** No sticky headers, no overlays, no floating elements that could
cover a focused input. If a sticky header is introduced, the developer must ensure
focused elements scroll into view clear of it.

### 3.24 -- 2.4.13 Focus Appearance (Level AAA)

The focus indicator must:

- Have an area of at least the 2px perimeter of the component
- Have at least 3:1 contrast between focused and unfocused states
- Have at least 3:1 contrast against adjacent colours

**For this product:** The designer must define a focus ring style that meets these
requirements and apply it globally. A 2px solid outline offset by 2px, in a colour that
achieves 3:1 against both the element background and the page background, is the
recommended approach. The exact colour must be computed and recorded in the design
system.

### 3.25 -- 2.5.1 Pointer Gestures (Level A)

No functionality requires multipoint or path-based gestures.

**For this product:** Met by design. No pinch, swipe, or drag interactions.

### 3.26 -- 2.5.2 Pointer Cancellation (Level A)

Actions fire on up-event, not down-event.

**For this product:** Use native `<button>` and `<a>` elements, which handle this
natively. The developer must not bind `mousedown` or `touchstart` for activation.

### 3.27 -- 2.5.3 Label in Name (Level A)

The accessible name of a component must contain its visible label text.

**For this product:** If a button shows "Search", its accessible name must contain
"Search". It may be "Search for signal" but not "Submit query".

### 3.28 -- 2.5.4 Motion Actuation (Level A)

Not applicable. No motion-triggered actions.

### 3.29 -- 2.5.5 Target Size (Enhanced) (Level AAA)

Every interactive target must be at least **44 by 44 CSS pixels**.

**For this product:**

- All form inputs: the clickable/tappable area must be at least 44px tall.
- Radio buttons for network selection: the label must extend the tap target to 44x44.
  A bare `<input type="radio">` is typically 16x16 and will fail.
- The submit button: at least 44px tall.
- Any links on the results page: at least 44px tap target. Inline text links must have
  sufficient padding or line height to meet the target.
- The station search combobox suggestion items: each must be at least 44px tall.

The developer must verify computed target sizes, not just the element dimensions --
padding contributes but `overflow: hidden` on a parent can clip it.

### 3.30 -- 2.5.7 Dragging Movements (Level AA)

Not applicable. No drag interactions.

### 3.31 -- 2.5.8 Target Size (Minimum) (Level AA)

Superseded by 2.5.5 above.

---

## 4. Understandable

### 4.1 -- 3.1.1 Language of Page (Level A)

The `<html>` element must have `lang="en-GB"`.

### 4.2 -- 3.1.2 Language of Parts (Level AA)

Any content in a different language must be marked. Not applicable for v1 (English
only), but station names from Welsh-language stations (e.g. "Caerdydd Canolog") should
have `lang="cy"` if rendered in Welsh.

### 4.3 -- 3.1.3 Unusual Words (Level AAA)

Jargon or technical terms must be defined.

**For this product:** The product must avoid jargon entirely. If a term cannot be
avoided, it must be defined inline or via a glossary. Specific prohibitions:

- "RSRP", "RSRQ", "SNIR" -- never shown to users
- "CRS code" -- say "station code" if mentioned at all
- "Calling point" -- say "stop" or "station"
- "Throughput" -- say "signal strength" or just "signal"

### 4.4 -- 3.1.4 Abbreviations (Level AAA)

Abbreviations must be expanded on first use or via a mechanism.

**For this product:** Network names EE, O2 are brand names, not abbreviations, and need
no expansion. "WCAG" must not appear in user-facing content. If "BST" appears (in
time displays), expand it to "British Summer Time" on first use.

### 4.5 -- 3.1.5 Reading Level (Level AAA)

Content must be understandable at **lower-secondary reading level** (approximately
Flesch-Kincaid Grade Level 6--8, or Flesch Reading Ease 60--70+).

**For this product:**

- All user-facing strings must be reviewed against this criterion.
- The headline result is the most critical: "Best window: 14:35 to 15:20. 45 minutes
  of good signal between York and Doncaster. Good enough for a video call." -- this
  style is the target.
- Error messages: "We could not find a train for that journey. Check the station names
  and try again." Not "No services matched the supplied origin/destination pair."
- The "no good window" case: "This journey does not have a long stretch of good signal.
  You may lose the call between stops." Not "Insufficient contiguous coverage to
  recommend a booking window."
- The confidence disclaimer: "This is based on signal measurements from 2018 and 2019.
  Signal may have improved since then." Not "Data vintage: Q2 2018--Q2 2019;
  measurements may not reflect current network topology."

**Testing:** Run all user-facing copy through a readability checker (Flesch-Kincaid,
Gunning Fog, or equivalent). Any string above Grade 8 must be rewritten. This is a
manual review; axe-core does not check reading level.

### 4.6 -- 3.1.6 Pronunciation (Level AAA)

A mechanism to identify pronunciation of ambiguous words.

**For this product:** Station names may be ambiguous (e.g. "Slough", "Loughborough",
"Bicester"). This criterion does not require phonetic guides for proper nouns; it
applies to words whose meaning changes with pronunciation. No action required unless
the product introduces ambiguous common words.

### 4.7 -- 3.2.1 On Focus (Level A)

Receiving focus must not trigger a change of context.

**For this product:** Focusing a form field must not submit the form, navigate away, or
open a new panel. The station search may show suggestions on focus, but this is content
within the same context, not a context change.

### 4.8 -- 3.2.2 On Input (Level A)

Changing a form input must not trigger a change of context unless the user is warned
beforehand.

**For this product:** Selecting a network radio button must not submit the form or
navigate. The form must have an explicit submit action.

### 4.9 -- 3.2.3 Consistent Navigation (Level AA)

Navigation mechanisms must appear in the same order across pages.

**For this product:** The header (if any), skip link, and footer must be identical on
both screens.

### 4.10 -- 3.2.4 Consistent Identification (Level AA)

Components with the same function must be identified consistently.

**For this product:** If "Search" is the button label on the form, the "Search again"
link on results must use the same verb.

### 4.11 -- 3.2.5 Change on Request (Level AAA)

Changes of context must only occur on user request.

**For this product:**

- No auto-refresh of results.
- No auto-submit of the form when the last field is completed.
- No auto-navigation after submission -- the results page may load as a new page or
  replace content, but only in direct response to the user pressing the submit button.
- No timed redirects.

### 4.12 -- 3.3.1 Error Identification (Level A)

Errors must be identified and described in text.

**For this product:**

- If a required field is empty on submit, the error must name the field: "Enter a
  destination station."
- If a date is out of range, the error must state the valid range: "Choose a date
  within the next 8 weeks."
- Errors must appear adjacent to the field AND in an error summary at the top of the
  form, with links to each errored field.

### 4.13 -- 3.3.2 Labels or Instructions (Level A)

Form fields must have labels. If special formatting is required, it must be stated.

**For this product:** Each field has a visible `<label>`. The date field must state the
expected format or use a native date picker that removes ambiguity. The station search
must hint that the user can type a station name.

### 4.14 -- 3.3.3 Error Suggestion (Level AA)

If an error is detected and a correction is known, it must be suggested.

**For this product:** If the user types a station name that is close to a known station,
suggest it: "Did you mean 'King's Cross'?" If the date is in the past, suggest today's
date.

### 4.15 -- 3.3.4 Error Prevention (Legal, Financial, Test) (Level AA)

Superseded by 3.3.6 below.

### 4.16 -- 3.3.6 Error Prevention (All) (Level AAA)

For any form submission, at least one of: reversible, checked, or confirmed.

**For this product:**

- The journey search is inherently reversible -- the user can change inputs and search
  again at no cost. This satisfies the criterion.
- The form must not clear itself on submission. If the user navigates back, their
  inputs must be preserved.
- The URL must encode the search parameters so the results page is bookmarkable and
  the back button works.

### 4.17 -- 3.3.7 Redundant Entry (Level A)

The user must not be asked to enter the same information twice.

**For this product:** If the user searches again, the form must be pre-populated with
their previous inputs.

---

## 5. Robust

### 5.1 -- 4.1.2 Name, Role, Value (Level A)

All UI components must have an accessible name, role, and value exposed to assistive
technology.

**For this product:**

- Custom combobox for station search: must implement `role="combobox"`,
  `aria-expanded`, `aria-activedescendant`, `aria-controls`, and `aria-autocomplete`.
- Radio buttons: native `<input type="radio">` within a `<fieldset>`.
- Submit button: native `<button type="submit">`.
- The developer must not use `<div>` or `<span>` with click handlers as interactive
  elements.

### 5.2 -- 4.1.3 Status Messages (Level AA)

Status messages must be announced to screen readers without receiving focus.

**For this product:**

- "Searching..." while results load: use `aria-live="polite"` on a status region.
- "Found 3 services" or result count: announced via live region.
- Error messages that appear without a page reload: announced via `aria-live="assertive"`
  or by moving focus to the error summary.
- The headline result when it appears must be announced. If results load via client-side
  navigation, the developer must ensure the new content is announced -- either by moving
  focus to the heading or by using a live region.

---

## 6. The timeline problem

A visual timeline of signal bands -- coloured segments along a journey line -- cannot be
made AAA-accessible on its own. The fundamental issue is 1.4.1: colour is inherently
the primary channel, and making three bands distinguishable without colour while keeping
the visualisation useful is a genuine design challenge, not a checkbox exercise.

### 6.1 The accessible representation comes first

The **text-equivalent table** (section 7) is the primary accessible representation. It
is built first (P1-05 in the backlog). The visual timeline is a progressive enhancement
over it (P1-06).

The visual timeline is marked `aria-hidden="true"`. Screen readers interact with the
table. Sighted users have both.

### 6.2 Making the visual timeline work without colour

Even though the timeline is aria-hidden, sighted users with colour vision deficiency
rely on it. It must be distinguishable without hue. The designer must implement all of
the following:

**Patterns:**

- Voice and video: solid fill, no overlay pattern. This is the "best" band and should
  be visually clean.
- Voice only: diagonal line hatching at 45 degrees, with lines at least 2px wide and
  spaced at least 6px apart (to remain visible at reduced sizes and not create a moire
  effect).
- No signal: dense crosshatch (perpendicular lines) or stipple/dot pattern, visually
  heavier than the voice-only hatching.
- Tunnel: solid very dark fill, visually distinct from the crosshatch of "no signal".

**Icons:**

Each band must carry a small icon at its start or at regular intervals within it:

- Voice and video: a checkmark or a strong-signal indicator
- Voice only: a phone handset
- No signal: an X or a broken-signal indicator
- Tunnel: a tunnel entrance icon

Icons must be at least 16x16px and achieve 3:1 contrast against the band background
(per 1.4.11).

**Inline labels:**

For bands longer than approximately 60px, the band name must be rendered as inline text
within the band. For shorter bands, the legend must be sufficient.

**Legend:**

The legend is always visible on the results page. It shows all four band types with
their pattern, icon, and text label.

### 6.3 Colour choices (constrained by contrast)

The band colours must meet these constraints simultaneously:

1. **Adjacent bands** must have at least 3:1 contrast against each other (1.4.11).
2. **Label text** within each band must achieve 7:1 against the band background (1.4.6).
3. **Icons** within each band must achieve 3:1 against the band background (1.4.11).
4. **Each band** must contrast at least 3:1 against the page background (1.4.11).

The designer must deliver the exact hex values, with computed ratios, for each
combination. Approximate guidance (the designer must verify and may adjust):

| Band | Suggested background range | Text colour | Notes |
|---|---|---|---|
| Voice and video | Light green/teal, e.g. #D4EDDA to #C3E6CB | #1A1A1A (black) | Must not rely on green alone -- pattern (solid) distinguishes it |
| Voice only | Light amber/gold, e.g. #FFF3CD to #FFE69C | #1A1A1A (black) | Hatching pattern is the primary distinguisher |
| No signal | Light grey/pink, e.g. #E2E3E5 to #D6D8DB | #1A1A1A (black) | Crosshatch is the primary distinguisher |
| Tunnel | Dark grey, e.g. #343A40 to #495057 | #FFFFFF (white) | Solid dark, distinct from crosshatch |

These are starting points. The designer must verify every combination and adjust to
meet all four constraints listed above.

### 6.4 Forced colours and high contrast mode

In Windows High Contrast Mode (`forced-colors: active`), the timeline patterns may
not render correctly because background images are suppressed. The developer must test
in forced-colours mode and ensure:

- Band boundaries are visible via borders.
- Labels are visible.
- The text-equivalent table (which uses standard text and table elements) remains fully
  usable.

---

## 7. The text-equivalent table

This is not a fallback. It is a first-class feature, visible by default, carrying the
same information as the visual timeline.

### 7.1 Structure

The table must use semantic HTML:

```html
<table>
  <caption>Journey details: Leeds to London, 14 July 2026</caption>
  <thead>
    <tr>
      <th scope="col">From</th>
      <th scope="col">To</th>
      <th scope="col">Departs</th>
      <th scope="col">Arrives</th>
      <th scope="col">Expected signal</th>
      <th scope="col">Confidence</th>
    </tr>
  </thead>
  <tbody>
    <!-- one row per journey segment -->
  </tbody>
</table>
```

### 7.2 Content per row

Each row represents a segment between two calling points (or a tunnel within a segment).

| Column | Content | Constraints |
|---|---|---|
| From | Station name | Plain text, no abbreviations |
| To | Station name | Plain text, no abbreviations |
| Departs | Clock time, 24-hour | e.g. "14:12" |
| Arrives | Clock time, 24-hour | e.g. "14:47" |
| Expected signal | One of: "Voice and video", "Voice only", "No signal", "Tunnel: [name]" | Plain English, matching the legend. Not colour-coded without text. |
| Confidence | "High", "Medium", "Low", or "No data" | Based on measurement density |

### 7.3 Visibility

The table is **always visible** on the results page. It is not behind a toggle, a tab,
an accordion, or a "show accessible version" link. The designer may position it below or
beside the visual timeline, but it must be visible without user action.

If screen space is constrained (mobile, high zoom), the table takes priority over the
visual timeline. The developer may hide the visual timeline at narrow widths but must
never hide the table.

### 7.4 Responsive behaviour

At 320px effective width, the table may gain horizontal scroll within its container
(per the reflow exemption for data tables). The developer must ensure:

- The scrollable region is indicated (e.g. shadow or fade at the edges).
- The scrollable region is keyboard-operable (it must be focusable with `tabindex="0"`
  and `role="region"` with an `aria-label`).
- The scroll position does not reset unexpectedly.

---

## 8. Testing approach

Automated tooling catches approximately one-third of WCAG AAA issues. The following
table lists every applicable criterion with how it is tested. "Axe" means axe-core can
check it. "Manual" means a human must verify it. Many criteria require both.

### 8.1 What axe-core can check

axe-core, configured with `{ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa',
'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }` plus the `best-practice` tag,
can reliably detect violations of:

| Criterion | What axe checks | What axe misses |
|---|---|---|
| 1.1.1 Non-text Content | Missing `alt`, missing `aria-label` | Whether the alt text is actually meaningful |
| 1.3.1 Info and Relationships | Missing labels, broken `for`/`id` associations, tables without headers | Whether the heading hierarchy is logical, whether `scope` is correct |
| 1.3.5 Identify Input Purpose | Missing `autocomplete` on personal-data fields | Whether the autocomplete value is correct |
| 1.4.3/1.4.6 Contrast | Contrast ratios on text over solid backgrounds | Text over gradients, text over images, text over patterned backgrounds, alpha-composited colours |
| 1.4.11 Non-text Contrast | Some component contrast | Graphical object contrast in SVG or canvas |
| 2.4.1 Bypass Blocks | Missing skip links | Whether skip links actually work |
| 2.4.2 Page Titled | Missing `<title>` | Whether the title is descriptive |
| 2.5.5 Target Size | Can flag small targets in some cases | Reliably measuring computed target size with padding |
| 4.1.2 Name, Role, Value | Missing names on interactive elements | Whether ARIA patterns are correctly implemented |
| 4.1.3 Status Messages | Some missing live regions | Whether live regions fire at the right time |

### 8.2 What axe-core cannot check

These must be verified manually. The accessibility specialist must perform these checks
at each review milestone.

| Criterion | Manual check required |
|---|---|
| 1.4.1 Use of Colour | Render in greyscale. Confirm every band is distinguishable by pattern and label alone. |
| 1.4.8 Visual Presentation | Measure line length (80ch max), line spacing (1.5), paragraph spacing. Verify in forced-colours mode. |
| 1.4.12 Text Spacing | Apply the WCAG text spacing bookmarklet. Verify no clipping or overlap. |
| 2.1.1/2.1.3 Keyboard | Navigate the entire app using only keyboard. Verify every function is reachable. Verify focus order matches visual order. Verify no keyboard traps. |
| 2.4.7/2.4.13 Focus Appearance | Tab through every element. Verify focus indicators are visible and meet the enhanced appearance requirements. |
| 2.4.8 Location | Confirm the user can always identify which screen they are on. |
| 2.4.9 Link Purpose | Read every link text out of context. Does it make sense? |
| 2.5.5 Target Size | Measure computed size of every interactive element. Must be 44x44 CSS px. |
| 3.1.3 Unusual Words | Read all copy. Flag jargon. |
| 3.1.5 Reading Level | Run all user-facing copy through a readability checker. Target: Flesch-Kincaid Grade 6-8. |
| 3.2.5 Change on Request | Confirm nothing changes without user action. |
| 3.3.6 Error Prevention | Submit the form with errors. Confirm inputs are preserved. Confirm the action is reversible. |
| Screen reader testing | Navigate the entire app with NVDA or VoiceOver. Verify headings, landmarks, table structure, live regions, form labels, and the experience of the results page. |
| Zoom testing | Test at 200% and 400% on 1280px viewport. Verify no horizontal scroll (except data tables). Verify no clipped content. |
| Reduced motion | Enable `prefers-reduced-motion: reduce`. Verify no animations. |
| Forced colours | Enable Windows High Contrast Mode. Verify all information is visible. |

### 8.3 CI integration

The following must run on every pull request via GitHub Actions:

1. **axe-core via Playwright** on every page and every meaningful state:
   - Form: empty, filled, with validation errors, **collapsed (date/time hidden),
     expanded (date/time visible)**
   - **Departure selection: populated (1--5 results), single result, zero results, error**
   - Results: loading, populated, no-good-window, error
   - The axe ruleset must include `wcag2aaa` tags
2. **Lighthouse accessibility audit** with a minimum score of 100 (acknowledging this
   does not guarantee AAA compliance)
3. **HTML validation** to catch structural issues that affect assistive technology

### 8.4 Review milestones

The accessibility specialist must perform a full manual review at:

- P1-07: after the journey form and timeline table are built, before signal data lands
- **DW-13: after departure selection page and progressive-reveal form are built**
- P3-03: full manual audit of the complete product
- Any PR that changes user-facing HTML, CSS, or strings

### 8.5 Honest limits

- Automated tools cannot verify reading level, colour-independence, keyboard usability,
  or screen reader experience. These are the criteria most likely to fail in practice.
- axe-core's contrast checks fail on alpha-composited colours and on text over patterns.
  The timeline band labels will likely need manual contrast verification.
- No automated tool can verify that the text-equivalent table is genuinely equivalent to
  the visual timeline. A human must compare them.
- Focus appearance (2.4.13) is new in WCAG 2.2 and poorly supported by automated tools.
  It must be verified visually.

---

## 9. Accessibility statement

Before launch, the product must include an accessibility statement page, linked from
the footer. It must state:

- The target conformance level (WCAG 2.2 AAA)
- Any known non-conformances, with the specific criterion, description, and planned
  remediation
- The date of the last manual audit
- How to report accessibility issues
- The data vintage disclaimer (since stale signal data is not an accessibility issue
  per se, but transparent communication about data limitations supports understanding)

---

## 10. Departure selection page

This section covers the intermediate page that sits between the journey search form and
the results page. The user submits the form and lands here, sees up to 5 trains near
their requested time, picks one, and proceeds to results.

### 10.1 Surface entry in the product

Add to the Surface table in section 1:

| Surface | Key states | Highest-risk criteria |
|---|---|---|
| Departure selection (Screen 1b) | Populated (1--5 results), single result, zero results, loading, error | 3.2.2, 3.3.6, 2.4.9, 2.4.8, 2.5.5 |

### 10.2 Interaction semantics: links, not a radio group

The departure list must be rendered as **a list of links** (`<a>` elements inside an
`<ol>`), not as a radio group with a submit button.

**Reasoning:**

1. **3.3.6 (Error Prevention):** The journey search is inherently reversible -- the user
   can press Back and search again at no cost. Selecting a departure and loading results
   is equally reversible -- the user can press Back to return to this list. A radio
   group + submit adds a confirmation step that provides no meaningful error prevention
   because there is no destructive or irreversible action. The extra step adds friction
   without adding safety.
2. **3.2.2 (On Input):** A link activates on explicit user action (click or Enter), not
   on selection. There is no change-of-context "on input" because the user must
   deliberately activate the link. A radio group could tempt an implementation that
   navigates on selection (which would violate 3.2.2), though a properly implemented
   radio + submit avoids this. Links are the simpler, harder-to-get-wrong pattern.
3. **Simplicity:** Links are the native web pattern for "choose one of these pages to go
   to". They work without JavaScript. They are understood by every screen reader. They
   produce focusable, activatable elements with no ARIA needed.

**Constraints on the links:**

- Each link must have a **44 x 44 CSS px minimum tap target** (2.5.5). This means the
  entire row/card containing the departure information must be the link's clickable
  area, not just the departure time text.
- Each link's **text must be self-descriptive when read alone** (2.4.9). The link text
  must include the departure time, the arrival time, and the origin/destination. Example
  accessible name: "14:35 to London King's Cross, arriving 17:12". The link text must
  not be "Select" or "View signal" alone.
- If additional information is presented visually within the link (such as journey
  duration), it must either be part of the link text or be marked `aria-hidden="true"`
  if it is redundant with information already in the link text.
- Links must point to the results page URL with all journey parameters encoded. Each
  link is a standard `<a href="/results?from=...&to=...&date=...&time=...&network=...">`.
  No JavaScript is required for navigation.

### 10.3 Focus management on page load

On page load, focus must move to the **`<h1>` element** (set with `tabindex="-1"`).

**Reasoning:**

- The departure selection page is a server-rendered page transition in direct response
  to the user pressing the submit button. Moving focus to the `<h1>` on a new page load
  is the standard accessible pattern -- it orients the user and announces the page
  context via screen reader.
- Moving focus to the first list item would skip the page heading and any contextual
  information (the recap of origin, destination, date). The user would not know where
  they are (violates 2.4.8).
- Leaving focus on the skip link (the browser default) is acceptable for simple page
  loads, but this is an intermediate step in a flow. The user has just submitted a form
  and needs immediate confirmation that something happened. The `<h1>` provides that.
- This is not "stealing focus" in the 3.2.5 sense -- the user explicitly requested a
  page transition by submitting the form. Focus management on a new page load in
  response to user action is permitted and expected.

**Implementation:** The `<h1>` element must have `tabindex="-1"` so it can receive
programmatic focus. It must not appear in the natural tab order. On server-rendered page
load, a small inline script (or the framework's page-transition focus management) must
call `.focus()` on the `<h1>`. The `<h1>` must not have an outline/focus-ring style when
focused via `tabindex="-1"` -- use `:focus:not(:focus-visible)` to suppress the visual
ring while retaining screen reader announcement.

### 10.4 Page title

The `<title>` must follow the pattern:

```
Choose a departure: [Origin] to [Destination], [Date] — Train Signal
```

Example: `Choose a departure: Leeds to London, 14 August 2026 — Train Signal`

**Reasoning:**

- **2.4.2 (Page Titled):** The title must describe the page purpose.
- **2.4.8 (Location):** The user must know this is an intermediate step, not the results
  page. "Choose a departure" makes clear that an action is required.
- The origin, destination, and date confirm the user's search was understood.
- The site name at the end follows the existing convention (see section 3.14).

### 10.5 Screen reader announcement strategy

**Heading structure:**

- `<h1>`: "Choose a departure" -- immediately tells the user this is a selection step.
- Contextual text (not a heading): "Trains from [Origin] to [Destination] on [Date],
  near [Time]." -- provides the recap.
- The departure list needs no `<h2>` because the `<h1>` already introduces it and the
  page has a single purpose. If a "no trains found" or error message appears, it
  replaces the list content, not the heading.

**Live regions:** None needed on page load. This is a full server-rendered page, not a
client-side state change. The screen reader will announce the `<h1>` when focus lands on
it. Do not add `aria-live` to the departure list -- it is static content rendered
server-side.

If this page is ever converted to client-side rendering (which it should not be), then
the heading area would need `aria-live="polite"` to announce the new content. But the
current architecture (server-rendered page) makes this unnecessary.

**Result count:** The contextual text after the `<h1>` should include the count:
"5 trains from Leeds to London on 14 August, near 10:00." This gives the screen reader
user an immediate sense of scope before they encounter the list.

### 10.6 Keyboard interaction

- **Tab** moves through the page in document order: skip link, `<h1>` (if focused
  programmatically on load, it is then skipped by Tab since `tabindex="-1"`), then each
  departure link in sequence, then the "Back to search" navigation link.
- **Enter** on a focused departure link navigates to the results page. Standard link
  behaviour.
- **Arrow keys** do not have special behaviour. This is a list of links, not a radio
  group or menu. Users navigate between links with Tab/Shift+Tab. Implementing
  `role="listbox"` or arrow-key navigation would be non-standard for a list of page
  links and would confuse users who expect Tab navigation.
- **Space** on a focused link should also activate it (browsers do this natively for
  `<a>` elements).
- The list must be an `<ol>` (ordered list), not `<ul>`, because the departures are in
  chronological order and the ordinal position carries meaning (the first train before
  the requested time, then trains after).

### 10.7 Edge cases

**Zero results (no trains found):**

- The `<h1>` remains "Choose a departure".
- The page body shows a clear message: "We could not find any trains from [Origin] to
  [Destination] on [Date] near [Time]. Try a different date or time."
- A "Back to search" link (meeting 2.4.9) is prominent, with a 44 x 44 px tap target.
- The message must meet Grade 6--8 reading level (3.1.5). No jargon ("No services
  matched the query").
- Focus on page load still goes to `<h1>`.

**Single result (one train found):**

- The page must still show the departure selection page with the single option. Do not
  auto-redirect to results -- that would be an unexpected change of context (3.2.5) and
  the user would not know which train was selected.
- The contextual text says "1 train from [Origin] to [Destination] on [Date] near
  [Time]."
- The single departure is still rendered as a link inside an `<ol>` with one `<li>`.

**Error (server/API failure):**

- Show an error message in the page body. Follow the existing error page pattern from
  section 3.14: descriptive heading, plain English explanation, "Back to search" link.
- Do not use a toast, modal, or auto-dismissing notification.

---

## 11. Progressive-reveal form

This section covers the redesigned journey search form. Origin, destination, and network
are always visible. Date and time fields are hidden behind a user-triggered control and
revealed on demand.

### 11.1 Surface entry update

Update the Surface table row for "Journey form (Screen 1)":

| Surface | Key states | Highest-risk criteria |
|---|---|---|
| Journey form (Screen 1) | Empty, partially filled, validation errors, submitting, **collapsed (date/time hidden), expanded (date/time visible)** | 1.3.5, 2.5.5, 3.3.1--3.3.6, 2.4.6, **2.1.1, 4.1.3** |

### 11.2 Technique for hiding/showing fields

Use a **`<button>` with `aria-expanded` and `aria-controls`**, combined with the
`hidden` attribute on the controlled field group.

**Specification:**

```html
<button
  type="button"
  aria-expanded="false"
  aria-controls="datetime-fields"
>
  Add a departure time
</button>

<div id="datetime-fields" hidden>
  <!-- date and time fields go here, inside a <fieldset> -->
</div>
```

When the user activates the button:
- Toggle `aria-expanded` between `"false"` and `"true"`.
- Toggle the `hidden` attribute on `#datetime-fields`.
- Move focus to the first field inside the revealed group (the date input).

When the user collapses the fields:
- Set `aria-expanded="false"`.
- Add `hidden` to `#datetime-fields`.
- Return focus to the toggle button.
- Clear any validation errors on the date and time fields.

**Why this technique:**

- **2.1.1 (Keyboard):** The `hidden` attribute removes elements from the tab order and
  from the accessibility tree. When the fields are hidden, they are unreachable by
  keyboard. When revealed, they enter the tab order at their DOM position. No extra
  work is needed.
- **3.3.2 (Labels or Instructions):** The button label clearly states what will happen.
  The fields, when revealed, retain their existing `<label>` elements and `<fieldset>`/
  `<legend>` grouping.
- **4.1.2 (Name, Role, Value):** `aria-expanded` communicates the toggle state to
  assistive technology. `aria-controls` identifies the controlled region. These are
  well-supported ARIA attributes.
- The `hidden` attribute is preferred over `display: none` in CSS because it is a
  semantic HTML attribute that clearly communicates intent and is not overridable by a
  CSS class change without also changing the attribute. The `inert` attribute would also
  work but has slightly less browser support and is unnecessary here -- `hidden` is
  sufficient because the fields do not need to remain visible-but-inert.

**Do not use:**

- `visibility: hidden` -- leaves the element in the layout, taking up space.
- `inert` alone without `hidden` -- the fields would remain visually present but
  non-interactive, which is confusing.
- A `<details>`/`<summary>` element -- styling is inconsistent across browsers and the
  pattern does not easily support moving focus into the revealed content.

### 11.3 Trigger labelling

**Visible text and accessible name:** "Add a departure time"

**Element type:** `<button type="button">`

**Reasoning:**

- **2.4.6 (Headings and Labels):** The label is descriptive. It tells the user what will
  happen: date and time fields will appear. It does not say "More options" (vague),
  "Advanced" (jargon), or "Show all fields" (implies the form is incomplete without
  them).
- "Add a departure time" (rather than "Find a specific journey time") is shorter, uses
  the word "departure" consistently with the rest of the product, and reads at Grade 4.
- The word "Add" is accurate: the user is adding optional information to their search.
- The control is a `<button>`, not a link (`<a>`), because it does not navigate to a new
  page -- it reveals content on the current page. Using a link would violate the
  semantic expectation that links navigate (2.4.9 applies to links, and "Add a departure
  time" does not describe a link destination).
- The control is not a checkbox because the action is not a boolean preference -- it is
  a disclosure that reveals a form section.

**When expanded**, the button text changes to "Remove departure time" (not "Hide" or
"Close", which are ambiguous). This makes the toggle action clear in both states.

**Target size:** The button must be at least 44 x 44 CSS px (2.5.5).

### 11.4 Progressive enhancement: no-JavaScript strategy

Use approach **(b): the full form is always visible when JavaScript is off.**

**Specification:**

- The `hidden` attribute on `#datetime-fields` must be set by JavaScript, not by the
  server-rendered HTML.
- In the server-rendered HTML, the date and time fields are visible and part of the form.
  The toggle button is also present but has no effect without JavaScript.
- When JavaScript loads, it adds `hidden` to the field group and sets up the toggle
  behaviour.
- The toggle button should be rendered with `hidden` in the server HTML and un-hidden
  by JavaScript, so that without JS the user sees the complete form and no non-functional
  button.

**Why approach (b):**

- **3.3.6 (Error Prevention):** The full form is always functional. The user can fill in
  all fields and submit. There is no risk of a broken form state.
- **3.2.5 (Change on Request):** No automatic changes occur. Without JavaScript, the
  form is static HTML. With JavaScript, the progressive enhancement adds the disclosure
  behaviour, but only in response to user action.
- Approach (a) (a two-step form) would require a server round-trip to show the second
  step, adding latency and complexity for no accessibility benefit.
- Approach (c) (URL param) would work but is over-engineered for a disclosure that only
  affects the current page's form layout.

**Implementation note:** The `<noscript>` element is not needed. The strategy is:
server renders the full form with fields visible and the toggle button hidden. JavaScript
hides the fields and shows the toggle button. This is standard progressive enhancement.

### 11.5 Validation when fields are hidden

**Rule:** If the date and time fields are not revealed (the field group has the `hidden`
attribute), they must not be validated, either client-side or server-side.

**Client-side:** The `required` attribute must only be present on date and time inputs
when the field group is visible. When JavaScript hides the field group, it must also
remove `required` from the date and time inputs. When the fields are revealed, `required`
is added back.

**Server-side:** The server must check whether date and time parameters are present in
the submitted request. If they are absent, the server must not treat this as a validation
error -- it must proceed with a default or route-overview behaviour (when that feature
is built). If they are present, they must be validated normally.

**Rationale:** Validating invisible fields is a 3.3.1 violation -- the user would
receive an error message for a field they cannot see or interact with, which is neither
identifiable nor correctable.

**When no-JS applies:** Without JavaScript, the fields are always visible and always
carry the `required` attribute. Validation is always applied. This is correct because
the user can always see and fill the fields.

### 11.6 URL state preservation

Use a **URL parameter** (`mode=timed` or equivalent) to encode the reveal state.

**Specification:**

- When the user reveals the date/time fields, the URL is updated (via
  `history.replaceState`, not `pushState`) to include `?mode=timed` (or add it to
  existing params).
- When the user hides the fields, the `mode` param is removed from the URL.
- When the form page loads, if `mode=timed` is present in the URL, JavaScript reveals
  the fields on page load (after the progressive enhancement setup).
- When the user navigates back from the departure selection or results page, the browser
  restores the URL with the `mode` param, and the form shows the fields in their
  previous state.
- The form values themselves are already preserved via URL params (existing behaviour in
  `JourneyForm.tsx`).

**Why URL params, not server-side session:**

- The product has no authentication and no server-side session (2.2.5 is not applicable).
  Introducing session state for a single boolean is disproportionate.
- URL params are transparent, bookmarkable, and work with the browser's history stack.
- They support the existing pattern where all form state is encoded in the URL (see
  section 4.16 and the current `JourneyForm.tsx` implementation).

**Use `replaceState`, not `pushState`:** Toggling the disclosure should not add a
history entry. If the user opens and closes the fields three times, pressing Back should
go to the previous page, not cycle through toggle states.

### 11.7 Focus management during reveal and collapse

**On reveal:**

- After the `hidden` attribute is removed and `aria-expanded` is set to `"true"`, move
  focus to the date input (the first field in the revealed group).
- This is in response to direct user action (activating the button), so it is not a
  3.2.5 violation.
- The screen reader will announce the date input's label and any associated hint text.

**On collapse:**

- After `hidden` is added and `aria-expanded` is set to `"false"`, move focus back to
  the toggle button.
- This prevents focus from being lost (if focus was inside the now-hidden group, it
  would move to `<body>`, disorienting the user).

**Announce the state change:** The `aria-expanded` attribute change is sufficient for
screen readers to announce the new state ("Add a departure time, collapsed" /
"Remove departure time, expanded"). No additional `aria-live` region is needed.

### 11.8 Focus order with revealed fields

When the fields are visible, the tab order must be:

1. Skip link
2. Origin station
3. Destination station
4. Mobile network radio group
5. "Remove departure time" button (the toggle, now in its expanded state)
6. Date input
7. Time input
8. "Find signal" submit button

**Reasoning:** The toggle button must appear in the tab order immediately before the
fields it controls. This means the DOM order must place the button between the network
field and the date/time fieldset. When the fields are hidden, the user tabs from the
network radio group to the "Add a departure time" button, then to "Find signal". When
the fields are revealed, the user tabs from the button into the date field, then time
field, then to "Find signal".

This matches the visual layout: the toggle button is above the revealed fields, not
below them.

### 11.9 Interaction with the departure selection page

When the form is submitted **without** date and time fields revealed:

- For the current version (until route-overview mode is built), the form must not submit.
  Instead, reveal the date/time fields automatically, move focus to the date input, and
  announce via `aria-live="polite"`: "Enter a date and time to search for trains." This
  is not a validation error -- it is a prompt to complete the form.
- This is acceptable under 3.2.5 because it is in direct response to the user pressing
  submit. It does not navigate away or change context unexpectedly.
- When route-overview mode is implemented in a future task, submitting without date/time
  will go to a route overview page instead. At that point, this constraint should be
  revisited.

When the form is submitted **with** date and time fields:

- Navigate to the departure selection page (section 10) as normal.
- The URL includes all params including `mode=timed` so the form state is preserved on
  Back navigation.

---

## Appendix: criteria not applicable to this product

| Criterion | Why not applicable |
|---|---|
| 1.2.x (Time-based Media) | No audio or video content |
| 1.4.2 Audio Control | No audio |
| 1.4.7 Low or No Background Audio | No audio |
| 2.2.5 Re-authenticating | No authentication |
| 2.5.4 Motion Actuation | No motion-triggered actions |
| 2.5.7 Dragging Movements | No drag interactions |
| 3.1.6 Pronunciation | No ambiguous common words whose meaning changes with pronunciation |
