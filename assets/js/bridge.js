/* 熟語 Bridge: a daily kanji-bridge puzzle (和同開珎-style) for Japanese learners.
 * Boards come from bridge/data/v1/<YYYY-MM>.json, written by the DangoChains repo's
 * tools/bridge/bridge.py (JMdict/KANJIDIC2 data, CC BY-SA 4.0). Results and the
 * streak live in localStorage; every access is wrapped so private modes still play. */
(function () {
  'use strict';
  var root = document.getElementById('br');
  if (!root || !window.fetch || !window.Promise) return;

  var TIERS = ['easy', 'medium', 'hard'];
  var LABEL = { easy: 'Easy', medium: 'Normal', hard: 'Hard' };
  var WINDOW_DAYS = 7, MAX_TRIES = 3, STORE_KEY = 'dangochains-bridge-v1';
  var dataBase = root.getAttribute('data-data');
  var siteUrl = (root.getAttribute('data-site') || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(siteUrl)) siteUrl = location.origin + (root.getAttribute('data-root') || '/').replace(/\/+$/, '');

  function q(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* analytics never breaks play */ }
  }

  // ---- dates (local calendar days, noon to dodge DST edges)
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 12);
    return ymd(d) === s ? d : null;
  }
  function dayDiff(a, b) { return Math.round((b - a) / 864e5); }
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  var todayStr = ymd(today);
  var WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ---- storage: {res: {"YYYY-MM-DD|tier": {picks: [...], won: bool, on: "YYYY-MM-DD"}}}
  function loadStore() {
    try {
      var s = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null');
      if (s && typeof s === 'object' && s.res && typeof s.res === 'object') return s;
    } catch (e) { /* unreadable or blocked: start fresh */ }
    return { res: {} };
  }
  var store = loadStore();
  function saveStore() {
    try {
      var cutoff = ymd(addDays(today, -400));
      Object.keys(store.res).forEach(function (k) { if (k.slice(0, 10) < cutoff) delete store.res[k]; });
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* storage full or blocked: the game still works for this visit */ }
  }
  function saved(date, tier) {
    var r = store.res[date + '|' + tier];
    return r && Array.isArray(r.picks) ? r : null;
  }

  // ---- what to open: ?d=YYYY-MM-DD&t=easy|medium|hard, within the last 7 days
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }
  var reqDate = params.get('d'), reqTier = params.get('t');
  var oldest = addDays(today, -(WINDOW_DAYS - 1));
  var date = todayStr, notice = '';
  if (reqDate) {
    var pd = parseYmd(reqDate);
    if (!pd) notice = 'That link has no valid date, so here is today’s board.';
    else if (pd > today) notice = 'The board for ' + reqDate + ' isn’t out yet. Here is today’s.';
    else if (pd < oldest) notice = 'Only the last 7 days are playable, and the ' + reqDate + ' board has closed. Here is today’s.';
    else date = reqDate;
  }
  var tier = TIERS.indexOf(reqTier) >= 0 ? reqTier : null;

  // ---- data
  var byDate = {};
  function fetchMonth(month) {
    return fetch(dataBase + month + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { (j.puzzles || []).forEach(function (p) { byDate[p.date] = p; }); })
      .catch(function () { /* a missing month just means no boards for those days */ });
  }
  var months = {};
  for (var i = 0; i < WINDOW_DAYS; i++) months[ymd(addDays(today, -i)).slice(0, 7)] = 1;

  // ---- game state
  var cur = null; // {date, tier, puzzle, board, picks, won, over}
  var justTimer = null; // while set, the page carries .br-just and the last pick's feedback animates

  function open(d, t, fromUser) {
    var puzzle = byDate[d];
    if (!puzzle || !puzzle.tiers || !puzzle.tiers[t]) {
      cur = null;
      showMissing(d);
      return;
    }
    var board = puzzle.tiers[t], s = saved(d, t);
    var picks = s ? s.picks.filter(function (k) { return board.options.indexOf(k) >= 0; }) : [];
    cur = { date: d, tier: t, puzzle: puzzle, board: board, picks: [], won: false, over: false };
    picks.forEach(function (k) { applyPick(k); });
    tier = t;
    date = d;
    if (fromUser) syncUrl();
    render();
  }

  function applyPick(k) {
    if (cur.over || cur.picks.indexOf(k) >= 0) return false;
    cur.picks.push(k);
    cur.won = k === cur.board.answer;
    cur.over = cur.won || wrongPicks().length >= MAX_TRIES;
    return true;
  }
  function wrongPicks() { return cur.picks.filter(function (k) { return k !== cur.board.answer; }); }

  function pick(k) {
    if (!cur || cur.over) return;
    var first = cur.picks.length === 0;
    if (!applyPick(k)) return;
    if (first) track('bridge_start', { tier: cur.tier, number: cur.puzzle.number });
    store.res[cur.date + '|' + cur.tier] = { picks: cur.picks.slice(), won: cur.won, on: todayStr };
    saveStore();
    if (cur.over) {
      track('bridge_complete', { tier: cur.tier, won: cur.won, tries: cur.picks.length, number: cur.puzzle.number });
    }
    root.classList.add('br-just');
    clearTimeout(justTimer);
    justTimer = setTimeout(function () { root.classList.remove('br-just'); }, 700);
    render();
    if (cur.over) {
      var end = q('.br-end');
      if (end && end.scrollIntoView) setTimeout(function () { end.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
    }
  }

  function syncUrl() {
    try {
      var url = location.pathname + (date === todayStr ? (tier === firstOpenTier(date) ? '' : '?t=' + tier) : '?d=' + date + '&t=' + tier);
      history.replaceState(null, '', url);
    } catch (e) { /* file:// or sandboxed: the URL just doesn't update */ }
  }

  // ---- what each option does to the four slots
  function word(p, k) { return p.position === 'before' ? p.kanji + k : k + p.kanji; }
  function hits(k) {
    // slot indexes the kanji completes: all four for the answer, the near-miss list for a decoy
    if (k === cur.board.answer) return [0, 1, 2, 3];
    return (cur.board.near && cur.board.near[k] || []).map(function (h) { return h.slot; });
  }

  // Before-partners read into the center, after-partners read out of it; each takes the spot
  // where that direction reads naturally (left/top in, right/bottom out) while one is free.
  function layout(partners) {
    var spots = {}, order = { before: ['left', 'top', 'bottom', 'right'], after: ['right', 'bottom', 'top', 'left'] };
    var idx = partners.map(function (p, i) { return i; });
    var nb = partners.filter(function (p) { return p.position === 'before'; }).length;
    var firstPos = nb >= partners.length - nb ? 'before' : 'after';
    idx.sort(function (a, b) {
      return (partners[a].position === firstPos ? 0 : 1) - (partners[b].position === firstPos ? 0 : 1) || a - b;
    });
    idx.forEach(function (i) {
      var prefs = order[partners[i].position];
      for (var j = 0; j < prefs.length; j++) if (!spots[prefs[j]] && spots[prefs[j]] !== 0) { spots[prefs[j]] = i; break; }
    });
    return spots; // spot -> partner index
  }
  var ARROW = {
    left: { before: '→', after: '←' }, right: { before: '←', after: '→' },
    top: { before: '↓', after: '↑' }, bottom: { before: '↑', after: '↓' }
  };
  var CELL = { top: [1, 3], left: [3, 1], right: [3, 5], bottom: [5, 3] };
  var ARROW_CELL = { top: [2, 3], left: [3, 2], right: [3, 4], bottom: [4, 3] };

  // ---- rendering
  function render() {
    renderTabs();
    renderMeta();
    var game = q('.br-game');
    game.hidden = !cur;
    if (cur) {
      renderBoard();
      renderSlots();
      renderMsg();
      renderTries();
      renderOptions();
      renderHistory();
      renderEnd();
    }
    renderWeek();
    renderStreak();
  }

  function firstOpenTier(d) {
    for (var i = 0; i < TIERS.length; i++) {
      var s = saved(d, TIERS[i]);
      if (!s || !isOver(d, TIERS[i], s)) return TIERS[i];
    }
    return TIERS[0];
  }
  function isOver(d, t, s) {
    var p = byDate[d], b = p && p.tiers && p.tiers[t];
    if (!b || !s) return false;
    var wrong = s.picks.filter(function (k) { return k !== b.answer; }).length;
    return s.picks.indexOf(b.answer) >= 0 || wrong >= MAX_TRIES;
  }
  function outcome(d, t) {
    var s = saved(d, t), p = byDate[d], b = p && p.tiers && p.tiers[t];
    if (!s || !b || !isOver(d, t, s)) return s && s.picks.length ? 'playing' : '';
    return s.picks.indexOf(b.answer) >= 0 ? 'won' : 'lost';
  }

  function renderTabs() {
    var box = q('.br-tiers'), focused = box.contains(document.activeElement);
    box.innerHTML = '';
    TIERS.forEach(function (t, i) {
      var b = el('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(t === tier));
      b.tabIndex = t === tier ? 0 : -1;
      b.dataset.tier = t;
      b.onkeydown = function (e) {
        var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        box.children[(i + step + TIERS.length) % TIERS.length].click();
      };
      b.appendChild(document.createTextNode(LABEL[t]));
      var o = outcome(date, t);
      if (o === 'won' || o === 'lost') {
        var tick = el('span', 'br-tick', o === 'won' ? '✓' : '✗');
        tick.setAttribute('aria-label', o === 'won' ? 'solved' : 'missed');
        b.appendChild(tick);
      }
      b.onclick = function () { if (t !== tier || !cur) open(date, t, true); };
      box.appendChild(b);
      if (focused && t === tier) b.focus();
    });
  }

  function renderMeta() {
    var p = byDate[date], meta = q('.br-meta');
    var d = parseYmd(date);
    var label = WEEKDAY[d.getDay()] + ' ' + date + (date === todayStr ? ' · today' : '');
    meta.textContent = p ? 'No. ' + p.number + ' · ' + label : label;
    var n = q('.br-notice');
    n.hidden = !notice;
    n.textContent = notice;
  }

  function showMissing(d) {
    var msg = d === todayStr ? 'Today’s board isn’t published yet. Please check back soon.'
      : 'There is no board for ' + d + '.';
    if (!notice) notice = msg;
    else if (notice.indexOf(msg) < 0) notice += ' ' + msg;
    render();
  }

  function renderBoard() {
    var board = q('.br-board'), b = cur.board, spots = layout(b.partners);
    var last = cur.picks.length ? cur.picks[cur.picks.length - 1] : null;
    var showK = cur.over ? b.answer : last;
    var made = showK ? hits(showK) : [];
    board.innerHTML = '';
    Object.keys(CELL).forEach(function (spot) {
      var i = spots[spot];
      if (i === undefined) return;
      var p = b.partners[i];
      var tile = el('div', 'br-tile', p.kanji);
      tile.style.gridArea = CELL[spot][0] + ' / ' + CELL[spot][1];
      if (showK && (cur.over || last)) {
        var ok = made.indexOf(i) >= 0;
        var badge = el('span', 'br-badge ' + (ok ? 'ok' : 'no'), ok ? '✓' : '✗');
        badge.setAttribute('aria-hidden', 'true');
        tile.appendChild(badge);
      }
      tile.setAttribute('aria-label', p.position === 'before' ? p.kanji + ', then the hidden kanji' : 'the hidden kanji, then ' + p.kanji);
      board.appendChild(tile);
      var arrow = el('div', 'br-arrow', ARROW[spot][p.position]);
      arrow.setAttribute('aria-hidden', 'true');
      arrow.style.gridArea = ARROW_CELL[spot][0] + ' / ' + ARROW_CELL[spot][1];
      board.appendChild(arrow);
    });
    var center = el('div', 'br-tile br-center', showK || '？');
    center.style.gridArea = '3 / 3';
    if (cur.over) center.className += cur.won ? ' is-right' : ' is-lost';
    else if (last) center.className += ' is-wrong';
    center.setAttribute('aria-label', cur.over ? 'Answer: ' + b.answer : last ? 'Your last pick: ' + last : 'Hidden kanji');
    board.appendChild(center);
  }

  function renderSlots() {
    var box = q('.br-slots'), b = cur.board;
    var last = cur.picks.length ? cur.picks[cur.picks.length - 1] : null;
    var showK = cur.over ? b.answer : last;
    var made = showK ? hits(showK) : [];
    box.innerHTML = '';
    b.partners.forEach(function (p, i) {
      var s = el('span', 'br-slot');
      var blank = el('span', 'br-blank', showK || '□');
      var k = el('span', null, p.kanji);
      if (p.position === 'before') { s.appendChild(k); s.appendChild(blank); } else { s.appendChild(blank); s.appendChild(k); }
      if (showK) s.className += made.indexOf(i) >= 0 ? ' ok' : ' no';
      box.appendChild(s);
    });
  }

  function renderMsg() {
    var m = q('.br-msg'), b = cur.board, last = cur.picks[cur.picks.length - 1];
    if (!cur.picks.length) { m.textContent = 'Which kanji fits all four?'; return; }
    if (cur.won) { m.textContent = cur.picks.length === 1 ? 'First try! ' + b.answer + ' it is.' : 'Solved! ' + b.answer + ' it is.'; return; }
    var n = hits(last).length, words = hits(last).map(function (i) { return word(b.partners[i], last); });
    var made = n ? last + ' makes ' + words.join(' and ') + ' (' + n + ' of 4).' : last + ' makes none of the four.';
    if (cur.over) { m.textContent = made + ' Out of tries: the answer is ' + b.answer + '.'; return; }
    var left = MAX_TRIES - wrongPicks().length;
    m.textContent = made + ' ' + left + (left === 1 ? ' try' : ' tries') + ' left.';
  }

  function renderTries() {
    var t = q('.br-tries'), wrong = wrongPicks().length;
    t.innerHTML = '';
    for (var i = 0; i < MAX_TRIES; i++) t.appendChild(el('i', i < MAX_TRIES - wrong ? '' : 'used'));
    t.setAttribute('role', 'img');
    t.setAttribute('aria-label', (MAX_TRIES - wrong) + ' of ' + MAX_TRIES + ' tries left');
  }

  function renderOptions() {
    var box = q('.br-options'), b = cur.board;
    box.innerHTML = '';
    b.options.forEach(function (k) {
      var btn = el('button', 'br-opt');
      btn.type = 'button';
      btn.dataset.k = k;
      btn.appendChild(document.createTextNode(k));
      var picked = cur.picks.indexOf(k) >= 0;
      if (picked && k === b.answer) btn.className += ' is-right';
      else if (picked) {
        btn.className += ' is-wrong';
        btn.appendChild(el('small', null, hits(k).length + '/4'));
      } else if (cur.over && k === b.answer) btn.className += ' is-answer';
      btn.disabled = cur.over || picked;
      // The spoken name starts with what is on the button (the kanji, and "1/4" after a wrong pick).
      btn.setAttribute('aria-label', k + (picked ? (k === b.answer ? ', correct' : ' ' + hits(k).length + '/4, wrong: makes ' + hits(k).length + ' of 4') : ''));
      btn.onclick = function () { pick(k); };
      box.appendChild(btn);
    });
  }

  function renderHistory() {
    var box = q('.br-history'), b = cur.board;
    box.innerHTML = '';
    if (cur.over) return; // the review below covers it
    wrongPicks().forEach(function (k) {
      var ws = hits(k).map(function (i) { return word(b.partners[i], k); });
      box.appendChild(el('li', null, '✗ ' + k + ': ' + (ws.length ? ws.join(' · ') + ' (' + ws.length + '/4)' : 'no words')));
    });
  }

  function renderEnd() {
    var end = q('.br-end'), b = cur.board;
    end.hidden = !cur.over;
    if (!cur.over) return;
    var n = cur.picks.length;
    q('.br-end-title').textContent = cur.won
      ? (n === 1 ? 'Solved on the first try!' : 'Solved in ' + n + ' tries.')
      : 'Not this time. The hidden kanji was ' + b.answer + '.';
    var ul = q('.br-words');
    ul.innerHTML = '';
    b.words.forEach(function (w) {
      var li = el('li');
      var left = el('span', 'br-w', w.word);
      left.setAttribute('lang', 'ja');
      var right = el('span');
      var r = el('span', 'br-r', w.reading);
      r.setAttribute('lang', 'ja');
      right.appendChild(r);
      if (w.jlpt) right.appendChild(el('span', 'br-lv', 'N' + w.jlpt));
      right.appendChild(el('div', 'br-g', w.gloss));
      li.appendChild(left);
      li.appendChild(right);
      ul.appendChild(li);
    });
    var kj = b.kanji || {}, kp = q('.br-kanji');
    kp.innerHTML = '';
    var big = el('b', null, b.answer);
    big.setAttribute('lang', 'ja');
    kp.appendChild(big);
    var bits = [];
    if (kj.meanings && kj.meanings.length) bits.push(kj.meanings.join(', '));
    var rd = (kj.on || []).concat(kj.kun || []);
    if (rd.length) bits.push(rd.join('、'));
    if (kj.jlpt) bits.push('JLPT N' + kj.jlpt + ' kanji');
    kp.appendChild(document.createTextNode(bits.join(' · ')));

    var near = q('.br-near');
    near.innerHTML = '';
    var count = 0;
    b.options.forEach(function (k) {
      var list = (b.near && b.near[k]) || [];
      if (k === b.answer || !list.length) return;
      var li = el('li');
      var kk = el('span', 'br-nk', k);
      kk.setAttribute('lang', 'ja');
      li.appendChild(kk);
      li.appendChild(document.createTextNode(list.map(function (h) {
        return h.word + ' (' + h.reading + ') ' + h.gloss;
      }).join(' · ')));
      near.appendChild(li);
      count += list.length;
    });
    q('.br-near-box summary').textContent = 'Words the other options make (' + count + ')';

    q('.br-share-text').textContent = shareText();
    q('.br-share-msg').textContent = '';
    q('.br-share').onclick = share;

    var next = q('.br-next');
    next.innerHTML = '';
    var nt = null;
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i] !== cur.tier && !isOver(date, TIERS[i], saved(date, TIERS[i])) && byDate[date].tiers[TIERS[i]]) { nt = TIERS[i]; break; }
    }
    if (nt) {
      var btn = el('button', 'btn btn-primary', 'Play ' + LABEL[nt] + ' →');
      btn.type = 'button';
      btn.onclick = function () { open(date, nt, true); window.scrollTo(0, root.offsetTop); };
      next.appendChild(btn);
    } else if (date !== todayStr && byDate[todayStr] && firstUnfinished(todayStr)) {
      var tb = el('button', 'btn btn-primary', 'Play today’s board →');
      tb.type = 'button';
      tb.onclick = function () { notice = ''; open(todayStr, firstUnfinished(todayStr), true); window.scrollTo(0, root.offsetTop); };
      next.appendChild(tb);
    } else {
      next.textContent = 'That’s all three for ' + (date === todayStr ? 'today' : date) + '. New boards at midnight.';
    }
  }
  function firstUnfinished(d) {
    for (var i = 0; i < TIERS.length; i++) if (!isOver(d, TIERS[i], saved(d, TIERS[i]))) return TIERS[i];
    return null;
  }

  function shareText() {
    var squares = cur.picks.map(function (k) { return k === cur.board.answer ? '🟩' : '🟥'; }).join('');
    return '🍡 熟語 Bridge #' + cur.puzzle.number + ' · ' + LABEL[cur.tier] + '\n' + cur.date + '\n' + squares + '\n' +
      siteUrl + '/bridge/?d=' + cur.date + '&t=' + cur.tier + '&utm_source=share';
  }

  function share() {
    var text = shareText(), msg = q('.br-share-msg');
    var params = { tier: cur.tier, number: cur.puzzle.number, won: cur.won };
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (mobile && navigator.share) {
      navigator.share({ text: text }).then(function () {
        params.method = 'share_sheet';
        track('bridge_share', params);
      }, function () { /* dismissed */ });
      return;
    }
    copyText(text).then(function () {
      var btn = q('.br-share');
      btn.classList.remove('is-done'); void btn.offsetWidth; btn.classList.add('is-done');
      msg.textContent = 'Copied!';
      params.method = 'clipboard';
      track('bridge_share', params);
    }, function () {
      msg.textContent = 'Select the text above to copy it.';
    });
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = el('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function renderWeek() {
    var wrap = q('.br-week'), box = q('.br-week-days');
    box.innerHTML = '';
    var any = false;
    for (var i = WINDOW_DAYS - 1; i >= 0; i--) {
      var d = addDays(today, -i), ds = ymd(d);
      if (!byDate[ds]) continue;
      any = true;
      var a = el('a', 'br-day' + (ds === date ? ' is-current' : ''));
      a.href = location.pathname + '?d=' + ds + '&t=' + tier;
      a.target = '_self';
      a.dataset.date = ds;
      a.appendChild(el('span', null, i === 0 ? 'Today' : WEEKDAY[d.getDay()]));
      a.appendChild(document.createTextNode(' ')); // so the link reads "Wed 4", as its spoken name does
      a.appendChild(el('b', null, String(d.getDate())));
      a.appendChild(document.createTextNode(' '));
      var o = outcome(ds, tier);
      a.appendChild(el('span', 'br-dot', o === 'won' ? '🟩' : o === 'lost' ? '🟥' : o === 'playing' ? '…' : '·'));
      a.setAttribute('aria-label', (i === 0 ? 'Today' : WEEKDAY[d.getDay()]) + ' ' + d.getDate() + ': ' + LABEL[tier] + ' board for ' + ds + (o === 'won' ? ', solved' : o === 'lost' ? ', missed' : ''));
      a.onclick = (function (dsCopy) {
        return function (e) { e.preventDefault(); notice = ''; open(dsCopy, tier, true); };
      })(ds);
      box.appendChild(a);
    }
    wrap.hidden = !any;
  }

  // Streak: consecutive days, ending today (or yesterday if today isn't solved yet),
  // with at least one board solved on its own day.
  function solvedOnDay(ds) {
    return TIERS.some(function (t) { var s = saved(ds, t); return s && s.on === ds && outcome(ds, t) === 'won'; });
  }
  function streakInfo() {
    var keys = Object.keys(store.res), byDay = {};
    keys.forEach(function (k) {
      var ds = k.slice(0, 10), t = k.slice(11), s = store.res[k];
      if (s && s.won && s.on === ds && TIERS.indexOf(t) >= 0) byDay[ds] = 1;
    });
    var d = byDay[todayStr] ? today : addDays(today, -1), n = 0;
    while (byDay[ymd(d)]) { n++; d = addDays(d, -1); }
    return n;
  }
  function renderStreak() {
    var n = streakInfo();
    var solved = TIERS.filter(function (t) { return outcome(todayStr, t) === 'won'; }).length;
    var line = 'Streak: ' + n + (n === 1 ? ' day' : ' days') + ' · Today: ' + solved + ' of 3 solved';
    q('.br-streak').textContent = line;
  }

  try { document.title = '熟語 Bridge: a daily kanji puzzle for Japanese learners | DangoChains'; } catch (e) { /* ignore */ }
  Promise.all(Object.keys(months).map(fetchMonth)).then(function () {
    if (!tier) tier = firstOpenTier(date);
    if (!byDate[date]) { render(); showMissing(date); return; }
    open(date, tier, false);
  });
})();
