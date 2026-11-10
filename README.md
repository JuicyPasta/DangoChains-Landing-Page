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

The rest of this file is the original template's README.

# Automatic App Landing Page
**Create and deploy an iOS app landing page on GitHub Pages in only five minutes.**

Designed for GitHub Pages for super easy set up. 

🔧 Fork this repo

🗝 Enter iOS App ID in `_config.yml`

📲 Upload video preview or screenshot

🎨 Customise site in `_config.yml` (no HTML/CSS)

📝 Write Privacy Policy as markdown in `privacypolicy.md`

🕒 Keep a changelog in `CHANGELOG.md`

✅ Site becomes live at GitHub Pages repository URL, e.g. `https://your-username.github.io/your-repo-name/`.

<img src="https://emilbaehr.com/files/jayson1.png" width="440"> <img src="https://emilbaehr.com/files/slor1.png" width="440">




## Quick Start

### Step 1: Fork this repo.
After forking the repo, your site will be live immediately on your personal Github Pages account, e.g. `https://yourusername.github.io/your-repo-name/`.

*Make sure GitHub Pages is enabled for your repo. It might take some time for the site to propagate entirely.*



### Step 2: Enter iOS App ID in `_config.yml`
Enter your iOS app ID in the `ios_app_id` field and commit your changes. Your site will automatically rebuild with your app icon, name, price and link to App Store.

You can go on with customising almost anything in the `_config.yml` file. 

Things you can customise in `_config.yml`:
- App Name
- App Icon
- App Description
- App Price
- App Store Link
- Play Store Link
- Press Kit Download Link
- Cover Image
- Cover Overlay Color
- Background Color
- Text Colors
- iPhone Device Color
- Your Name / Company Name
- Link to Website
- Social Links and Contact Info
- Feature List (Title, text, icon)



### Step 3: Add screenshot or video

#### Adding a screenshot
Upload a `.png` or `.jpg` of your app to the folder `assets/screenshot/`. The name does not matter. Be sure to delete the placeholder `yourscreenshot.png`.

#### Adding video
Upload your video to the folder `assets/videos/`. To have support for most browsers, you need to upload two files – one for Safari and one for Chrome/Firefox.

Video formats supported by Chrome and Firefox:
- `.webm`
- `.ogg`

Video formats supported by Safari:
- `.mp4`
- `.mov`

#### Resolutions
The videos and screenshots must have one of the following resolutions:
- 828x1792
- 1125x2436
- 1242x2688



### Step 4: Edit (or remove) Privacy Policy and Changelog
Your site automatically includes pages for a Privacy Policy and a Changelog. Change the content of these pages by editing the `privacypolicy.md` and `CHANGELOG.md` files in the `_pages` directory.

In each of the markdown files, you can set the `include_in_header:` value to either `true` or `false`. This determines if the page is included in the top navigation.
By default, only the Changelog is included in the top navigation. The title of the navigation item can also be edited, by editing the `title:` in each markdown file.

If you need to, you can create additional markdown based pages just by creating an `.md` file like the `privacypolicy.md` and `CHANGELOG.md` files in the `_pages` directory.

**Please note:** The Privacy Policy and Changelog provided are written using dummy text, so please adapt each of them for your own app.
You can also choose not to include these pages, by simple deleting the `privacypolicy.md` and `CHANGELOG.md` files.




## Feedback
If you have feedback regarding bugs or improvements, open an issue, @ me on Twitter or write me an email. You can find my contact info on my website.

I'd love to see the sites you create using this little tool.

## Credits
- [Jekyll](https://github.com/jekyll/jekyll)
- [FontAwesome](https://fontawesome.github.io/Font-Awesome/)

## Donations
[Donations are welcome](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=S8ZZT3JXJPN92&currency_code=USD&source=url)

## Author
[Emil Baehr](https://emilbaehr.com/)

## License
[MIT License](LICENSE)
