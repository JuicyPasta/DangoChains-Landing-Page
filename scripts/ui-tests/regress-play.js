// Behaviour regression for /play/ (the daily and custom boards) and /make/.
//   node regress-play.js <baseUrl> <out.json> [--only=substr,substr]
// Run it against the build of main and against the redesign, then diff with compare.js.
const fs = require('fs');
const L = require('./lib');

const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, '');
const out = process.argv[3] || 'regress-play.json';
const onlyArg = process.argv.find(function (a) { return a.indexOf('--only=') === 0; });
const only = onlyArg ? onlyArg.slice(7).split(',') : null;

const T = L.TODAY;
function addDays(ymd, n) {
  const p = ymd.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.toISOString().slice(0, 10);
}
const TIERS = ['easy', 'medium', 'hard'];
const tiles = function (page) { return page.waitForSelector('.dc-grid .dc-tile'); };
const ended = function (page) { return page.waitForSelector('#dc-end:not([hidden])', { timeout: 20000 }); };

async function openDaily(page, query) {
  await page.goto(base + '/play/' + (query || ''));
  await tiles(page);
}

// One guess, returning the status line it produced (read as soon as it appears).
async function guessMsg(page, words) {
  await L.settle(page);
  await L.pickTiles(page, words);
  await page.locator('.dc-submit').click();
  await page.waitForTimeout(60);
  const st = await L.boardState(page);
  await L.settle(page);
  return { msg: st.msg, kind: st.msgKind };
}

async function share(page) {
  await page.locator('#dc-share').click();
  await page.waitForTimeout(250);
  return L.captured(page);
}

async function makerFill(page) {
  await page.goto(base + '/make/', { waitUntil: 'networkidle' });
  await page.locator('#dc-example').click();
  await page.waitForFunction(function () { return Array.prototype.some.call(document.querySelectorAll('.dc-in-reading'), function (i) { return i.value; }); });
  await page.waitForFunction(function () { return Array.prototype.some.call(document.querySelectorAll('.dc-in-gloss'), function (i) { return i.dataset.auto === '1' || i.value; }); });
  await page.waitForTimeout(400);
}
async function formValues(page) {
  return page.evaluate(function () {
    return {
      title: document.getElementById('dc-title').value,
      groups: Array.prototype.map.call(document.querySelectorAll('.dc-make-group'), function (fs) {
        return {
          name: fs.querySelector('.dc-in-name').value,
          words: Array.prototype.map.call(fs.querySelectorAll('.dc-make-word'), function (row) {
            var r = row.querySelector('.dc-in-reading'), g = row.querySelector('.dc-in-gloss');
            return [row.querySelector('.dc-in-word').value, r.value, r.dataset.auto || '', r.placeholder, g.value, g.dataset.auto || ''];
          })
        };
      })
    };
  });
}

