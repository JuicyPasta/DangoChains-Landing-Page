// Behaviour regression for /bridge/ (熟語 Bridge).
//   node regress-bridge.js <baseUrl> <out.json> [--only=substr]
const fs = require('fs');
const L = require('./lib');

const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, '');
const out = process.argv[3] || 'regress-bridge.json';
const onlyArg = process.argv.find(function (a) { return a.indexOf('--only=') === 0; });
const only = onlyArg ? onlyArg.slice(7).split(',') : null;
const T = L.TODAY;
function addDays(ymd, n) { const p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
const TIERS = ['easy', 'medium', 'hard'];

async function open(page, query) {
  await page.goto(base + '/bridge/' + (query || ''));
  await page.waitForSelector('.br-opt, .br-notice:not([hidden])');
  await page.waitForTimeout(100);
}
async function pick(page, k) {
  await page.locator('.br-opt[data-k=' + JSON.stringify(k) + ']').click();
  await page.waitForTimeout(120);
}
function wrongs(board, n, withHits) {
  let list = board.options.filter(function (k) { return k !== board.answer; });
  if (withHits) list = list.filter(function (k) { return (board.near[k] || []).length; }).concat(list.filter(function (k) { return !(board.near[k] || []).length; }));
  return list.slice(0, n);
}
async function state(page) {
  return page.evaluate(function () {
    var root = document.getElementById('br'), q = function (s) { return root.querySelector(s); }, all = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };
    var text = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
    var vis = function (el) { return !!el && !el.hidden && el.offsetParent !== null; };
    var tries = q('.br-tries'), end = q('.br-end');
    return {
      url: location.pathname + location.search, title: document.title,
      tabs: all('.br-tiers button[data-tier]').map(function (b) { return [b.dataset.tier, b.getAttribute('aria-selected'), (b.querySelector('.br-tick') || {}).textContent || '', b.querySelector('.br-tick') ? b.querySelector('.br-tick').getAttribute('aria-label') : '']; }),
      meta: text(q('.br-meta')), notice: vis(q('.br-notice')) ? text(q('.br-notice')) : null,
      gameVisible: vis(q('.br-game')),
      tiles: all('.br-board .br-tile:not(.br-center)').map(function (t) { return [t.childNodes[0].textContent, t.style.gridArea, t.getAttribute('aria-label'), (t.querySelector('.br-badge') || {}).className || '']; }),
      arrows: all('.br-board .br-arrow').map(function (a) { return [a.textContent, a.style.gridArea]; }),
      center: q('.br-center') ? [q('.br-center').textContent, q('.br-center').className.replace('br-tile br-center', '').trim(), q('.br-center').getAttribute('aria-label')] : null,
      slots: all('.br-slot').map(function (s) { return [s.textContent, s.className.replace('br-slot', '').trim()]; }),
      msg: text(q('.br-msg')),
      triesLabel: tries ? tries.getAttribute('aria-label') : null,
      triesLeft: tries ? (tries.children.length ? all('.br-tries > *').filter(function (i) { return !i.classList.contains('used'); }).length : (tries.textContent.match(/●/g) || []).length) : null,
      options: all('.br-opt').map(function (o) { return [o.dataset.k, o.disabled, o.className.replace('br-opt', '').trim(), o.getAttribute('aria-label'), (o.querySelector('small') || {}).textContent || '']; }),
      history: all('.br-history li').map(text),
      end: end && !end.hidden ? {
        title: text(q('.br-end-title')),
        words: all('.br-words li').map(function (li) { return [text(li.querySelector('.br-w')), text(li.querySelector('.br-r')), text(li.querySelector('.br-lv')), text(li.querySelector('.br-g'))]; }),
        kanji: text(q('.br-kanji')), nearSummary: text(q('.br-near-box summary')), near: all('.br-near li').map(text),
        shareText: q('.br-share-text').textContent, shareMsg: text(q('.br-share-msg')),
        next: text(q('.br-next')), nextButtons: all('.br-next button').map(text)
      } : null,
      week: vis(q('.br-week')) ? all('.br-day').map(function (a) { return [a.dataset.date, a.getAttribute('href'), a.className.replace('br-day', '').trim(), text(a), a.getAttribute('aria-label')]; }) : null,
      streak: text(q('.br-streak')), cross: text(q('.br-cross'))
    };
  });
}
// Spoken names (aria-label) are presentation: they are split off so they can be reviewed
// without counting as behaviour. Everything else in a state is compared exactly
// (a day link's text is compared without its whitespace).
function isRows(x) { return Array.isArray(x) && x.length > 0 && x.every(function (r) { return Array.isArray(r) && r.length === 5; }); }
function isOptions(x) { return isRows(x) && x.every(function (r) { return typeof r[1] === 'boolean'; }); }
function isWeek(x) { return isRows(x) && x.every(function (r) { return /^\d{4}-\d{2}-\d{2}$/.test(r[0]); }); }
function deep(v) {
  if (isOptions(v)) return v.map(function (r) { return [r[0], r[1], r[2], r[4]]; });
  if (isWeek(v)) return v.map(function (r) { return [r[0], r[1], r[2], String(r[3]).replace(/\s+/g, '')]; });
  if (Array.isArray(v)) return v.map(deep);
  if (!v || typeof v !== 'object') return v;
  const o = {};
  Object.keys(v).forEach(function (k) { o[k] = deep(v[k]); });
  return o;
}
function labelsOf(v, out) {
  out = out || [];
  if (isOptions(v)) v.forEach(function (r) { out.push(r[3]); });
  else if (isWeek(v)) v.forEach(function (r) { out.push(r[4]); });
  else if (Array.isArray(v)) v.forEach(function (x) { labelsOf(x, out); });
  else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { labelsOf(v[k], out); });
  return out;
}
async function bridgeStore(page) {
  return page.evaluate(function () { try { return JSON.parse(window.localStorage.getItem('dangochains-bridge-v1')); } catch (e) { return 'unreadable'; } });
}
async function share(page) {
  await page.locator('.br-share').click();
  await page.waitForTimeout(250);
  return L.captured(page);
}

