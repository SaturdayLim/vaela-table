# Saturday Signature: writing and caption voice (v1.0.3)

Status: **APPROVED by owner, 26 Oct 2026.** The rules below come from the owner's edits to the v1.0.0 draft. When a rule and a sample disagree, the rule wins. To change the voice, edit a sample, update the matching rule, and bump the version.

## 1. Voice

1. **Plain and direct.** Say what it is or what to do. Short sentences.
2. **Numbers carry the point.** Lead with the figure, then the comparison, then the base in brackets.
3. **Brackets hold the qualifier.** Units, periods, bases, scope and formats go in round brackets: `(9Lc)`, `(F27)`, `(30,000)`, `(Employees Only)`, `(e.g. 48000)`.
4. **Shorthand is welcome when it is standard.** Use `=`, `+`, `<`, `>=` and the abbreviations in section 3. Spell out anything not in that list.
5. **No verbal contractions.** Write "does not", "unable to", not "doesn't", "didn't". (Date forms like `Oct'26` are not contractions.)
6. **Honest about gaps.** Say what is not tested, partial or estimated.
7. **No filler.** No "please", "simply", "successfully", "just", no exclamation marks, no middle-dot chains.

## 2. Case

| Text | Case | Example |
|---|---|---|
| Page titles and subtitles | Title Case | `Stock Projection (F27)`, `World Markets` |
| Card and section titles | Sentence case | `Top markets (F26)`, `Volume by quarter` |
| Captions above values, table headers | UPPERCASE, qualifier in brackets keeps its own case | `STOCK COVER (months)`, `VOLUME (9Lc)` |
| Buttons | Sentence case | `Export report`, `Create event` |
| Body, tooltips, errors, empty states, status | Sentence case | `PIN does not match this event.` |
| Roles and named things | Capitalised | `Organiser`, `Judge`, `Events tab`, `"Now pouring" toggle` |

In HTML, wrap the bracketed qualifier of a caption or table header in `<span class="sat-qual">` so the CSS does not uppercase it: `<span class="sat-caption">Stock cover <span class="sat-qual">(months)</span></span>`. Do the same for a lowercase `v` in a table header: `<th><span class="sat-qual">v</span> F25</th>`.

## 3. Notation

### Periods

- Every quarter or to-date figure names its year type: **F** = financial year, **C** = calendar year.
- **The financial year runs July to June.** F27 = Jul'26-Jun'27. F27Q1 = Jul-Sep'26, F27Q2 = Oct-Dec'26, F27Q3 = Jan-Mar'27, F27Q4 = Apr-Jun'27.
- Quarters: `F26Q2`, `C26Q1`. Never `Q2` alone, `Q2 2026` or `Q2 of F26`.
- Years: `F26`, `C26`.
- A named month needs no F or C: `Oct'26`. Ranges: `Jan-Sep'26`.
- Full dates in source lines: `13 Oct 2026`.

### Brand names

- **Código 1530**, always with the accent, wherever the name appears: titles, captions, file names people read, alt text and messages.
- Product names keep their accents too: **Añejo**, **Extra Añejo**.
- Code identifiers stay plain ASCII (`data-skin="codigo"`, `skin-codigo.css`) because accents in file names and attributes break on some systems. Anything a person reads uses the accent.

### Units

- Standard volume unit: **9Lc** (9-litre cases). Thousands: `14.9k 9Lc`.
- "Cases" alone is not allowed. If a page uses cases, the footnote says which: 9-litre cases, or physical cases with the pack size per product (for example Origen = 3-pack, Añejo = 6-pack).
- Money: currency in the caption or after the value, `(USD)`, `$4.21m`.

### Numbers

- Thousands separated by commas: `45,888`.
- Large values shortened with lowercase `k` and `m`: `14.9k`, `$4.21m`. Up to 3 significant figures.
- Negatives with a minus sign: `-1,240`. Never in brackets (brackets hold qualifiers).
- Percentages to one decimal: `39.3%`.

### Period abbreviations

Build any period from these parts. The examples are the common ones; any combination that follows the parts is allowed.

