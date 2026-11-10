// Store-button clicks are the site's conversion events (head.html binds them by class name).
// Every store link on every kind of page must still fire play_store_click / app_store_click with
// {link_url, transport_type: 'beacon'}.   node regress-clicks.js <baseUrl> <out.json>
const fs = require('fs');
const L = require('./lib');
const base = (process.argv[2] || 'http://127.0.0.1:4012').replace(/\/$/, ''), out = process.argv[3] || 'regress-clicks.json';
const T = L.TODAY;

// Clicks every store link currently on the page (navigation suppressed) and returns what was tracked.
async function clickAll(page) {
  return page.evaluate(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('a.appStoreLink, a.playStoreLink')).filter(function (a) { return a.offsetParent !== null; });
    return links.map(function (a) {
      var before = window.dataLayer.length;
      var stop = function (e) { e.preventDefault(); };
      a.addEventListener('click', stop);
      (a.querySelector('img') || a).click(); // a badge is an image inside the link: the click starts there
      a.removeEventListener('click', stop);
      var pushed = window.dataLayer.slice(before).map(function (x) { return Array.prototype.slice.call(x); });
      return { cls: /playStoreLink/.test(a.className) ? 'playStoreLink' : 'appStoreLink', href: a.href, target: a.target, rel: a.rel, pushed: pushed, where: (a.closest('[class]') && a.parentNode.className) || a.parentNode.tagName };
    });
  });
}

(async function () {
  const browser = await L.launch();
  const R = L.makeRunner(browser, base, null), test = R.test;
  const judge = function (t, name, clicks, min) {
    t.ui(name, clicks.map(function (c) { return [c.cls, c.href, c.target, c.where]; }));
    t.check(name + ': at least ' + min + ' store links', clicks.length >= min, clicks.length);
    clicks.forEach(function (c, i) {
      const ev = c.pushed.filter(function (p) { return p[0] === 'event'; });
      const want = c.cls === 'playStoreLink' ? 'play_store_click' : 'app_store_click';
      const ok = ev.length === 1 && ev[0][1] === want && ev[0][2] && ev[0][2].link_url === c.href && ev[0][2].transport_type === 'beacon' && Object.keys(ev[0][2]).length === 2;
      t.check(name + ' #' + i + ' ' + c.cls + ' fires ' + want, ok, c.pushed);
      t.check(name + ' #' + i + ' points at the right store', c.cls === 'playStoreLink' ? /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.jacksondarrow\.dangochains/.test(c.href) : /^https:\/\/apps\.apple\.com\/.*id6757343508/.test(c.href), c.href);
    });
  };
  try {
    for (const vp of ['mobile', 'desktop']) {
      await test('store-clicks/' + vp, { vp: vp }, async function (t) {
        const page = t.page;
        await page.goto(base + '/', { waitUntil: 'networkidle' });
        judge(t, 'home', await clickAll(page), 4);                      // app section badges + footer
        await page.goto(base + '/how-to-play/', { waitUntil: 'networkidle' });
        judge(t, 'how-to-play', await clickAll(page), 4);
        await page.goto(base + '/study/2026-11-08/', { waitUntil: 'networkidle' });
        judge(t, 'study day', await clickAll(page), 4);                 // the page's own call to action + footer
        await page.goto(base + '/play/?d=2026-10-01&t=easy'); await page.waitForSelector('#dc-notice:not([hidden])');
        const archive = await clickAll(page);
        judge(t, 'archive notice', archive, 4);
        t.strict('archiveReferrer', archive.filter(function (c) { return c.cls === 'playStoreLink' && /referrer/.test(c.href); }).map(function (c) { return c.href; }));
        const b = await L.dailyBoard(base, T, 'easy');
        await page.goto(base + '/play/?t=easy'); await page.waitForSelector('.dc-grid .dc-tile');
        await L.playSequence(page, b, L.SEQ.golden); await page.waitForSelector('#dc-end:not([hidden])');
        const end = await clickAll(page);
        judge(t, 'daily result', end, 4);
        t.strict('resultReferrer', end.filter(function (c) { return /referrer/.test(c.href); }).map(function (c) { return c.href; }));
      });
    }
  } finally { await browser.close(); }
  fs.writeFileSync(out, JSON.stringify(R.results, null, 1));
  Object.keys(R.results).forEach(function (k) {
    const r = R.results[k];
    console.log(k + ': ' + r.checks.length + ' checks, ' + r.checks.filter(function (c) { return !c.ok; }).length + ' failed' + (r.failed ? '  FAILED ' + r.failed : ''));
    r.checks.filter(function (c) { return !c.ok; }).slice(0, 5).forEach(function (c) { console.log('   ' + c.name + '  ' + JSON.stringify(c.detail).slice(0, 300)); });
  });
})();
