# Saturday Signature: design rules (v1.0.3)

These rules apply to every Saturday Portfolio project. The kit's CSS already follows them; this file explains them so a new screen made by hand (or by Claude) follows them too. Open `demo/index.html` to see each rule in use.

## 1. Five principles

1. **Readable before pretty.** Glass is decoration. Text contrast never drops below 4.5:1, in either theme, wherever the text sits on the page.
2. **Surfaces say what they do.** Glass holds content. A well holds controls. A flat outline holds information only. A solid surface holds dense data.
3. **One accent per view.** Teal (or Código gold) marks the one primary action and the current state. Everything else stays neutral.
4. **The same thing looks the same everywhere.** A caption, a delta, a switch: one style each, in every project.
5. **Phones are not small desktops.** Touch gets bigger targets, a bottom bar and bottom sheets. Hover never hides information.

## 2. Glass

### Levels

| Class | Use for | Light | Dark |
|---|---|---|---|
| `.sat-glass` | Cards, panels, header bar | white 58% | ink 68% |
| `.sat-glass-2` | Anything above glass: sheets, popovers, sticky bars, tables | white 78% | ink 84% |
| `.sat-well` | Tray behind segmented controls and inputs | ink 6% | black 28% |
| `.sat-flat` | Information only (never looks pressable) | outline | outline |
| `.sat-solid` | Third layer, print, dense data | solid | solid |

### Recipe

Background tint, 1px light edge, an inset 1px top highlight, a soft drop shadow, and `backdrop-filter: blur(18px) saturate(160%)`. Blur drops to 12px on touch screens to keep scrolling smooth.

### The dark-mode rule

**In dark mode, glass is a dark tint, never a white film.** A white film (for example `rgba(255,255,255,0.07)`) lets a bright background colour shine through, and light text then sits on a light patch. The first mockup did this and muted text measured 1.07:1. The kit's dark glass is `rgba(14,20,24,0.68)` over a mesh dimmed to 32%, and its worst case is 7.6:1 for muted text.

### Limits

- At most **two glass layers stacked**. A third layer uses `.sat-solid`.
- **Tables and dense numbers sit on `.sat-glass-2` or `.sat-solid`**, never on `.sat-glass`.
- No glass on glass inside the same card for decoration. Inside a card, use `.sat-well` or a hairline.
- The mesh (`body.sat::before`) is the only colour field. Do not add photos or gradients behind glass without rerunning the contrast check against them.

### Fallbacks (built in)

- Browser without `backdrop-filter`: glass becomes solid.
- `prefers-reduced-transparency`: glass becomes solid.
- `prefers-contrast: more`: solid surfaces and stronger edges.
- Print: white, no mesh, no blur.

## 3. Type

| Role | Font | Size | Notes |
|---|---|---|---|
| Display | Instrument Serif 400 | 44 to 72px fluid | Hero only, one per page |
| H1 | Instrument Serif 400 | 32 to 48px fluid | Page title |
| H2 | Instrument Serif 400 | 24 to 32px fluid | Card and section titles |
| H3 | Geist 600 | 18px | Small panel titles, table titles |
| KPI | Instrument Serif 400 | 32 to 44px fluid | Big numbers, tabular figures |
| Body | Geist 400 | 15px desktop, 16px touch | Line length up to 68 characters |
| Small | Geist 400 | 13px | Hints, table cells, supporting text |
| Caption | Geist 600, uppercase | 12px, +0.14em tracking | Labels above values |
| Mono | Geist Mono 500 | 13px | Deltas, codes, IDs, dates in tables |

Rules:

- **Instrument Serif has one weight. Never bold it.** `font-synthesis: none` blocks the browser from faking bold. For emphasis in a heading, use the italic: `<em>` turns teal.
- Numbers that line up (tables, KPIs, deltas) use tabular figures: `.sat-num`, `.sat-kpi`, `.sat-mono`.
- Nothing smaller than 12px. Nothing lighter than 400.
- Title Case for page titles and subtitles only. Sentence case for card and section titles, buttons, body, tooltips and errors. Uppercase only for `.sat-caption` and table headers, and their bracketed qualifier keeps its own case through `.sat-qual` (see `WRITING.md` section 2).
- **Código skin:** display font is Baskerville (`Baskerville Brand` if installed, else bundled Libre Baskerville). Captions use `Engravers Gothic` if installed, else Geist. The licensed brand fonts are not in this zip.

## 4. Captions and labels

The approved voice, notation and samples are in `WRITING.md`. It wins over this summary.

1. **Caption above a value:** uppercase, 2 or 3 words, unit or basis in brackets: `VOLUME (9Lc)`, `STOCK COVER (months)`. Wrap the bracket in `<span class="sat-qual">` so it keeps its case. The number below carries no unit; the period sits in the page subtitle.
2. **Delta = arrow + sign + colour + `v` + comparison + base:** `▲ 39.3% v F25 (32,942)`. Never colour alone. Flat change is grey `0.0%`.
3. **Periods name their year type:** `F26Q3`, `C26Q1`, `FYTD`. A named month needs none: `Oct'26`. The financial year runs July to June (F27 = Jul'26-Jun'27).
   Numbers: `45,888`, `14.9k`, `$4.21m`, `-1,240`, `39.3%`.
4. **Standard unit is 9Lc.** "Cases" alone is not allowed (see `WRITING.md` section 3).
5. **Chart caption: finding first, in bold, as an equation where it fits:** "**Peak = F26Q3 (14.9k 9Lc)**, up 53% v F25Q3." Not "Chart showing quarterly volume".
6. **Caveats go in an info tip, not a second caption line.**
7. **Source line under every chart and table built from data:** `Source: QuickBooks snapshot (13 Oct 2026). Volume in 9Lc.`
8. **Tooltips explain how the figure is counted.** Several sentences are fine if the tip fits on one screen.
9. **No middle-dot chains, no truncated captions or market names, and Código always with the accent.**

