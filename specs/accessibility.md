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
- Results page: "Train Signal -- Leeds to London, 14 July 2026" (dynamic, including
  the journey)
- Error page: "Train Signal -- Something went wrong"

### 3.15 -- 2.4.3 Focus Order (Level A)

Focus order must be logical and match the visual layout.

**For this product:** On the form, focus order is: skip link, then fields in visual
order (origin, destination, date, time, network), then submit button. On the results
page: skip link, then headline, then table, then timeline (if focusable elements exist
within it), then any navigation.

### 3.16 -- 2.4.4 Link Purpose (In Context) (Level A)

Superseded by 2.4.9 below.

### 3.17 -- 2.4.5 Multiple Ways (Level AA)

More than one way to reach each page.

**For this product:** The app has two screens. The form is the entry point. The results
page is reached via the form and via a direct URL (since state is encoded in the URL).
This is sufficient.

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

**For this product:** With only two screens this is low-risk, but the requirements are:

- The current page must be identifiable from the page title and heading.
- If the results page includes a "Search again" or "New journey" link, the user must
  understand they will return to the form.
- Breadcrumbs are unnecessary given the two-screen structure, but the heading hierarchy
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
   - Form: empty, filled, with validation errors
   - Results: loading, populated, no-good-window, error
   - The axe ruleset must include `wcag2aaa` tags
2. **Lighthouse accessibility audit** with a minimum score of 100 (acknowledging this
   does not guarantee AAA compliance)
3. **HTML validation** to catch structural issues that affect assistive technology

### 8.4 Review milestones

The accessibility specialist must perform a full manual review at:

- P1-07: after the journey form and timeline table are built, before signal data lands
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
