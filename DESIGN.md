# DangoChains web design system

One visual system for dangochains.com: the home page, the three games (`/play/`, `/bridge/`, `/make/`),
the study pages and the text pages. Everything lives in `assets/css/site.css` (plain CSS, no Sass, no
framework); this note explains the choices so later changes stay consistent.

## Idea

A wagashi-shop counter: warm rice-paper background, soft ink text, and the four dango balls from the app
icon as the only saturated colour. Rounded type and rounded tiles; motion that feels like something soft
being pressed. The game is the hero of every screen, so chrome stays quiet and flat.

## Tokens

All values are CSS custom properties on `:root`; dark mode overrides them under
`@media (prefers-color-scheme: dark)`. Components use tokens only, never raw colours.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FBF7EF` | `#1B1A17` | page |
| `--surface` | `#FFFFFF` | `#25241F` | cards, inputs, menus |
| `--surface-2` | `#F4EFE4` | `#2D2C26` | quiet panels, table heads |
| `--tile` / `--tile-hover` | `#ECE6D8` / `#E2DBCA` | `#35342D` / `#403F37` | game tiles |
| `--ink` / `--ink-2` / `--muted` | `#25241F` / `#4E4D43` / `#6A685C` | `#F4F0E6` / `#D2CEC1` / `#A9A698` | text (all ≥ 4.5:1 on every surface) |
| `--line` / `--line-strong` | `#E2DBCC` / `#8D8676` | `#3A3932` / `#7C796C` | hairlines / control borders (≥ 3:1) |
| `--primary` / `--on-primary` | `#5A594E` / `#FFFDF8` | `#EFEADC` / `#25241F` | selected tile, primary button |
| `--accent` / `--on-accent` | `#FFAD5C` / `#25241F` | same | the one main action per screen |
| `--link` | `#A3470A` | `#FFB870` | text links |
| `--good` / `--bad` | `#256B3B` / `#AD3B12` | `#8FD6A0` / `#FF9E80` | result text |
| `--gold` / `--gold-ring` | `#F2C230` / `#96690A` | `#F2C230` / `#F2C230` | golden tries |
| `--focus` | `#1F5FD1` | `#8DB8FF` | focus ring, used for nothing else |

