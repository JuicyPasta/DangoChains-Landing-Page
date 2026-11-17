/* Kana quiz: see a hiragana or katakana character, pick its romaji. No account, no server.
   Mount: <div id="kq" data-script="hiragana|katakana|both"></div> */
(function () {
  'use strict';
  var BASIC = 'あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno ' +
    'はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をwo んn';
  var DAKU = 'がga ぎgi ぐgu げge ごgo ざza じji ずzu ぜze ぞzo だda でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo';
  var YOON = 'きゃkya きゅkyu きょkyo しゃsha しゅshu しょsho ちゃcha ちゅchu ちょcho にゃnya にゅnyu にょnyo ひゃhya ひゅhyu ひょhyo ' +
    'みゃmya みゅmyu みょmyo りゃrya りゅryu りょryo ぎゃgya ぎゅgyu ぎょgyo じゃja じゅju じょjo びゃbya びゅbyu びょbyo ぴゃpya ぴゅpyu ぴょpyo';
  var ROUND = 20;

  function parse(str) {
    return str.split(' ').map(function (t) { var m = t.match(/^([ぁ-ゖ]+)([a-z]+)$/); return { k: m[1], r: m[2] }; });
  }
  function kata(s) { return s.replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function track(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var root = document.getElementById('kq');
  if (!root) return;
  var state = { script: root.getAttribute('data-script') || 'hiragana', set: 'basic' };
  var best = {};
  try { best = JSON.parse(localStorage.getItem('dc.kanaQuiz.best') || '{}') || {}; } catch (e) { best = {}; }

  function pool() {
    var items = parse(BASIC);
    if (state.set !== 'basic') items = items.concat(parse(DAKU));
    if (state.set === 'all') items = items.concat(parse(YOON));
    var out = [];
    items.forEach(function (it) {
      if (state.script !== 'katakana') out.push({ k: it.k, r: it.r });
      if (state.script !== 'hiragana') out.push({ k: kata(it.k), r: it.r });
    });
    return out;
  }

  function controls() {
    var bar = el('div', 'kq-controls');
    [['script', [['hiragana', 'Hiragana'], ['katakana', 'Katakana'], ['both', 'Both']]],
     ['set', [['basic', '46 basic'], ['daku', '+ が ぱ'], ['all', '+ きゃ']]]].forEach(function (g) {
      var grp = el('div', 'kq-seg'); grp.setAttribute('role', 'group');
      g[1].forEach(function (o) {
        var b = el('button', 'kq-chip' + (state[g[0]] === o[0] ? ' is-on' : ''), o[1]);
        b.type = 'button'; b.setAttribute('aria-pressed', state[g[0]] === o[0] ? 'true' : 'false');
        b.addEventListener('click', function () { state[g[0]] = o[0]; start(); });
        grp.appendChild(b);
      });
      bar.appendChild(grp);
    });
    return bar;
  }

  var q, i, score, streak, missed, locked;
  function key() { return state.script + '/' + state.set; }

  function start() {
    var p = shuffle(pool());
    q = p.slice(0, Math.min(ROUND, p.length)); i = 0; score = 0; streak = 0; missed = []; locked = false;
    track('kana_quiz_start', { script: state.script, set: state.set });
    render();
  }

  function options(item) {
    var all = pool(), seen = {}, opts = [item.r];
    seen[item.r] = 1;
    shuffle(all).forEach(function (o) { if (opts.length < 4 && !seen[o.r]) { seen[o.r] = 1; opts.push(o.r); } });
    return shuffle(opts);
  }

  function render() {
    root.innerHTML = '';
    root.appendChild(controls());
    if (i >= q.length) return done();
    var item = q[i];
    var head = el('div', 'kq-head');
    head.appendChild(el('span', '', 'Question ' + (i + 1) + ' of ' + q.length));
    head.appendChild(el('span', '', 'Score ' + score + (streak > 2 ? ' · streak ' + streak : '')));
    root.appendChild(head);
    var card = el('div', 'kq-card'); var big = el('span', 'kq-kana', item.k); big.lang = 'ja'; card.appendChild(big);
    root.appendChild(card);
    var grid = el('div', 'kq-opts');
    options(item).forEach(function (r, n) {
      var b = el('button', 'kq-opt', r); b.type = 'button'; b.setAttribute('data-r', r);
      b.addEventListener('click', function () { answer(b, item); });
      grid.appendChild(b);
    });
    root.appendChild(grid);
    root.appendChild(el('p', 'kq-hint', 'Tip: keys 1–4 pick an answer.'));
  }

  function answer(btn, item) {
    if (locked) return; locked = true;
    var ok = btn.getAttribute('data-r') === item.r;
    if (ok) { score++; streak++; btn.classList.add('is-good'); }
    else {
      streak = 0; btn.classList.add('is-bad'); missed.push(item);
      Array.prototype.forEach.call(root.querySelectorAll('.kq-opt'), function (b) { if (b.getAttribute('data-r') === item.r) b.classList.add('is-good'); });
    }
    setTimeout(function () { i++; locked = false; render(); }, ok ? 450 : 1100);
  }

  function done() {
    var k = key(), prev = best[k] || 0;
    if (score > prev) { best[k] = score; try { localStorage.setItem('dc.kanaQuiz.best', JSON.stringify(best)); } catch (e) {} }
    track('kana_quiz_complete', { script: state.script, set: state.set, score: score, total: q.length });
    var box = el('div', 'kq-done');
    box.appendChild(el('p', 'kq-score', score + ' / ' + q.length));
    box.appendChild(el('p', '', score === q.length ? 'Perfect round!' : (score > prev && prev ? 'New best (was ' + prev + ').' : 'Best: ' + Math.max(prev, score) + ' / ' + q.length + '.')));
    if (missed.length) {
      box.appendChild(el('p', '', 'Review the ones you missed:'));
      var ul = el('ul', 'kq-missed');
      missed.forEach(function (m) { var li = el('li'); var s = el('span', '', m.k); s.lang = 'ja'; li.appendChild(s); li.appendChild(document.createTextNode(' ' + m.r)); ul.appendChild(li); });
      box.appendChild(ul);
    }
    var again = el('button', 'kq-btn', 'Play again'); again.type = 'button'; again.addEventListener('click', start);
    box.appendChild(again);
    var cta = el('p', 'kq-cta');
    cta.innerHTML = 'Ready for real words? <a href="/play/?t=easy">Play today\'s Easy DangoChains puzzle</a>: 16 Japanese words, 4 hidden groups, furigana on.';
    box.appendChild(cta);
    root.appendChild(box);
  }

  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { var b = root.querySelectorAll('.kq-opt')[n - 1]; if (b) b.click(); }
  });
  start();
})();
