// The motion layer: the right animation starts at each moment, the result arrives in time,
// and with prefers-reduced-motion nothing animates and nothing waits.
//   node regress-feel.js <baseUrl> <out.json>
const fs = require('fs');
const L = require('./lib');
const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, ''), out = process.argv[3] || 'regress-feel.json';
const T = L.TODAY;
function running(page) {
  return page.evaluate(function () {
    return document.getAnimations().filter(function (a) { return a.playState === 'running' || a.playState === 'pending'; }).map(function (a) {
      var el = a.effect && a.effect.target, cls = el && typeof el.className === 'string' ? el.className.split(' ')[0] : '';
      return (a.animationName || (a.transitionProperty ? 'transition:' + a.transitionProperty : 'waapi')) + '@' + cls;
    }).sort();
  });
}
const uniq = function (a) { return Array.from(new Set(a)); };
(async function () {
  const browser = await L.launch();
  const R = L.makeRunner(browser, base, null), test = R.test;
  try {
    for (const calm of [false, true]) {
      await test('motion/' + (calm ? 'reduced' : 'full'), { vp: 'mobile', reducedMotion: calm }, async function (t) {
        const b = await L.dailyBoard(base, T, 'easy'), seen = {}, page = t.page;
        await page.goto(base + '/play/?t=easy'); await page.waitForSelector('.dc-grid .dc-tile'); await page.waitForTimeout(700);
        await L.pickTiles(page, L.wordsFor(b, 'M')); seen.select = uniq(await running(page));
        await L.pickTiles(page, L.wordsFor(b, 'MMH').slice(1).concat([])); await L.pickTiles(page, [L.wordsFor(b, 'MM')[1]].slice(0, 0));
        await L.pickTiles(page, [L.wordsFor(b, 'MMM')[2]]);
        await page.locator('.dc-submit').click(); seen.oneAway = uniq(await running(page));
        await page.waitForTimeout(600);
        await page.locator('.dc-shuffle').click(); seen.shuffle = uniq(await running(page));
        await page.waitForTimeout(450);
        await L.pickTiles(page, L.wordsFor(b, 'EEEE')); await page.waitForTimeout(350);
        await page.locator('.dc-submit').click(); seen.correct = uniq(await running(page));
        await page.waitForTimeout(500);
        await L.guess(page, L.wordsFor(b, 'MMMM')); await L.guess(page, L.wordsFor(b, 'HHHH'));
        await L.pickTiles(page, L.wordsFor(b, 'XXXX')); await page.waitForTimeout(350);
        const t0 = Date.now();
        await page.locator('.dc-submit').click(); seen.win = uniq(await running(page));
        const busy = await page.evaluate(function () { return !!document.querySelector('.dc-busy'); });
        await page.waitForSelector('#dc-end:not([hidden])', { timeout: 8000 });
        const winMs = Date.now() - t0;
        seen.endCard = uniq(await running(page));
        t.ui('animations', seen); t.ui('winToResultMs', winMs); t.ui('busyDuringCelebration', busy);
        const has = function (list, name) { return list.some(function (x) { return x.indexOf(name) === 0; }); };
        if (calm) {
          const any = Object.keys(seen).filter(function (k) { return seen[k].some(function (x) { return x.indexOf('transition:') !== 0; }); });
          t.check('reduced motion: no keyframe or glide animation', any.length === 0, seen);
          t.check('reduced motion: the result is immediate', winMs < 600 && !busy, { winMs: winMs, busy: busy });
        } else {
          t.check('select pops', has(seen.select, 'dc-pop@dc-tile'), seen.select);
          t.check('one away: tiles shake', has(seen.oneAway, 'dc-shake@dc-tile'), seen.oneAway);
          t.check('one away: the status pill has its own entrance', has(seen.oneAway, 'dc-near@dc-msg'), seen.oneAway);
          t.check('one away: the lost try pops', has(seen.oneAway, 'dc-eat@dc-dot'), seen.oneAway);
          t.check('shuffle: tiles glide', has(seen.shuffle, 'waapi@dc-tile'), seen.shuffle);
          t.check('correct: the band pops in', has(seen.correct, 'dc-band@dc-group'), seen.correct);
          t.check('correct: remaining tiles glide', has(seen.correct, 'waapi@dc-tile'), seen.correct);
          t.check('win: bands wave and dango fly', has(seen.win, 'dc-wave@dc-group') && seen.win.some(function (x) { return x.indexOf('dc-burst') === 0; }), seen.win);
          t.check('win: the result card rises', has(seen.endCard, 'dc-rise@dc-end-card'), seen.endCard);
          t.check('win: result within 1.6 s', winMs < 1600 && busy, { winMs: winMs, busy: busy });
        }
      });
      await test('motion-loss/' + (calm ? 'reduced' : 'full'), { vp: 'mobile', reducedMotion: calm }, async function (t) {
        const b = await L.dailyBoard(base, T, 'hard'), page = t.page;
        await page.goto(base + '/play/?t=hard'); await page.waitForSelector('.dc-grid .dc-tile');
        await L.playSequence(page, b, L.SEQ.lost.slice(0, 5));
        await L.pickTiles(page, L.wordsFor(b, 'EEEH2'));
        const t0 = Date.now(), steps = [];
        await page.locator('.dc-submit').click();
        for (let i = 0; i < 40 && !(await page.evaluate(function () { return !document.getElementById('dc-end').hidden; })); i++) {
          steps.push(await page.evaluate(function () { return document.querySelectorAll('.dc-solved .dc-group').length + '/' + document.querySelectorAll('.dc-grid .dc-tile').length; }));
          await page.waitForTimeout(90);
        }
        const ms = Date.now() - t0;
        t.ui('revealSteps', uniq(steps)); t.ui('lossToResultMs', ms);
        if (calm) t.check('reduced motion: the loss shows at once', ms < 700 && uniq(steps).length <= 1, { ms: ms, steps: uniq(steps) });
        else {
          t.check('loss: the groups are revealed one at a time', ['0/16', '1/12', '2/8', '3/4'].every(function (s) { return steps.indexOf(s) >= 0; }), uniq(steps));
          t.check('loss: result within 4 s', ms < 4000, ms);
        }
        const st = await L.boardState(page);
        t.check('all four groups shown, in level order for an unsolved board', JSON.stringify(st.groups.map(function (g) { return g.level; })) === JSON.stringify(['easy', 'medium', 'hard', 'expert']), st.groups.map(function (g) { return g.level; }));
      });
    }
    // switching boards during the celebration must not leak the old result onto the new board
    await test('motion/switch-during-celebration', { vp: 'desktop' }, async function (t) {
      const b = await L.dailyBoard(base, T, 'easy'), page = t.page;
      await page.goto(base + '/play/?t=easy'); await page.waitForSelector('.dc-grid .dc-tile');
      await L.playSequence(page, b, L.SEQ.golden.slice(0, 3));
      await L.pickTiles(page, L.wordsFor(b, 'XXXX'));
      await page.locator('.dc-submit').click();
      await page.locator('#dc-tiers button[data-tier="hard"]').click();
      await page.waitForTimeout(2000);
      const pg = await L.pageState(page), bd = await L.boardState(page);
      t.check('the new board is playable and shows no result', pg.end === null && bd.tiles.length === 16 && !bd.actionsHidden, { end: pg.end, tiles: bd.tiles.length });
      t.check('the finished board still got its badge', /✨/.test(pg.tabs[0].text), pg.tabs);
      t.check('the win was saved', (await L.webStore(page)).boards[T + '/easy'].done === 1);
      t.check('the board is not left busy', await page.evaluate(function () { return !document.querySelector('.dc-busy') && !document.getElementById('dc-board').style.minHeight; }));
      await page.locator('#dc-tiers button[data-tier="easy"]').click(); await page.waitForSelector('#dc-end:not([hidden])');
      t.check('going back shows the result', (await L.pageState(page)).end.result === '✨ Golden dango!');
    });
  } finally { await browser.close(); }
  fs.writeFileSync(out, JSON.stringify(R.results, null, 1));
  Object.keys(R.results).forEach(function (k) {
    R.results[k].checks.filter(function (c) { return !c.ok; }).forEach(function (c) { console.log('  ' + k + ': ' + c.name + '  ' + JSON.stringify(c.detail).slice(0, 600)); });
    if (R.results[k].ui.animations) console.log('  ' + k + ' ' + JSON.stringify(R.results[k].ui.animations).slice(0, 900) + ' win->result ' + R.results[k].ui.winToResultMs + 'ms');
    if (R.results[k].ui.revealSteps) console.log('  ' + k + ' steps ' + JSON.stringify(R.results[k].ui.revealSteps) + ' loss->result ' + R.results[k].ui.lossToResultMs + 'ms');
  });
})();
