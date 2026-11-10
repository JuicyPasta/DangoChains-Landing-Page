// Screenshot pass: every page and game state at 1280x800 and 390x844, light and dark.
//   node shots.js <baseUrl> <outDir> [--only=substr,substr] [--vp=desktop,mobile] [--scheme=light,dark]
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const base = (process.argv[2] || 'http://127.0.0.1:4011').replace(/\/$/, '');
const outDir = process.argv[3];
const arg = function (name) {
  const a = process.argv.find(function (x) { return x.indexOf('--' + name + '=') === 0; });
  return a ? a.split('=')[1].split(',') : null;
};
const only = arg('only'), vps = arg('vp') || ['desktop', 'mobile'], schemes = arg('scheme') || ['light', 'dark'];
if (!outDir) { console.error('usage: node shots.js <baseUrl> <outDir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const T = L.TODAY;

function states(custom) {
  const tiles = async function (page) { await page.waitForSelector('.dc-tile'); };
  const ended = async function (page) { await page.waitForSelector('#dc-end:not([hidden])'); };
  return [
    { name: '01-home', run: async function (page) { await page.goto(base + '/', { waitUntil: 'networkidle' }); } },
    { name: '02-play-start', run: async function (page) { await page.goto(base + '/play/?t=easy'); await tiles(page); } },
    { name: '03-play-mid', run: async function (page) {
      const b = await L.dailyBoard(base, T, 'easy');
      await page.goto(base + '/play/?t=easy'); await tiles(page);
      await L.guess(page, L.wordsFor(b, 'EEEE'));
      await L.pickTiles(page, L.wordsFor(b, 'MM'));
    } },
    { name: '04-play-one-away', run: async function (page) {
      const b = await L.dailyBoard(base, T, 'easy');
      await page.goto(base + '/play/?t=easy'); await tiles(page);
      await L.guess(page, L.wordsFor(b, 'EEEE'));
      await L.guess(page, L.wordsFor(b, 'MMMH1'));
    } },
    { name: '05-play-won', run: async function (page) {
      const b = await L.dailyBoard(base, T, 'easy');
      await page.goto(base + '/play/?t=easy'); await tiles(page);
      await L.playSequence(page, b, L.SEQ.golden); await ended(page);
      await page.locator('#dc-share').click(); await page.waitForTimeout(200);
    } },
    { name: '06-play-lost', run: async function (page) {
      const b = await L.dailyBoard(base, T, 'hard');
      await page.goto(base + '/play/?t=hard'); await tiles(page);
      await L.playSequence(page, b, L.SEQ.lost); await ended(page);
    } },
    { name: '07-play-normal-nofurigana', run: async function (page) { await page.goto(base + '/play/?t=medium'); await tiles(page); } },
    { name: '08-play-archive-notice', run: async function (page) { await page.goto(base + '/play/?d=2026-10-01&t=easy'); await page.waitForSelector('#dc-notice:not([hidden])'); } },
    { name: '09-play-custom', run: async function (page) { await page.goto(base + '/play/#b=' + custom); await tiles(page); } },
    { name: '10-make', run: async function (page) { await page.goto(base + '/make/', { waitUntil: 'networkidle' }); } },
    { name: '11-make-filled', run: async function (page) {
      await page.goto(base + '/make/', { waitUntil: 'networkidle' });
      await page.locator('#dc-example').click();
      await page.waitForFunction(function () { return Array.prototype.some.call(document.querySelectorAll('.dc-in-reading'), function (i) { return i.value; }); });
      await page.locator('#dc-form button[type=submit]').click();
      await page.waitForSelector('#dc-result-box:not([hidden])'); await page.waitForTimeout(700);
    } },
    { name: '12-bridge-start', run: async function (page) { await page.goto(base + '/bridge/?t=easy'); await page.waitForSelector('.br-opt'); } },
    { name: '13-bridge-mid', run: async function (page) {
      const b = (await L.bridgeBoard(base, T, 'easy')).board;
      await page.goto(base + '/bridge/?t=easy'); await page.waitForSelector('.br-opt');
      const wrong = b.options.filter(function (k) { return k !== b.answer && (b.near[k] || []).length; })[0];
      await page.locator('.br-opt[data-k=' + JSON.stringify(wrong) + ']').click(); await page.waitForTimeout(300);
    } },
    { name: '14-bridge-won', run: async function (page) {
      const b = (await L.bridgeBoard(base, T, 'easy')).board;
      await page.goto(base + '/bridge/?t=easy'); await page.waitForSelector('.br-opt');
      await page.locator('.br-opt[data-k=' + JSON.stringify(b.answer) + ']').click();
      await page.waitForSelector('.br-end:not([hidden])'); await page.waitForTimeout(900);
    } },
    { name: '15-bridge-lost', run: async function (page) {
      const b = (await L.bridgeBoard(base, T, 'hard')).board;
      await page.goto(base + '/bridge/?t=hard'); await page.waitForSelector('.br-opt');
      for (const k of b.options.filter(function (x) { return x !== b.answer; }).slice(0, 3)) {
        await page.locator('.br-opt[data-k=' + JSON.stringify(k) + ']').click(); await page.waitForTimeout(200);
      }
      await page.waitForSelector('.br-end:not([hidden])'); await page.waitForTimeout(900);
    } },
    { name: '16-how-to-play', run: async function (page) { await page.goto(base + '/how-to-play/'); } },
    { name: '17-changelog', run: async function (page) { await page.goto(base + '/changelog/'); } },
    { name: '18-privacy', run: async function (page) { await page.goto(base + '/privacypolicy/'); } },
    { name: '19-terms', run: async function (page) { await page.goto(base + '/tos/'); } },
    { name: '20-study-hub', run: async function (page) { await page.goto(base + '/study/'); } },
    { name: '21-study-day', run: async function (page) {
      await page.goto(base + '/study/2026-11-08/');
      await page.locator('details.st-answers summary').first().click(); await page.waitForTimeout(200);
    } },
    { name: '22-study-topics', run: async function (page) { await page.goto(base + '/study/topics/'); } },
    { name: '23-study-topic', run: async function (page) { await page.goto(base + '/study/topics/idioms/'); } }
  ];
}

// A custom board made the way a visitor makes one: example -> Create link.
async function customPayload(browser) {
  const ctx = await L.newContext(browser, { vp: 'desktop' });
  const page = await ctx.newPage();
  await page.goto(base + '/make/', { waitUntil: 'networkidle' });
  await page.locator('#dc-example').click();
  await page.waitForFunction(function () { return Array.prototype.some.call(document.querySelectorAll('.dc-in-reading'), function (i) { return i.value; }); });
  await page.locator('#dc-form button[type=submit]').click();
  await page.waitForSelector('#dc-result-box:not([hidden])');
  const link = await page.locator('#dc-link').inputValue();
  await ctx.close();
  return link.split('#b=')[1];
}

(async function () {
  const browser = await L.launch();
  const report = [];
  try {
    const custom = await customPayload(browser);
    for (const st of states(custom)) {
      if (only && !only.some(function (o) { return st.name.indexOf(o) >= 0; })) continue;
      for (const vp of vps) for (const scheme of schemes) {
        const ctx = await L.newContext(browser, { vp: vp, scheme: scheme });
        const page = await ctx.newPage(), errors = [];
        L.watch(page, errors);
        const file = path.join(outDir, st.name + '--' + vp + '-' + scheme + '.png');
        try {
          await st.run(page);
          const info = await L.shot(page, file, vp === 'desktop' ? 3600 : 4500);
          report.push({ state: st.name, vp: vp, scheme: scheme, file: path.basename(file), height: info.height, clipped: info.clipped, errors: errors });
          console.log('ok   ' + path.basename(file) + '  h=' + info.height + (errors.length ? '  errors=' + errors.length : ''));
        } catch (e) {
          report.push({ state: st.name, vp: vp, scheme: scheme, failed: e.message.split('\n')[0], errors: errors });
          console.log('FAIL ' + path.basename(file) + '  ' + e.message.split('\n')[0]);
        }
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  const failed = report.filter(function (r) { return r.failed; }).length;
  console.log(report.length + ' shots, ' + failed + ' failed');
})();
