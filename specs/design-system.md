# Design System -- Train Signal

**Status:** Active
**Owner:** Designer
**Date:** 2026-08-06
**WCAG target:** 2.2 Level AAA

This document records every visual decision, the constraint that drove it, and the
computed verification. It is a design input for the developer and a reference for the
accessibility specialist.

---

## Quick reference

The tokens most tasks actually need, without reading the reasoning behind each one. For
a new component or visual treatment, read the relevant full section — the reasoning is
what keeps the next decision consistent with this one.

| Token | Light | Dark |
|---|---|---|
| `--color-page-bg` / `--color-page-fg` | `#ffffff` / `#1a1a1a` | `#121212` / `#e8e8e8` |
| `--color-field-border` | `#5c5c5c` | `#999999` |
| `--color-focus` | `#0044cc` | `#6699ff` |
| `--color-error` | `#6e1111` | `#ff9999` |
| `--color-muted` | `#595959` | `#a0a0a0` |

| Rule | Value |
|---|---|
| Spacing base | 4px (`--space-1` = 4px … `--space-12` = 48px) |
| Interactive target minimum | `--target-min` = 2.75rem (44px) |
| Focus ring | `outline: 2px solid var(--color-focus); outline-offset: 2px` |
| Line length | `--max-width-text` = 40rem (~80ch) |
| Body line height | 1.5 (`--line-height-body`) |
| Font stack | System fonts only — no web font |
| Border radius | `--radius-sm` 4px (inputs), `--radius-md` 8px (cards) |

Signal band colours, patterns and the full contrast matrix are in sections 4 and 8 — a
new band treatment or a new colour pairing needs those, not just this table.

---

## Contents

