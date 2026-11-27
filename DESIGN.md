# Vaela Table: design rules

The Table app wears the **Saturday Signature** kit, Saturday Solutions skin (`saturday/`). Interaction rules follow **Felt** (Mike's game-app design principles: one decision per screen, tips not captions, motion bands, inline validation). This file records what the Table adds on top. When this file and a kit default disagree, this file wins for the Table.

## Brand

The logo suite is Mike's art (2026-11-27), kept as source in `../design/brand/`. `scripts/make-icons.mjs` cuts every app file from it.

| Use | File | From |
|---|---|---|
| Header mark (36 px, rounded) and favicon | `brand/vaela-mark.webp`, `favicon.png` | Gilded V, tight crop |
| App icons (home screen, install) | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Gilded V with wings |
| Opening book | `brand/vaela-emblem.webp` (cover), `brand/vaela-wordmark.webp` (pages) | Emblem; "Vaela, Chronicles of the Third Age" banner |

The faction emblems (`emblems-set-a.webp`, `emblems-set-b.png`) are not used yet: which emblem belongs to which faction is Mike's call.

## Words on the page

| Rule | Detail |
|---|---|
| No eyebrows | No small label above a heading ("No dice at hand", "Player kit"). The heading carries the page. |
| No subtitles that restate | A line under a heading stays only if it carries information the page lacks elsewhere. "Rolls here stay on this device" is gone. |
| Explanations live in tips | A heading that needs explaining becomes a tip header: the heading text plus a small "i" circle. Tapping it opens the explanation; tapping anywhere else closes it (`.sat-tip`, `saturday.js`). |
| Free text shows at a glance | Any answer longer than a few words is a textarea that grows with its text (min 2 to 4 rows). One-line inputs only for names, pronouns, skills. Your move and Private chat grow too, up to 60% of the screen. |
| No unexplained terms | A field that names something in the world (the Board, Force, Vaelan proficiency) carries a tip saying what it is. A choice with a fixed set of answers is a dropdown, short enough to read at 375 px. |
| Field hints are tips too | A form hint sits behind an "i" button beside the label, not as grey text under the field. |
| Status over captions | Show what changed ("New" badge, "2 new") instead of describing the page. |

Test for any line of small text: would a player miss it if it were gone? If not, delete it.

## Pages

| Rule | Detail |
|---|---|
| Five sections | Table, Inbox, Dice, Kit, Sheet. Bottom tab bar on phones, top bar on wide screens. |
| Subpages as notebook tabs | Long content splits into subpages, reached from tabs at the top of the section (`.subtabs`), not by scrolling. A subpage with nothing in it gets no tab. |
| Hash routes | `#section/sub`. Old links (`#world`, `#rules`, `#session`, `#start`, `#commission`) still resolve. The last subpage per section is remembered for the browser session. |
| Chapter turn | Moving forward turns the page like a book chapter; moving back turns it the other way (View Transitions, CSS fallback). Pages are paper: **fully opaque, never faded**. The turning page bends slightly and settles; the page underneath sits in its shadow (brightness, not transparency). About 440 ms. Off under reduced motion. |
| Opening book | Once per browser session a navy book with the gilded V on its cover opens on the "Vaela, Chronicles of the Third Age" banner, then fades into the Table (about 3 s). Tap to skip. Off under reduced motion. |
| Header | Sticky glass bar. Installed on a phone, the body starts below the status bar (`--safe-top`), so the bar never slides over the page title. The strip behind the bar blurs and tints what scrolls under it; its bottom edge fades. On phones the bar stays one row at any text size. |
| Text size | Five steps (Small, Standard, Large, Larger, Largest: 87.5 to 137.5% of the root). Font tokens are rem and spacing px, so words scale and the layout holds. "Aa" in the header opens a slider; a mouse wheel over it steps through. Kept on the device (`vaela-text-size`), applied in `<head>` before first paint. |
| Taps | No double-tap zoom (`touch-action: manipulation`). Pinch zoom still works. |
| One screen on a phone | Each subpage aims to fit 375 x 812 above the tab bar. Never any sideways scroll at 375 px. |

## Formulae, references, lookups

| Mark | Look | Used for |
|---|---|---|
| `.formula` | Mono, accent colour | Anything a player computes: `d20 + ability modifier`, `floor((score - 10) / 2)`, `1d8 + CON mod`. Long ones (`.formula--long`) may wrap at a space. |
| `.ref` | Small, muted, italic | Source pointers in brackets: (D17), (PH - Spells). |
| `.lookup` | Grid of small cells, key above value | Any "a = b, c = d" list of 3 or more pairs, such as the modifier table. Never a run-on sentence of pairs. |

`src/enhance.ts` applies these marks to sheet and rules text automatically. Hand-written HTML uses the same classes.

## Dice

- The player rolls and reports the raw dice. The app never adds modifiers: the DM adds bonuses.
- The result is decided first (`crypto.getRandomValues`), then the dice animate to it: thrown in, bounce, spin, faces flicker down to the final value.
- The page is a tray, not a form: tap a die on the shelf to put it in, tap it in the tray to take it out.
- Advantage and disadvantage: a graduated slider (Disadvantage, Normal, Advantage), shown only with exactly one d20 in the tray. A second d20 fades in; the dropped one is dimmed.
- Recent rolls has its own subpage.

## Roll entry (called checks)

| Rule | Detail |
|---|---|
| One box per check | A raised box with the die's shadow (the d20 icon for d20 checks, the die name otherwise). The player types the result. |
| Inline validation | A wrong entry pulses red and a small popup says why ("21 is too high. A d20 shows 1 to 20."). Never a blocking dialog. |
| Roll for me | A toggle beside each box. On: the box reads "DM" and the DM rolls on the player's behalf. |
| Public or private | A check called on the post appears in Your move. A private check appears in Private chat and travels sealed. |
| Send needs every roll | Each check needs a result or Roll for me before Send works. |

## Character sheet

| Rule | Detail |
|---|---|
| Picker | The open inbox's character (pre-filled from its profile: name, class, scores, skills), the player's new-character drafts, and "+ New character". |
| New character | Belongs to the player who drafted it and stays on that device. It goes live, with its own inbox code, once every required field is filled and its Session 0 is played. |
| Save | Explicit. Switching away with unsaved changes asks once; a second pick discards them. |
| Share | Copy and Download give the same Markdown file for the DM, one bullet per field, required fields marked *. |
| Stats | Each score's label is a tip saying what it covers. Randomize rolls a d20 per score (the Vaela rule). The DM assigns HP, AC, RP, SP, Speed and Proficiency: said in the Stats tip, not as badges. |
| Identity | Physical description, Backstory and Reason for adventuring are three separate boxes. Licence sponsor and "why hired cheaply" are dropdowns; their tips explain the Board (the Survey Dispatch Board). An old free-text answer that matches no option is kept as its own choice. |
| Slots | Four slots for tools, skills and proficiencies; Primary and Secondary language. |
| Pre-made | "+ Random Golgotha character" fills every required field (`src/premade.ts`) from the player-facing Player Kit only. It is marked "Pre-made: ready to play": no Session 0. Lines and Veils stay for the player. |

## Players and letters

| Rule | Detail |
|---|---|
| Several players per device | Each player signs in with their code once; "Switch player" changes who is active and keeps everyone signed in. "Lock inbox" signs the active player out (forgets the code). After the app is closed, the pick shows who is signed in. |
| Welcome letter | A letter opens over the page the first time each player signs in after the app opens. Closing the app resets it (session storage), so it shows again on the next open, not on every sign-in. Test text for now. |

## Table page

Two boxes, side by side on wide screens: **Your move** (answers everyone sees) and **Private chat** (sealed thread with the DM). Their headers are tip headers carrying the explanation.

## Motion bands (from Felt)

| Band | Duration | Examples |
|---|---|---|
| Press | 100 to 200 ms | Button and die press |
| Standard | 200 to 300 ms | Fades, slider, tip open |
| Screen | 300 to 400 ms | Chapter turn |
| Loader | 500 ms and up | Opening book, dice throw |

Every animation has a reduced-motion version (no movement, or an instant change).
