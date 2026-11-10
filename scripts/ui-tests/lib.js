// Shared helpers for the dangochains.com screenshot and regression passes.
// One headless browser at a time; every context gets a pinned clock, a GA stub
// (no hit ever leaves the machine) and capture hooks for clipboard / share-sheet text.
const { chromium, webkit } = require('playwright');

const NOW = process.env.DC_NOW || '2026-11-10T10:00:00-05:00';
const TODAY = NOW.slice(0, 10);
const TZ = 'America/New_York';

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  },
  tiny: {
    viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  small: {
    viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
  }
};

async function launch() { return (process.env.DC_BROWSER === 'webkit' ? webkit : chromium).launch(); } // DC_BROWSER=webkit for a Safari-engine pass

// opts: {vp: 'desktop'|'mobile'|'small', scheme: 'light'|'dark', reducedMotion, now, share: 'stub'|'none', clipboard: 'stub'|'fail'}
async function newContext(browser, opts) {
  opts = opts || {};
  const vp = VIEWPORTS[opts.vp || 'desktop'];
  const context = await browser.newContext(Object.assign({}, vp, {
    colorScheme: opts.scheme || 'light',
    reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
    timezoneId: TZ, locale: 'en-US'
  }));
  await context.clock.setFixedTime(new Date(opts.now || NOW));
  // Analytics never leaves the machine: gtag.js is replaced by an empty script, so the
  // page's own gtag() only fills window.dataLayer (which the tests read back).
  await context.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net/, function (route) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  const share = opts.share || (vp.hasTouch ? 'stub' : 'none');
  const clipboard = opts.clipboard || 'stub';
  await context.addInitScript(function (cfg) {
    window.__copied = []; window.__shared = [];
    try {
      if (cfg.share === 'stub') {
        Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: function (data) { window.__shared.push(data); return Promise.resolve(); } });
      } else if (cfg.share === 'none') {
        Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
      }
      var clip = cfg.clipboard === 'fail'
        ? { writeText: function () { return Promise.reject(new Error('denied')); } }
        : { writeText: function (t) { window.__copied.push(String(t)); return Promise.resolve(); } };
      Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: function () { return clip; } });
      if (cfg.clipboard === 'fail') document.execCommand = function () { return false; };
    } catch (e) { console.error('init-script failed: ' + e.message); }
  }, { share: share, clipboard: clipboard });
  return context;
}

// Collects console errors, page errors and failed same-origin requests for a page.
function watch(page, sink) {
  page.on('console', function (m) { if (m.type() === 'error') sink.push('console: ' + m.text()); });
  page.on('pageerror', function (e) { sink.push('pageerror: ' + e.message); });
  page.on('requestfailed', function (r) {
    var why = (r.failure() && r.failure().errorText) || '';
    if (/ERR_ABORTED/.test(why)) return; // the test navigated away while a lazy image was loading
    if (/127\.0\.0\.1|localhost|dangochains\.com/.test(r.url())) sink.push('requestfailed: ' + r.url() + ' ' + why);
  });
  page.on('response', function (r) {
    if (r.status() >= 400 && /127\.0\.0\.1|localhost|dangochains\.com/.test(r.url())) sink.push('http ' + r.status() + ': ' + r.url());
  });
}

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.json();
}

// Today's (or any day's) DangoChains board, with its words keyed by level.
async function dailyBoard(base, date, tier) {
  const doc = await getJson(base + '/feed/v1/' + tier + '/' + date.slice(0, 7) + '.json');
  const p = doc.puzzles.filter(function (x) { return x.date === date; })[0];
  if (!p) throw new Error('no board for ' + date + ' ' + tier);
  const LEVELS = ['easy', 'medium', 'hard', 'expert'], by = {};
  p.categories.forEach(function (c, i) { by[LEVELS.indexOf(c.difficulty) >= 0 ? c.difficulty : LEVELS[i]] = c.words.slice(); });
  return { number: p.number, date: date, tier: tier, by: by, puzzle: p };
}

async function bridgeBoard(base, date, tier) {
  const doc = await getJson(base + '/bridge/data/v1/' + date.slice(0, 7) + '.json');
  const p = doc.puzzles.filter(function (x) { return x.date === date; })[0];
  if (!p) throw new Error('no bridge board for ' + date);
  return { number: p.number, board: p.tiers[tier] };
}

