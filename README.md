# DangoChains site

Live at https://dangochains.com/ (custom domain since 2026-11-09; the old juicypasta.github.io/DangoChains-Landing-Page/ URLs redirect; GitHub Pages builds `main`; Jekyll, `bundle exec jekyll build`).

- **`/play/`** (`_pages/play.md`, `assets/js/dango-daily.js`): the free web daily. Today's three boards for the visitor's local date, `?d=YYYY-MM-DD&t=easy|medium|hard` for one board (the last 7 days play; older dates point to the app's archive), and custom boards from `#b=…`. Progress lives in localStorage only.
- **`/make/`** (`_pages/make.md`, `assets/js/dango-make.js`): make-your-own board; the whole board is base64url JSON in the link's fragment (format in `assets/js/dango-board.js`).
- **`assets/js/dango-board.js`**: the shared board engine, furigana parsing, share text.
- **`feed/v1/`**: the puzzle feed, a build artifact the web and the app read. Regenerate it at least monthly (it covers through the end of next month) and whenever puzzles change: `uv run --no-project --with pyyaml python ~/code/Projects/DangoChains/scripts/build_feed.py --out feed`, then `python3 scripts/build_study.py`.
- **`assets/data/readings.json`**: the maker's readings, from the app's `furigana.yaml`: `python3 scripts/build_readings.py`. Fallbacks: `assets/data/readings-jmdict.json` (readings) and `assets/data/glosses-jmdict.json` (suggested meanings, lazy-loaded) from JMdict's common words (CC BY-SA, attribution on /make/): `python3 scripts/build_jmdict_readings.py <jmdict-eng-common-*.json>` (jmdict-simplified releases).
- **`/study/`** (generated, don't hand-edit): `python3 scripts/build_study.py` writes the hub, one page per past day (through yesterday ET; groups behind `<details>`), and `/study/topics/<slug>/` (groups matched by name patterns in `TOPICS`; only boards 8+ days old). `--check` exits 1 when pages are stale. The `study-pages.yml` Action runs it daily at 11:17 UTC, pushes, requests a Pages build and announces the new page to IndexNow. Generated pages aren't in the `pages` collection, so the header/footer link them by hand.
- **Search:** `sitemap.xml` (jekyll-sitemap) + `robots.txt`; Google Search Console property https://dangochains.com/ (jackson.darrow@gmail.com, verified through GA4); IndexNow key file at the root, `python3 scripts/indexnow.py [URL…]` (no args = whole sitemap).
- **Icons:** `favicon.ico`, `assets/icon-48.png`, `assets/apple-touch-icon.png`, `manifest.webmanifest` (`app_icon` in `_config.yml` points at `assets/icon-512.png`, so nothing depends on the theme's iTunes-lookup JS).
- Share links and canonical URLs come from `url` + `baseurl` in `_config.yml`; change both when the custom domain goes live.

## Design and front end

One visual system for every page and all three games, described in [DESIGN.md](DESIGN.md) (tokens, type, components, motion, accessibility). Redesigned 2026-11-10.

- **`assets/css/site.css`**: the only stylesheet. Plain CSS with custom properties (light and dark via `prefers-color-scheme`); no Sass, no framework. Use the tokens, never raw colours.
- **Layouts:** `_layouts/base.html` (head, header, footer), `default.html` (the home page), `page.html` (text pages and the generated study pages, as `.prose`), `game.html` (`/play/`, `/make/`, `/bridge/`).
- **Includes:** `head.html` (meta, icons, fonts, GA4), `header.html` (logo, the game switcher, menu), `footer.html`, `demo-board.html` (the still board on the home page and How to Play), `dango-mark.html`, `icon.html` (feature icons, keyed by `fontawesome_icon_name` in `_config.yml`).
- **Fonts:** Nunito (Latin) and M PLUS Rounded 1c (Japanese) from Google Fonts, loaded without blocking render. Nothing else is third-party except GA4: no jQuery, no Font Awesome, no iTunes lookup.
- **The scripts' two halves:** in `assets/js/*.js` the rules, share text, URL parameters, localStorage keys and GA4 events are a contract with the app and with shared links; how the board looks and moves is presentation. `dango-board.js` lays each word out on its tile itself (legal Japanese line breaks, font size from the tile's measured width), so tile text never depends on browser wrapping.
- **Study pages** are restyled from the stylesheet alone (`.prose .st-*`); `scripts/build_study.py` and its output are unchanged.
- **Tests:** [scripts/ui-tests/](scripts/ui-tests/README.md) has the headless regression suites (behaviour before/after, layout at 320–1280 px, motion, accessibility). Run them before changing the games.

Started from the Automatic App Landing Page template by [Emil Baehr](https://emilbaehr.com/) (MIT, see [LICENSE](LICENSE)); the template's layout, styles and scripts have since been replaced.
