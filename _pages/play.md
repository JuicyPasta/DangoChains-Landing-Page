---
layout: page
title: Try a Puzzle
include_in_header: true
include_in_footer: true
---

# Try a DangoChains puzzle

Sixteen Japanese words, four hidden groups of four. Tap four words that belong together, then press **Submit**. You have six tries. These three sample boards are from the archive; the app has a new set every day.

<div id="dc-play">
  <div class="dc-tiers" role="tablist"></div>
  <div class="dc-solved"></div>
  <div class="dc-grid"></div>
  <p class="dc-msg" aria-live="polite"></p>
  <div class="dc-tries"></div>
  <div class="dc-actions">
    <button type="button" class="dc-shuffle">Shuffle</button>
    <button type="button" class="dc-clear">Deselect</button>
    <button type="button" class="dc-submit" disabled>Submit</button>
  </div>
  <div class="dc-end" hidden>
    <p class="dc-end-text"></p>
    <p>Get a new puzzle every day, collect dango and review every word you played:</p>
    <p class="dc-stores">
      <a class="playStoreLink dc-store" href="{{ site.playstore_link }}&referrer=utm_source%3Dlanding%26utm_medium%3Dtry_puzzle">Get it on Google Play</a>
      <a class="appStoreLink dc-store" href="https://apps.apple.com/app/id{{ site.ios_app_id }}">Download on the App Store</a>
    </p>
  </div>
</div>

<label class="dc-furigana"><input type="checkbox" checked> Show furigana</label>

New to the rules? See [How to Play]({{ '/how-to-play/' | relative_url }}).

