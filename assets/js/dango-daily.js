/*
 * /play/: the free daily (today's three boards, plus the last 7 days via ?d=YYYY-MM-DD&t=tier)
 * and custom boards from the maker (#b=...). Needs dango-board.js and the #dc-config JSON.
 *
 * Feed: feed/v1/<tier>/<YYYY-MM>.json (written by DangoChains/scripts/build_feed.py).
 * Storage (optional): localStorage "dangochains.web.v1" =
 *   {boards: {"YYYY-MM-DD/tier": {fp, n, g: guesses, s: started, done, won, m: mistakes}},
 *    furigana: true|false (the visitor's own choice; absent = tier default), tier: last tier played}
 */
(function () {
  'use strict';

  var D = window.DangoBoard;
  var $ = function (id) { return document.getElementById(id); };
  var cfg = JSON.parse($('dc-config').textContent);
  var TIERS = ['easy', 'medium', 'hard'];
  var TIER_NAMES = { easy: 'Easy', medium: 'Normal', hard: 'Hard' };
  var EPOCH = '2026-01-01';   // puzzle #1 (build_feed.py: number = days since epoch + 1)
  var FREE_DAYS = 7;          // today and the 6 days before it are playable on the web
  var KEEP_GUESSES_DAYS = 8;  // older entries keep only the result
  var store = D.store('dangochains.web.v1');
  var today = ymd(new Date());
  var game = null, timer = null, seq = 0;

  // ---------- dates (the player's local calendar) ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function validYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && ymd(toDate(s)) === s; }
  function dayIndex(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
  function addDays(s, n) { var d = toDate(s); d.setDate(d.getDate() + n); return ymd(d); }
  function puzzleNumber(s) { return dayIndex(s) - dayIndex(EPOCH) + 1; }
  function longDate(s) {
    return toDate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ---------- storage ----------

  // localStorage when it works (shared across tabs), else an in-memory copy for this visit.
  var memory = store.get(), persistent = store.set(memory);
  function load() { return persistent ? store.get() : memory; }
  function persist(s) { memory = s; if (persistent) store.set(s); }

  function boardsOf(s) { return s.boards && typeof s.boards === 'object' ? s.boards : {}; }
  function entryFor(key) { return boardsOf(load())[key] || null; }

  function saveEntry(key, entry) {
    var s = load(), boards = boardsOf(s), cutoff = addDays(today, -KEEP_GUESSES_DAYS);
    boards[key] = entry;
    Object.keys(boards).forEach(function (k) {
      if (!boards[k] || typeof boards[k] !== 'object') delete boards[k];
      else if (k.slice(0, 10) < cutoff) delete boards[k].g;
    });
    s.boards = boards;
    persist(s);
  }

  function setPref(name, value) { var s = load(); s[name] = value; persist(s); }

  function furiganaFor(tier) {
    var choice = load().furigana;
    if (typeof choice === 'boolean') return choice;
    // Normal and Hard boards often hinge on readings (物 read もの / ぶつ / もつ), so only
    // Easy and custom boards start with furigana. Same default as the app (1.0.4).
    return tier === 'easy' || tier === 'custom';
  }

  // Consecutive days, ending today or yesterday, with at least one board won.
  function streak() {
    var boards = boardsOf(load()), won = {};
    Object.keys(boards).forEach(function (k) { if (boards[k] && boards[k].won) won[k.slice(0, 10)] = true; });
    var d = won[today] ? today : addDays(today, -1), n = 0;
    while (won[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- feed ----------

  var months = {};
  function loadMonth(tier, month) {
    var key = tier + '/' + month;
    if (!months[key]) {
      months[key] = fetch(cfg.feedBase + '/' + key + '.json', { cache: 'no-cache' }).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      months[key].catch(function () { delete months[key]; }); // let a retry fetch again
    }
    return months[key];
  }

  function fingerprint(p) {
    var s = p.id + '|' + p.categories.map(function (c) { return c.words.join(','); }).join('|'), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function feedBoard(doc, p, tier) {
    var readings = doc.readings || {};
    return {
      tier: tier, date: p.date, number: p.number, fp: fingerprint(p),
      groups: p.categories.map(function (c, ci) {
        return {
          name: c.name, nameJp: c.nameJp,
          level: D.LEVELS.indexOf(c.difficulty) >= 0 ? c.difficulty : D.LEVELS[ci],
          words: c.words.map(function (w, wi) { return D.word(w, readings[w] || '', null, (c.glosses || [])[wi]); })
        };
      })
    };
  }

  // ---------- page pieces ----------

  // The store buttons: the official badges when the page provides them, else text. They open in
  // a new tab so the result stays on screen. (Clicks are counted by class name in head.html.)
  function storeLink(cls, href, label, badge) {
    var inner = badge ? '<img src="' + D.esc(badge) + '" alt="' + D.esc(label) + '" height="46" loading="lazy">' : D.esc(label);
    return '<a class="' + cls + ' dc-store' + (badge ? ' dc-store-badge' : '') + '" href="' + D.esc(href) + '" target="_blank" rel="noopener">' + inner + '</a>';
  }

  // Phones see only their own store; desktops and anything unrecognised see both.
  function mobilePlatform() {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return '';
  }

  function storeLinks(medium) {
    var referrer = encodeURIComponent('utm_source=landing&utm_medium=' + medium), os = mobilePlatform();
    var play = storeLink('playStoreLink', cfg.playStore + '&referrer=' + referrer, 'Get it on Google Play', cfg.playBadge);
    var apple = storeLink('appStoreLink', cfg.appStore, 'Download on the App Store', cfg.appBadge);
    return os === 'android' ? play : os === 'ios' ? apple : play + apple;
  }

  function internalLink(href, text) {
    return '<a href="' + D.esc(href) + '">' + D.esc(text) + '</a>';
  }

  function setHeading(title, subHtml) {
    $('dc-heading').textContent = title;
    $('dc-sub').innerHTML = subHtml;
  }

  function skeleton() {
    var cells = '';
    for (var i = 0; i < 16; i++) cells += '<i style="--i:' + i + '"></i>';
    $('dc-board').className = '';
    $('dc-board').innerHTML = '<div class="dc-skeleton" aria-label="Loading">' + cells + '</div>';
  }

  function showNotice(html) {
    $('dc-notice').innerHTML = html;
    $('dc-notice').hidden = !html;
  }

  function hideEnd() {
    $('dc-end').hidden = true;
    clearInterval(timer);
    $('dc-share-status').textContent = '';
    $('dc-share-fallback').hidden = true;
  }

  function badge(entry) {
    if (!entry || !entry.done) return '';
    var r = { won: entry.won, mistakes: entry.m };
    return D.isGolden(r) ? '✨' : entry.won ? '🍡' : '🍢';
  }

  function renderTabs(date, tier) {
    var el = $('dc-tiers'), focused = el.contains(document.activeElement);
    el.hidden = false;
    el.innerHTML = '';
    TIERS.forEach(function (t, i) {
      var b = document.createElement('button'), mark = badge(entryFor(date + '/' + t));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tier = t;
      b.setAttribute('aria-selected', t === tier ? 'true' : 'false');
      b.tabIndex = t === tier ? 0 : -1; // one tab stop; the arrow keys move between difficulties
      b.innerHTML = D.esc(TIER_NAMES[t]) + (mark ? '<span class="dc-badge" aria-label="finished">' + mark + '</span>' : '');
      b.onclick = function () { if (t !== tier) { setPref('tier', t); openDaily(date, t); } };
      b.onkeydown = function (e) {
        var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        el.children[(i + step + TIERS.length) % TIERS.length].click();
      };
      el.appendChild(b);
      if (focused && t === tier) b.focus();
    });
  }

  function countdown() {
    var el = $('dc-next');
    clearInterval(timer);
    var tick = function () {
      var now = new Date();
      if (ymd(now) !== today) {
        el.innerHTML = 'New puzzles are out. ' + internalLink(cfg.playPath, 'Play today’s →');
        clearInterval(timer);
        return;
      }
      var s = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) / 1000);
      el.innerHTML = 'Next puzzle in <b>' + pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + '</b>';
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  function resultHeadline(res) {
    if (!res.won) return ['🍢 Out of tries', 'The groups are above, and every word is below.'];
    var m = res.mistakes + (res.mistakes === 1 ? ' mistake' : ' mistakes');
    return res.golden ? ['✨ Golden dango!', 'Solved with ' + m + '.'] : ['🍡 Solved!', 'Solved with ' + m + '.'];
  }

  function wireShare(buildText, onShared) {
    var btn = $('dc-share'), status = $('dc-share-status'), fallback = $('dc-share-fallback');
    btn.onclick = function () {
      D.shareText(buildText(), fallback).then(function (method) {
        status.textContent = method === 'clipboard' ? 'Copied! Paste it anywhere.'
          : method === 'manual' ? 'Copy the text below.' : '';
        if (method === 'clipboard' || method === 'share') { // a small "done" bounce on the button
          btn.classList.remove('is-done'); void btn.offsetWidth; btn.classList.add('is-done');
        }
        if (method !== 'cancel') onShared(method);
      });
    };
  }

  function endLinks() {
    var links = [internalLink(cfg.makePath, 'Make your own board →')];
    if (cfg.bridgePath) links.push(internalLink(cfg.bridgePath, '熟語 Bridge →'));
    return links.join('');
  }

  // ---------- the daily ----------

  function dailyShareText(board, res) {
    return ['🍡 DangoChains #' + board.number + ' · ' + TIER_NAMES[board.tier], board.date]
      .concat(D.shareRows(board, res.guesses))
      .concat([D.outcomeLine(res), cfg.siteUrl + '/play/?d=' + board.date + '&t=' + board.tier + '&utm_source=share'])
      .join('\n');
  }

  // The player's guesses as the rows of balls the share text carries.
  function showRows(board, res) {
    var el = $('dc-rows');
    if (el) el.textContent = D.shareRows(board, res.guesses).join('\n');
  }

  // Brings the result into view once a game has just ended (not when a finished one is reopened),
  // and moves focus to it: the Submit button that had focus is gone, and a screen reader hears "Your result".
  function revealEnd() {
    var end = $('dc-end'), calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (end.hasAttribute('tabindex') && (!document.activeElement || document.activeElement === document.body)) {
      try { end.focus({ preventScroll: true }); } catch (e) { /* older browsers: no focus move */ }
    }
    if (!end.scrollIntoView || end.getBoundingClientRect().top < window.innerHeight * 0.55) return;
    setTimeout(function () { end.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); }, 150);
  }

  function showDailyEnd(board, res, fresh) {
    var head = resultHeadline(res), n = streak(), other = TIERS.filter(function (t) {
      var e = entryFor(board.date + '/' + t);
      return t !== board.tier && !(e && e.done);
    });
    $('dc-result').textContent = head[0];
    $('dc-result-sub').textContent = head[1];
    showRows(board, res);
    $('dc-streak').textContent = n > 0 ? 'Streak: ' + n + (n === 1 ? ' day' : ' days') : '';
    $('dc-share').hidden = false;
    wireShare(function () { return dailyShareText(board, res); }, function (method) {
      D.track('daily_share', { tier: board.tier, number: board.number, method: method });
    });
    if (board.date === today) countdown();
    else $('dc-next').innerHTML = 'This was the puzzle for ' + D.esc(longDate(board.date)) + '. ' + internalLink(cfg.playPath, 'Play today’s →');
    var more = $('dc-more');
    more.innerHTML = '';
    if (other.length) {
      more.appendChild(document.createTextNode(board.date === today ? 'Next today: ' : 'Also from that day: '));
      other.forEach(function (t, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'dc-btn'; b.textContent = TIER_NAMES[t];
        b.onclick = function () { setPref('tier', t); openDaily(board.date, t); window.scrollTo(0, 0); };
        if (i) more.appendChild(document.createTextNode(' '));
        more.appendChild(b);
      });
    }
    $('dc-review').innerHTML = D.reviewHtml(board);
    $('dc-cta-text').textContent = 'The free app keeps your streak, collects dango and can remind you each day. The 900+ past puzzles are a one-time unlock, no subscription.';
    $('dc-cta-stores').innerHTML = storeLinks('web_daily');
    $('dc-links').innerHTML = endLinks();
    $('dc-end').hidden = false;
    if (fresh) revealEnd();
  }

  function mountDaily(board) {
    var key = board.date + '/' + board.tier, entry = entryFor(key);
    if (entry && entry.fp !== board.fp) entry = null; // the board was rewritten since: start fresh
    var record = function (st, extra) {
      var e = { fp: board.fp, n: board.number, g: st.guesses, s: 1 };
      Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
      saveEntry(key, e);
    };
    $('dc-board').innerHTML = '';
    game = D.mount($('dc-board'), board, {
      guesses: entry && entry.g, started: entry && entry.s, furigana: furiganaFor(board.tier),
      onStart: function () {
        record({ guesses: [] });
        D.track('daily_start', { tier: board.tier, number: board.number });
      },
      onGuess: function (st) { if (!st.over) record(st); },
      onEnd: function (res) {
        record(res, { done: 1, won: res.won ? 1 : 0, m: res.mistakes });
        D.track('daily_complete', { tier: board.tier, won: res.won, mistakes: res.mistakes, number: board.number });
        var mine = game; // the result waits for the board's reveal, unless another board was opened meanwhile
        mine.whenIdle(function () {
          if (game !== mine) return;
          renderTabs(board.date, board.tier);
          showDailyEnd(board, res, true);
        });
      },
      onFurigana: function (on) { setPref('furigana', on); }
    });
    if (game.over) showDailyEnd(board, game.result());
  }

  function openDaily(date, tier) {
    var mine = ++seq, month = date.slice(0, 7);
    game = null;
    hideEnd();
    showNotice('');
    renderTabs(date, tier);
    $('dc-furi-note').hidden = tier === 'easy';
    var sub = D.esc(longDate(date)) + (date === today ? '' : ' · ' + internalLink(cfg.playPath, 'Play today’s →'));
    setHeading('DangoChains #' + puzzleNumber(date), sub);
    skeleton();
    loadMonth(tier, month).then(function (doc) {
      if (mine !== seq) return;
      var p = doc && (doc.puzzles || []).filter(function (x) { return x.date === date; })[0];
      if (!p) {
        $('dc-board').innerHTML = '';
        showNotice('<p>The ' + D.esc(TIER_NAMES[tier]) + ' puzzle for ' + D.esc(longDate(date)) + ' isn’t here yet. ' +
          'The app has every puzzle:</p><p class="dc-stores">' + storeLinks('web_missing') + '</p>');
        return;
      }
      var board = feedBoard(doc, p, tier);
      setHeading('DangoChains #' + board.number, sub);
      mountDaily(board);
    }, function () {
      if (mine !== seq) return;
      $('dc-board').innerHTML = '';
      showNotice('<p>Couldn’t load the puzzle. Check your connection and try again.</p>' +
        '<p><button type="button" class="dc-btn dc-btn-primary" id="dc-retry">Try again</button></p>');
      $('dc-retry').onclick = function () { openDaily(date, tier); };
    });
  }

  function showArchive(date, tier) {
    var label = 'DangoChains #' + puzzleNumber(date) + (tier ? ' · ' + TIER_NAMES[tier] : '');
    setHeading(label, D.esc(longDate(date)));
    $('dc-tiers').hidden = true;
    $('dc-board').innerHTML = '';
    $('dc-furi-note').hidden = true;
    showNotice('<p><b>This one is in the app’s archive.</b></p>' +
      '<p>The web has the last ' + FREE_DAYS + ' days of puzzles. The DangoChains app has every puzzle since January 1, 2026.</p>' +
      '<p class="dc-stores">' + storeLinks('web_archive') + '</p>' +
      '<p>' + internalLink(cfg.playPath, 'Play today’s puzzle →') + '</p>');
    D.track('daily_archive_link', { days_ago: dayIndex(today) - dayIndex(date) });
  }

  // ---------- custom boards (#b=) ----------

  function customShareText(board, res, payload) {
    var head = board.title ? '🍡 ' + board.title + ' · a custom DangoChains board' : '🍡 A custom DangoChains board';
    return [head].concat(D.shareRows(board, res.guesses))
      .concat([D.outcomeLine(res), cfg.siteUrl + '/play/#b=' + payload]).join('\n');
  }

  function openCustom(payload) {
    var board;
    $('dc-tiers').hidden = true;
    $('dc-furi-note').hidden = true;
    $('dc-intro').hidden = true;
    try { board = D.customBoard(payload); } catch (e) {
      setHeading('A custom DangoChains board', '');
      $('dc-board').innerHTML = '';
      showNotice('<p>' + D.esc(e.message) + '</p><p>' + internalLink(cfg.makePath, 'Make your own board →') +
        '</p><p>' + internalLink(cfg.playPath, 'Play today’s puzzle →') + '</p>');
      return;
    }
    document.title = (board.title || 'Custom board') + ' · DangoChains';
    setHeading(board.title || 'A custom board', 'A custom DangoChains board: find the four groups of four. ' +
      internalLink(cfg.howToPath, 'How to play'));
    var start = function () {
      hideEnd();
      game = D.mount($('dc-board'), board, {
        furigana: furiganaFor('custom'),
        onStart: function () { D.track('custom_start'); },
        onEnd: function (res) {
          D.track('custom_complete', { won: res.won, mistakes: res.mistakes });
          var mine = game;
          mine.whenIdle(function () { if (game === mine) showCustomEnd(res); });
        },
        onFurigana: function (on) { setPref('furigana', on); }
      });
    };
    var showCustomEnd = function (res) {
      var head = resultHeadline(res);
      $('dc-result').textContent = head[0];
      $('dc-result-sub').textContent = head[1];
      showRows(board, res);
      $('dc-streak').textContent = '';
      wireShare(function () { return customShareText(board, res, payload); }, function (method) {
        D.track('custom_share', { method: method });
      });
      $('dc-next').innerHTML = '';
      var again = document.createElement('button');
      again.type = 'button'; again.className = 'dc-btn'; again.textContent = 'Play again';
      again.onclick = function () { start(); window.scrollTo(0, 0); };
      $('dc-more').innerHTML = '';
      $('dc-more').appendChild(again);
      $('dc-review').innerHTML = D.reviewHtml(board);
      $('dc-cta-text').textContent = 'Want a new puzzle every day? DangoChains has three, with furigana, streaks and dango to collect.';
      $('dc-cta-stores').innerHTML = storeLinks('custom_board');
      $('dc-links').innerHTML = internalLink(cfg.makePath, 'Make your own board →') +
        internalLink(cfg.makePath + '#b=' + payload, 'Edit a copy of this board') +
        internalLink(cfg.playPath, 'Play today’s DangoChains →') +
        (cfg.bridgePath ? internalLink(cfg.bridgePath, '熟語 Bridge →') : '');
      $('dc-end').hidden = false;
      revealEnd();
    };
    start();
  }

  // ---------- start ----------

  window.addEventListener('hashchange', function () { location.reload(); });

  var hash = location.hash.replace(/^#/, '');
  if (hash.indexOf('b=') === 0) { openCustom(hash.slice(2)); return; }

  var params = new URLSearchParams(location.search);
  var d = params.get('d'), t = params.get('t');
  var tier = TIERS.indexOf(t) >= 0 ? t : null;
  var date = today;
  if (validYmd(d) && d >= EPOCH && d < today) {
    if (dayIndex(today) - dayIndex(d) >= FREE_DAYS) { showArchive(d, tier); return; }
    date = d;
  }
  if (!tier) {
    var last = load().tier, done = function (x) { var e = entryFor(date + '/' + x); return e && e.done; };
    tier = TIERS.indexOf(last) >= 0 && !done(last) ? last
      : TIERS.filter(function (x) { return !done(x); })[0] || (TIERS.indexOf(last) >= 0 ? last : 'easy');
  }
  openDaily(date, tier);
})();