(async function () {
  const browser = await L.launch();
  const R = L.makeRunner(browser, base, only), test = R.test;
  try {
    for (const tier of TIERS) {
      await test('bridge/' + tier + '/first-try', { vp: 'desktop' }, async function (t) {
        const b = (await L.bridgeBoard(base, T, tier)).board;
        await open(t.page, '?t=' + tier);
        const start = await state(t.page);
        await pick(t.page, b.answer);
        await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
        const end = await state(t.page), cap = await share(t.page);
        t.strict('start', start); t.strict('end', Object.assign({}, end, { end: Object.assign({}, end.end, { shareMsg: undefined }) }));
        t.strict('copied', cap.copied);
        t.strict('events', await L.events(t.page)); t.strict('storage', await bridgeStore(t.page));
        t.ui('shareMsg', (await state(t.page)).end.shareMsg);
        t.check('share text shown equals share text copied', cap.copied[0] === end.end.shareText);
        t.check('no horizontal scroll', (await L.hScroll(t.page)).over.length === 0);
      });
      await test('bridge/' + tier + '/second-try', { vp: 'desktop' }, async function (t) {
        const b = (await L.bridgeBoard(base, T, tier)).board;
        await open(t.page, '?t=' + tier);
        await pick(t.page, wrongs(b, 1, true)[0]);
        const mid = await state(t.page);
        await pick(t.page, b.answer);
        await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
        const end = await state(t.page), cap = await share(t.page);
        t.strict('mid', mid); t.strict('end', Object.assign({}, end, { end: Object.assign({}, end.end, { shareMsg: undefined }) }));
        t.strict('copied', cap.copied);
        t.strict('events', await L.events(t.page)); t.strict('storage', await bridgeStore(t.page));
      });
      await test('bridge/' + tier + '/lost', { vp: 'desktop' }, async function (t) {
        const b = (await L.bridgeBoard(base, T, tier)).board, seen = [];
        await open(t.page, '?t=' + tier);
        for (const k of wrongs(b, 3, false)) { await pick(t.page, k); seen.push(await state(t.page)); }
        await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
        const end = await state(t.page), cap = await share(t.page);
        t.strict('afterEachPick', seen.map(function (s) { return [s.msg, s.triesLeft, s.triesLabel, s.history, s.center, s.slots]; }));
        t.strict('end', Object.assign({}, end, { end: Object.assign({}, end.end, { shareMsg: undefined }) }));
        t.strict('copied', cap.copied);
        t.strict('events', await L.events(t.page)); t.strict('storage', await bridgeStore(t.page));
      });
    }

    await test('bridge/mobile-share-sheet', { vp: 'mobile' }, async function (t) {
      const b = (await L.bridgeBoard(base, T, 'easy')).board;
      await open(t.page, '?t=easy');
      await pick(t.page, wrongs(b, 1, true)[0]); await pick(t.page, wrongs(b, 2, true)[1]); await pick(t.page, b.answer);
      await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(900);
      const cap = await share(t.page);
      t.strict('shared', cap.shared); t.strict('copied', cap.copied);
      t.strict('events', await L.events(t.page)); t.strict('storage', await bridgeStore(t.page));
      t.check('no horizontal scroll', (await L.hScroll(t.page)).over.length === 0);
    });

    await test('bridge/dates', { vp: 'desktop' }, async function (t) {
      const cases = { sixDaysAgo: '?d=' + addDays(T, -6) + '&t=hard', sevenDaysAgo: '?d=' + addDays(T, -7) + '&t=easy', tomorrow: '?d=' + addDays(T, 1) + '&t=medium', garbage: '?d=nope', yesterdayNoTier: '?d=' + addDays(T, -1), badTier: '?t=expert', none: '' };
      const res = {};
      for (const k of Object.keys(cases)) {
        await open(t.page, cases[k]);
        const s = await state(t.page);
        res[k] = { url: s.url, tabs: s.tabs, meta: s.meta, notice: s.notice, tiles: s.tiles.length, options: s.options.length, week: s.week && s.week.map(function (d) { return [d[0], d[1], d[2]]; }), streak: s.streak };
      }
      t.strict('cases', res);
      t.strict('events', await L.events(t.page));
    });

    await test('bridge/resume-tabs-week', { vp: 'desktop' }, async function (t) {
      const b = (await L.bridgeBoard(base, T, 'easy')).board;
      await open(t.page);
      await pick(t.page, wrongs(b, 1, true)[0]);
      const before = await state(t.page);
      await t.page.reload(); await t.page.waitForSelector('.br-opt'); await t.page.waitForTimeout(150);
      const after = await state(t.page);
      t.strict('resumeSame', JSON.stringify([before.center, before.slots, before.options, before.history, before.triesLeft, before.msg]) === JSON.stringify([after.center, after.slots, after.options, after.history, after.triesLeft, after.msg]));
      t.strict('resumed', [after.center, after.options, after.history, after.triesLeft, after.msg]);
      await pick(t.page, b.answer); await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
      const done = await state(t.page);
      await t.page.locator('.br-next button').click(); await t.page.waitForTimeout(250);
      const next = await state(t.page);
      await t.page.locator('.br-tiers button[data-tier="hard"]').click(); await t.page.waitForTimeout(200);
      const hard = await state(t.page);
      await t.page.locator('.br-tiers button[data-tier="easy"]').click(); await t.page.waitForTimeout(200);
      const backToEasy = await state(t.page);
      // the week strip opens another day's board without a page load
      await t.page.locator('.br-day[data-date="' + addDays(T, -2) + '"]').click(); await t.page.waitForTimeout(250);
      const day = await state(t.page);
      const b2 = (await L.bridgeBoard(base, addDays(T, -2), 'easy')).board;
      await pick(t.page, b2.answer); await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
      const dayDone = await state(t.page), cap = await share(t.page);
      t.strict('afterWin', { nextButtons: done.end.nextButtons, tabs: done.tabs, streak: done.streak, week: done.week });
      t.strict('nextTier', { url: next.url, tabs: next.tabs, end: next.end });
      t.strict('hard', { url: hard.url, tabs: hard.tabs }); t.strict('backToEasy', { url: backToEasy.url, end: backToEasy.end && backToEasy.end.title, shareText: backToEasy.end && backToEasy.end.shareText });
      t.strict('otherDay', { url: day.url, meta: day.meta, tabs: day.tabs, week: day.week });
      t.strict('otherDayDone', { end: Object.assign({}, dayDone.end, { shareMsg: undefined }), streak: dayDone.streak, copied: cap.copied });
      t.strict('events', await L.events(t.page)); t.strict('storage', await bridgeStore(t.page));
    });

    // a streak that exists already: solved on their own days
    const y1 = (await L.bridgeBoard(base, addDays(T, -1), 'easy')).board, y2 = (await L.bridgeBoard(base, addDays(T, -2), 'medium')).board;
    const seed = { 'dangochains-bridge-v1': { res: {} } };
    seed['dangochains-bridge-v1'].res[addDays(T, -1) + '|easy'] = { picks: [y1.answer], won: true, on: addDays(T, -1) };
    seed['dangochains-bridge-v1'].res[addDays(T, -2) + '|medium'] = { picks: [wrongs(y2, 1)[0], y2.answer], won: true, on: addDays(T, -2) };
    seed['dangochains-bridge-v1'].res[addDays(T, -3) + '|hard'] = { picks: ['x'], won: true, on: addDays(T, -1) }; // solved late: no streak credit
    await test('bridge/streak', { vp: 'desktop', seed: seed }, async function (t) {
      const b = (await L.bridgeBoard(base, T, 'easy')).board;
      await open(t.page);
      const s0 = await state(t.page);
      await pick(t.page, b.answer); await t.page.waitForSelector('.br-end:not([hidden])'); await t.page.waitForTimeout(700);
      const s1 = await state(t.page);
      t.strict('before', [s0.streak, s0.week]); t.strict('after', [s1.streak, s1.week, s1.tabs]);
      t.strict('storage', await bridgeStore(t.page));
    });

    await test('bridge/keyboard-and-focus', { vp: 'desktop' }, async function (t) {
      await open(t.page, '?t=easy');
      await t.page.locator('.br-opt').first().focus();
      const ring = await t.page.evaluate(function () { var cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, width: cs.outlineWidth }; });
      t.ui('focusRing', ring);
      t.check('focus ring visible on an option', ring.style !== 'none' && parseFloat(ring.width) >= 2, ring);
      await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(150);
      t.strict('enterPicks', (await state(t.page)).options.filter(function (o) { return o[1]; }).length);
    });
  } finally { await browser.close(); }
  Object.keys(R.results).forEach(function (id) {
    const r = R.results[id];
    r.ui.spokenNames = labelsOf(r.strict);
    r.strict = deep(r.strict);
  });
  fs.writeFileSync(out, JSON.stringify(R.results, null, 1));
  const ids = Object.keys(R.results), failed = ids.filter(function (k) { return R.results[k].failed; });
  const badChecks = ids.filter(function (k) { return R.results[k].checks.some(function (c) { return !c.ok; }); });
  const withErrors = ids.filter(function (k) { return R.results[k].errors.length; });
  console.log(ids.length + ' tests; failed: ' + failed.length + '; failed checks: ' + badChecks.length + '; console/network errors: ' + withErrors.length + '  -> ' + out);
  withErrors.forEach(function (k) { console.log('  errors in ' + k + ': ' + R.results[k].errors.slice(0, 3).join(' || ')); });
})();
