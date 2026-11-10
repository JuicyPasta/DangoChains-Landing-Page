# UI tests for dangochains.com

Headless-browser checks written for the 2026-11 redesign. They are the safety net for anything that
touches `assets/js/*.js`, `assets/css/site.css` or the layouts: the games' rules, share text, storage and
analytics events must not change by accident.

Nothing here is published (`scripts/` is excluded from the Jekyll build) and nothing is installed in the
repo. Set up once, in a scratch folder outside it:

    mkdir -p /tmp/dc-pw && cd /tmp/dc-pw && npm init -y && npm i playwright axe-core
    npx playwright install chromium-headless-shell webkit
    export NODE_PATH=/tmp/dc-pw/node_modules

Then build and serve the site, and point the scripts at it:

    bundle exec jekyll build -d /tmp/dc-site && python3 -m http.server 4012 --bind 127.0.0.1 --directory /tmp/dc-site &
    node scripts/ui-tests/regress-play.js   http://127.0.0.1:4012 /tmp/play.json     # the daily, custom boards, the maker
    node scripts/ui-tests/regress-bridge.js http://127.0.0.1:4012 /tmp/bridge.json   # 熟語 Bridge
    node scripts/ui-tests/regress-layout.js http://127.0.0.1:4012 /tmp/layout.json   # no sideways scroll; every feed word fits its tile
    node scripts/ui-tests/regress-feel.js   http://127.0.0.1:4012 /tmp/feel.json     # animations fire; reduced motion is instant
    node scripts/ui-tests/axe.js            http://127.0.0.1:4012 /tmp/axe.json      # accessibility (axe-core, WCAG A/AA)

- **Before/after:** run `regress-play.js` and `regress-bridge.js` against a build of `main` and against your
  branch, then `node scripts/ui-tests/compare.js before.json after.json --ui`. The `strict` part of every
  result (share text, storage, analytics events, URLs, messages, board state) must be identical; `ui`
  differences are listed for review.
- **Clock:** every context runs with the clock pinned (`DC_NOW`, default `2026-11-10T10:00:00-05:00`), so
  results are repeatable. Pick a date the feed and `bridge/data` cover, at least 7 days after their first day.
- **Analytics never leaves the machine:** gtag.js is replaced by an empty script; the tests read
  `window.dataLayer` instead. Keep that stub if you run them against the live site.
- **Safari's engine:** prefix any command with `DC_BROWSER=webkit`.
- **Screenshots:** `node scripts/ui-tests/shots.js <base> <outDir>` takes every page and game state at
  390 x 844 and 1280 x 800, light and dark; `sheet.js <dir>` builds a before/after page from `<dir>/before`
  and `<dir>/after`.
- One browser at a time: the scripts run their contexts in sequence on purpose.
