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

  // Width in full-width characters (Latin and half-width kana count about half).
  function units(s) {
    return Array.from(s).reduce(function (n, ch) {
      var c = ch.charCodeAt(0);
      return n + (c <= 0xFF || (c >= 0xFF61 && c <= 0xFF9F) ? 0.55 : 1);
    }, 0);
  }

  // Characters per line on a tile: short words get one line, longer ones two or
  // three. A reading wider than its kanji (消防車, しょうぼうしゃ) widens the word.
  // CSS sizes the text from it so every word fits its tile.
  function perLine(word, bracket, withReadings) {
    var width = (segmentsFor(word, bracket) || [{ t: word }]).reduce(function (n, x) {
      return n + (x.r && withReadings ? Math.max(units(x.t), units(x.r) / 2) : units(x.t));
    }, 0);
    var lines = width > 8 ? 3 : width > 4.5 ? 2 : 1;
    return Math.max(3, Math.round(width / lines * 10) / 10);
  }

  // A board word. `bracket` is furigana.yaml notation ('' for none); `reading` is the
  // plain kana shown in the review (derived from `bracket` when omitted).
  function word(w, bracket, reading, gloss) {
    bracket = segmentsFor(w, bracket) ? bracket : '';
    return {
      w: w, bracket: bracket, html: wordHtml(w, bracket),
      perLine: perLine(w, bracket, true), perLineBare: perLine(w, bracket, false),
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
    this.build();
    (this.opts.guesses || []).forEach(function (g) {
      if (!self.over && Array.isArray(g) && g.length === 4 && g.every(function (w) { return w in groupOf; })) self.apply(g);
    });
    this.setFurigana(this.opts.furigana !== false);
    this.render();
  }

  Game.prototype.build = function () {
    var self = this, r = this.root;
    r.classList.add('dc-board');
    r.innerHTML =
      '<div class="dc-solved"></div>' +
      '<div class="dc-grid" role="group" aria-label="Words"></div>' +
      '<p class="dc-msg" role="status" aria-live="polite"></p>' +
      '<div class="dc-tries"><span class="dc-tries-label">Tries</span><span class="dc-dots"></span></div>' +
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
    r.querySelector('.dc-shuffle').onclick = function () { shuffle(self.tiles); self.render(); };
    this.el.furigana.onchange = function (e) {
      self.setFurigana(e.target.checked);
      if (self.opts.onFurigana) self.opts.onFurigana(e.target.checked);
    };
  };

  Game.prototype.setFurigana = function (on) {
    this.el.furigana.checked = on;
    this.root.classList.toggle('dc-nofuri', !on);
  };

  Game.prototype.say = function (text, kind) {
    this.el.msg.textContent = text;
    this.el.msg.className = 'dc-msg' + (kind ? ' dc-msg-' + kind : '');
  };

  Game.prototype.render = function () {
    var self = this, el = this.el;
    el.solved.innerHTML = this.solved.map(function (gi) {
      var g = self.board.groups[gi];
      return '<div class="dc-group dc-' + esc(g.level) + '">' + groupTitleHtml(g) + '<div class="dc-group-words" lang="ja">' +
        g.words.map(function (w) { return '<span>' + w.html + '</span>'; }).join('、') + '</div></div>';
    }).join('');
    el.grid.innerHTML = '';
    this.tiles.forEach(function (t) {
      if (self.solved.indexOf(t.group) >= 0) return;
      var b = document.createElement('button'), on = self.selected.indexOf(t) >= 0;
      b.type = 'button'; b.className = 'dc-tile' + (on ? ' sel' : '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('lang', 'ja');
      b.dataset.w = t.word.w;
      b.innerHTML = '<span style="--n:' + t.word.perLine + ';--n0:' + t.word.perLineBare + '">' + t.word.html + '</span>';
      b.onclick = function () { self.toggle(t); };
      el.grid.appendChild(b);
    });
    el.grid.hidden = this.over;
    var left = MAX_MISTAKES - this.mistakes, dots = '';
    for (var i = 0; i < MAX_MISTAKES; i++) {
      var golden = i >= MAX_MISTAKES - GOLDEN_TRIES;
      dots += '<i class="dc-dot' + (i < left ? (golden ? ' dc-dot-gold' : '') : ' dc-dot-used') + '"></i>';
    }
    el.dots.innerHTML = dots;
    el.tries.setAttribute('aria-label', left + ' of ' + MAX_MISTAKES + ' tries left');
    el.actions.hidden = this.over;
    el.submit.disabled = this.over || this.selected.length !== 4;
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
    var outcome = this.apply(this.selected.map(function (t) { return t.word.w; }));
    if (outcome === 'duplicate') { this.say('Already guessed', 'info'); return; }
    this.selected = [];
    if (outcome === 'correct') this.say(this.over ? '' : '正解！', 'good');
    else {
      this.say(this.over ? '' : outcome === 'one-away' ? 'One away…' : 'Not quite', 'bad');
      var grid = this.el.grid;
      grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
    }
    this.render();
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
