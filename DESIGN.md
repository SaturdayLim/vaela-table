# Vaela Table: design rules

The Table app wears the **Saturday Signature** kit, Saturday Solutions skin (`saturday/`). Interaction rules follow **Felt** (Mike's game-app design principles: one decision per screen, tips not captions, motion bands, inline validation). This file records what the Table adds on top. When this file and a kit default disagree, this file wins for the Table.

## Words on the page

| Rule | Detail |
|---|---|
| No eyebrows | No small label above a heading ("No dice at hand", "Player kit"). The heading carries the page. |
| No subtitles that restate | A line under a heading stays only if it carries information the page lacks elsewhere. "Rolls here stay on this device" is gone. |
| Explanations live in tips | A heading that needs explaining becomes a tip header: the heading text plus a small "i" circle. Tapping it opens the explanation; tapping anywhere else closes it (`.sat-tip`, `saturday.js`). |
| Field hints are tips too | A form hint sits behind an "i" button beside the label, not as grey text under the field. |
| Status over captions | Show what changed ("New" badge, "2 new") instead of describing the page. |

Test for any line of small text: would a player miss it if it were gone? If not, delete it.

## Pages

| Rule | Detail |
|---|---|
| Five sections | Table, Inbox, Dice, Kit, Sheet. Bottom tab bar on phones, top bar on wide screens. |
| Subpages as notebook tabs | Long content splits into subpages, reached from tabs at the top of the section (`.subtabs`), not by scrolling. A subpage with nothing in it gets no tab. |
| Hash routes | `#section/sub`. Old links (`#world`, `#rules`, `#session`, `#start`, `#commission`) still resolve. The last subpage per section is remembered for the browser session. |
| Chapter turn | Moving forward turns the page like a book chapter; moving back turns it the other way (View Transitions, CSS fallback). Screen band: 300 to 400 ms. Off under reduced motion. |
| Opening book | Once per browser session a closed book with the V opens into the Table. Tap to skip. Off under reduced motion. |
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