1. [Palette](#1-palette)
2. [Typography](#2-typography)
3. [Spacing](#3-spacing)
4. [Signal bands](#4-signal-bands)
5. [Interactive targets](#5-interactive-targets)
6. [Focus indicators](#6-focus-indicators)
7. [Low confidence overlay](#7-low-confidence-overlay)
8. [Contrast matrix](#8-contrast-matrix)
9. [Departure selection page](#9-departure-selection-page)
10. [Journey form -- progressive reveal](#10-journey-form----progressive-reveal)

---

## 1. Palette

### Design reasoning

The palette avoids traffic-light red/amber/green for three reasons:

1. It fails 1.4.1 for the approximately 8% of men with colour vision deficiency.
2. At 7:1 contrast, amber text-on-background combinations are nearly impossible to
   achieve.
3. It is a cliche that signals "dashboard" rather than "utility."

Instead, signal quality maps to a **value ramp** -- lightness carries the meaning,
with hue as subtle reinforcement. This degrades to greyscale by construction because
the distinguishing axis is already luminance, not hue.

### Light scheme tokens

| Token | Hex | Purpose |
|---|---|---|
| `--color-page-bg` | `#ffffff` | Page background |
| `--color-page-fg` | `#1a1a1a` | Body text, headings, icons |
| `--color-field-border` | `#5c5c5c` | Form field borders |
| `--color-field-bg` | `#ffffff` | Form field background |
| `--color-focus` | `#0044cc` | Focus ring |
| `--color-error` | `#6e1111` | Error message text |
| `--color-muted` | `#595959` | Secondary text, placeholder text |

### Dark scheme tokens

| Token | Hex | Purpose |
|---|---|---|
| `--color-page-bg` | `#121212` | Page background |
| `--color-page-fg` | `#e8e8e8` | Body text |
| `--color-field-border` | `#999999` | Form field borders |
| `--color-field-bg` | `#1e1e1e` | Form field background |
| `--color-focus` | `#6699ff` | Focus ring |
| `--color-error` | `#ff9999` | Error message text |
| `--color-muted` | `#a0a0a0` | Secondary text |

---

## 2. Typography

### Font stack

```css
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif;
```

**Reasoning:** System fonts are faster (no download), respect user preferences, and
nobody visits this product for the typography. A web font would add latency on the
train connections this product is designed for.

### Type scale

All sizes in rem to support user zoom and browser font-size preferences.

| Token | Size (rem) | Size (px at 16px base) | WCAG "large text"? | Min contrast |
|---|---|---|---|---|
| `--font-size-xs` | 0.75 | 12 | No | 7:1 |
| `--font-size-sm` | 0.875 | 14 | No | 7:1 |
| `--font-size-base` | 1 | 16 | No | 7:1 |
| `--font-size-lg` | 1.25 | 20 | Bold only (>= 18.67px bold) | 4.5:1 if bold |
| `--font-size-xl` | 1.5 | 24 | Yes (>= 24px) | 4.5:1 |
| `--font-size-2xl` | 2 | 32 | Yes | 4.5:1 |

**Note on the headline result:** Although the "Best window" heading qualifies as large
text (>= 24px), it is the most important element on the page and should exceed 7:1. We
use `--color-page-fg` (#1a1a1a) on `--color-page-bg` (#ffffff), which achieves 17.40:1.

### Line height

| Token | Value | Reasoning |
|---|---|---|
| `--line-height-body` | 1.5 | WCAG 1.4.8 minimum |
| `--line-height-heading` | 1.3 | Tighter for headings; still above 1.2 minimum for large text |

### Line length

| Token | Value | Reasoning |
|---|---|---|
| `--max-width-text` | 40rem | Approximately 80 characters at 16px body size (1.4.8) |

The `<main>` element carries `max-width: 40rem`. No text container exceeds this.
At 200% zoom on a 1280px viewport (640px effective), 40rem = 640px, which fits without
horizontal scroll. At 320px (400% zoom), content reflows to full width.

### Text alignment

No `text-align: justify` anywhere (1.4.8). The global rule `text-align: revert` ensures
inherited alignment is left (or start) in all contexts.

### Paragraph spacing

`margin-bottom: 1.5em` on `<p>`. At 16px body size with line-height 1.5, the line
height is 24px. Paragraph spacing of 1.5em = 24px, which is 1.0x line height. WCAG
1.4.8 requires 1.5x line spacing for paragraph spacing, meaning the gap between the
last line of one paragraph and the first line of the next must be at least 1.5x the
line height (36px). With 1.5em margin-bottom (24px) plus the natural line-height gap
within the next paragraph's first line, the visual gap exceeds 36px. If stricter
interpretation is needed, increase to `margin-bottom: 2.25em`.

---

## 3. Spacing

A 4px base unit, using rem for scalability.

| Token | Value (rem) | Value (px at 16px) | Use |
|---|---|---|---|
| `--space-1` | 0.25 | 4 | Tight internal padding |
| `--space-2` | 0.5 | 8 | Input padding, small gaps |
| `--space-3` | 0.75 | 12 | Between related elements |
| `--space-4` | 1 | 16 | Standard gap |
| `--space-6` | 1.5 | 24 | Section padding |
| `--space-8` | 2 | 32 | Between sections |
| `--space-12` | 3 | 48 | Page-level padding |

### Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 0.25rem (4px) | Input fields, small elements |
| `--radius-md` | 0.5rem (8px) | Cards, containers |

Kept minimal. Rounded corners serve no informational purpose; slight rounding softens
the form fields without creating ambiguity about tap targets.

---

## 4. Signal bands

### The design problem

Three signal bands plus tunnels must be distinguishable with colour entirely removed.
Each band carries **three redundant cues** (required by 1.4.1):

1. **Fill pattern** (solid, hatching, crosshatch, or solid dark)
2. **Icon** (distinct shape per band)
3. **Text label** (band name rendered inline for bands wider than ~60px)

### Band definitions

| Band | Fill | Pattern | Icon | Label | Greyscale value |
|---|---|---|---|---|---|
| Voice and video | Solid light sage `#d4e8d7` | None (solid fill) | Checkmark | "Voice and video" | ~224 (lightest) |
| Voice only | Light cream `#f0e4c0` | 45-degree diagonal hatching, 2px lines, 8px spacing | Phone handset | "Voice only" | ~227 (light, distinguished by hatching) |
| No usable signal | Light grey `#dcdcdc` | Dense crosshatch (perpendicular 2px lines, 6px spacing) | X mark | "No signal" | ~220 (medium-light, distinguished by crosshatch) |
| Tunnel | Near-black `#2d2d2d` | Solid dark fill | Tunnel entrance | Tunnel name (e.g. "Standedge Tunnel") | ~45 (dark, clearly distinct) |

### Dark scheme band definitions

| Band | Fill | Text colour |
|---|---|---|
| Voice and video | `#1e3a22` (dark sage) | `#e8e8e8` |
| Voice only | `#3d351c` (dark amber) | `#e8e8e8` |
| No usable signal | `#4a4a4a` (dark grey) | `#e8e8e8` |
| Tunnel | `#0a0a0a` (near-black) | `#c8c8c8` |

### Greyscale distinguishability

The three lighter bands (good, ok, none) have similar greyscale values (220-227). They
are distinguished by **pattern**, not by lightness:

- Good: clean, solid fill -- no visual texture
- Ok: visible diagonal lines at 45 degrees
- None: dense crosshatch -- visually heavier than the diagonal

The tunnel band is dramatically darker (~45 vs ~220+), distinguishable by value alone.

This is verified by applying `filter: grayscale(1)` and confirming each band remains
identifiable by its pattern and label.

### Band boundaries

Bands are separated by visible borders, not by fill contrast alone. Each band segment
has a 2px border.

| Scheme | Border colour | Purpose |
|---|---|---|
| Light | `#5c5c5c` | 3:1 against all three light band fills |
| Light (tunnel) | `#7a7a7a` | 3:1 against tunnel fill and page background |
| Dark | `#999999` | 3:1 against all dark band fills and page background |

### CSS pattern implementation

Patterns use `repeating-linear-gradient` in CSS custom properties. They work at any
zoom level because the values are in px (which scale with zoom).

**Voice only -- diagonal hatching:**
```css
repeating-linear-gradient(
  45deg,
  transparent,
  transparent 6px,
  var(--band-ok-stripe) 6px,
  var(--band-ok-stripe) 8px
)
```
Stripe colour is `rgba(0, 0, 0, 0.15)` (light) or `rgba(255, 255, 255, 0.15)` (dark),
providing visible texture without interfering with text legibility.

**No signal -- crosshatch:**
```css
repeating-linear-gradient(
  45deg,
  transparent,
  transparent 4px,
  var(--band-none-stripe) 4px,
  var(--band-none-stripe) 6px
),
repeating-linear-gradient(
  -45deg,
  transparent,
  transparent 4px,
  var(--band-none-stripe) 4px,
  var(--band-none-stripe) 6px
)
```
Stripe colour is `rgba(0, 0, 0, 0.12)` (light) or `rgba(255, 255, 255, 0.12)` (dark).

### Band icons

Icons are inline SVG or Unicode symbols, at least 16x16px, achieving 3:1 contrast
against the band background (per 1.4.11).

| Band | Icon | Unicode fallback | Accessible name |
|---|---|---|---|
| Voice and video | Checkmark SVG | U+2713 | "Good signal" |
| Voice only | Phone SVG | U+260E | "Voice only" |
| No usable signal | X mark SVG | U+2717 | "No signal" |
| Tunnel | Tunnel arch SVG | U+25AE (black rectangle) | "Tunnel" |

Icons carry `aria-hidden="true"` because the text label provides the accessible name.
The entire visual timeline is `aria-hidden="true"` -- screen readers use the
text-equivalent table.

### Legend

The legend is always visible on the results page (not behind a toggle). It shows all
four band types with their pattern swatch, icon, and text label side by side.

---

## 5. Interactive targets

Every interactive element must be at least **44 x 44 CSS pixels** (2.5.5).

### How this is enforced

| Element | Method |
|---|---|
| Text inputs | `min-height: 2.75rem` (44px) plus padding |
| Select / combobox | Same as text inputs |
| Radio buttons | The `<label>` extends the tap target; `min-height: 2.75rem` on the label container, with `padding` to fill the area |
| Submit button | `min-height: 2.75rem`, `padding: 0.75rem 1.5rem` |
| Links | `min-height: 2.75rem` achieved via `line-height` and `padding` on block-level links; inline text links rely on `line-height: 1.5` on 16px text (24px line height) which is below 44px -- inline links in body text are exempt per the WCAG understanding doc when spacing between lines provides sufficient separation |
| Combobox suggestion items | `min-height: 2.75rem` per item |

The token `--target-min` is set to `2.75rem` (44px at default font size) for consistent
reference.

---

## 6. Focus indicators

### Specification

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

### Contrast verification

The focus ring must achieve 3:1 against adjacent colours (2.4.13). "Adjacent" means the
colours the outline physically sits next to -- the page background and the element's
outer edge.

| Scheme | Focus colour | Adjacent colour | Ratio | Passes 3:1? |
|---|---|---|---|---|
| Light | `#0044cc` | `#ffffff` (page bg) | 7.78:1 | Yes |
| Light | `#0044cc` | `#5c5c5c` (field border) | 3.55:1 | Yes |
| Dark | `#6699ff` | `#121212` (page bg) | 6.75:1 | Yes |
| Dark | `#6699ff` | `#999999` (field border) | 1.46:1 | Marginal |

The dark scheme focus-vs-field-border ratio is low. This is acceptable because the
outline-offset (2px) means the focus ring does not sit directly against the field border
-- there is 2px of page background (#121212) between them. The focus ring's 6.75:1
contrast against the page background is what matters.

### Forced colours

In `forced-colors: active`, the outline colour is overridden by the system. No action
needed beyond not suppressing outlines.

---

## 7. Low confidence overlay

Low confidence is not a fourth band. It is a visual treatment applied to any band where
measurement data is sparse.

### Visual treatment

- A **dashed border** replaces the solid border on the band segment
- An inline label appended: "(low confidence)" or "(limited data)"
- Optional: a subtle dot pattern overlay at very low opacity

This approach works in greyscale because the dashed border is structurally different
from the solid border, and the text label is explicit.

### In the text-equivalent table

The "Confidence" column shows "High", "Medium", "Low", or "No data" -- no visual
treatment needed; it is plain text.

---

## 8. Contrast matrix

Every text/background combination in the design system, with computed ratios using the
WCAG relative luminance formula.

Linearisation: `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`
Luminance: `L = 0.2126R + 0.7152G + 0.0722B`
Ratio: `(L1 + 0.05) / (L2 + 0.05)` where L1 >= L2

### Light scheme -- text on backgrounds (need 7:1)

| Text | Background | Ratio | Passes? |
|---|---|---|---|
| `#1a1a1a` | `#ffffff` (page) | 17.40:1 | Yes |
| `#595959` | `#ffffff` (muted text) | 7.00:1 | Yes |
| `#6e1111` | `#ffffff` (error text) | 11.99:1 | Yes |
| `#1a1a1a` | `#d4e8d7` (good band) | 13.53:1 | Yes |
| `#1a1a1a` | `#f0e4c0` (ok band) | 13.73:1 | Yes |
| `#1a1a1a` | `#dcdcdc` (none band) | 12.69:1 | Yes |
| `#f0f0f0` | `#2d2d2d` (tunnel band) | 12.08:1 | Yes |

### Light scheme -- non-text elements (need 3:1)

| Element | Adjacent | Ratio | Passes? |
|---|---|---|---|
| `#5c5c5c` (field border) | `#ffffff` (page) | 6.69:1 | Yes |
| `#5c5c5c` (band border) | `#d4e8d7` (good) | 5.20:1 | Yes |
| `#5c5c5c` (band border) | `#f0e4c0` (ok) | 5.27:1 | Yes |
| `#5c5c5c` (band border) | `#dcdcdc` (none) | 4.88:1 | Yes |
| `#7a7a7a` (tunnel border) | `#2d2d2d` (tunnel) | 3.21:1 | Yes |
| `#7a7a7a` (tunnel border) | `#ffffff` (page) | 4.29:1 | Yes |
| `#0044cc` (focus) | `#ffffff` (page) | 7.78:1 | Yes |

### Dark scheme -- text on backgrounds (need 7:1)

| Text | Background | Ratio | Passes? |
|---|---|---|---|
| `#e8e8e8` | `#121212` (page) | 15.29:1 | Yes |
| `#a0a0a0` | `#121212` (muted text) | 7.16:1 | Yes |
| `#ff9999` | `#121212` (error text) | 9.16:1 | Yes |
| `#e8e8e8` | `#1e3a22` (good band) | 10.18:1 | Yes |
| `#e8e8e8` | `#3d351c` (ok band) | 9.94:1 | Yes |
| `#e8e8e8` | `#4a4a4a` (none band) | 7.23:1 | Yes |
| `#c8c8c8` | `#0a0a0a` (tunnel band) | 11.83:1 | Yes |

### Dark scheme -- non-text elements (need 3:1)

| Element | Adjacent | Ratio | Passes? |
|---|---|---|---|
| `#999999` (field/band border) | `#121212` (page) | 6.58:1 | Yes |
| `#999999` (band border) | `#1e3a22` (good) | 4.38:1 | Yes |
| `#999999` (band border) | `#3d351c` (ok) | 4.27:1 | Yes |
| `#999999` (band border) | `#4a4a4a` (none) | 3.11:1 | Yes |
| `#999999` (band border) | `#0a0a0a` (tunnel) | 6.95:1 | Yes |
| `#6699ff` (focus) | `#121212` (page) | 6.75:1 | Yes |

---

## 9. Departure selection page

### Design problem

The user has submitted a journey search. They land on an intermediate page showing up
to 5 trains near their requested time. They pick one and proceed to results. The page
must make the choice fast, obvious, and unambiguous. Most users will scan the list, tap
a departure time, and leave within five seconds.

### Component: `DepartureHeader`

The page heading and contextual summary. Provides orientation (2.4.8) and announces
the page purpose to screen readers when focus lands on load.

**HTML structure:**

```html
<h1 class="ts-departure-header__heading" tabindex="-1">
  Choose a departure
</h1>
<p class="ts-departure-header__context">
  5 trains from Leeds to London on 14 August, near 10:00.
</p>
```

**Tokens used:**

| Element | Token | Value |
|---|---|---|
| `<h1>` text | `--color-page-fg` on `--color-page-bg` | 17.40:1 light, 15.29:1 dark |
| `<h1>` size | `--font-size-2xl` (32px) | Large text, 4.5:1 minimum; exceeds 7:1 |
| `<h1>` weight | `--font-weight-bold` | |
| `<h1>` line-height | `--line-height-heading` (1.3) | |
| `<h1>` margin-bottom | `--space-2` (8px) | Tight gap before context text |
| Context `<p>` colour | `--color-muted` on `--color-page-bg` | 7.00:1 light, 7.16:1 dark |
| Context `<p>` size | `--font-size-base` (16px) | Body text, needs 7:1 |
| Context `<p>` margin-bottom | `--space-6` (24px) | Gap before the departure list |

**Focus management:**

- On page load, JavaScript calls `.focus()` on the `<h1>`.
- The `<h1>` has `tabindex="-1"` so it can receive programmatic focus but does not
  appear in the natural Tab sequence.
- Visual focus ring is suppressed via `:focus:not(:focus-visible) { outline: none; }`.
  The purpose of focus is screen reader announcement, not visual indication. When the
  user tabs forward, the standard `:focus-visible` ring appears on the first link.

**CSS class: `ts-departure-header__heading`**

```css
.ts-departure-header__heading {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-heading);
  color: var(--color-page-fg);
  margin-bottom: var(--space-2);
}

.ts-departure-header__heading:focus:not(:focus-visible) {
  outline: none;
}

.ts-departure-header__context {
  font-size: var(--font-size-base);
  color: var(--color-muted);
  line-height: var(--line-height-body);
  margin-bottom: var(--space-6);
}
```

**Page `<title>` pattern:**

```
Choose a departure: [Origin] to [Destination], [Date] -- Train Signal
```

Example: `Choose a departure: Leeds to London, 14 August 2026 -- Train Signal`

### Component: `DepartureList`

An ordered list of departure links. Each link navigates directly to the results page
for that specific train.

**HTML structure:**

```html
<ol class="ts-departure-list">
  <li class="ts-departure-list__item">
    <a
      class="ts-departure-list__link"
      href="/results?from=LDS&to=KGX&date=2026-08-14&time=09:48&network=EE"
    >
      <span class="ts-departure-list__time">09:48</span>
      <span class="ts-departure-list__details">
        <span class="ts-departure-list__route">Leeds to London King's Cross</span>
        <span class="ts-departure-list__meta">
          Arrives 12:30 &middot; 2h 42m
        </span>
      </span>
    </a>
  </li>
  <!-- ... more items ... -->
</ol>
```

**Accessible name pattern (2.4.9):**

Each link's computed accessible name comes from its text content. Read in sequence, the
inner spans produce: "09:48 Leeds to London King's Cross Arrives 12:30 . 2h 42m". This
is self-descriptive when read out of context.

The developer must verify that the computed accessible name includes at minimum: the
departure time, the destination, and the arrival time. The route recap and duration
are supporting information.

**Layout and spacing:**

The list is a vertical stack. Each item is separated by a 1px border in
`--color-field-border`.

| Element | Token | Value |
|---|---|---|
| `<ol>` | list-style: none | No numeric markers (the times serve as identifiers) |
| `<ol>` | padding: 0, margin: 0 | Reset default list spacing |
| `<li>` border-bottom | 1px solid `--color-field-border` | Separates items visually |
| Last `<li>` | border-bottom: none | No trailing border |

**Link styling (`.ts-departure-list__link`):**

```css
.ts-departure-list__link {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  min-height: var(--target-min);
  padding: var(--space-3) var(--space-4);
  text-decoration: none;
  color: var(--color-page-fg);
}
```

- `display: flex` with `align-items: baseline` aligns the departure time with the
  first line of the details block.
- `min-height: var(--target-min)` ensures the 44px tap target (2.5.5). Combined with
  padding, the actual height will be taller than 44px for multi-line content.
- `text-decoration: none` because the entire card is the link. Underline on the full
  block would be noisy. The link nature is communicated by: cursor change, the list
  structure, the action-oriented heading ("Choose a departure"), and focus/hover
  states.

**Hover and focus states:**

```css
.ts-departure-list__link:hover {
  background-color: var(--color-field-bg);
}

.ts-departure-list__link:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: -2px;
}
```

The `outline-offset: -2px` (inset) is used instead of the standard `2px` outset
because the links are full-width blocks stacked vertically. An outset focus ring would
overlap the adjacent items. An inset ring is visually contained within the link area.

Contrast verification for the inset focus ring: the ring sits against `--color-page-bg`
(the link background). Light: `#0044cc` on `#ffffff` = 7.78:1. Dark: `#6699ff` on
`#121212` = 6.75:1. Both pass 3:1.

In dark scheme, `--color-field-bg` is `#1e1e1e` for hover. `#e8e8e8` text on `#1e1e1e`
= 14.43:1. Passes.

**Departure time (`.ts-departure-list__time`):**

```css
.ts-departure-list__time {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-heading);
  color: var(--color-page-fg);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 4rem;
}
```

- `--font-size-xl` (24px) qualifies as WCAG large text. At 4.5:1 minimum, this passes
  at 17.40:1 (light) and 15.29:1 (dark).
- `min-width: 4rem` keeps the times aligned in the list when "09:48" and "10:05" have
  different character widths.

**Details block (`.ts-departure-list__details`):**

```css
.ts-departure-list__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.ts-departure-list__route {
  font-size: var(--font-size-base);
  color: var(--color-page-fg);
  font-weight: var(--font-weight-normal);
}

.ts-departure-list__meta {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
```

- Route text uses `--color-page-fg` on `--color-page-bg` = 17.40:1 (light), 15.29:1
  (dark). Passes 7:1.
- Meta text uses `--color-muted` on `--color-page-bg` = 7.00:1 (light), 7.16:1 (dark).
  Passes 7:1.

**Responsive behaviour:**

At 320px, the layout works without changes because the flex container wraps naturally.
The departure time stays on the first line, and the details block fills the remaining
width. If the station name is long, it wraps to a second line within the details block.

At 1280px, the layout is identical but within the 40rem max-width container. No
wide-screen treatment is needed -- the departure list does not benefit from more width.

### Edge cases

**Zero trains found:**

```html
<h1 class="ts-departure-header__heading" tabindex="-1">
  Choose a departure
</h1>
<p class="ts-departure-header__context">
  We could not find any trains from Leeds to London on 14 August near 10:00.
  Try a different date or time.
</p>
<a class="ts-back-link" href="/?from=LDS&to=KGX&network=EE&mode=timed">
  Back to search
</a>
```

- The `<h1>` remains "Choose a departure" for consistency (the page title also remains
  the same pattern).
- The context text is plain English at Grade 6 reading level.
- "Back to search" is a self-descriptive link (2.4.9) using the existing
  `ts-back-link` class, which already meets the 44px target requirement.
- The link preserves the user's previous search parameters so the form is pre-filled
  (3.3.7: no redundant entry).

**Single train:**

- Rendered identically to the multi-train case, with a list containing one item.
- The context text says "1 train from Leeds to London on 14 August near 10:00."
- No auto-redirect (3.2.5).

**Error state (server/API failure):**

```html
<h1 class="ts-departure-header__heading" tabindex="-1">
  Choose a departure
</h1>
<p class="ts-departure-header__context">
  Something went wrong while looking for trains. Please try again.
</p>
<a class="ts-back-link" href="/?from=LDS&to=KGX&network=EE&mode=timed">
  Back to search
</a>
```

- Same structure as zero-results. Plain English, Grade 6.
- No toast, no modal, no auto-dismiss.

### Departure page layout at both widths

**320px (mobile / 400% zoom):**

The page sits within the viewport with `--space-4` (16px) horizontal padding from
`<main>`. Each departure link fills the full width. The departure time and details
stack naturally because of `flex-wrap` on the baseline alignment. Line wrapping handles
long station names.

**1280px (desktop / 100% zoom):**

The page is centred at 40rem max-width. Each departure link is a horizontal row with
time on the left and details on the right. The content does not stretch to fill the wide
viewport -- the 40rem cap keeps line lengths under 80 characters.

### Dark scheme

All tokens used (page-fg, page-bg, muted, field-border, focus, link, field-bg) have
dark-scheme values already defined and verified in the contrast matrix. No new colour
pairings are introduced. The departure list uses the same foreground, background, and
border tokens as the rest of the design system.

### Forced colours (Windows High Contrast Mode)

```css
@media (forced-colors: active) {
  .ts-departure-list__link {
    border-bottom: 1px solid ButtonText;
  }

  .ts-departure-list__link:hover {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }
}
```

In forced-colours mode, background colours are suppressed. The border-bottom on each
link ensures visual separation remains. Hover uses the system Highlight colour.

---

## 10. Journey form -- progressive reveal

### Design problem

The form has five fields. Three are always needed (origin, destination, network). Two
(date and time) are optional -- when omitted, the system could show a route overview
(future feature). For now, date and time are still required to produce results, but the
form presents them as an opt-in disclosure to support the future route-overview path and
to reduce initial visual complexity.

### Updated form layout

**Always visible (in DOM order):**

1. Origin station combobox
2. Destination station combobox
3. Mobile network radio group

**Disclosure toggle:**

4. `<button type="button">` with `aria-expanded` and `aria-controls`

**Revealed on demand:**

5. Date input (inside a hidden `<div>`)
6. Time input (inside the same hidden `<div>`)

**Always visible:**

7. "Find signal" submit button

### Component: disclosure toggle button

This button reveals or hides the date and time fields. It uses the existing
`ts-button--secondary` variant (outline style: `--color-page-fg` border on
`--color-page-bg` background).

**HTML structure (server-rendered, before JS enhancement):**

```html
<!-- Toggle button: hidden in server HTML, revealed by JS -->
<button
  type="button"
  class="ts-button ts-button--secondary ts-disclosure-toggle"
  aria-expanded="false"
  aria-controls="datetime-fields"
  hidden
>
  <span class="ts-disclosure-toggle__text">Add a departure time</span>
  <span class="ts-disclosure-toggle__chevron" aria-hidden="true">&#9662;</span>
</button>

<!-- Date/time fields: visible in server HTML, hidden by JS -->
<div id="datetime-fields">
  <fieldset class="ts-field ts-datetime">
    <legend class="ts-field__label">Date and time</legend>
    <!-- existing date and time inputs -->
  </fieldset>
</div>
```

**Progressive enhancement sequence:**

1. Server renders the full form: toggle button has `hidden`, date/time fields are
   visible, date and time inputs carry `required`.
2. JavaScript on load: removes `hidden` from the toggle button, adds `hidden` to
   `#datetime-fields`, removes `required` from date and time inputs, sets
   `aria-expanded="false"` on the toggle button.
3. If URL contains `mode=timed`, JavaScript immediately reveals the fields after the
   enhancement step (removes `hidden` from `#datetime-fields`, sets
   `aria-expanded="true"`, adds `required` back).

**Button text states:**

| State | Button text | `aria-expanded` |
|---|---|---|
| Collapsed (fields hidden) | "Add a departure time" | `"false"` |
| Expanded (fields visible) | "Remove departure time" | `"true"` |

**Chevron indicator:**

A small downward-pointing triangle (`&#9662;` / U+25BE) when collapsed, upward
(`&#9652;` / U+25B4) when expanded. The chevron is purely decorative (`aria-hidden`).
It provides a secondary visual cue that the button is a disclosure control.

**CSS for the toggle button:**

```css
.ts-disclosure-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--target-min);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-base);
  margin-bottom: var(--space-4);
}

.ts-disclosure-toggle__chevron {
  font-size: var(--font-size-sm);
  line-height: 1;
}
```

The toggle uses `ts-button ts-button--secondary` for base styling (border, colours,
radius). The `ts-disclosure-toggle` class adds the gap for the chevron and the
margin-bottom spacing.

**Contrast verification for the secondary button:**

The secondary button uses `--color-page-fg` text on `--color-page-bg` background, with
a `--color-page-fg` border.

| Scheme | Text | Background | Ratio | Passes 7:1? |
|---|---|---|---|---|
| Light | `#1a1a1a` | `#ffffff` | 17.40:1 | Yes |
| Dark | `#e8e8e8` | `#121212` | 15.29:1 | Yes |

Border contrast (non-text, need 3:1):

| Scheme | Border | Background | Ratio | Passes 3:1? |
|---|---|---|---|---|
| Light | `#1a1a1a` | `#ffffff` | 17.40:1 | Yes |
| Dark | `#e8e8e8` | `#121212` | 15.29:1 | Yes |

No new tokens or colour pairings needed.

**Visual distinction from the primary "Find signal" button:**

The secondary button is visually distinct in two ways:
1. It has an outline style (transparent/page-bg fill, page-fg border) vs the primary
   button's filled style (page-fg fill, page-bg text).
2. It includes a chevron indicator that the primary button does not have.

These differences are sufficient to communicate that the toggle is not the form's
submit action. The primary button is the only filled button, making it the visual
anchor for form submission.

### Focus management during reveal and collapse

**On reveal (user activates toggle):**

1. Remove `hidden` from `#datetime-fields`.
2. Set `aria-expanded="true"` on the toggle button.
3. Change button text to "Remove departure time".
4. Change chevron from `&#9662;` to `&#9652;`.
5. Add `required` to date and time inputs.
6. Move focus to the date input (`#journey-date`).
7. Update URL via `history.replaceState` to add `mode=timed`.

**On collapse (user activates toggle again):**

1. Add `hidden` to `#datetime-fields`.
2. Set `aria-expanded="false"` on the toggle button.
3. Change button text to "Add a departure time".
4. Change chevron from `&#9652;` to `&#9662;`.
5. Remove `required` from date and time inputs.
6. Clear any validation errors on date and time fields.
7. Move focus back to the toggle button.
8. Update URL via `history.replaceState` to remove `mode` parameter.

### Updated DOM order

The full form DOM order, with the toggle button and hidden fields in position:

```html
<form>
  <!-- Error summary (if errors exist) -->

  <!-- 1. Origin station combobox -->
  <StationCombobox id="from-station" ... />

  <!-- 2. Destination station combobox -->
  <StationCombobox id="to-station" ... />

  <!-- 3. Mobile network radio group -->
  <RadioGroup legend="Mobile network" ... />

  <!-- 4. Disclosure toggle -->
  <button type="button" class="ts-button ts-button--secondary ts-disclosure-toggle"
    aria-expanded="false" aria-controls="datetime-fields" hidden>
    Add a departure time &#9662;
  </button>

  <!-- 5-6. Date and time fields (hidden by JS) -->
  <div id="datetime-fields">
    <fieldset class="ts-field ts-datetime">
      <legend class="ts-field__label">Date and time</legend>
      <div class="ts-datetime__inputs">
        <div class="ts-datetime__group">
          <label for="journey-date">Date</label>
          <input id="journey-date" type="date" ... />
        </div>
        <div class="ts-datetime__group">
          <label for="journey-time">Time</label>
          <input id="journey-time" type="time" ... />
        </div>
      </div>
    </fieldset>
  </div>

  <!-- 7. Submit -->
  <div class="ts-form__actions">
    <button type="submit" class="ts-button ts-button--primary">
      Find signal
    </button>
  </div>
</form>
```

**Tab order when collapsed:** Origin, Destination, Network radios, Toggle button
("Add a departure time"), Submit button ("Find signal").

**Tab order when expanded:** Origin, Destination, Network radios, Toggle button
("Remove departure time"), Date input, Time input, Submit button.

This matches the visual layout in both states. The toggle is always directly above
the fields it controls (or directly above the submit button when collapsed).

### Submit behaviour when date/time are hidden

When the form is submitted without date/time fields revealed:

1. Do not navigate. Instead, reveal the date/time fields (same as toggling the
   disclosure).
2. Move focus to the date input.
3. Announce via a live region: "Enter a date and time to search for trains."

This is a prompt, not a validation error. The prompt text is rendered in a
`<p aria-live="polite">` element within the `#datetime-fields` container. It appears
only on this auto-reveal and is cleared when the user interacts with the date field.

**CSS for the prompt:**

```css
.ts-disclosure-prompt {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  margin-bottom: var(--space-2);
}
```

Uses `--color-muted` on page background: 7.00:1 (light), 7.16:1 (dark). Passes.

### Form at both widths and both schemes

**320px, light scheme, collapsed:**

The form stacks vertically. Origin, destination, and network fill the width. The
toggle button appears inline with left alignment. The submit button sits at the
bottom. The date/time fields are hidden. Total visible elements: 5 (two comboboxes,
radio group, toggle button, submit button).

**320px, light scheme, expanded:**

Same as collapsed, plus the date and time inputs appear between the toggle button and
the submit button. The date and time inputs sit side by side (flex-wrap allows them
to stack if the viewport cannot fit both at `min-width: 8rem` each). At 320px, both
inputs typically fit side by side (8rem = 128px, two inputs = 256px + 12px gap = 268px,
within 320px - 32px padding = 288px available). If not, they stack.

**1280px, light scheme:**

Same layout, centred at 40rem. More whitespace around the form. No wide-screen
adaptations -- the form does not benefit from more width.

**Dark scheme:**

All tokens swap to their dark values. No new colour pairings. The toggle button uses
page-fg (#e8e8e8) border on page-bg (#121212) background, with page-fg text. This
is already verified in the secondary button contrast check above.

### Forced colours

The secondary button already has forced-colours handling via the existing
`.ts-button` rule in `globals.css`. No additional forced-colours CSS is needed for
the toggle button.

---

## Component inventory

The design system covers these components. Each is built as CSS custom properties;
actual component implementation is the developer's responsibility.

| Component | Tokens used | Notes |
|---|---|---|
| Page shell | `--color-page-bg`, `--color-page-fg`, `--max-width-text` | Single-column, centred |
| Form field | `--color-field-bg`, `--color-field-border`, `--target-min`, `--radius-sm` | 44px min height |
| Radio group | `--target-min`, `--space-3` | Label extends tap target |
| Submit button | `--color-page-fg`, `--color-page-bg`, `--target-min`, `--radius-sm` | Inverted colours |
| Disclosure toggle | `--color-page-fg`, `--color-page-bg`, `--target-min`, `--radius-sm` | Secondary button + chevron; `aria-expanded` + `aria-controls` |
| Error message | `--color-error` | Adjacent to field and in summary |
| Headline result | `--font-size-2xl`, `--color-page-fg` | The product's primary output |
| Signal band | `--band-*-bg`, `--band-*-fg`, `--band-*-pattern`, `--band-border` | Pattern + icon + label |
| Band legend | All band tokens | Always visible, not toggleable |
| Data table | `--color-page-fg`, `--color-field-border` | Semantic HTML table |
| Low confidence | `--band-border` (dashed variant) | Overlay on any band |
| Skip link | `--color-focus`, `--color-page-bg` | First focusable element |
| Departure header | `--font-size-2xl`, `--color-page-fg`, `--color-muted` | `<h1 tabindex="-1">` with context text |
| Departure list | `--color-page-fg`, `--color-field-border`, `--target-min`, `--color-muted` | `<ol>` of `<a>` links; 44px tap targets |

---

## Decisions log

| Decision | Reasoning |
|---|---|
| No traffic-light colours | Fails 1.4.1 for colour-blind users; amber fails 7:1 contrast; cliche |
| System font stack | Faster loading on train connections; respects user preferences |
| Value ramp (lightness = quality) | Degrades to greyscale by construction; hue is reinforcement only |
| Borders separate bands, not fill contrast alone | Achieving 3:1 between all adjacent band fills AND 7:1 text on each is mathematically impossible with four bands; borders provide the non-text contrast boundary |
| Patterns as CSS gradients, not images | Scale with zoom; work at any size; no additional HTTP requests |
| 40rem max-width | Approximately 80 characters at 16px; fits at 200% zoom without horizontal scroll |
| 4px spacing base | Clean multiples; 44px target size = 11 units = 2.75rem |
| Tunnel gets its own border colour | A single border colour cannot achieve 3:1 against both light fills and the dark tunnel fill |
| Low confidence as overlay, not fourth band | Keeps the three-band model simple; confidence is orthogonal to signal quality |
| Departures as links, not radio + submit | The action is reversible (press Back), so the extra confirm step adds friction without safety; links are the native web pattern for "pick a page" |
| Departure link focus ring inset (-2px offset) | Full-width stacked links overlap if the focus ring is outset; inset ring is visually contained while meeting 3:1 contrast |
| No list markers on departure list | The departure times and chronological order serve as identifiers; numeric markers add noise without value |
| Disclosure toggle uses existing secondary button | No new colour pairing needed; the outline style is visually distinct from the filled primary button; the chevron adds a disclosure cue |
| Toggle label "Add/Remove departure time" | "Add" is accurate (the user is adding optional info); "Remove" is clear on collapse; both read at Grade 4 |
| Progressive enhancement: server renders full form | Without JS the form is complete and functional; JS enhances by hiding optional fields behind a toggle |
| `hidden` attribute, not CSS `display:none` | Semantic HTML attribute; removed from tab order and accessibility tree without relying on CSS cascade |
| Submit-without-time auto-reveals fields with prompt | Until route-overview mode exists, the form cannot produce results without a time; the prompt is in response to user action (3.2.5) |