// The game is idle when no reveal/shake sequence is running (the redesign marks those with .dc-busy).
async function settle(page) {
  await page.waitForFunction(function () { return !document.querySelector('.dc-busy'); }, null, { timeout: 15000 });
}

async function pickTiles(page, words) {
  for (const w of words) await page.locator('.dc-tile[data-w=' + JSON.stringify(w) + ']').click();
}

async function guess(page, words) {
  await settle(page);
  await pickTiles(page, words);
  await page.locator('.dc-submit').click();
  await settle(page);
}

// Guess sequences are written by level, so they give the same share rows whatever the words are.
// e.g. 'EEEE' = the four easy words; 'MMMH' = three medium words + the first hard word.
// A digit after a letter picks which word of that level is the odd one: 'MMMH2' -> hard word #2.
function wordsFor(board, spec, used) {
  const key = { E: 'easy', M: 'medium', H: 'hard', X: 'expert' }, out = [], next = {};
  const tokens = spec.match(/[EMHX]\d?/g);
  tokens.forEach(function (t) {
    const lvl = key[t[0]], list = board.by[lvl];
    if (t[1]) out.push(list[+t[1] - 1]);
    else { next[lvl] = next[lvl] || 0; out.push(list[next[lvl]++]); }
  });
  return out;
}

async function playSequence(page, board, specs) {
  for (const s of specs) await guess(page, wordsFor(board, s));
}

const SEQ = {
  golden: ['EEEE', 'MMMM', 'HHHH', 'XXXX'],                                   // 0 mistakes
  goldenOne: ['EEEX1', 'EEEE', 'MMMM', 'HHHH', 'XXXX'],                       // 1 mistake: still golden
  solved: ['EEEM1', 'EEMM', 'EEEE', 'MMMM', 'HHXX', 'HHHH', 'XXXX'],          // 3 mistakes
  lost: ['EEEM1', 'EEEM2', 'EEEM3', 'EEEM4', 'EEEH1', 'EEEH2'],               // 6 mistakes, nothing solved
  lostLate: ['EEEE', 'MMMM', 'HHHX1', 'HHHX2', 'HHHX3', 'HHHX4', 'HHXX', 'HXXX'] // 2 solved, then 6 mistakes
};

async function events(page) {
  return page.evaluate(function () {
    return (window.dataLayer || []).map(function (a) { return Array.prototype.slice.call(a); })
      .filter(function (a) { return a[0] === 'event'; }).map(function (a) { return [a[1], a[2] || {}]; });
  });
}

// Full-page screenshot, capped so very long pages stay reviewable.
async function shot(page, file, cap) {
  await page.evaluate(function () { return document.fonts && document.fonts.ready; });
  await page.waitForTimeout(150);
  const size = await page.evaluate(function () {
    return { w: document.documentElement.clientWidth, h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) };
  });
  const h = Math.min(size.h, cap || 6000);
  await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: size.w, height: h }, animations: 'disabled' });
  return { width: size.w, height: size.h, clipped: size.h > h };
}

module.exports = { NOW, TODAY, TZ, VIEWPORTS, launch, newContext, watch, getJson, dailyBoard, bridgeBoard, settle, pickTiles, guess, wordsFor, playSequence, SEQ, events, shot };