(async function () {
  const browser = await L.launch();
  const R = L.makeRunner(browser, base, only), test = R.test;
  try {
    // ---------- every tier x every way a game can end: share text, storage, events ----------
    for (const tier of TIERS) {
      for (const name of Object.keys(L.SEQ)) {
        await test('daily/' + tier + '/' + name, { vp: 'desktop' }, async function (t) {
          const b = await L.dailyBoard(base, T, tier);
          await openDaily(t.page, '?t=' + tier);
          t.ui('start', await L.pageState(t.page));
          await L.playSequence(t.page, b, L.SEQ[name]);
          await ended(t.page);
          const board = await L.boardState(t.page), pg = await L.pageState(t.page);
          t.ui('board', { groups: board.groups, dots: board.dots, triesLabel: board.triesLabel, gridHidden: board.gridHidden, actionsHidden: board.actionsHidden, msg: board.msg });
          t.ui('end', pg.end); t.ui('tabs', pg.tabs);
          const cap = await share(t.page);
          t.strict('shareText', cap.copied);
          t.ui('shareStatus', (await L.pageState(t.page)).end.shareStatus);
          t.strict('events', await L.events(t.page));
          t.strict('storage', await L.webStore(t.page));
          t.strict('groupsOrder', board.groups.map(function (g) { return g.level; }));
          t.strict('dots', board.dots);
          t.strict('stores', pg.end.stores.map(function (s) { return [s.cls.split(' ').filter(function (c) { return /StoreLink/.test(c); })[0], s.href]; }));
          t.check('share text copied once', cap.copied.length === 1, cap.copied.length);
          t.check('no overflow on end screen', (await L.hScroll(t.page)).over.length === 0);
        });
      }
    }

    // ---------- the phone path: the share sheet ----------
    for (const pair of [['easy', 'golden'], ['hard', 'lost'], ['medium', 'solved']]) {
      await test('daily-mobile/' + pair[0] + '/' + pair[1], { vp: 'mobile' }, async function (t) {
        const b = await L.dailyBoard(base, T, pair[0]);
        await openDaily(t.page, '?t=' + pair[0]);
        t.check('pointer is coarse', await t.page.evaluate(function () { return window.matchMedia('(pointer: coarse)').matches; }));
        await L.playSequence(t.page, b, L.SEQ[pair[1]]);
        await ended(t.page);
        const cap = await share(t.page);
        t.strict('sharedViaSheet', cap.shared);
        t.strict('copied', cap.copied);
        t.strict('events', await L.events(t.page));
        t.strict('storage', await L.webStore(t.page));
        t.ui('end', (await L.pageState(t.page)).end);
      });
    }

    // ---------- nothing can copy: the text is shown for copying by hand ----------
    await test('daily/share-manual', { vp: 'desktop', clipboard: 'fail' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy');
      await openDaily(t.page, '?t=easy');
      await L.playSequence(t.page, b, L.SEQ.goldenOne);
      await ended(t.page);
      await t.page.locator('#dc-share').click();
      await t.page.waitForTimeout(250);
      const pg = await L.pageState(t.page);
      t.strict('fallbackText', pg.end.fallbackValue);
      t.strict('fallbackVisible', pg.end.fallbackVisible);
      t.strict('events', await L.events(t.page));
      t.ui('status', pg.end.shareStatus);
    });

    // ---------- the status line after each kind of guess ----------
    await test('daily/messages', { vp: 'desktop' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy');
      await openDaily(t.page, '?t=easy');
      const m = {};
      m.wrong = await guessMsg(t.page, L.wordsFor(b, 'EEMM'));
      m.oneAway = await guessMsg(t.page, L.wordsFor(b, 'EEEM1'));
      m.correct = await guessMsg(t.page, L.wordsFor(b, 'EEEE'));
      // the same four again (in another order) is not a new guess
      await L.pickTiles(t.page, L.wordsFor(b, 'MMMH1').reverse());
      await t.page.locator('.dc-submit').click(); await t.page.waitForTimeout(80); await L.settle(t.page);
      m.first = (await L.boardState(t.page));
      await t.page.locator('.dc-clear').click();
      await L.pickTiles(t.page, L.wordsFor(b, 'MMMH1'));
      await t.page.locator('.dc-submit').click(); await t.page.waitForTimeout(80);
      const dup = await L.boardState(t.page);
      t.strict('messages', { wrong: m.wrong.msg, oneAway: m.oneAway.msg, correct: m.correct.msg, duplicate: dup.msg });
      t.ui('kinds', { wrong: m.wrong.kind, oneAway: m.oneAway.kind, correct: m.correct.kind, duplicate: dup.msgKind });
      t.strict('afterDuplicate', { dots: dup.dots, selected: dup.selected.length, triesLabel: dup.triesLabel });
      t.strict('storage', await L.webStore(t.page));
      t.strict('events', await L.events(t.page));
    });

    // ---------- selecting ----------
    await test('daily/selection', { vp: 'desktop' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy');
      await openDaily(t.page, '?t=easy');
      const s0 = await L.boardState(t.page);
      await L.pickTiles(t.page, L.wordsFor(b, 'EEE'));
      const s3 = await L.boardState(t.page);
      await L.pickTiles(t.page, L.wordsFor(b, 'M'));
      const s4 = await L.boardState(t.page);
      await L.pickTiles(t.page, L.wordsFor(b, 'H'));               // a fifth tile does nothing
      const s5 = await L.boardState(t.page);
      await t.page.locator('.dc-shuffle').click(); await t.page.waitForTimeout(450);
      const sShuffled = await L.boardState(t.page);
      await L.pickTiles(t.page, L.wordsFor(b, 'E'));               // tapping a selected tile releases it
      const sRelease = await L.boardState(t.page);
      await t.page.locator('.dc-clear').click();
      const sClear = await L.boardState(t.page);
      t.strict('counts', { start: [s0.tiles.length, s0.selected.length, s0.submitDisabled], three: [s3.selected.length, s3.submitDisabled], four: [s4.selected.length, s4.submitDisabled], five: [s5.selected.length, s5.selected.join()], shuffled: [sShuffled.selected.join(), sShuffled.tiles.length], release: [sRelease.selected.length, sRelease.submitDisabled], clear: [sClear.selected.length, sClear.submitDisabled] });
      t.strict('pressedMatchesSel', [s3.pressed, s4.pressed, sClear.pressed]);
      t.strict('dots', s0.dots);
      t.strict('storageAfterFirstTap', await L.webStore(t.page));
      t.strict('events', await L.events(t.page));
      // keyboard: a tile is a button
      await t.page.locator('.dc-grid .dc-tile').first().focus();
      await t.page.keyboard.press('Enter');
      t.strict('keyboardSelects', (await L.boardState(t.page)).selected.length);
      const ring = await t.page.evaluate(function () { var cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, width: cs.outlineWidth }; });
      t.ui('focusRing', ring);
      t.check('focus ring visible on a tile', ring.style !== 'none' && parseFloat(ring.width) >= 2, ring);
    });

    // ---------- leaving and coming back ----------
    await test('daily/resume', { vp: 'desktop' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'medium');
      await openDaily(t.page, '?t=medium');
      await L.playSequence(t.page, b, ['EEEE', 'MMMH1', 'MMHH']);
      const before = await L.boardState(t.page), stored = await L.webStore(t.page);
      await t.page.reload(); await tiles(t.page);
      const after = await L.boardState(t.page);
      t.strict('midGame', { before: [before.groups.map(function (g) { return g.level; }), before.dots, before.tiles], after: [after.groups.map(function (g) { return g.level; }), after.dots, after.tiles], stored: stored });
      t.strict('sameAfterReload', JSON.stringify([before.groups, before.dots, before.tiles]) === JSON.stringify([after.groups, after.dots, after.tiles]));
      await L.playSequence(t.page, b, ['MMMM', 'HHHH', 'XXXX']);
      await ended(t.page);
      const cap1 = await share(t.page), end1 = (await L.pageState(t.page)).end;
      await t.page.reload(); await ended(t.page);
      const cap2 = await share(t.page), pg2 = await L.pageState(t.page);
      t.strict('shareBeforeReload', cap1.copied);
      t.strict('shareAfterReload', cap2.copied);
      t.strict('storage', await L.webStore(t.page));
      t.ui('endAfterReload', pg2.end); t.ui('endBefore', end1);
      t.strict('eventsAfterReload', await L.events(t.page));
      // with one board done, a plain visit opens the first unfinished one
      await t.page.goto(base + '/play/'); await tiles(t.page);
      const pg3 = await L.pageState(t.page);
      t.strict('nextVisitTabs', pg3.tabs.map(function (x) { return [x.tier, x.selected]; }));
      t.ui('nextVisitTabsText', pg3.tabs.map(function (x) { return x.text; }));
    });

    // ---------- switching difficulty from the tabs and from the end screen ----------
    await test('daily/tabs', { vp: 'desktop' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy');
      await openDaily(t.page);
      const first = await L.pageState(t.page);
      await t.page.locator('#dc-tiers button[data-tier="hard"]').click(); await tiles(t.page);
      const hard = await L.pageState(t.page), hardBoard = await L.boardState(t.page);
      await t.page.locator('#dc-tiers button[data-tier="easy"]').click(); await tiles(t.page);
      await L.playSequence(t.page, b, L.SEQ.golden); await ended(t.page);
      const done = await L.pageState(t.page);
      await t.page.locator('#dc-more button').first().click(); await tiles(t.page);
      const next = await L.pageState(t.page);
      t.strict('defaultTier', first.tabs.map(function (x) { return [x.tier, x.selected]; }));
      t.strict('hardSelected', hard.tabs.map(function (x) { return [x.tier, x.selected]; }));
      t.strict('hardFurigana', [hardBoard.furigana, hardBoard.nofuri, hard.furiNoteVisible]);
      t.strict('moreButtons', done.end.moreButtons);
      t.strict('afterNextButton', [next.tabs.map(function (x) { return [x.tier, x.selected]; }), next.end === null, next.heading]);
      t.strict('storage', await L.webStore(t.page));
      t.strict('url', await t.page.evaluate(function () { return location.pathname + location.search + location.hash; }));
      t.ui('tabsText', next.tabs.map(function (x) { return x.text; }));
    });

    // ---------- ?d= and &t=, and the 7-day rule ----------
    await test('daily/dates', { vp: 'desktop' }, async function (t) {
      const cases = {
        yesterday: '?d=' + addDays(T, -1) + '&t=easy', sixDaysAgo: '?d=' + addDays(T, -6) + '&t=hard', sevenDaysAgo: '?d=' + addDays(T, -7) + '&t=medium',
        sevenNoTier: '?d=' + addDays(T, -7), longAgo: '?d=2026-03-03&t=hard', epoch: '?d=2026-01-01&t=easy', beforeEpoch: '?d=2025-12-31&t=easy',
        tomorrow: '?d=' + addDays(T, 1) + '&t=easy', today: '?d=' + T + '&t=hard', garbage: '?d=2026-13-45&t=easy', badTier: '?d=' + addDays(T, -2) + '&t=expert', tierOnly: '?t=medium', none: ''
      };
      const outS = {}, outU = {};
      for (const k of Object.keys(cases)) {
        await t.page.goto(base + '/play/' + cases[k]);
        await t.page.waitForSelector('.dc-grid .dc-tile, #dc-notice:not([hidden])');
        const pg = await L.pageState(t.page), bd = await L.boardState(t.page);
        outS[k] = { heading: pg.heading, tabs: pg.tabs && pg.tabs.map(function (x) { return [x.tier, x.selected]; }), playable: bd.tiles.length, subLinks: pg.subLinks, noticeStores: pg.noticeLinks.filter(function (a) { return /StoreLink/.test(a.cls); }).map(function (a) { return [a.cls.split(' ').filter(function (c) { return /StoreLink/.test(c); })[0], a.href]; }), furigana: bd.furigana };
        outU[k] = { sub: pg.sub, notice: pg.notice, noticeLinks: pg.noticeLinks, furiNote: pg.furiNoteVisible };
      }
      t.strict('cases', outS); t.ui('cases', outU);
      t.strict('events', await L.events(t.page));
    });

    await test('daily/past-day-end', { vp: 'desktop' }, async function (t) {
      const day = addDays(T, -3), b = await L.dailyBoard(base, day, 'hard');
      await openDaily(t.page, '?d=' + day + '&t=hard');
      await L.playSequence(t.page, b, L.SEQ.solved); await ended(t.page);
      const pg = await L.pageState(t.page), cap = await share(t.page);
      t.strict('shareText', cap.copied);
      t.strict('nextLinks', pg.end.nextLinks);
      t.strict('moreButtons', pg.end.moreButtons);
      t.strict('storage', await L.webStore(t.page));
      t.strict('events', await L.events(t.page));
      t.ui('end', pg.end); t.ui('sub', pg.sub);
    });

    // ---------- furigana defaults and the visitor's own choice ----------
    await test('daily/furigana', { vp: 'desktop' }, async function (t) {
      const seen = {};
      for (const tier of TIERS) {
        await openDaily(t.page, '?t=' + tier);
        const bd = await L.boardState(t.page), pg = await L.pageState(t.page);
        seen[tier] = [bd.furigana, bd.nofuri, pg.furiNoteVisible];
      }
      t.strict('defaults', seen);
      t.strict('storageUntouched', await L.webStore(t.page));
      // turn it on in Hard: the choice is kept and applies everywhere
      await openDaily(t.page, '?t=hard');
      await t.page.locator('.dc-furigana input').check();
      const on = await L.boardState(t.page);
      const rubyShown = await t.page.evaluate(function () { var rt = document.querySelector('.dc-grid rt'); return rt ? getComputedStyle(rt).display !== 'none' : null; });
      const stored = await L.webStore(t.page), after = {};
      for (const tier of TIERS) { await openDaily(t.page, '?t=' + tier); const bd = await L.boardState(t.page); after[tier] = [bd.furigana, bd.nofuri]; }
      await t.page.locator('.dc-furigana input').uncheck();
      const off = await L.webStore(t.page), afterOff = {};
      for (const tier of TIERS) { await openDaily(t.page, '?t=' + tier); const bd = await L.boardState(t.page); afterOff[tier] = [bd.furigana, bd.nofuri]; }
      t.strict('afterTurningOn', { board: [on.furigana, on.nofuri], rubyShown: rubyShown, stored: stored, everywhere: after });
      t.strict('afterTurningOff', { stored: off, everywhere: afterOff });
      const rt = await t.page.evaluate(function () { var r = document.querySelector('.dc-grid rt'); return r ? getComputedStyle(r).display : null; });
      t.strict('rtHiddenWhenOff', rt);
    });

    // ---------- streak, and old entries losing their guesses ----------
    const seedStreak = { 'dangochains.web.v1': { boards: {} } };
    seedStreak['dangochains.web.v1'].boards[addDays(T, -1) + '/easy'] = { fp: 'x1', n: 313, g: [], s: 1, done: 1, won: 1, m: 0 };
    seedStreak['dangochains.web.v1'].boards[addDays(T, -2) + '/hard'] = { fp: 'x2', n: 312, g: [], s: 1, done: 1, won: 1, m: 3 };
    seedStreak['dangochains.web.v1'].boards[addDays(T, -3) + '/medium'] = { fp: 'x3', n: 311, g: [], s: 1, done: 1, won: 0, m: 6 };
    seedStreak['dangochains.web.v1'].boards[addDays(T, -4) + '/medium'] = { fp: 'x4', n: 310, g: [], s: 1, done: 1, won: 1, m: 1 };
    seedStreak['dangochains.web.v1'].boards[addDays(T, -20) + '/easy'] = { fp: 'x5', n: 294, g: [['a', 'b', 'c', 'd']], s: 1, done: 1, won: 1, m: 0 };
    seedStreak['dangochains.web.v1'].tier = 'hard';
    await test('daily/streak', { vp: 'desktop', seed: seedStreak }, async function (t) {
      const b = await L.dailyBoard(base, T, 'hard');
      await openDaily(t.page);
      const pg0 = await L.pageState(t.page);
      await L.playSequence(t.page, b, L.SEQ.goldenOne); await ended(t.page);
      const pg = await L.pageState(t.page);
      t.strict('openedLastTier', pg0.tabs.map(function (x) { return [x.tier, x.selected]; }));
      t.strict('streak', pg.end.streak);
      t.strict('storage', await L.webStore(t.page));
      t.ui('end', pg.end);
    });
    await test('daily/streak-lost-today', { vp: 'desktop', seed: seedStreak }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy');
      await openDaily(t.page, '?t=easy');
      await L.playSequence(t.page, b, L.SEQ.lost); await ended(t.page);
      t.strict('streak', (await L.pageState(t.page)).end.streak);
    });

    // ---------- a day past the end of the feed, and a feed that fails to load ----------
    await test('daily/missing-day', { vp: 'desktop', now: '2027-02-10T10:00:00-05:00' }, async function (t) {
      await t.page.goto(base + '/play/?t=easy');
      await t.page.waitForSelector('#dc-notice:not([hidden])');
      const pg = await L.pageState(t.page);
      t.strict('heading', pg.heading);
      t.strict('stores', pg.noticeLinks.filter(function (a) { return /StoreLink/.test(a.cls); }).map(function (a) { return a.href; }));
      t.ui('notice', pg.notice);
      t.r.errors.length = 0; // the 404 for a month that is not published is expected here
    });
    await test('daily/offline-retry', { vp: 'desktop' }, async function (t) {
      let fail = true;
      await t.ctx.route(/\/feed\/v1\//, function (route) { return fail ? route.abort() : route.continue(); });
      await t.page.goto(base + '/play/?t=easy');
      await t.page.waitForSelector('#dc-retry');
      const pg = await L.pageState(t.page);
      fail = false;
      await t.page.locator('#dc-retry').click();
      await tiles(t.page);
      t.strict('recovered', (await L.boardState(t.page)).tiles.length);
      t.ui('notice', pg.notice);
      t.r.errors.length = 0; // the aborted request is the point of the test
    });

    // ---------- the maker, and a board's round trip through its link ----------
    let payload = null, exampleForm = null;
    await test('make/example-link', { vp: 'desktop' }, async function (t) {
      await makerFill(t.page);
      exampleForm = await formValues(t.page);
      await t.page.locator('#dc-form button[type=submit]').click();
      await t.page.waitForSelector('#dc-result-box:not([hidden])');
      const link = await t.page.locator('#dc-link').inputValue();
      payload = link.split('#b=')[1];
      await t.page.locator('#dc-copy').click(); await t.page.waitForTimeout(200);
      const cap = await L.captured(t.page);
      t.strict('form', exampleForm);
      t.strict('link', link);
      t.strict('openHref', await t.page.locator('#dc-open').getAttribute('href'));
      t.strict('copied', cap.copied);
      t.strict('longNoteHidden', await t.page.locator('#dc-long').isHidden());
      t.strict('events', await L.events(t.page));
      t.strict('draft', await t.page.evaluate(function () { return sessionStorage.getItem('dangochains.make.draft'); }));
      t.ui('copyStatus', await t.page.locator('#dc-copy-status').textContent());
      t.check('no horizontal scroll', (await L.hScroll(t.page)).over.length === 0);
    });

    await test('make/validation', { vp: 'desktop' }, async function (t) {
      await t.page.goto(base + '/make/', { waitUntil: 'networkidle' });
      await t.page.locator('#dc-form button[type=submit]').click();
      const empty = await t.page.evaluate(function () { return { text: document.getElementById('dc-errors').textContent, invalid: document.querySelectorAll('[aria-invalid="true"]').length, focused: document.activeElement.id || document.activeElement.className }; });
      await makerFill(t.page);
      const words = t.page.locator('.dc-in-word');
      await words.nth(5).fill('いちご');   // a duplicate of word 1
      await words.nth(15).fill('');        // one word missing in group 4
      await t.page.locator('.dc-in-name').nth(2).fill('');
      await t.page.locator('#dc-form button[type=submit]').click();
      const dup = await t.page.evaluate(function () { return { text: document.getElementById('dc-errors').textContent, invalid: document.querySelectorAll('[aria-invalid="true"]').length, resultHidden: document.getElementById('dc-result-box').hidden }; });
      t.strict('empty', empty); t.strict('problems', dup);
      t.strict('events', await L.events(t.page));
    });

    await test('make/readings', { vp: 'desktop' }, async function (t) {
      await t.page.goto(base + '/make/', { waitUntil: 'networkidle' });
      const w = t.page.locator('.dc-in-word'), r = t.page.locator('.dc-in-reading'), g = t.page.locator('.dc-in-gloss');
      await w.nth(0).fill('消防車'); await w.nth(1).fill('すし'); await w.nth(2).fill('猫背'); await w.nth(3).fill('図星');
      await r.nth(3).fill('じぶんでいれた');           // a reading typed by hand is kept
      await g.nth(2).fill('my own meaning');          // and so is a meaning
      await t.page.waitForTimeout(900);
      await t.page.waitForFunction(function () { return document.querySelectorAll('.dc-in-gloss')[0].value !== ''; }, null, { timeout: 15000 }).catch(function () {});
      const v = await formValues(t.page);
      t.strict('rows', v.groups[0].words);
      await w.nth(0).fill('取り消し'); await t.page.waitForTimeout(500);
      t.strict('followsTheWord', (await formValues(t.page)).groups[0].words[0]);
      // the draft survives a reload of this tab
      await t.page.reload({ waitUntil: 'networkidle' }); await t.page.waitForTimeout(500);
      t.strict('draftRestored', (await formValues(t.page)).groups[0].words.map(function (x) { return x[0]; }));
    });

    await test('custom/round-trip', { vp: 'desktop' }, async function (t) {
      if (!payload) throw new Error('no payload (make/example-link did not run)');
      await t.page.goto(base + '/play/#b=' + payload); await tiles(t.page);
      const pg = await L.pageState(t.page), bd = await L.boardState(t.page);
      const board = { by: { easy: exampleForm.groups[0].words.map(function (x) { return x[0]; }), medium: exampleForm.groups[1].words.map(function (x) { return x[0]; }), hard: exampleForm.groups[2].words.map(function (x) { return x[0]; }), expert: exampleForm.groups[3].words.map(function (x) { return x[0]; }) } };
      t.strict('start', { title: pg.title, heading: pg.heading, tabs: pg.tabs, intro: pg.introVisible, furigana: [bd.furigana, bd.nofuri], tiles: bd.tiles, subLinks: pg.subLinks });
      const ruby = await t.page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.dc-grid .dc-tile'), function (b) { return [b.dataset.w, Array.prototype.map.call(b.querySelectorAll('ruby'), function (r) { return r.textContent; }).join('|')]; }).sort(); });
      t.strict('ruby', ruby);
      await L.playSequence(t.page, board, L.SEQ.solved); await ended(t.page);
      const end = await L.pageState(t.page), cap = await share(t.page);
      t.strict('shareText', cap.copied);
      t.strict('links', end.end.links);
      t.strict('stores', end.end.stores.map(function (s) { return [s.cls.split(' ').filter(function (c) { return /StoreLink/.test(c); })[0], s.href]; }));
      t.strict('moreButtons', end.end.moreButtons);
      t.strict('events', await L.events(t.page));
      t.strict('storage', await L.webStore(t.page));
      t.ui('end', end.end);
      // Play again starts the same board over
      await t.page.locator('#dc-more button').click(); await tiles(t.page);
      const again = await L.boardState(t.page), pgAgain = await L.pageState(t.page);
      t.strict('playAgain', { tiles: again.tiles.length, dots: again.dots, endHidden: pgAgain.end === null, groups: again.groups.length });
      await L.playSequence(t.page, board, L.SEQ.lost); await ended(t.page);
      const cap2 = await share(t.page);
      t.strict('shareTextLost', cap2.copied);
      t.strict('eventsAfterSecondGame', await L.events(t.page));
      // "Edit a copy" brings the same board back into the maker
      await t.page.goto(base + '/make/#b=' + payload, { waitUntil: 'networkidle' }); await t.page.waitForTimeout(600);
      const copy = await formValues(t.page);
      t.strict('editACopy', { title: copy.title, groups: copy.groups.map(function (g) { return { name: g.name, words: g.words.map(function (x) { return [x[0], x[1], x[4]]; }) }; }) });
    });

    await test('custom/mobile-share', { vp: 'mobile' }, async function (t) {
      if (!payload) throw new Error('no payload');
      await t.page.goto(base + '/play/#b=' + payload); await tiles(t.page);
      const board = { by: { easy: exampleForm.groups[0].words.map(function (x) { return x[0]; }), medium: exampleForm.groups[1].words.map(function (x) { return x[0]; }), hard: exampleForm.groups[2].words.map(function (x) { return x[0]; }), expert: exampleForm.groups[3].words.map(function (x) { return x[0]; }) } };
      await L.playSequence(t.page, board, L.SEQ.golden); await ended(t.page);
      const cap = await share(t.page);
      t.strict('shared', cap.shared);
      t.strict('events', await L.events(t.page));
      t.check('no tile overflow', (await L.tileOverflow(t.page)).length === 0);
    });

    await test('custom/untitled-and-bad-links', { vp: 'desktop' }, async function (t) {
      // an untitled board with no readings or meanings, built with the page's own encoder
      await t.page.goto(base + '/make/', { waitUntil: 'networkidle' });
      const made = await t.page.evaluate(function () {
        var D = window.DangoBoard, g = function (n, w) { return { name: n, words: w.map(function (x) { return { w: x, reading: '', gloss: '' }; }) }; };
        return {
          plain: D.encodeCustom({ title: '', groups: [g('Fruit', ['りんご', 'みかん', 'もも', 'なし']), g('Animals', ['いぬ', 'ねこ', 'うま', 'とり']), g('Colors', ['あか', 'あお', 'きいろ', 'みどり']), g('Numbers', ['いち', 'に', 'さん', 'よん'])] }),
          short: D.encodeCustom({ title: 'x', groups: [g('A', ['1', '2', '3', '4'])] })
        };
      });
      await t.page.goto(base + '/play/#b=' + made.plain); await tiles(t.page);
      const pg = await L.pageState(t.page);
      const board = { by: { easy: ['りんご', 'みかん', 'もも', 'なし'], medium: ['いぬ', 'ねこ', 'うま', 'とり'], hard: ['あか', 'あお', 'きいろ', 'みどり'], expert: ['いち', 'に', 'さん', 'よん'] } };
      await L.playSequence(t.page, board, L.SEQ.goldenOne); await ended(t.page);
      const cap = await share(t.page);
      t.strict('untitled', { title: pg.title, heading: pg.heading, share: cap.copied });
      const notices = {};
      for (const pair of [['damaged', '%%%not-base64'], ['notABoard', 'eyJ2IjoyfQ'], ['incomplete', made.short], ['empty', '']]) {
        await t.page.goto(base + '/play/#b=' + pair[1]);
        await t.page.waitForSelector('#dc-notice:not([hidden])');
        const p = await L.pageState(t.page);
        notices[pair[0]] = { notice: p.notice, links: p.noticeLinks.map(function (a) { return a.href; }), heading: p.heading };
      }
      t.strict('badLinks', notices);
    });

    await test('custom/hash-change-reloads', { vp: 'desktop' }, async function (t) {
      if (!payload) throw new Error('no payload');
      await openDaily(t.page, '?t=easy');
      await Promise.all([t.page.waitForNavigation({ waitUntil: 'load' }), t.page.evaluate(function (p) { location.hash = 'b=' + p; }, payload)]);
      await tiles(t.page);
      const pg = await L.pageState(t.page);
      t.strict('nowCustom', { heading: pg.heading, tabs: pg.tabs });
    });
  } finally { await browser.close(); }
  fs.writeFileSync(out, JSON.stringify(R.results, null, 1));
  const ids = Object.keys(R.results), failed = ids.filter(function (k) { return R.results[k].failed; });
  const badChecks = ids.filter(function (k) { return R.results[k].checks.some(function (c) { return !c.ok; }); });
  const withErrors = ids.filter(function (k) { return R.results[k].errors.length; });
  console.log(ids.length + ' tests; failed: ' + failed.length + '; failed checks: ' + badChecks.length + '; console/network errors: ' + withErrors.length + '  -> ' + out);
  if (withErrors.length) withErrors.forEach(function (k) { console.log('  errors in ' + k + ': ' + R.results[k].errors.slice(0, 3).join(' || ')); });
})();