<style>
#dc-play { max-width: 560px; margin: 1.5em auto; font-family: "Hiragino Sans", "Noto Sans JP", sans-serif; }
#dc-play button { font: inherit; cursor: pointer; }
.dc-tiers { display: flex; gap: 6px; justify-content: center; margin-bottom: 12px; }
.dc-tiers button { border: 1px solid #5A594E; background: #fff; color: #5A594E; border-radius: 999px; padding: 4px 16px; }
.dc-tiers button[aria-selected="true"] { background: #5A594E; color: #fff; }
.dc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dc-tile { min-height: 72px; border: 0; border-radius: 10px; background: #efeee6; color: #222; font-size: 1.05em; line-height: 1.25; padding: 6px 4px; word-break: keep-all; overflow-wrap: anywhere; }
.dc-tile.sel { background: #5A594E; color: #fff; }
.dc-grid.shake { animation: dc-shake .35s; }
@keyframes dc-shake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.dc-group { border-radius: 10px; padding: 10px; margin-bottom: 8px; text-align: center; color: #222; }
.dc-group b { display: block; font-size: 1.1em; }
.dc-easy { background: #f6b6c8; } .dc-medium { background: #f7c27a; } .dc-hard { background: #a8d8a0; } .dc-expert { background: #c9c9c9; }
.dc-msg { text-align: center; min-height: 1.4em; margin: 10px 0 4px; font-weight: bold; }
.dc-tries { text-align: center; letter-spacing: 4px; font-size: 1.2em; }
.dc-actions { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
.dc-actions button { border: 1px solid #5A594E; background: #fff; border-radius: 999px; padding: 8px 18px; }
.dc-actions .dc-submit { background: #E8892E; border-color: #E8892E; color: #fff; }
.dc-actions button:disabled { opacity: .4; cursor: default; }
.dc-end { text-align: center; margin-top: 16px; }
.dc-end-text { font-size: 1.2em; font-weight: bold; }
.dc-store { display: inline-block; margin: 4px; padding: 10px 16px; border-radius: 10px; background: #000; color: #fff !important; text-decoration: none; }
.dc-furigana { display: block; text-align: center; }
.dc-nofuri rt { display: none; }
</style>

<script>
(function () {
  var PUZZLES = {{ site.data.sample_puzzles | jsonify }};
  var root = document.getElementById('dc-play');
  var grid = root.querySelector('.dc-grid'), solvedEl = root.querySelector('.dc-solved');
  var msg = root.querySelector('.dc-msg'), triesEl = root.querySelector('.dc-tries');
  var submitBtn = root.querySelector('.dc-submit'), endEl = root.querySelector('.dc-end');
  var state;

  function track(name, params) { if (window.gtag) gtag('event', name, params || {}); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function start(tier) {
    var p = PUZZLES[tier], words = [];
    p.groups.forEach(function (g, gi) { g.words.forEach(function (w) { words.push({ w: w.w, html: w.html, group: gi }); }); });
    state = { tier: tier, puzzle: p, words: shuffle(words), selected: [], solved: [], mistakes: 0, guesses: [], over: false };
    root.querySelectorAll('.dc-tiers button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tier === tier); });
    endEl.hidden = true; msg.textContent = '';
    render();
  }

  function render() {
    solvedEl.innerHTML = '';
    state.solved.forEach(function (gi) {
      var g = state.puzzle.groups[gi], d = document.createElement('div');
      d.className = 'dc-group dc-' + g.level;
      d.innerHTML = '<b>' + g.nameJp + '</b><small>' + g.name + '</small><div>' + g.words.map(function (w) { return w.html; }).join('、') + '</div>';
      solvedEl.appendChild(d);
    });
    grid.innerHTML = '';
    state.words.forEach(function (w) {
      if (state.solved.indexOf(w.group) >= 0) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'dc-tile' + (state.selected.indexOf(w) >= 0 ? ' sel' : '');
      b.innerHTML = w.html; b.disabled = state.over;
      b.onclick = function () { toggle(w); };
      grid.appendChild(b);
    });
    var left = 6 - state.mistakes, dots = '';
    for (var i = 0; i < 6; i++) dots += i < left ? (i >= 4 ? '🟡' : '⚫') : '◯';
    triesEl.textContent = dots;
    submitBtn.disabled = state.over || state.selected.length !== 4;
  }

  function toggle(w) {
    var i = state.selected.indexOf(w);
    if (i >= 0) state.selected.splice(i, 1);
    else if (state.selected.length < 4) state.selected.push(w);
    msg.textContent = '';
    render();
  }

  function submit() {
    var sel = state.selected, counts = {};
    sel.forEach(function (w) { counts[w.group] = (counts[w.group] || 0) + 1; });
    state.guesses.push(sel.map(function (w) { return w.group; }));
    var gi = Object.keys(counts).filter(function (k) { return counts[k] === 4; })[0];
    if (gi !== undefined) {
      state.solved.push(+gi); state.selected = [];
      if (state.solved.length === 4) return finish(true);
      msg.textContent = '正解！';
    } else {
      state.mistakes++;
      var max = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
      msg.textContent = max === 3 ? 'One away…' : 'Not quite';
      grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
      if (state.mistakes >= 6) return finish(false);
    }
    render();
  }

  function finish(won) {
    state.over = true; state.selected = [];
    if (!won) state.puzzle.groups.forEach(function (_, gi) { if (state.solved.indexOf(gi) < 0) state.solved.push(gi); });
    render();
    var golden = won && state.mistakes <= 1;
    root.querySelector('.dc-end-text').textContent = won
      ? (golden ? 'Golden dango! Solved with ' + state.mistakes + ' mistake' + (state.mistakes === 1 ? '' : 's') + '.' : 'Solved with ' + state.mistakes + ' mistakes.')
      : 'Out of tries. The groups are shown above with their readings.';
    endEl.hidden = false;
    track('sample_puzzle_complete', { tier: state.tier, won: won, mistakes: state.mistakes });
  }

  Object.keys(PUZZLES).forEach(function (tier) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = tier; b.dataset.tier = tier; b.setAttribute('role', 'tab');
    b.onclick = function () { start(tier); };
    root.querySelector('.dc-tiers').appendChild(b);
  });
  submitBtn.onclick = submit;
  root.querySelector('.dc-clear').onclick = function () { state.selected = []; render(); };
  root.querySelector('.dc-shuffle').onclick = function () { shuffle(state.words); render(); };
  document.querySelector('.dc-furigana input').onchange = function (e) { root.classList.toggle('dc-nofuri', !e.target.checked); };
  start('Easy');
})();
</script>
