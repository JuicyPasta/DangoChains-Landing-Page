// Accessibility audit (axe-core, WCAG 2.x A/AA rules) of every page and the main game states, light and dark.
//   node axe.js <baseUrl> <out.json>
const fs = require('fs');
const L = require('./lib');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, ''), out = process.argv[3] || 'axe.json';
const T = L.TODAY;
async function audit(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async function () {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return r.violations.map(function (v) { return { id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(function (n) { return { target: n.target.join(' '), summary: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 260) }; }), count: v.nodes.length }; });
  });
}
(async function () {
  const browser = await L.launch(), all = {};
  const states = [
    ['home', async function (p) { await p.goto(base + '/', { waitUntil: 'networkidle' }); }],
    ['play', async function (p) { await p.goto(base + '/play/?t=easy'); await p.waitForSelector('.dc-grid .dc-tile'); }],
    ['play-mid', async function (p) { const b = await L.dailyBoard(base, T, 'easy'); await p.goto(base + '/play/?t=easy'); await p.waitForSelector('.dc-grid .dc-tile'); await L.guess(p, L.wordsFor(b, 'EEEE')); await L.guess(p, L.wordsFor(b, 'MMMH1')); await L.pickTiles(p, L.wordsFor(b, 'MM')); }],
    ['play-won', async function (p) { const b = await L.dailyBoard(base, T, 'easy'); await p.goto(base + '/play/?t=easy'); await p.waitForSelector('.dc-grid .dc-tile'); await L.playSequence(p, b, L.SEQ.goldenOne); await p.waitForSelector('#dc-end:not([hidden])'); await p.waitForTimeout(700); }],
    ['play-lost', async function (p) { const b = await L.dailyBoard(base, T, 'hard'); await p.goto(base + '/play/?t=hard'); await p.waitForSelector('.dc-grid .dc-tile'); await L.playSequence(p, b, L.SEQ.lost); await p.waitForSelector('#dc-end:not([hidden])', { timeout: 20000 }); await p.waitForTimeout(700); }],
    ['play-archive', async function (p) { await p.goto(base + '/play/?d=2026-10-01&t=easy'); await p.waitForSelector('#dc-notice:not([hidden])'); }],
    ['make', async function (p) { await p.goto(base + '/make/', { waitUntil: 'networkidle' }); }],
    ['make-filled', async function (p) { await p.goto(base + '/make/', { waitUntil: 'networkidle' }); await p.locator('#dc-example').click(); await p.waitForTimeout(600); await p.locator('#dc-form button[type=submit]').click(); await p.waitForSelector('#dc-result-box:not([hidden])'); await p.waitForTimeout(600); }],
    ['make-errors', async function (p) { await p.goto(base + '/make/', { waitUntil: 'networkidle' }); await p.locator('#dc-form button[type=submit]').click(); await p.waitForTimeout(200); }],
    ['bridge', async function (p) { await p.goto(base + '/bridge/?t=easy'); await p.waitForSelector('.br-opt'); }],
    ['bridge-mid', async function (p) { const b = (await L.bridgeBoard(base, T, 'easy')).board; await p.goto(base + '/bridge/?t=easy'); await p.waitForSelector('.br-opt'); await p.locator('.br-opt[data-k=' + JSON.stringify(b.options.filter(function (k) { return k !== b.answer && (b.near[k] || []).length; })[0]) + ']').click(); await p.waitForTimeout(800); }],
    ['bridge-won', async function (p) { const b = (await L.bridgeBoard(base, T, 'easy')).board; await p.goto(base + '/bridge/?t=easy'); await p.waitForSelector('.br-opt'); await p.locator('.br-opt[data-k=' + JSON.stringify(b.answer) + ']').click(); await p.waitForSelector('.br-end:not([hidden])'); await p.waitForTimeout(1000); }],
    ['bridge-lost', async function (p) { const b = (await L.bridgeBoard(base, T, 'hard')).board; await p.goto(base + '/bridge/?t=hard'); await p.waitForSelector('.br-opt'); for (const k of b.options.filter(function (x) { return x !== b.answer; }).slice(0, 3)) { await p.locator('.br-opt[data-k=' + JSON.stringify(k) + ']').click(); await p.waitForTimeout(200); } await p.waitForSelector('.br-end:not([hidden])'); await p.waitForTimeout(1000); }],
    ['how-to-play', async function (p) { await p.goto(base + '/how-to-play/'); }],
    ['changelog', async function (p) { await p.goto(base + '/changelog/'); }],
    ['privacy', async function (p) { await p.goto(base + '/privacypolicy/'); }],
    ['terms', async function (p) { await p.goto(base + '/tos/'); }],
    ['study', async function (p) { await p.goto(base + '/study/'); }],
    ['study-day', async function (p) { await p.goto(base + '/study/2026-11-08/'); await p.evaluate(function () { Array.prototype.forEach.call(document.querySelectorAll('details.st-answers'), function (d) { d.open = true; }); }); }],
    ['study-topics', async function (p) { await p.goto(base + '/study/topics/'); }],
    ['study-topic', async function (p) { await p.goto(base + '/study/topics/idioms/'); }],
    ['404', async function (p) { await p.goto(base + '/404.html'); }],
    ['menu-open', async function (p) { await p.goto(base + '/play/?t=easy'); await p.waitForSelector('.dc-grid .dc-tile'); await p.locator('.site-menu > summary').click(); await p.waitForTimeout(150); }]
  ];
  let total = 0;
  for (const scheme of ['light', 'dark']) for (const vp of ['mobile', 'desktop']) {
    for (const st of states) {
      if (st[0] === 'menu-open' && vp === 'desktop') continue;
      const ctx = await L.newContext(browser, { vp: vp, scheme: scheme, reducedMotion: true });
      const page = await ctx.newPage();
      try {
        await st[1](page); await page.waitForTimeout(250);
        const v = await audit(page);
        all[st[0] + '/' + vp + '/' + scheme] = v; total += v.length;
        if (v.length) console.log(st[0] + '/' + vp + '/' + scheme + ': ' + v.map(function (x) { return x.id + '(' + x.impact + ' x' + x.count + ')'; }).join(', '));
      } catch (e) { all[st[0] + '/' + vp + '/' + scheme] = 'FAILED ' + e.message.split('\n')[0]; console.log('FAILED ' + st[0] + ' ' + e.message.split('\n')[0]); total++; }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(out, JSON.stringify(all, null, 1));
  console.log(Object.keys(all).length + ' audits; ' + total + ' with findings');
})();
