// Layout checks: no horizontal scroll on any page, no console errors, and every word of every
// board in the feed fits its tile (with and without furigana) at 360, 390 and 1280 px.
//   node regress-layout.js <baseUrl> <out.json> [--only=substr] [--fonts] [--sample=N]
const fs = require('fs');
const L = require('./lib');

const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, '');
const out = process.argv[3] || 'regress-layout.json';
const flag = function (n) { return process.argv.indexOf('--' + n) >= 0; };
const arg = function (n) { const a = process.argv.find(function (x) { return x.indexOf('--' + n + '=') === 0; }); return a ? a.split('=')[1] : null; };
const only = arg('only') ? arg('only').split(',') : null;
const withFonts = flag('fonts'), sample = arg('sample') ? +arg('sample') : 0;
const T = L.TODAY;
function addDays(ymd, n) { const p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }

const PAGES = ['/', '/play/', '/play/?t=medium', '/play/?t=hard', '/play/?d=' + addDays(T, -9) + '&t=easy', '/make/', '/bridge/', '/bridge/?t=hard',
  '/how-to-play/', '/changelog/', '/privacypolicy/', '/tos/', '/study/', '/study/' + addDays(T, -2) + '/', '/study/2026-08-21/', '/study/topics/',
  '/study/topics/idioms/', '/study/topics/kanji-readings/', '/study/topics/collocations/', '/study/topics/counters/', '/404.html'];

async function allWords() {
  const index = await L.getJson(base + '/feed/v1/index.json'), boards = [];
  for (const tier of Object.keys(index.tiers)) {
    for (const month of index.tiers[tier]) {
      const doc = await L.getJson(base + '/feed/v1/' + tier + '/' + month + '.json'), readings = doc.readings || {};
      doc.puzzles.forEach(function (p) {
        const words = [];
        p.categories.forEach(function (c) { c.words.forEach(function (w) { words.push({ w: w, b: readings[w] || '' }); }); });
        if (words.length === 16) boards.push({ id: tier + ' ' + p.date, words: words });
      });
    }
  }
  return boards;
}