| Part | Meaning |
|---|---|
| `D` `W` `M` `Q` | day, week, month, quarter |
| `FY` `CY` `Y` | financial year, calendar year, year (use FY or CY whenever the difference matters) |
| `TD` | to date (up to today) |
| `TEOM` | to end of month (up to the last closed month) |
| `-n` after a period | n periods back: `M-1` previous month, `Q-2`, `FY-1` previous financial year |
| `P` before a period | previous: `PFYTD` = `FY-1TD` |
| `L` + n + period | last n periods: `L12M`, `L4Q` |
| `N` + n + period | next n periods: `N3M`, `N2Q` |
| `o` between two periods | on (change over that step): `MoM`, `QoQ`, `YoY` |

| Example | Meaning |
|---|---|
| MTD, QTD, FYTD, CYTD | month, quarter, financial year, calendar year to date |
| M-1TD | previous month to the same day |
| FY-1TD or PFYTD | previous financial year to the same point |
| YTEOM, CYTEOM, FYTEOM | year, calendar year, financial year to end of month |
| L12M | last 12 months |
| N3M | next 3 months |
| MoM, QoQ, YoY | month on month, quarter on quarter, year on year |

### Other abbreviations

| Abbreviation | Meaning |
|---|---|
| 9Lc | 9-litre cases |
| vol | volume |
| mktshare | market share |
| v | versus (comparisons: `v F25`, `v F25Q3`) |

## 4. Pattern rules

- **Caption above a value:** UPPERCASE, 2 or 3 words, unit or basis in brackets. The period lives in the page subtitle, not the caption. The number below carries no unit of its own.
- **Delta:** arrow, sign, colour, `v`, comparison period, base in brackets. `▲ 39.3% v F25 (32,942)`. Flat is grey `0.0%`.
- **Chart caption:** finding first, written as an equation where it fits, in bold. `**Peak = F26Q3 (14.9k 9Lc)**, up 53% v F25Q3.`
- **Caveats go in an info button (tip), not in a second caption line.**
- **Source line:** `Source: <system> (<date>). <unit or coverage note>.`
- **Tooltips:** as many sentences or short paragraphs as needed for the reader to see how the figure is calculated without leaving the page, as long as the tip fits on one screen without scrolling. Formulas are fine: `Value = Invoiced revenue (USD) at the spot FX rate.`
- **Buttons:** verb first. Generated buttons say what you get (`Show 35 markets`). Fixed buttons stay short (`Show all`) and rely on their placement for scope.
- **Errors:** what is wrong, then what to do, with a format example in brackets.
- **Confirmations:** say where the result went (`Data Saved in local cache`, `Report exported to Downloads`).
- **Instructions:** heading with time in brackets, then numbered steps, one action each, even for two steps. Format hints and placeholders in brackets.
- **Summaries:** `Done: … Not yet verified: … Next: …`, or `Keep.` / `Changed.` followed by the reason.

## 5. Samples (owner-approved)

Samples marked † were normalised to the rules above (unit 9Lc, `v`, year type on quarters, July-June financial year). Everything else is as the owner wrote it.

### A. Page titles and subtitles

- **A1** Title: `Stock Projection (F27)` / Subtitle: `Arrivals, Depletions, Closing Stock by month`
- **A2** Title: `World Markets` / Subtitle: `Código 1530 Distribution Map (F26), by volume (9Lc) and value (USD)` †
- **A3** Title: `Margarita Challenge` / Subtitle: `2026 Singapore (Employees Only), 14 November 2026`

### B. Captions above values

- **B1** `ACTIVE MARKETS`
- **B2** `VOLUME (9Lc)` †
- **B3** `STOCK COVER (months)`
- **B4** `TOP MARKET (by vol)`
- **B5** `LAST UPDATED`

### C. Deltas and comparisons

- **C1** `▲ 39.3% v F25 (30,000)` †
- **C2** `▼ 0.6 9Lc v YTEOM Target (30,000)` †
- **C3** `0.0% v F25 (30,000)` (flat, grey) †
- **C4** `▲ 1,240 9Lc v M-1TD (30,000)` †

