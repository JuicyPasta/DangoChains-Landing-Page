/*
 * DangoChains board engine, shared by the daily (/play/) and custom boards (/make/ links).
 *
 * A board is {groups: [{name, nameJp?, level, words: [word x4]} x4]}, where `level` is
 * easy | medium | hard | expert (pink, orange, green, gray) and each word comes from
 * DangoBoard.word(text, bracketNotation, plainReading?, gloss?).
 *
 *   var game = DangoBoard.mount(el, board, {guesses, started, furigana,
 *                                           onStart, onGuess, onEnd, onFurigana});
 *
 * Everything that reaches innerHTML goes through esc(): custom boards come from URLs.
 *
 * The rules, the share text and the storage/analytics helpers are the contract with the app and
 * with other pages. How the board looks and moves (tile layout, reveal, DESIGN.md) is the part
 * between "words on tiles" and "the game" below.
 */
(function (global) {
  'use strict';

  var LEVELS = ['easy', 'medium', 'hard', 'expert'];
  var BALLS = { easy: '🔴', medium: '🟠', hard: '🟢', expert: '⚪' };
  var MAX_MISTAKES = 6;
  var GOLDEN_TRIES = 2;        // the last two tries are golden...
  var GOLDEN_MAX_MISTAKES = 1; // ...so a win with at most 1 mistake is golden (app: GameRules.isGoldenWin)

  // ---------- text ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Hiragana, katakana (with ー and ・) and half-width katakana. ヵ and ヶ count as
  // kanji here because they sit inside compounds (一ヶ月).
  function isKana(ch) {
    var c = ch.charCodeAt(0);
    if (c === 0x30F5 || c === 0x30F6) return false;
    return (c >= 0x3041 && c <= 0x309F) || (c >= 0x30A0 && c <= 0x30FF) || (c >= 0xFF66 && c <= 0xFF9F);
  }

  function toHiragana(s) {
    return Array.from(String(s)).map(function (ch) {
      var c = ch.charCodeAt(0);
      return c >= 0x30A1 && c <= 0x30F6 ? String.fromCharCode(c - 0x60) : ch;
    }).join('');
  }

  // Bracket notation from furigana.yaml: the reading in [] belongs to the run of
  // non-kana characters right before it. お金[かね] -> お + 金(かね);
  // 取[と]り消[け]し -> 取(と) り 消(け) し. Returns [{t, r?}].
  function parseBracket(s) {
    s = String(s);
    var out = [], re = /([^\[\]]*)\[([^\[\]]*)\]/g, last = 0, m;
    while ((m = re.exec(s)) !== null) {
      var chars = Array.from(m[1]), i = chars.length;
      while (i > 0 && !isKana(chars[i - 1])) i--;
      var lead = chars.slice(0, i).join(''), core = chars.slice(i).join('');
      if (!core) { core = m[1]; lead = ''; } // base ends in kana: the reading covers all of it
      if (lead) out.push({ t: lead });
      if (core) out.push(m[2] ? { t: core, r: m[2] } : { t: core });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ t: s.slice(last) });
    return out;
  }

  // Segments for `word`, or null when the notation doesn't spell that word
  // (a reading recorded for a different word must never change what is displayed).
  function segmentsFor(word, bracket) {
    if (!bracket || String(bracket).indexOf('[') < 0) return null;
    var segs = parseBracket(bracket);
    return segs.map(function (x) { return x.t; }).join('') === word ? segs : null;
  }

  function wordHtml(word, bracket) {
    var segs = segmentsFor(word, bracket);
    if (!segs) return esc(word);
    return segs.map(function (x) {
      return x.r ? '<ruby>' + esc(x.t) + '<rt>' + esc(x.r) + '</rt></ruby>' : esc(x.t);
    }).join('');
  }

  // The whole word in kana (お金[かね] -> おかね); '' when it adds nothing.
  function plainReading(word, bracket) {
    var segs = segmentsFor(word, bracket);
    if (!segs) return '';
    var r = segs.map(function (x) { return x.r || x.t; }).join('');
    return r === word ? '' : r;
  }

  // Turns a plain kana reading typed for a word into bracket notation by lining the
  // word's kana up with the reading: (取り消し, とりけし) -> 取[と]り消[け]し.
  // Returns '' when there is nothing to annotate.
  function alignReading(word, reading) {
    word = String(word || ''); reading = String(reading || '').trim();
    if (!word || !reading || toHiragana(word) === toHiragana(reading)) return '';
    var runs = [];
    Array.from(word).forEach(function (ch) {
      var k = isKana(ch), last = runs[runs.length - 1];
      if (last && last.kana === k) last.s += ch; else runs.push({ kana: k, s: ch });
    });
    if (!runs.some(function (x) { return !x.kana; })) return '';
    var pattern = '^' + runs.map(function (x) {
      return x.kana ? toHiragana(x.s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '(.+?)';
    }).join('') + '$';
    var m = new RegExp(pattern).exec(toHiragana(reading));
    // No line-up: parseBracket then puts the reading over the trailing kanji run,
    // or over the whole word when it ends in kana.
    if (!m) return word + '[' + reading + ']';
    var out = '', pos = 0, gi = 1;
    runs.forEach(function (x) {
      if (x.kana) { out += x.s; pos += x.s.length; return; }
      var len = m[gi++].length;
      out += x.s + '[' + reading.substr(pos, len) + ']';
      pos += len;
    });
    return out;
  }

  // ---------- words on tiles ----------
  //
  // A tile never lets the browser wrap its word. The engine splits the word into one to three
  // lines at a legal break (no line starts with ゃ ゅ ょ っ ー or closing punctuation, a furigana
  // group stays whole, a break after okurigana beats one before it) and sizes the text so the
  // widest line fills the tile. So a long word cannot overflow, whatever the screen width.

  var RT = 0.5;            // furigana size relative to its base (site.css: .dc-tile rt)
  var LINE = 1.14;         // line height of a tile line, in em (site.css: .dc-tile)
  var RUBY_LINE = 0.56;    // extra height of a line that shows furigana, in em
  var MAX_FONT = 28, MIN_FONT = 9;
  var NO_START = 'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶーｰ々ゝゞヽヾ、。，．・：；？！）」』】〕〉》｝］,.!?:;)]}%';
  var NO_END = '（「『【〔〈《｛［([{';

  // Width in full-width characters (Latin and half-width kana are narrower).
  function units(s) {
    return Array.from(s).reduce(function (n, ch) {
      var c = ch.charCodeAt(0);
      return n + (c <= 0xFF || (c >= 0xFF61 && c <= 0xFF9F) ? 0.6 : 1);
    }, 0);
  }

  function kind(ch) {
    var c = ch.codePointAt(0);
    if (c >= 0x3041 && c <= 0x309F) return 'hira';
    if ((c >= 0x30A0 && c <= 0x30FF) || (c >= 0xFF66 && c <= 0xFF9F)) return 'kata';
    if ((c >= 0x3400 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || c >= 0x20000) return 'kanji';
    if (c < 0x250) return 'latin';
    return 'other';
  }

  function isLatinWord(ch) { return /[A-Za-z0-9À-ɏ'’]/.test(ch); }

  // The pieces a line may be built from: a furigana group, one character, or a short Latin run.
  function atomsOf(segs) {
    var out = [];
    segs.forEach(function (seg) {
      if (seg.r) {
        out.push({
          html: '<ruby>' + esc(seg.t) + '<rt>' + esc(seg.r) + '</rt></ruby>', text: seg.t, ruby: true,
          w0: units(seg.t), w1: Math.max(units(seg.t), units(seg.r) * RT)
        });
        return;
      }
      var chars = Array.from(seg.t), i = 0;
      while (i < chars.length) {
        var ch = chars[i], j = i + 1;
        if (/\s/.test(ch)) { out.push({ space: true, html: ' ', text: ' ', w0: 0.3, w1: 0.3 }); i = j; continue; }
        if (isLatinWord(ch)) while (j < chars.length && isLatinWord(chars[j]) && j - i < 10) j++;
        var run = chars.slice(i, j).join(''), w = units(run);
        out.push({ html: esc(run), text: run, w0: w, w1: w });
        i = j;
      }
    });
    return out;
  }

  // How bad a line break between two atoms is: Infinity = never, 0 = the natural place.
  function breakCost(a, b) {
    if (a.space || b.space) return 0;
    var prev = Array.from(a.text).pop(), next = Array.from(b.text)[0];
    if (NO_START.indexOf(next) >= 0 || NO_END.indexOf(prev) >= 0) return Infinity;
    var kp = kind(prev), kn = kind(next), cost;
    if (kp === kn) cost = kp === 'kanji' && (a.ruby || b.ruby) ? 0.2 : 0.5;  // between two furigana groups / inside a run
    else if (kp === 'kanji' && kn === 'hira') cost = 0.9;                      // would cut okurigana off its kanji
    else cost = 0;                                                             // the script changes: a word boundary
    if (next === 'ん' || next === 'ン') cost += 0.5;
    return cost;
  }

  function lineOf(atoms, from, to, furi) {
    while (from < to && atoms[from].space) from++;
    while (to > from && atoms[to - 1].space) to--;
    var width = 0, html = '', ruby = false;
    for (var i = from; i < to; i++) {
      width += furi ? atoms[i].w1 : atoms[i].w0; html += atoms[i].html;
      if (atoms[i].ruby) ruby = true;
    }
    return { width: width, html: html, ruby: ruby && furi };
  }

  // The best split of `atoms` into `k` lines, or null when there is no legal one.
  function splitInto(atoms, k, furi) {
    var n = atoms.length, best = null;
    function consider(cuts, cost) {
      var lines = [], prev = 0, widest = 0, height = 0;
      cuts.concat(n).forEach(function (c) { lines.push(lineOf(atoms, prev, c, furi)); prev = c; });
      if (lines.some(function (l) { return !l.html; })) return;
      lines.forEach(function (l) { widest = Math.max(widest, l.width); height += LINE + (l.ruby ? RUBY_LINE : 0); });
      var score = widest + cost + (lines[lines.length - 1].width > lines[0].width ? 0.05 : 0);
      if (!best || score < best.score) {
        best = {
          k: k, score: score, n: Math.max(widest, 1), h: height,
          html: lines.map(function (l) { return '<span class="dc-ln">' + l.html + '</span>'; }).join('')
        };
      }
    }
    if (k === 1) { consider([], 0); return best; }
    for (var a = 1; a < n; a++) {
      var ca = breakCost(atoms[a - 1], atoms[a]);
      if (ca === Infinity) continue;
      if (k === 2) { consider([a], ca); continue; }
      for (var b = a + 1; b < n; b++) {
        var cb = breakCost(atoms[b - 1], atoms[b]);
        if (cb !== Infinity) consider([a, b], ca + cb);
      }
    }
    return best;
  }

  // The one-, two- and three-line versions of a word (cached on the word).
  function layoutsFor(wd, furi) {
    var key = furi ? 'layF' : 'lay0';
    if (!wd[key]) {
      var atoms = wd.atoms || (wd.atoms = atomsOf(wd.segs));
      wd[key] = [1, 2, 3].map(function (k) { return splitInto(atoms, k, furi); }).filter(Boolean);
    }
    return wd[key];
  }

  // The layout and font size for a word on a tile whose text box is W x H px.
  function chooseLayout(wd, W, H, furi) {
    var options = layoutsFor(wd, furi).map(function (L) {
      var cap = Math.min(MAX_FONT, 0.96 * W / (L.k === 1 ? 3.2 : 4)); // short words don't balloon; lines hold about four characters
      return { L: L, f: Math.min(cap, 0.96 * W / L.n, H / L.h) };
    });
    // Fewer lines are the default, unless the word would get too small to read (kanji need more than kana).
    var floor = !wd.hasKanji ? 13 : furi && wd.hasRuby ? 17 : 15.5;
    while (options.length > 1 && options[0].f < floor && options.some(function (o, i) { return i && o.f > options[0].f; })) options.shift();
    var best = options[0];
    options.forEach(function (o) { // an extra line has to buy a clearly bigger font
      if (o.f * (1 - 0.3 * (o.L.k - 1)) > best.f * (1 - 0.3 * (best.L.k - 1))) best = o;
    });
    return { id: (furi ? 'f' : 'n') + best.L.k, html: best.L.html, size: Math.max(MIN_FONT, Math.floor(best.f * 10) / 10) };
  }

  // A board word. `bracket` is furigana.yaml notation ('' for none); `reading` is the
  // plain kana shown in the review (derived from `bracket` when omitted).
  function word(w, bracket, reading, gloss) {
    var segs = segmentsFor(w, bracket);
    bracket = segs ? bracket : '';
    return {
      w: w, bracket: bracket, html: wordHtml(w, bracket),
      segs: segs || [{ t: w }], hasRuby: !!segs && segs.some(function (x) { return !!x.r; }),
      hasKanji: Array.from(w).some(function (ch) { return kind(ch) === 'kanji'; }),
      reading: reading != null ? reading : plainReading(w, bracket), gloss: gloss || ''
    };
  }

  // ---------- results ----------

  function isGolden(result) { return !!result.won && result.mistakes <= GOLDEN_MAX_MISTAKES; }

  // One row of balls per guess, each word colored by its group's level.
  function shareRows(board, guesses) {
    var levelOf = {};
    board.groups.forEach(function (g) { g.words.forEach(function (w) { levelOf[w.w] = g.level; }); });
    return guesses.map(function (guess) {
      return guess.map(function (w) { return BALLS[levelOf[w]] || '⚫'; }).join('');
    });
  }

  // The outcome line of the share text (same lines as the app's ResultShareFormatter).
  function outcomeLine(result) {
    if (!result.won) return '🍢 Out of tries';
    if (isGolden(result)) return '✨ Golden';
    return '🍡 Solved in ' + result.guesses.length + ' tries · ' + result.mistakes + ' mistakes';
  }

  function groupTitleHtml(g) {
    return g.nameJp ? '<b lang="ja">' + esc(g.nameJp) + '</b><span>' + esc(g.name) + '</span>'
                    : '<b>' + esc(g.name) + '</b>';
  }

  // Post-game review: every group with readings, plus glosses when present.
  function reviewHtml(board) {
    return board.groups.map(function (g) {
      var rows = g.words.map(function (w) {
        return '<li><span class="dc-rv-word" lang="ja">' + esc(w.w) + '</span>' +
          (w.reading ? '<span class="dc-rv-reading" lang="ja">' + esc(w.reading) + '</span>' : '') +
          (w.gloss ? '<span class="dc-rv-gloss">' + esc(w.gloss) + '</span>' : '') + '</li>';
      }).join('');
      return '<div class="dc-rv-group dc-' + esc(g.level) + '"><div class="dc-rv-title">' + groupTitleHtml(g) +
        '</div><ul>' + rows + '</ul></div>';
    }).join('');
  }

  // ---------- sharing ----------

  // The share sheet on phones and tablets, the clipboard elsewhere. Resolves to
  // 'share' | 'clipboard' | 'cancel' | 'manual' (nothing worked: the text is shown
  // selected in `fallbackEl`, a textarea, for copying by hand).
  function shareText(text, fallbackEl) {
    var touch = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    if (navigator.share && touch) {
      return navigator.share({ text: text }).then(function () { return 'share'; }, function (e) {
        return e && e.name === 'AbortError' ? 'cancel' : copyText(text, fallbackEl);
      });
    }
    return copyText(text, fallbackEl);
  }

  function copyText(text, fallbackEl) {
    var legacy = function () {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) return 'clipboard';
      if (fallbackEl) { fallbackEl.hidden = false; fallbackEl.value = text; fallbackEl.focus(); fallbackEl.select(); }
      return 'manual';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return 'clipboard'; }, legacy);
    }
    return Promise.resolve(legacy());
  }

  // ---------- storage and analytics (both optional: the game works without them) ----------

  function store(key) {
    return {
      get: function () {
        try {
          var v = JSON.parse(global.localStorage.getItem(key));
          return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
        } catch (e) { return {}; }
      },
      set: function (value) {
        try { global.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
      }
    };
  }

  function track(name, params) {
    try { if (typeof global.gtag === 'function') global.gtag('event', name, params || {}); } catch (e) { /* never breaks the game */ }
  }

  // ---------- the game ----------

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function Game(root, board, opts) {
    var self = this, words = [], groupOf = {};
    this.root = root; this.board = board; this.opts = opts || {};
    board.groups.forEach(function (g, gi) {
      g.words.forEach(function (w) { words.push({ word: w, group: gi }); groupOf[w.w] = gi; });
    });
    this.groupOf = groupOf;
    this.tiles = shuffle(words);
    this.selected = []; this.solved = []; this.guesses = []; this.keys = [];
    this.mistakes = 0; this.over = false; this.won = false;
    this.started = !!this.opts.started;
    // Presentation state: how many solved groups are on screen (the rest are still tiles while a
    // lost board reveals itself), and the end-of-game sequence the page waits for.
    this.shown = 0; this.bands = {}; this.busy = false; this.idle = [];
    root.__dcGame = this;
    this.build();
    (this.opts.guesses || []).forEach(function (g) {
      if (!self.over && Array.isArray(g) && g.length === 4 && g.every(function (w) { return w in groupOf; })) self.apply(g);
    });
    this.shown = this.solved.length; // a restored game shows where it stands, with no replay
    this.setFurigana(this.opts.furigana !== false);
    this.render();
    this.watch();
  }

  Game.prototype.build = function () {
    var self = this, r = this.root;
    r.classList.add('dc-board');
    r.classList.remove('dc-busy', 'is-won', 'is-over');
    r.style.minHeight = '';
    r.innerHTML =
      '<div class="dc-solved"></div>' +
      '<div class="dc-grid" role="group" aria-label="Words"></div>' +
      '<div class="dc-status">' + // one line: the status pill (when there is one) beside the tries
        '<p class="dc-msg" role="status" aria-live="polite"></p>' +
        '<div class="dc-tries" role="img"><span class="dc-tries-label">Tries</span><span class="dc-dots"></span></div>' +
      '</div>' +
      '<div class="dc-actions">' +
        '<button type="button" class="dc-btn dc-shuffle">Shuffle</button>' +
        '<button type="button" class="dc-btn dc-clear">Deselect</button>' +
        '<button type="button" class="dc-btn dc-btn-primary dc-submit" disabled>Submit</button>' +
      '</div>' +
      '<label class="dc-furigana"><input type="checkbox"> Show furigana</label>';
    this.el = {
      solved: r.querySelector('.dc-solved'), grid: r.querySelector('.dc-grid'), msg: r.querySelector('.dc-msg'),
      tries: r.querySelector('.dc-tries'), dots: r.querySelector('.dc-dots'), actions: r.querySelector('.dc-actions'),
      submit: r.querySelector('.dc-submit'), furigana: r.querySelector('.dc-furigana input')
    };
    this.el.submit.onclick = function () { self.submit(); };
    r.querySelector('.dc-clear').onclick = function () { self.selected = []; self.say(''); self.render(); };
    r.querySelector('.dc-shuffle').onclick = function () { shuffle(self.tiles); self.render({ flip: true }); };
    this.el.furigana.onchange = function (e) {
      self.setFurigana(e.target.checked);
      if (self.opts.onFurigana) self.opts.onFurigana(e.target.checked);
    };
  };

  Game.prototype.setFurigana = function (on) {
    this.el.furigana.checked = on;
    this.root.classList.toggle('dc-nofuri', !on);
    this.fit();
  };

  Game.prototype.say = function (text, kind) {
    var m = this.el.msg;
    m.textContent = text;
    m.className = 'dc-msg' + (kind ? ' dc-msg-' + kind : '');
    if (text) { m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; } // replay the entrance
  };

  // Syncs the page with the game. Tiles and solved bands are kept between calls (keyed by word
  // and by group), so a tap only changes classes and CSS can animate it.
  //   o.flip: tiles glide from where they were to where they are now
  //   o.fresh: the group index whose band has just been earned
  Game.prototype.render = function (o) {
    o = o || {};
    var self = this, el = this.el, shown = this.solved.slice(0, this.shown), live = [];
    var from = o.flip && !reducedMotion() ? this.rects() : null;

    shown.forEach(function (gi, i) {
      if (self.bands[gi]) return;
      var g = self.board.groups[gi], band = self.bands[gi] = document.createElement('div');
      band.className = 'dc-group dc-' + esc(g.level) + (o.fresh === gi ? ' is-new' : '');
      band.style.setProperty('--i', i);
      band.innerHTML = groupTitleHtml(g) + '<div class="dc-group-words" lang="ja">' +
        g.words.map(function (w) { return '<span>' + w.html + '</span>'; }).join('、') + '</div>';
      el.solved.appendChild(band);
    });

    this.tiles.forEach(function (t) { if (shown.indexOf(t.group) < 0) live.push(t); });
    live.forEach(function (t, i) {
      var b = t.el;
      if (!b) {
        b = t.el = document.createElement('button');
        b.type = 'button'; b.className = 'dc-tile';
        b.setAttribute('lang', 'ja');
        b.dataset.w = t.word.w;
        b.innerHTML = '<span class="dc-w">' + t.word.html + '</span>';
        b.onclick = function () { self.toggle(t); };
      }
      var on = self.selected.indexOf(t) >= 0;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.disabled = self.over;
      if (el.grid.children[i] !== b) el.grid.insertBefore(b, el.grid.children[i] || null);
    });
    while (el.grid.children.length > live.length) el.grid.removeChild(el.grid.lastChild);
    el.grid.hidden = !live.length;

    var left = MAX_MISTAKES - this.mistakes, dots = '';
    for (var i = 0; i < MAX_MISTAKES; i++) {
      var golden = i >= MAX_MISTAKES - GOLDEN_TRIES;
      dots += '<i class="dc-dot' + (i < left ? (golden ? ' dc-dot-gold' : '') : ' dc-dot-used') + '"></i>';
    }
    el.dots.innerHTML = dots;
    el.tries.setAttribute('aria-label', left + ' of ' + MAX_MISTAKES + ' tries left');
    el.actions.hidden = this.over;
    el.submit.disabled = this.over || this.selected.length !== 4;
    this.root.classList.toggle('is-over', this.over);
    this.fit();
    if (from) this.glide(from);
  };

  // Lays every word out on its tile (see "words on tiles"), then measures: anything the estimate
  // got wrong (an unusual glyph, a late web font) is shrunk until it fits.
  Game.prototype.fit = function () {
    var grid = this.el && this.el.grid, first = grid && grid.firstElementChild;
    if (!first || !first.clientWidth) return;
    var W = first.clientWidth - 6, H = first.clientHeight - 8; // the tile's padding (site.css)
    var furi = !this.root.classList.contains('dc-nofuri'), key = W + 'x' + H + (furi ? 'f' : 'n'), todo = [];
    this.tiles.forEach(function (t) {
      if (!t.el || t.el.parentNode !== grid || t.fitKey === key) return;
      var L = chooseLayout(t.word, W, H, furi), box = t.el.firstChild;
      if (t.layoutId !== L.id) { box.innerHTML = L.html; t.layoutId = L.id; }
      box.style.fontSize = L.size + 'px';
      t.fitKey = key; t.size = L.size;
      todo.push(t);
    });
    for (var pass = 0; pass < 3 && todo.length; pass++) {
      var over = todo.map(function (t) {
        var box = t.el.firstChild;
        return Math.min(W / box.scrollWidth, H / box.scrollHeight);
      });
      todo = todo.filter(function (t, i) {
        if (over[i] >= 1) return false;
        t.size = Math.max(MIN_FONT, Math.floor(t.size * over[i] * 9.8) / 10);
        t.el.firstChild.style.fontSize = t.size + 'px';
        return true;
      });
    }
  };

  // Refits when the board's width changes and when the web fonts arrive.
  Game.prototype.watch = function () {
    var self = this, grid = this.el.grid;
    var refit = function (force) {
      if (self.root.__dcGame !== self) return false;
      if (force) self.tiles.forEach(function (t) { t.fitKey = null; });
      self.fit();
      return true;
    };
    if (global.ResizeObserver) {
      var ro = new global.ResizeObserver(function () { if (!refit(false)) ro.disconnect(); });
      ro.observe(grid);
    } else {
      global.addEventListener('resize', function () { refit(false); });
    }
    // Web fonts arrive in pieces (one file per group of characters), so refit after each batch.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refit(true); });
    if (document.fonts && document.fonts.addEventListener) {
      var onFonts = function () { if (!refit(true)) document.fonts.removeEventListener('loadingdone', onFonts); };
      document.fonts.addEventListener('loadingdone', onFonts);
    }
  };

  Game.prototype.rects = function () {
    var out = [];
    this.tiles.forEach(function (t) { if (t.el && t.el.parentNode) out.push([t.el, t.el.getBoundingClientRect()]); });
    return out;
  };

  Game.prototype.glide = function (from) {
    from.forEach(function (pair) {
      var el = pair[0];
      if (!el.parentNode || !el.animate) return;
      var now = el.getBoundingClientRect(), dx = pair[1].left - now.left, dy = pair[1].top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  };

  // Marks the tiles of a wrong guess (they shake) and the try it cost.
  Game.prototype.miss = function (picked) {
    picked.forEach(function (t) {
      if (!t.el) return;
      t.el.classList.remove('is-wrong'); void t.el.offsetWidth; t.el.classList.add('is-wrong');
      setTimeout(function () { t.el.classList.remove('is-wrong'); }, 450);
    });
    var dot = this.el.dots.children[MAX_MISTAKES - this.mistakes];
    if (dot) dot.classList.add('is-lost');
  };

  Game.prototype.confetti = function (golden) {
    var box = document.createElement('div'), colors = golden ? ['--gold', '--g2', '--gold', '--g1'] : ['--g1', '--g2', '--g3', '--g4'];
    box.className = 'dc-confetti';
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('i'), angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4, far = 90 + Math.random() * 110;
      p.style.setProperty('--dx', Math.round(Math.cos(angle) * far) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(angle) * far - 30) + 'px');
      p.style.setProperty('--c', 'var(' + colors[i % colors.length] + ')');
      p.style.animationDelay = Math.round(Math.random() * 120) + 'ms';
      box.appendChild(p);
    }
    this.root.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
  };

  // Puts the guess that was just applied on screen. Mid-game that is one render; when the game
  // ends it is a short sequence (a win celebrates, a loss reveals the remaining groups one at a
  // time), and whenIdle() callbacks wait for it. With reduced motion there is no sequence.
  Game.prototype.reveal = function (outcome, picked) {
    var self = this, right = outcome === 'correct', last = this.solved[this.solved.length - 1];
    if (!this.over) {
      this.shown = this.solved.length;
      this.render(right ? { flip: true, fresh: last } : null);
      if (!right) this.miss(picked);
      return;
    }
    if (reducedMotion()) { this.shown = this.solved.length; this.render(); return; }
    var alive = function () { return self.root.__dcGame === self; };
    var done = function () {
      self.busy = false;
      if (!alive()) return;
      self.root.classList.remove('dc-busy');
      self.root.style.minHeight = '';
      var queue = self.idle; self.idle = [];
      queue.forEach(function (fn) { fn(); });
    };
    this.busy = true;
    this.root.classList.add('dc-busy');
    this.root.style.minHeight = this.root.offsetHeight + 'px'; // nothing under the board moves until the result is ready
    if (right) {
      this.shown = this.solved.length;
      this.render({ fresh: last });
      this.root.classList.add('is-won');
      this.confetti(isGolden(this.result()));
      setTimeout(done, 800);
      return;
    }
    this.render();
    this.miss(picked);
    var step = function () {
      if (!alive()) return done();
      if (self.shown >= self.solved.length) return done();
      self.shown++;
      self.render({ flip: true, fresh: self.solved[self.shown - 1] });
      setTimeout(step, 430);
    };
    setTimeout(step, 500);
  };

  // Runs `fn` now, or once the end-of-game sequence has finished.
  Game.prototype.whenIdle = function (fn) {
    if (this.busy) this.idle.push(fn); else fn();
  };

  Game.prototype.toggle = function (t) {
    if (this.over) return;
    if (!this.started) { this.started = true; if (this.opts.onStart) this.opts.onStart(); }
    var i = this.selected.indexOf(t);
    if (i >= 0) this.selected.splice(i, 1);
    else if (this.selected.length < 4) this.selected.push(t);
    this.say('');
    this.render();
  };

  // Records a guess (four words, in the order picked):
  // 'duplicate' | 'correct' | 'one-away' | 'wrong'.
  Game.prototype.apply = function (guess) {
    var self = this, key = guess.slice().sort().join('|');
    if (this.keys.indexOf(key) >= 0) return 'duplicate';
    this.keys.push(key); this.guesses.push(guess.slice());
    var counts = {};
    guess.forEach(function (w) { var gi = self.groupOf[w]; counts[gi] = (counts[gi] || 0) + 1; });
    var hit = Object.keys(counts).filter(function (k) { return counts[k] === 4; })[0];
    if (hit !== undefined) {
      this.solved.push(+hit);
      if (this.solved.length === 4) { this.over = true; this.won = true; }
      return 'correct';
    }
    this.mistakes++;
    if (this.mistakes >= MAX_MISTAKES) {
      this.over = true;
      this.board.groups.forEach(function (_, gi) { if (self.solved.indexOf(gi) < 0) self.solved.push(gi); });
    }
    var max = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
    return max === 3 ? 'one-away' : 'wrong';
  };

  Game.prototype.submit = function () {
    if (this.over || this.selected.length !== 4) return;
    var picked = this.selected.slice();
    var outcome = this.apply(picked.map(function (t) { return t.word.w; }));
    if (outcome === 'duplicate') { this.say('Already guessed', 'info'); return; }
    this.selected = [];
    if (outcome === 'correct') this.say(this.over ? '' : '正解！', 'good');
    else this.say(this.over ? '' : outcome === 'one-away' ? 'One away…' : 'Not quite', outcome === 'one-away' ? 'near' : 'bad');
    this.reveal(outcome, picked);
    if (this.opts.onGuess) this.opts.onGuess(this.state());
    if (this.over && this.opts.onEnd) this.opts.onEnd(this.result());
  };

  Game.prototype.state = function () {
    return { guesses: this.guesses.slice(), over: this.over, won: this.won, mistakes: this.mistakes, started: this.started };
  };

  Game.prototype.result = function () {
    var r = { won: this.won, mistakes: this.mistakes, guesses: this.guesses.slice() };
    r.golden = isGolden(r);
    return r;
  };

  // ---------- custom boards in the URL fragment: #b=base64url(JSON) ----------
  //
  // {"v":1,"t":"title","g":[{"n":"group name","w":[4 words],"r":[4 readings],"m":[4 meanings]} x4]}
  // "r" (plain kana) and "m" (English) are optional. Groups are colored in order.

  var LIMITS = { title: 80, name: 60, word: 24, reading: 48, meaning: 80 };

  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function clean(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }

  // Returns {title, groups: [{name, words: [{w, reading, gloss}]}]} as typed in the
  // maker, or throws an Error with a message for the reader.
  function decodeCustomData(payload) {
    var data, seen = {};
    try { data = JSON.parse(b64urlDecode(String(payload))); } catch (e) { throw new Error('This board link is damaged. Ask for the link again.'); }
    if (!data || data.v !== 1 || !Array.isArray(data.g) || data.g.length !== 4) throw new Error('This link is not a DangoChains board.');
    var groups = data.g.map(function (g) {
      var name = clean(g && g.n, LIMITS.name);
      if (!name || !Array.isArray(g.w) || g.w.length !== 4) throw new Error('This board link is incomplete.');
      return {
        name: name,
        words: g.w.map(function (raw, wi) {
          var w = clean(raw, LIMITS.word);
          if (!w || seen[w]) throw new Error('This board link is incomplete.');
          seen[w] = true;
          return {
            w: w, reading: clean(Array.isArray(g.r) ? g.r[wi] : '', LIMITS.reading),
            gloss: clean(Array.isArray(g.m) ? g.m[wi] : '', LIMITS.meaning)
          };
        })
      };
    });
    return { title: clean(data.t, LIMITS.title), groups: groups };
  }

  // A playable board from a #b= payload (throws like decodeCustomData).
  function customBoard(payload) {
    var data = decodeCustomData(payload);
    return {
      title: data.title,
      groups: data.groups.map(function (g, gi) {
        return {
          name: g.name, level: LEVELS[gi],
          words: g.words.map(function (x) {
            var bracket = alignReading(x.w, x.reading);
            return word(x.w, bracket, bracket ? x.reading : '', x.gloss);
          })
        };
      })
    };
  }

  // `data` has the decodeCustomData shape; returns the payload for #b=.
  function encodeCustom(data) {
    return b64urlEncode(JSON.stringify({
      v: 1, t: clean(data.title, LIMITS.title),
      g: data.groups.map(function (g) {
        var out = { n: clean(g.name, LIMITS.name), w: g.words.map(function (x) { return clean(x.w, LIMITS.word); }) };
        var r = g.words.map(function (x) { return clean(x.reading, LIMITS.reading); });
        var m = g.words.map(function (x) { return clean(x.gloss, LIMITS.meaning); });
        if (r.some(Boolean)) out.r = r;
        if (m.some(Boolean)) out.m = m;
        return out;
      })
    }));
  }

  global.DangoBoard = {
    LEVELS: LEVELS, BALLS: BALLS, LIMITS: LIMITS, MAX_MISTAKES: MAX_MISTAKES,
    esc: esc, isKana: isKana, toHiragana: toHiragana, clean: clean,
    parseBracket: parseBracket, wordHtml: wordHtml, plainReading: plainReading, alignReading: alignReading,
    word: word, shareRows: shareRows, outcomeLine: outcomeLine, isGolden: isGolden, reviewHtml: reviewHtml,
    shareText: shareText, copyText: copyText, store: store, track: track,
    encodeCustom: encodeCustom, decodeCustomData: decodeCustomData, customBoard: customBoard,
    mount: function (root, board, opts) { return new Game(root, board, opts); }
  };
})(window);