(async function () {
  const browser = await L.launch();
  const R = L.makeRunner(browser, base, only), test = R.test;
  try {
    for (const vp of ['tiny', 'small', 'mobile', 'desktop']) {
      for (const scheme of ['light', 'dark']) {
        await test('pages/' + vp + '/' + scheme, { vp: vp, scheme: scheme }, async function (t) {
          const res = {};
          for (const path of PAGES) {
            const before = t.r.errors.length;
            await t.page.goto(base + path, { waitUntil: 'load' });
            await t.page.waitForTimeout(350);
            await t.page.evaluate(function () { Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { if (!d.classList.contains('site-menu')) d.open = true; }); });
            const h = await L.hScroll(t.page);
            res[path] = { scroll: h.scrollWidth - h.clientWidth, over: h.over, errors: t.r.errors.slice(before) };
            t.check('no horizontal scroll ' + path, h.scrollWidth <= h.clientWidth, h);
          }
          t.ui('pages', res);
          t.check('no console or network errors', t.r.errors.length === 0, t.r.errors.slice(0, 5));
        });
      }
    }

    // game states at the narrowest width
    for (const svp of ['tiny', 'small']) await test('states/' + svp, { vp: svp }, async function (t) {
      const b = await L.dailyBoard(base, T, 'hard');
      await t.page.goto(base + '/play/?t=hard'); await t.page.waitForSelector('.dc-grid .dc-tile');
      await L.playSequence(t.page, b, L.SEQ.lostLate); await t.page.waitForSelector('#dc-end:not([hidden])', { timeout: 20000 });
      let h = await L.hScroll(t.page); t.check('play end screen', h.scrollWidth <= h.clientWidth, h);
      await t.page.goto(base + '/make/', { waitUntil: 'networkidle' });
      await t.page.locator('#dc-example').click(); await t.page.waitForTimeout(500);
      await t.page.locator('#dc-form button[type=submit]').click(); await t.page.waitForSelector('#dc-result-box:not([hidden])'); await t.page.waitForTimeout(600);
      h = await L.hScroll(t.page); t.check('maker with its link', h.scrollWidth <= h.clientWidth, h);
      const br = (await L.bridgeBoard(base, T, 'hard')).board;
      await t.page.goto(base + '/bridge/?t=hard'); await t.page.waitForSelector('.br-opt');
      for (const k of br.options.filter(function (x) { return x !== br.answer; }).slice(0, 3)) { await t.page.locator('.br-opt[data-k=' + JSON.stringify(k) + ']').click(); await t.page.waitForTimeout(150); }
      await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(600);
      await t.page.evaluate(function () { document.querySelector('.br-near-box').open = true; });
      h = await L.hScroll(t.page); t.check('bridge end screen', h.scrollWidth <= h.clientWidth, h);
    });

    // the last 7 days as a visitor sees them
    for (const vp of ['tiny', 'small', 'mobile', 'desktop']) {
      await test('week-boards/' + vp, { vp: vp }, async function (t) {
        const bad = [], fonts = [];
        for (let d = 0; d < 7; d++) for (const tier of ['easy', 'medium', 'hard']) for (const furi of [true, false]) {
          await t.page.goto(base + '/play/?d=' + addDays(T, -d) + '&t=' + tier); await t.page.waitForSelector('.dc-grid .dc-tile');
          const box = t.page.locator('.dc-furigana input');
          if ((await box.isChecked()) !== furi) { await box.click(); await t.page.waitForTimeout(60); }
          (await L.tileOverflow(t.page)).forEach(function (o) { bad.push(Object.assign({ day: -d, tier: tier, furi: furi }, o)); });
          (await L.tileFonts(t.page)).forEach(function (f) { fonts.push(f.font); });
        }
        t.ui('overflowing', bad);
        t.ui('fonts', { min: Math.min.apply(null, fonts), max: Math.max.apply(null, fonts), tiles: fonts.length });
        t.check('no word overflows its tile', bad.length === 0, bad.slice(0, 8));
      });
    }

    // every word of every board in the feed, mounted with the real engine
    let boards = await allWords();
    if (sample) boards = boards.slice().sort(function (a, b) {
      const len = function (x) { return Math.max.apply(null, x.words.map(function (w) { return Array.from(w.w).length; })); };
      return len(b) - len(a);
    }).slice(0, sample);
    for (const vp of ['tiny', 'small', 'mobile', 'desktop']) {
      await test('all-words/' + vp + (withFonts ? '/webfont' : ''), { vp: vp }, async function (t) {
        if (!withFonts) await t.ctx.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/, function (r) { return r.abort(); });
        await t.page.goto(base + '/play/?t=easy'); await t.page.waitForSelector('.dc-grid .dc-tile');
        if (withFonts) { await t.page.waitForTimeout(1200); await t.page.evaluate(function () { return document.fonts.ready; }); }
        const res = await t.page.evaluate(async function (cfg) {
          var D = window.DangoBoard, host = document.createElement('div'), bad = [], sizes = {}, starts = [], total = 0, small = [], rtSmall = 0, lines = { 1: 0, 2: 0, 3: 0 };
          var NO_START = 'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶー々ゝゞヽヾ、。，．・：；？！）」』】〕〉》｝］';
          document.getElementById('dc-app').appendChild(host);
          for (var bi = 0; bi < cfg.boards.length; bi++) {
            var src = cfg.boards[bi], board = { groups: [0, 1, 2, 3].map(function (gi) { return { name: 'g' + gi, level: D.LEVELS[gi], words: src.words.slice(gi * 4, gi * 4 + 4).map(function (x) { return D.word(x.w, x.b); }) }; }) };
            for (var f = 0; f < 2; f++) {
              D.mount(host, board, { furigana: f === 0 });
              if (cfg.fonts && bi % 40 === 0) { await document.fonts.ready; await new Promise(function (r) { setTimeout(r, 30); }); }
              Array.prototype.forEach.call(host.querySelectorAll('.dc-grid .dc-tile'), function (tile) {
                var box = tile.firstElementChild, tr = tile.getBoundingClientRect(), range = document.createRange(), worst = 0;
                range.selectNodeContents(box);
                Array.prototype.forEach.call(range.getClientRects(), function (r) {
                  if (!r.width || !r.height) return;
                  worst = Math.max(worst, tr.left - r.left, r.right - tr.right, tr.top - r.top, r.bottom - tr.bottom);
                });
                if (tile.scrollWidth > tile.clientWidth + 1 || tile.scrollHeight > tile.clientHeight + 1) worst = Math.max(worst, tile.scrollWidth - tile.clientWidth, tile.scrollHeight - tile.clientHeight);
                var fs = parseFloat(getComputedStyle(box).fontSize), key = Math.round(fs);
                total++; sizes[key] = (sizes[key] || 0) + 1;
                if (worst > 0.75 && bad.length < 60) bad.push({ board: src.id, w: tile.dataset.w, furi: f === 0, by: Math.round(worst * 10) / 10, font: fs });
                else if (worst > 0.75) bad.push(null);
                if (fs < 12 && small.length < 40) small.push(tile.dataset.w + '@' + fs);
                var rt = tile.querySelector('rt');
                if (f === 0 && rt && parseFloat(getComputedStyle(rt).fontSize) < 7.5) rtSmall++;
                var ln = tile.querySelectorAll('.dc-ln');
                if (ln.length) lines[ln.length] = (lines[ln.length] || 0) + 1;
                Array.prototype.forEach.call(ln, function (l, i) { if (i && NO_START.indexOf(l.textContent.charAt(0)) >= 0 && starts.length < 40) starts.push(tile.dataset.w + ' -> ' + Array.prototype.map.call(ln, function (x) { return x.textContent; }).join('/')); });
              });
            }
          }
          host.remove();
          return { total: total, overflowing: bad.length, examples: bad.filter(Boolean), sizes: sizes, under12px: small, rtUnder7_5: rtSmall, lines: lines, badLineStarts: starts };
        }, { boards: boards, fonts: withFonts });
        t.r.errors.length = 0; // the blocked font requests are this test's own doing
        t.ui('summary', res);
        t.check('no word overflows its tile (' + res.total + ' tiles)', res.overflowing === 0, res.examples.slice(0, 10));
        t.check('no line starts with a small kana or ー', res.badLineStarts.length === 0, res.badLineStarts.slice(0, 10));
        console.log('     ' + vp + ': ' + res.total + ' tiles, overflowing ' + res.overflowing + ', sizes ' + JSON.stringify(res.sizes) + ', lines ' + JSON.stringify(res.lines) + ', <12px: ' + res.under12px.length + ', bad starts: ' + res.badLineStarts.length);
      });
    }
  } finally { await browser.close(); }
  fs.writeFileSync(out, JSON.stringify(R.results, null, 1));
  const ids = Object.keys(R.results), failed = ids.filter(function (k) { return R.results[k].failed; });
  const badChecks = ids.filter(function (k) { return R.results[k].checks.some(function (c) { return !c.ok; }); });
  console.log(ids.length + ' tests; failed: ' + failed.length + '; with failed checks: ' + badChecks.length + '  -> ' + out);
  badChecks.forEach(function (k) { R.results[k].checks.filter(function (c) { return !c.ok; }).slice(0, 6).forEach(function (c) { console.log('  ' + k + ': ' + c.name + '  ' + JSON.stringify(c.detail).slice(0, 500)); }); });
})();