## 5. Colour

All colours live in `tokens/tokens.json`. Use the token, never the hex.

| Token | Use |
|---|---|
| `--sat-text` | Body and headings |
| `--sat-muted` | Captions, hints, secondary text (passes 4.5:1 on all glass) |
| `--sat-faint` | Placeholders and disabled only; never for information |
| `--sat-accent` | Charts, highlights, chip borders |
| `--sat-accent-fill` / `--sat-on-accent` | Primary button and active switch |
| `--sat-accent-text` | Links and accent words on glass |
| `--sat-pos` / `--sat-neg` / `--sat-warn` | Up, down, caution |
| `--sat-line` / `--sat-line-strong` | Hairlines, dividers, inactive tracks |

`node tools/check-contrast.js` tests every text colour on every surface (glass-1, glass-2, solid, well) against the brightest point of the mesh, for both skins and both themes. Run it after any colour change. It must print `All 120 checks pass.`

## 5b. Logo (Saturday skin)

- The mark is the Saturday Shakes shaker: a Boston shaker outline whose two breaks form an S. Files in `assets/`.
- Inline `assets/saturday-shakes-mark.svg` with `class="sat-mark"`. It takes the `--sat-mark` colour (gold, darkened in light mode to keep 3:1 contrast) and keeps a 1.75px stroke at any size.
- Header lockup: mark at 32px high, then the wordmark "Saturday Shakes" in the display font.
- Minimum height 24px. Clear space equal to the mark's width on every side.
- Gold `#BBA77B` (`saturday-shakes-mark-gold.svg`) for dark backgrounds, print and slides. The triple-line PNG is for menus and print, not UI.
- Never fill, stretch, rotate or recolour it outside these two colours.
- Código pages use the Código wordmark, not the shaker.

## 6. Spacing and proportion

- **4px grid.** Use `--sat-space-1` (4) to `--sat-space-24` (96). Common steps: 8 inside controls, 16 between related items, 24 between groups, 48 to 64 between page sections.
- **Card padding:** 20px on phones and tablets, 24px on desktop.
- **Radius:** 8 small controls, 12 buttons and inputs, 16 wells and table frames, 22 cards, 28 sheets and dialogs, pill for chips and switches.
- **Nested corners:** inner radius = outer radius minus the padding between them. A 22px card with 4px padding holds an 18px child.
- **Widths:** content max 1200px; reading text max 68 characters (`.sat-read`).
- **Gutters:** 16px phone, 24px tablet, 32px desktop (`.sat-shell`).
- **Grids:** `.sat-grid` with `--sat-min` sets the smallest column width and lets the browser pick the count. KPI tiles 150px (2 across on phones), cards 240 to 320px.
- **Vertical rhythm:** captions sit 4px above their value; headings sit 16px above content; sections sit 24px apart inside a card.

## 7. Desktop and mobile

Decide by **input type first, width second.** `(hover: hover) and (pointer: fine)` means a mouse; `(pointer: coarse)` means a finger. Width only decides layout.

| | Desktop (mouse, 1024px and up) | Phone (touch, under 640px) |
|---|---|---|
| Targets | 40px buttons, 32px chips | 44px minimum for everything tappable |
| Primary action | In the header or card, top right | Bottom bar (`.sat-bottombar`), in thumb reach |
| Filters and options | Inline, or a centred dialog | Bottom sheet (`.sat-sheet` turns into one automatically) |
| Hover | Adds detail and highlights rows | Nothing depends on it; every tooltip opens on tap |
| Text | 15px body | 16px body and inputs (stops iOS from zooming) |
| Blur | 18px | 12px |
| Theme toggle | 3-way segmented (Auto, Light, Dark) | One icon button that cycles |
| Density | Tables and compact rows allowed | One column; tables scroll sideways inside their card |
| Keyboard | Every control reachable; arrows move segmented controls; Escape closes tips and sheets | Same, for external keyboards |

Tablet (640 to 1023px) uses the desktop components with phone targets if the pointer is coarse.

## 8. Which toggle when

| Control | Use when | Markup |
|---|---|---|
| Switch | An on/off setting that applies at once | `<button class="sat-switch" role="switch" aria-checked>` |
| Segmented | Pick one of 2 to 5 views of the same thing | `.sat-seg` + `role="radio"` buttons |
| Chip | Filters that stack (0 to many) | `<button class="sat-chip" aria-pressed>` |
| Theme toggle | Auto, light, dark | `data-sat-theme` buttons or one `data-sat-theme-cycle` button |
| Checkbox | A choice inside a form that saves later | native `<input type="checkbox">` |

A switch never needs a Save button. If the change waits for Save, use a checkbox.

## 9. Motion

- 120ms for hovers and presses, 200ms for toggles, 320ms for sheets and theme changes.
- Ease-out (`--sat-ease`) for everything; a small spring only on the switch thumb.
- Buttons scale to 97% while pressed.
- Entrance: `.sat-rise` with `--i` for a 50ms stagger. Use once per page, on first load only.
- `prefers-reduced-motion` sets every duration to 0.

## 10. Before you ship: checklist

1. `node tools/check-contrast.js` passes (if colours changed).
2. Page tested in light, dark and auto, and at 375px and 1280px wide.
3. No sideways scroll at 375px.
4. Every tap target is at least 44px on a phone.
5. Every chart has a finding-first caption and a source line; every quarter and to-date figure says F or C; volume is in 9Lc; Código and Añejo carry their accents.
6. No information sits behind hover only.
7. Keyboard: Tab reaches every control; focus ring visible.
8. "Código" spelled with the accent everywhere.