// ---------- a tiny test runner: each test gets a fresh context; results go to one JSON ----------
// Result shape per test id: {strict: {...}, ui: {...}, checks: [{name, ok, detail}], errors: [...]}
//   strict = must be identical before and after the redesign (share text, storage, events, URLs)
//   ui     = visible copy and state, compared and reviewed (differences may be intended)
//   checks = assertions that must hold on the build under test
function makeRunner(browser, base, filter) {
  const results = {};
  async function test(id, opts, fn) {
    if (typeof opts === 'function') { fn = opts; opts = {}; }
    if (filter && !filter.some(function (f) { return id.indexOf(f) >= 0; })) return;
    const ctx = await newContext(browser, opts);
    if (opts.seed) {
      await ctx.addInitScript(function (seed) {
        try {
          if (window.localStorage.getItem('__seeded')) return;
          Object.keys(seed).forEach(function (k) { window.localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k])); });
          window.localStorage.setItem('__seeded', '1');
        } catch (e) { /* storage blocked */ }
      }, opts.seed);
    }
    const page = await ctx.newPage(), errors = [];
    watch(page, errors);
    const r = results[id] = { strict: {}, ui: {}, checks: [], errors: errors };
    const t = {
      page: page, ctx: ctx, base: base, r: r,
      strict: function (k, v) { r.strict[k] = v; }, ui: function (k, v) { r.ui[k] = v; },
      check: function (name, ok, detail) { r.checks.push({ name: name, ok: !!ok, detail: detail === undefined ? null : detail }); }
    };
    const started = Date.now();
    try { await fn(t); } catch (e) { r.failed = e.message.split('\n').slice(0, 3).join(' | '); }
    r.ms = Date.now() - started;
    const bad = r.checks.filter(function (c) { return !c.ok; }).length;
    console.log((r.failed ? 'FAIL ' : bad ? 'BAD  ' : 'ok   ') + id + (r.failed ? '  ' + r.failed : '') + (bad ? '  failed checks: ' + bad : '') + (errors.length ? '  errors: ' + errors.length : ''));
    await ctx.close();
  }
  return { test: test, results: results };
}

async function webStore(page) {
  return page.evaluate(function () { try { return JSON.parse(window.localStorage.getItem('dangochains.web.v1')); } catch (e) { return 'unreadable'; } });
}
async function captured(page) {
  return page.evaluate(function () { return { copied: window.__copied.slice(), shared: window.__shared.map(function (s) { return s; }) }; });
}

// What the board shows right now (works on the old and the new markup).
async function boardState(page) {
  return page.evaluate(function () {
    var q = function (s) { return document.querySelector(s); }, all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    var msg = q('.dc-msg'), tries = q('.dc-tries'), furi = q('.dc-furigana input'), actions = q('.dc-actions'), submit = q('.dc-submit');
    return {
      tiles: all('.dc-grid .dc-tile').map(function (b) { return b.dataset.w; }).sort(),
      selected: all('.dc-grid .dc-tile.sel').map(function (b) { return b.dataset.w; }).sort(),
      pressed: all('.dc-grid .dc-tile[aria-pressed="true"]').length,
      groups: all('.dc-solved .dc-group').map(function (g) {
        var lvl = (g.className.match(/dc-(easy|medium|hard|expert)/) || [])[1];
        return { level: lvl, title: (g.querySelector('b') || {}).textContent, sub: g.querySelector('span') && !g.querySelector('span').closest('.dc-group-words') ? g.querySelector('span').textContent : null, words: g.querySelector('.dc-group-words').textContent.replace(/\s+/g, '') };
      }),
      dots: all('.dc-dots .dc-dot').map(function (d) { return d.classList.contains('dc-dot-used') ? 'used' : d.classList.contains('dc-dot-gold') ? 'gold' : 'left'; }),
      triesLabel: tries ? tries.getAttribute('aria-label') : null,
      msg: msg ? msg.textContent : null, msgKind: msg ? msg.className.replace(/\s*dc-msg\s*/, '').trim() : null,
      gridHidden: q('.dc-grid') ? q('.dc-grid').hidden : null,
      actionsHidden: actions ? actions.hidden : null, submitDisabled: submit ? submit.disabled : null,
      furigana: furi ? furi.checked : null, nofuri: q('#dc-board') ? q('#dc-board').classList.contains('dc-nofuri') : null
    };
  });
}

