# Vaela Table: design rules

The Table app wears the **Saturday Signature** kit, Saturday Solutions skin (`saturday/`). Interaction rules follow **Felt** (Mike's game-app design principles: one decision per screen, tips not captions, motion bands, inline validation). This file records what the Table adds on top. When this file and a kit default disagree, this file wins for the Table.

## Brand

The logo suite is Mike's art (2026-11-27), kept as source in `../design/brand/`. `scripts/make-icons.mjs` cuts every app file from it.

| Use | File | From |
|---|---|---|
| Header mark (36 px, rounded) and favicon | `brand/vaela-mark.webp`, `favicon.png` | Gilded V, tight crop |
| App icons (home screen, install) | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Gilded V with wings |
| Opening book | `brand/vaela-emblem.webp` (cover), `brand/vaela-wordmark.webp` (pages) | Emblem; "Vaela, Chronicles of the Third Age" banner |

Faction emblems (Mike's mapping, 2026-11-28) are single-ink masks in `brand/emblem-*.png`, painted in the accent ink so they work in light and dark. They sit beside each faction in the Player Kit's "Who runs things" table; the Transport Guild's anchor marks the Gantry heading.

| Emblem | Faction |
|---|---|
| Crystal under a moon, in an arch | The Celestial College |
| Open book with a star and a ring | The Arcane University |
| Shield with a cracked eye | The Rift Watchers |
| Shrine arch over the radiant hearth-flame (not a sun) | The Order of the Eternal Flame |
| Hand with a circle | The Hollow Hand |
| Anchor with a wing | The Transport Guild |
| Wave with a trident | Aquias (region; built, not shown until play reaches Aquias or a player is from there) |

The Bardic College has no emblem yet; its row keeps an empty slot so names stay aligned. Set the mask image inline: a `url()` inside a CSS custom property resolves against `assets/`, not the page.

## Words on the page

| Rule | Detail |
|---|---|
| No eyebrows | No small label above a heading ("No dice at hand", "Player kit"). The heading carries the page. |
| No subtitles that restate | A line under a heading stays only if it carries information the page lacks elsewhere. "Rolls here stay on this device" is gone. |
| Explanations live in tips | A heading that needs explaining becomes a tip heading: the heading itself is the button, marked by a dotted underline, with no "i" circle (Mike, 2026-11-28). Tapping it opens the explanation; tapping anywhere else closes it (`.sat-tip`, `saturday.js`). |
| Free text shows at a glance | Any answer longer than a few words is a textarea that grows with its text (min 2 to 4 rows). One-line inputs only for names, pronouns, skills. Your move and Private chat grow too, up to 60% of the screen. |
| No unexplained terms | A field that names something in the world (the Board, Force, Vaelan proficiency) carries a tip saying what it is. A choice with a fixed set of answers is a dropdown, short enough to read at 375 px. |
| Field hints are tips too | A form hint sits behind an "i" button beside the label, not as grey text under the field. |
| Status over captions | Show what changed ("New" badge, "2 new") instead of describing the page. |

Test for any line of small text: would a player miss it if it were gone? If not, delete it.

## Pages

| Rule | Detail |
|---|---|
| Five sections | Table, Inbox, Dice, Kit, Sheet. Bottom tab bar on phones, top bar on wide screens. |
| Page tabs are icons | Long content splits into subpages, reached from a row of tabs under the page title (`.subtabs`), not by scrolling. Each tab is one icon (`data-icon` on the subpage); the open tab opens out to its title (Felt's rule). The row always fits the screen width and cannot be dragged: never a long sideways list. A subpage with nothing in it gets no tab. |
| Hash routes | `#section/sub`. Old links (`#world`, `#rules`, `#session`, `#start`, `#commission`) still resolve. The last subpage per section is remembered for the browser session. |
| Page changes | Between sections (tab bar, top bar) the screen slides sideways like a scroll, about 360 ms. Between tabs of one section the page turns like a book page, about 440 ms; the page underneath comes out of its shade evenly, with no jump at the end. Both use View Transitions on the root snapshot (one screen tall), so a long page is never cut off half way; the header and tab bar hold still. Pages are paper: **fully opaque, never faded**. A second tap during a move finishes the first at once. Off under reduced motion. |
| Opening book | On every app launch (any page load except a reload: a new tab, a closed home-screen app opened again) a navy leather book opens on the "Vaela, Chronicles of the Third Age" banner, then fades into the Table (about 3 s). The cover is built in CSS, not a flat picture: leather grain, gilded double frame, spine bands, the V set into the leather with its square edges faded out, the title in gold leaf, the page block at the fore-edge. Tap to skip. Off under reduced motion. |
| Header | Sticky glass bar. Installed on a phone, the body starts below the status bar (`--safe-top`), so the bar never slides over the page title. The strip behind the bar blurs and tints what scrolls under it; its bottom edge fades. On phones the bar stays one row at any text size. |
| Text size | Five steps (87.5 to 137.5% of the root). Font tokens are rem and spacing px, so words scale and the layout holds. "Aa" in the header opens a narrow bar: a small A, the slider, a large A. No captions: the A's say what it does and look like keys to press. A mouse wheel over it steps through. Kept on the device (`vaela-text-size`), applied in `<head>` before first paint. |
| Theme | Follows the device's light or dark setting. A sun and moon switch in the header (the chosen mark rides on the knob) changes it for this app session; closing the app returns to the device setting. There is no Auto button: Auto is what you get by not choosing (`theme.ts`, `vaela-theme` in session storage). |
| Taps | No double-tap zoom (`touch-action: manipulation`). Pinch zoom still works. |
| One screen on a phone | Each subpage aims to fit 375 x 812 above the tab bar. Never any sideways scroll at 375 px. |

## Footer and version

The footer reads **"DnD Virtual table by Saturday Solutions vXX.XX.XX"** and nothing else: no build date, no "Content built" line, no description (Mike, 2026-11-28). The version is MAJOR.MINOR.PATCH, two digits each (v00.02.00). The version is a button: it opens the version history, one entry per release with its date and player-facing changes (`src/changelog.ts`; the newest entry sets the footer). Every push that changes what players see adds an entry.

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
| One box per check | A raised box with its die drawn as a watermark (d4, d6, d8, d10, d12, d20 outlines). While empty, the die's name (D4, D20) sits grey in the middle. The player types the result on a number-only keypad (`inputmode="decimal"`: no letters under the digits). |
| Roll for me | Rolls on screen: the number spins like a carousel and slows onto a fair result (advantage rolls two and says both). The player can still clear it and type a physical roll. |
| DM rolls | A toggle beside it hands the roll to the DM instead; on, the box reads "DM". |
| Inline validation | A wrong entry pulses red and a small popup says why ("21 is too high. A d20 shows 1 to 20."). Leaving the box with a wrong entry clears it. Never a blocking dialog. |
| Public or private | A check called on the post appears in Your move. A private check appears in Private chat and travels sealed. |
| Send needs every roll | Each check needs a result or DM rolls before Send works. Pressing Send with one empty puts a popup on that box: "Please enter Perception check result, or select Roll for me." |

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
| Sign in | Each player has a card. Tapping a card opens it out in place (the others stay visible) to six code boxes, one character each (Felt's OTP input): tap a box and type to replace it; a paste fills all six; the sixth character opens the inbox. A wrong code keeps the boxes and says so. Remember on this device is a switch in the open card. Tapping outside the card closes it. |
| Several players per device | Each player signs in with their code once; "Switch player" changes who is active and keeps everyone signed in. "Lock inbox" signs the active player out (forgets the code). Codes are shared by every tab of the browser; who is active is per tab, so two tabs can be two players. A fresh tab acts as the one player the device remembers; after Switch player the tab only watches. |
| Welcome letter | A letter opens over the page the first time each player signs in after each app launch (not after a reload). Test text for now. |

## Table page

The status line says only when the table was last checked; there is no "New turn at" notice. Earlier turns list what each player answered (from the relay, which keeps 12 hours). The practice turn (`?test`) lasts one page view: the address drops `?test` at once and the turn has a Leave the practice turn button, so a reload always shows the live table.

Two boxes, side by side on wide screens: **Your move** (answers everyone sees) and **Private chat** (sealed thread with the DM). Their headers are tip headers carrying the explanation.

A turn may open with a **scene picture** under its title: full card width, `--sat-radius-md`, at most 420 px tall (cropped to fit, `object-fit: cover`), alt text from `table.py scene --alt`. A live post can arrive before its picture is deployed: the picture hides, a muted line says it arrives with the site update, and the app tries again every 30 s (6 tries).

## Motion bands (from Felt)

| Band | Duration | Examples |
|---|---|---|
| Press | 100 to 200 ms | Button and die press |
| Standard | 200 to 300 ms | Fades, slider, tip open |
| Screen | 300 to 400 ms | Chapter turn |
| Loader | 500 ms and up | Opening book, dice throw |

Every animation has a reduced-motion version (no movement, or an instant change).