### D. Chart captions

- **D1** **Peak = F26Q3 (14.9k 9Lc)**, up 53% v F25Q3. F27Q2 covers Oct'26 only. †
- **D2** **Spain + Philippines = 33% mktshare by volume.** All other individual markets <10%.
- **D3** **Safety Level Warning: March.** Info button: "Possible to avoid stock warning if Feb order arrives earlier."

### E. Source and footnote lines

- **E1** `Source: QuickBooks snapshot (13 Oct 2026). Volume in 9Lc.`
- **E2** `Source: Distributor depletion reports, Jan-Sep'26. Oct'26 partial based on MTD submissions.`
- **E3** `Hybrid markets with Direct <10 9Lc/FY considered as PR.` (wording sample only; the threshold is a placeholder, not a business rule)

### F. Tooltips

- **F1** An active market has >=1 invoice during the period.
- **F2** Value = Invoiced revenue (USD) at the spot FX rate.
- **F3** Stock cover (months) = (closing stock) / (average N3M demand).

### G. Buttons

- **G1** `Export report`
- **G2** `Show 35 markets` (generated: says what you get)
- **G3** `Reset`
- **G4** `Create event`
- **G5** `Show all` (fixed buttons only; placement shows which filter it releases)

### H. Empty states

- **H1** Heading: `No sales in this period` / Body: `Try a wider date range or switch Top 10 off.` / Button: `Show all` †
- **H2** Heading: `No events` / Body: `Create the first event to generate Organiser and Judge PINs.` / Button: `Create event`

### I. Errors

- **I1** `Use numbers only (e.g. 48000).`
- **I2** `PIN does not match this event. Check the PIN in the Events tab.`
- **I3** `Sheet unable to load. Check internet connection and reload page to try again.`

### J. Confirmations and status

- **J1** `Data Saved in local cache`
- **J2** `Report exported to Downloads`
- **J3** `Scores updated 4 seconds ago`
- **J4** `Not yet tested on a live event`

### K. Instructions

- **K1** One-time setup (10 minutes)
  1. Open the Web app link (insert web link).
  2. Type the owner PIN (alphanumeric, 4-6 characters).
  3. Add event name, city, and date.
  4. Click **Create event**.
- **K2**
  1. Draw a name from the hat.
  2. Tap the "Now pouring" toggle next to the corresponding name.

### L. Report and handover summaries

- **L1** `Done: v2 kit built and score-keeping tested (30 dummy contestants). Not yet verified: Button function from live slideshow. Next: Test full-run for button functionality.`
- **L2** `Keep. Opens on F26 (to match the slide numbers).`
- **L3** `Changed. The legend moved to bottom left because bottom right would cover Australia.`

## 6. Owner notes (26 Oct 2026, as written)

- Confirmed 26 Oct 2026: financial year July to June; numbers as `$4.21m`, `14.9k`, `-1,240`; `v` for comparisons; Title Case for page titles only; accents always on Código 1530 and Añejo; Saturday Shakes logo as the Saturday mark, with the wordmark "Saturday Shakes"; E3 threshold is a placeholder.
- Abbreviations confirmed: M-1TD, YTEOM, CYTEOM as listed, and the same pattern extends to any period (MoM = month on month, FY-1TD or PFYTD = previous financial year to date, N3M = next 3 months).
- Use C26Q1 or F26Q2 for consistency. Use contractions like "M-1", "L12M", "N3M", "CYTEOM" or "FYTD". Years should always be indicated as either "F" or "C", whenever to-date or quarters are referenced. "Oct'26" does not require F or C because it is a specific identifier.
- We can use "9Lc" as the standard unit, but where we want to use "cases", it must be specified in the footnote as physical or 9L cases. If physical cases are used, specify what are the conversion units (e.g. Origen = 3pack, Añejo = 6pack, etc.)
- Tooltips can have multiple sentences or even paragraphs, as long as they fit into the box on a single screen. It must provide sufficient information to understand how the figure is calculated without leaving the page. *(Ending confirmed by owner, 26 Oct 2026.)*