// The page around the board: heading, tabs, notice, end screen.
async function pageState(page) {
  return page.evaluate(function () {
    var $ = function (id) { return document.getElementById(id); }, all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
    var text = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    var vis = function (el) { return !!el && !el.hidden && el.offsetParent !== null; };
    var end = $('dc-end');
    return {
      title: document.title, heading: text($('dc-heading')), sub: text($('dc-sub')),
      subLinks: all('#dc-sub a').map(function (a) { return a.getAttribute('href'); }),
      introVisible: vis($('dc-intro')), furiNoteVisible: vis($('dc-furi-note')),
      tabs: $('dc-tiers') && !$('dc-tiers').hidden ? all('#dc-tiers button[data-tier]').map(function (b) { return { tier: b.dataset.tier, selected: b.getAttribute('aria-selected'), text: text(b) }; }) : null,
      notice: vis($('dc-notice')) ? text($('dc-notice')) : null,
      noticeLinks: all('#dc-notice a').map(function (a) { return { cls: a.className.replace(/\s*dc-store-badge\s*/, ' ').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), text: text(a) || (a.querySelector('img') ? a.querySelector('img').alt : '') }; }),
      end: end && !end.hidden ? {
        result: text($('dc-result')), resultSub: text($('dc-result-sub')), streak: text($('dc-streak')),
        shareVisible: vis($('dc-share')), shareStatus: text($('dc-share-status')),
        fallbackVisible: vis($('dc-share-fallback')), fallbackValue: $('dc-share-fallback').value,
        next: text($('dc-next')), nextLinks: all('#dc-next a').map(function (a) { return a.getAttribute('href'); }),
        more: text($('dc-more')), moreButtons: all('#dc-more button').map(function (b) { return text(b); }),
        review: all('#dc-review .dc-rv-group').map(function (g) {
          return { level: (g.className.match(/dc-(easy|medium|hard|expert)/) || [])[1], title: text(g.querySelector('.dc-rv-title')), rows: all.call(null, '#dc-review .dc-rv-group').length ? Array.prototype.map.call(g.querySelectorAll('li'), function (li) { return Array.prototype.map.call(li.children, function (c) { return c.textContent; }); }) : [] };
        }),
        cta: text($('dc-cta-text')),
        stores: all('#dc-cta-stores a').map(function (a) { return { cls: a.className.replace(/\s*dc-store-badge\s*/, ' ').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), text: text(a) || (a.querySelector('img') ? a.querySelector('img').alt : '') }; }),
        links: all('#dc-links a').map(function (a) { return { text: text(a), href: a.getAttribute('href') }; })
      } : null
    };
  });
}

// Every tile's text must sit inside its tile. Returns the offenders.
async function tileOverflow(page) {
  return page.evaluate(function () {
    var bad = [];
    Array.prototype.forEach.call(document.querySelectorAll('.dc-grid .dc-tile'), function (tile) {
      var box = tile.firstElementChild, tr = tile.getBoundingClientRect(), range = document.createRange(), worst = 0;
      if (!box) return;
      range.selectNodeContents(box);
      Array.prototype.forEach.call(range.getClientRects(), function (r) {
        if (!r.width || !r.height) return;
        worst = Math.max(worst, tr.left - r.left, r.right - tr.right, tr.top - r.top, r.bottom - tr.bottom);
      });
      if (tile.scrollWidth > tile.clientWidth + 1 || tile.scrollHeight > tile.clientHeight + 1) worst = Math.max(worst, tile.scrollWidth - tile.clientWidth, tile.scrollHeight - tile.clientHeight);
      if (worst > 0.75) bad.push({ w: tile.dataset.w, by: Math.round(worst * 10) / 10, font: getComputedStyle(box).fontSize, tile: Math.round(tr.width) + 'x' + Math.round(tr.height) });
    });
    return bad;
  });
}

async function tileFonts(page) {
  return page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('.dc-grid .dc-tile'), function (tile) {
      var box = tile.firstElementChild, rt = tile.querySelector('rt');
      return { w: tile.dataset.w, font: parseFloat(getComputedStyle(box).fontSize), rt: rt && getComputedStyle(rt).display !== 'none' ? parseFloat(getComputedStyle(rt).fontSize) : null, lines: tile.querySelectorAll('.dc-ln').length || null, starts: Array.prototype.map.call(tile.querySelectorAll('.dc-ln'), function (l) { return l.textContent.charAt(0); }).join('') };
    });
  });
}

async function hScroll(page) {
  return page.evaluate(function () {
    var de = document.documentElement, over = [];
    if (de.scrollWidth > de.clientWidth + 0.5) {
      Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.width && r.right > de.clientWidth + 1 && over.length < 6) over.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') + ' right=' + Math.round(r.right));
      });
    }
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, over: over };
  });
}

Object.assign(module.exports, { makeRunner, webStore, captured, boardState, pageState, tileOverflow, tileFonts, hScroll });
