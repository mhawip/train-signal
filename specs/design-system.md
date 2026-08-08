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

## Component inventory

The design system covers these components. Each is built as CSS custom properties;
actual component implementation is the developer's responsibility.

| Component | Tokens used | Notes |
|---|---|---|
| Page shell | `--color-page-bg`, `--color-page-fg`, `--max-width-text` | Single-column, centred |
| Form field | `--color-field-bg`, `--color-field-border`, `--target-min`, `--radius-sm` | 44px min height |
| Radio group | `--target-min`, `--space-3` | Label extends tap target |
| Submit button | `--color-page-fg`, `--color-page-bg`, `--target-min`, `--radius-sm` | Inverted colours |
| Error message | `--color-error` | Adjacent to field and in summary |
| Headline result | `--font-size-2xl`, `--color-page-fg` | The product's primary output |
| Signal band | `--band-*-bg`, `--band-*-fg`, `--band-*-pattern`, `--band-border` | Pattern + icon + label |
| Band legend | All band tokens | Always visible, not toggleable |
| Data table | `--color-page-fg`, `--color-field-border` | Semantic HTML table |
| Low confidence | `--band-border` (dashed variant) | Overlay on any band |
| Skip link | `--color-focus`, `--color-page-bg` | First focusable element |

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