**Group colours** (the app's dango balls; text on them is always dark ink, ≥ 8:1):

| Level | Fill (light / dark) | Soft tint (light / dark) | Second cue |
|---|---|---|---|
| easy | `#FF9FB2` / `#F892A7` | `#FFE5EA` / `#4B2E35` | 1 pip |
| medium | `#FFAD5C` / `#F7A654` | `#FFEBD6` / `#4A3622` | 2 pips |
| hard | `#B6CF6A` / `#ACC662` | `#EAF2D3` / `#333C1D` | 3 pips |
| expert | `#C8C8C8` / `#BFBFBA` | `#EEEDEA` / `#3A3A36` | 4 pips |

The four fills have almost the same luminance, so colour never stands alone: every coloured group
(solved band, review card, maker fieldset, legend) carries a row of **pips**, one to four, drawn by
`.dc-easy::before` … `.dc-expert::before`. Fills are for solved bands; soft tints are for anything that
holds body text or form fields.

## Type

- **Latin:** Nunito (variable, 500–900). **Japanese:** M PLUS Rounded 1c (500, 700), chosen from a
  specimen for the clearest furigana at 9–12 px. Both from Google Fonts, loaded without blocking render
  (`display=swap`); system fonts (Hiragino Sans, Noto Sans JP, Yu Gothic UI) are the fallback, and a
  metric-matched `Nunito Fallback` face keeps text from rewrapping when the web font arrives.
- Body is 16 px / 1.55 at weight 500; bold is 800. Headings are 800–900 with tight leading and
  `text-wrap: balance`.
- Scale: 12 · 13 · 14 · 16 · 18 · 20 · 24 · `clamp(28→36)` · `clamp(34→56)` (`--fs-xs` … `--fs-display`).
- Japanese text is marked `lang="ja"`: `line-break: strict` (no line starts with ゃゅょっー), and words on
  tiles are split into lines by the engine at a legal break, then sized with container units so the
  longest line fills the tile. Nothing wraps on its own, so nothing overflows at 360 px.
- **Furigana:** `rt` is 50% of its base on tiles (never under 9 px) and 55% in running text, weight 500,
  `user-select: none` so copying a word copies the word. Lines that carry ruby get extra leading.
- Numbers that tick (countdown, tries) use `font-variant-numeric: tabular-nums`.

## Space, shape, depth

- Spacing: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 72 (`--s-1` … `--s-9`). Page gutter is 16 px (12 px at ≤ 380 px).
- Widths: game column 34 rem, prose 44 rem, page 68 rem.
- Radius: 8 (chips, inputs) · 12 (tiles) · 16 (cards) · 24 (hero panels) · 999 (pills, buttons).
- Depth is mostly flat. Tiles and buttons have a 2 px bottom **lip** (`--lip`) that disappears when
  pressed; cards use one soft shadow (`--shadow-1`); only floating things (menu, toast) use `--shadow-2`.

## Components

- **Header** (`_includes/header.html`): logo, the **game switcher** (Daily · 熟語 Bridge · Make, a
  segmented pill with `aria-current`), then How to play / Past puzzles (in a `<details>` menu on phones).
- **Buttons** `.btn` (and `.dc-btn`, the name the game scripts use): `.btn-accent` (one per screen:
  Play, Submit, Share), `.btn-primary`, default (outlined), `.btn-quiet`. 44 px minimum target, visible
  label. A disabled accent button goes neutral, so Submit visibly wakes up when four words are picked.
- **Tabs** `.dc-tiers`, `.br-tiers`: segmented control for Easy / Normal / Hard with a result badge.
- **Tile** `.dc-tile`, `.br-opt`: `--tile` fill + lip; hover lifts the fill; selected = `--primary`
  with a small pop; wrong = shake; solved tiles hop, then merge into the band.
- **Group band** `.dc-group` and **review card** `.dc-rv-group`: level fill or tint + pips.
- **Tries** `.dc-dots`, `.br-tries`: dango on a skewer; a lost try pops and leaves an outline.
- **Status line** `.dc-status`: one row under the board with the status pill `.dc-msg` (`role="status"`) beside the tries, so a message never moves the buttons. "One away…" gets its own colour and nudge. Bridge's `.br-msg` is a full sentence, so it keeps its own line.
- **Result card** `.dc-end`, `.br-end`: outcome, guess grid, streak, Share, countdown, next board, then the words.
- **Cards** `.card`, **notices** `.dc-notice`, **forms** `.dc-form`, **prose** `.prose` (text pages and study pages).

## Motion

120 ms for presses, 200 ms for state, 350–500 ms for reveals; `--ease-out` for movement and
`--ease-spring` for pops. Everything decorative is inside `@media (prefers-reduced-motion: no-preference)`;
with reduced motion the games skip their sequences and show the result at once.

## Accessibility

- WCAG AA contrast in both themes (checked for every text/background pair above).
- One focus style everywhere: 3 px `--focus` ring with a 2 px gap, on `:focus-visible`.
- Real `<button>`s and links with text labels; state in ARIA (`aria-pressed`, `aria-selected`,
  `aria-current`, live regions for results).
- No horizontal scroll at 360 px; touch targets ≥ 44 px.

## Checking a change

`scripts/ui-tests/` plays scripted games in a headless browser and compares a branch with `main`:
share text, storage, analytics events and URLs must match exactly; layout must hold from 320 to 1280 px
(every word of every board in the feed is measured against its tile); the axe audit must stay clean in
both themes. See its README.

## What must not change

The redesign is presentation only. Game rules, the share text, URL parameters (`?d=`, `&t=`, `#b=`),
localStorage keys and GA4 event names/parameters are the same as before; `feed/`, `bridge/data/` and
`assets/data/readings.json` are generated and untouched.
