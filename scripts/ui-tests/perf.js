// Page weight and layout stability, cold cache, phone viewport: requests, decoded bytes by origin, CLS.
//   node perf.js <baseUrl>
const L = require('./lib');
const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, '');
(async function () {
  const browser = await L.launch();
  for (const path of ['/', '/play/?t=easy', '/bridge/?t=easy', '/make/', '/study/2026-11-08/']) {
    const ctx = await L.newContext(browser, { vp: 'mobile' });
    const page = await ctx.newPage(), reqs = [];
    await ctx.addInitScript(function () {
      window.__cls = 0; window.__shifts = [];
      try {
        new PerformanceObserver(function (list) { list.getEntries().forEach(function (e) { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push([Math.round(e.startTime), +e.value.toFixed(4), (e.sources || []).slice(0, 2).map(function (s) { return s.node && (s.node.id || s.node.className || s.node.nodeName); }).join(',')]); } }); }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* unsupported */ }
    });
    page.on('response', async function (r) {
      let n = 0; try { n = (await r.body()).length; } catch (e) { n = 0; }
      reqs.push({ url: r.url(), n: n, type: r.request().resourceType() });
    });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(function () { return { cls: +window.__cls.toFixed(4), shifts: window.__shifts.slice(0, 6) }; });
    const byOrigin = {}, byType = {};
    reqs.forEach(function (r) { const o = new URL(r.url).host; byOrigin[o] = (byOrigin[o] || 0) + r.n; byType[r.type] = (byType[r.type] || 0) + r.n; });
    const kb = function (o) { const out = {}; Object.keys(o).forEach(function (k) { out[k] = Math.round(o[k] / 1024) + 'KB'; }); return out; };
    console.log(path + '  requests=' + reqs.length + '  total=' + Math.round(reqs.reduce(function (a, r) { return a + r.n; }, 0) / 1024) + 'KB  CLS=' + cls.cls);
    console.log('   by origin ' + JSON.stringify(kb(byOrigin)));
    console.log('   by type   ' + JSON.stringify(kb(byType)) + (cls.shifts.length ? '  shifts ' + JSON.stringify(cls.shifts) : ''));
    await ctx.close();
  }
  await browser.close();
})();
