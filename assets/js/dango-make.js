/*
 * /make/: build a custom board and get a link that carries the whole board in its
 * fragment (/play/#b=...). Nothing is uploaded; an unsent draft is kept in this tab's
 * sessionStorage only. Readings fill in from assets/data/readings.json
 * (scripts/build_readings.py, from the app's furigana.yaml).
 * Needs dango-board.js and the #dc-config JSON.
 */
(function () {
  'use strict';

  var D = window.DangoBoard;
  var $ = function (id) { return document.getElementById(id); };
  var cfg = JSON.parse($('dc-config').textContent);
  var form = $('dc-form');
  var DRAFT_KEY = 'dangochains.make.draft';
  var dict = null;

  var EXAMPLE = {
    title: 'Example: colors and palindromes',
    groups: [
      { name: 'Fruit', words: [['いちご', '', 'strawberry'], ['りんご', '', 'apple'], ['みかん', '', 'mandarin orange'], ['ぶどう', '', 'grapes']] },
      { name: 'Red things', words: [['ポスト', '', 'mailbox'], ['消防車', '', 'fire engine'], ['夕焼け', '', 'sunset glow'], ['金魚', '', 'goldfish']] },
      { name: 'Colors ending in 色', words: [['茶色', '', 'brown'], ['水色', '', 'light blue'], ['黄色', '', 'yellow'], ['銀色', '', 'silver']] },
      { name: 'Palindromes (read the same backwards)', words: [['トマト', '', 'tomato'], ['新聞紙', '', 'newspaper'], ['八百屋', '', 'greengrocer'], ['南', '', 'south']] }
    ]
  };

  // ---------- the form ----------

  function groupEls() {
    return Array.prototype.map.call(form.querySelectorAll('.dc-make-group'), function (fs) {
      return {
        name: fs.querySelector('.dc-in-name'),
        words: Array.prototype.map.call(fs.querySelectorAll('.dc-make-word'), function (row) {
          return { w: row.querySelector('.dc-in-word'), reading: row.querySelector('.dc-in-reading'), gloss: row.querySelector('.dc-in-gloss') };
        })
      };
    });
  }

  function readForm() {
    return {
      title: $('dc-title').value,
      groups: groupEls().map(function (g) {
        return {
          name: g.name.value,
          words: g.words.map(function (x) { return { w: x.w.value, reading: x.reading.value, gloss: x.gloss.value }; })
        };
      })
    };
  }

  // `data` is {title, groups: [{name, words: [{w, reading, gloss}]}]}; readings given
  // here count as typed by hand, empty ones fill in from the dictionary.
  function fillForm(data) {
    $('dc-title').value = data.title || '';
    groupEls().forEach(function (g, gi) {
      var src = data.groups[gi] || { name: '', words: [] };
      g.name.value = src.name || '';
      g.words.forEach(function (x, wi) {
        var s = src.words[wi] || {};
        x.w.value = s.w || ''; x.reading.value = s.reading || ''; x.gloss.value = s.gloss || '';
        setAuto(x.reading, false);
        autofill(x);
      });
    });
  }

  // ---------- readings ----------

  function needsReading(w) {
    return Array.from(w).some(function (ch) {
      var c = ch.codePointAt(0);
      return (c >= 0x3400 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || c >= 0x20000 ||
        c === 0x3005 || c === 0x3006 || c === 0x30F5 || c === 0x30F6;
    });
  }

  function lookup(w) {
    if (!dict || !w) return '';
    return dict[w.normalize('NFKC')] || '';
  }

  function setAuto(input, on) {
    input.dataset.auto = on ? '1' : '';
    input.classList.toggle('dc-auto', !!on);
  }

  // Fills the reading from the dictionary unless it was typed by hand (a reading equal
  // to the dictionary's counts as filled in, so it follows later edits to the word).
  function autofill(x) {
    var w = D.clean(x.w.value, D.LIMITS.word), r = x.reading, found = needsReading(w) ? lookup(w) : '';
    if (r.value && r.value === found) setAuto(r, true);
    if (!r.value || r.dataset.auto === '1') { r.value = found; setAuto(r, !!found); }
    placeholder(x);
    fillGloss(x);
  }

  // ---------- meanings ----------
  // Suggested English meanings from JMdict's common words (glosses-jmdict.json, CC BY-SA,
  // scripts/build_jmdict_readings.py). The file is large, so it loads only once a word is typed.
  // Same rule as readings: a suggestion never replaces a meaning typed by hand.

  var glosses = null, glossesLoading = null;

  function loadGlosses() {
    if (glossesLoading) return;
    glossesLoading = (cfg.glossesUrl
      ? fetch(cfg.glossesUrl).then(function (res) { return res.ok ? res.json() : null; })
          .then(function (doc) { return (doc && doc.glosses) || {}; }, function () { return {}; })
      : Promise.resolve({}));
    glossesLoading.then(function (g) {
      glosses = g;
      groupEls().forEach(function (grp) { grp.words.forEach(fillGloss); });
    });
  }

  function fillGloss(x) {
    var w = D.clean(x.w.value, D.LIMITS.word), m = x.gloss;
    if (!m) return;
    if (w && !glosses) { loadGlosses(); return; }
    var found = (w && glosses && glosses[w.normalize('NFKC')]) || '';
    if (m.value && m.value === found) setAuto(m, true);
    if (!m.value || m.dataset.auto === '1') { m.value = found; setAuto(m, !!found); }
  }

  function placeholder(x) {
    var w = D.clean(x.w.value, D.LIMITS.word);
    x.reading.placeholder = !w ? 'Reading' : !needsReading(w) ? 'Not needed' : dict ? 'Type the reading' : 'Reading';
  }

  // The app's own readings (readings.json) win; JMdict's common words (readings-jmdict.json,
  // CC BY-SA, scripts/build_jmdict_readings.py) fill the rest. Either file failing is fine.
  function loadDictionary() {
    function get(url) {
      if (!url) return Promise.resolve({});
      return fetch(url).then(function (res) { return res.ok ? res.json() : null; })
        .then(function (doc) { return (doc && doc.readings) || {}; }, function () { return {}; });
    }
    Promise.all([get(cfg.readingsUrl), get(cfg.fallbackReadingsUrl)]).then(function (both) {
      dict = Object.assign({}, both[1], both[0]);
      groupEls().forEach(function (g) { g.words.forEach(autofill); });
    });
  }

  // ---------- validation ----------

  function validate(data) {
    var errors = [], bad = [], seen = {}, els = groupEls();
    data.groups.forEach(function (g, gi) {
      if (!D.clean(g.name, D.LIMITS.name)) { errors.push('Name group ' + (gi + 1) + '.'); bad.push(els[gi].name); }
      var empty = 0;
      g.words.forEach(function (x, wi) {
        var w = D.clean(x.w, D.LIMITS.word);
        if (!w) { empty++; bad.push(els[gi].words[wi].w); return; }
        if (seen[w]) { errors.push('“' + w + '” is on the board twice. All 16 words must be different.'); bad.push(els[gi].words[wi].w, seen[w]); }
        else seen[w] = els[gi].words[wi].w;
      });
      if (empty) errors.push('Group ' + (gi + 1) + ' needs ' + (empty === 4 ? 'four words' : empty + ' more word' + (empty === 1 ? '' : 's')) + '.');
    });
    return { errors: errors, bad: bad };
  }

  function showErrors(result) {
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var box = $('dc-errors');
    if (!result.errors.length) { box.hidden = true; box.innerHTML = ''; return; }
    result.bad.forEach(function (el) { el.setAttribute('aria-invalid', 'true'); });
    box.innerHTML = 'Almost there:<ul>' + result.errors.map(function (e) { return '<li>' + D.esc(e) + '</li>'; }).join('') + '</ul>';
    box.hidden = false;
    if (result.bad[0]) result.bad[0].focus();
  }

  // ---------- the link ----------

  function createLink() {
    var data = readForm(), result = validate(data);
    showErrors(result);
    if (result.errors.length) return;
    var payload = D.encodeCustom(data), link = cfg.siteUrl + '/play/#b=' + payload;
    $('dc-link').value = link;
    $('dc-open').href = cfg.playPath + '#b=' + payload;
    $('dc-copy-status').textContent = '';
    $('dc-long').hidden = link.length <= 2000;
    $('dc-share-link').hidden = !navigator.share;
    $('dc-result-box').hidden = false;
    $('dc-result-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
    var count = function (key) {
      return data.groups.reduce(function (n, g) { return n + g.words.filter(function (x) { return D.clean(x[key], 99); }).length; }, 0);
    };
    D.track('make_create', { readings: count('reading'), meanings: count('gloss'), length: link.length });
  }

  // ---------- drafts (this tab only) ----------

  function saveDraft() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(readForm())); } catch (e) { /* optional */ }
  }

  function loadDraft() {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch (e) { return null; }
  }

  // ---------- wiring ----------

  var timers = {};
  function debounce(key, fn, ms) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }

  groupEls().forEach(function (g) {
    g.words.forEach(function (x) {
      x.w.addEventListener('input', function () { debounce('w', function () { autofill(x); }, 200); });
      x.w.addEventListener('change', function () { autofill(x); });
      // Typed by hand from now on; cleared means no reading (until the word changes).
      x.reading.addEventListener('input', function () { setAuto(x.reading, false); placeholder(x); });
      x.gloss.addEventListener('input', function () { setAuto(x.gloss, false); });
    });
  });

  form.addEventListener('input', function () {
    $('dc-result-box').hidden = true;
    debounce('draft', saveDraft, 300);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); createLink(); });

  $('dc-example').onclick = function () {
    fillForm({
      title: EXAMPLE.title,
      groups: EXAMPLE.groups.map(function (g) {
        return { name: g.name, words: g.words.map(function (x) { return { w: x[0], reading: x[1], gloss: x[2] }; }) };
      })
    });
    showErrors({ errors: [], bad: [] });
    $('dc-result-box').hidden = true;
    saveDraft();
  };

  $('dc-reset').onclick = function () {
    if (!window.confirm('Clear the whole board?')) return;
    fillForm({ title: '', groups: [] });
    showErrors({ errors: [], bad: [] });
    $('dc-result-box').hidden = true;
    saveDraft();
  };

  $('dc-copy').onclick = function () {
    D.copyText($('dc-link').value, $('dc-link')).then(function (method) {
      $('dc-copy-status').textContent = method === 'clipboard' ? 'Copied! Paste it anywhere.' : 'Select the link and copy it.';
      D.track('make_share', { method: method });
    });
  };

  $('dc-share-link').onclick = function () {
    var title = D.clean($('dc-title').value, D.LIMITS.title);
    navigator.share({ title: title || 'A DangoChains board', url: $('dc-link').value }).then(function () {
      D.track('make_share', { method: 'share' });
    }, function () { /* cancelled */ });
  };

  $('dc-link').addEventListener('focus', function (e) { e.target.select(); });

  // Start from a board link (#b=, "Edit a copy"), else this tab's draft.
  var hash = location.hash.replace(/^#/, '');
  if (hash.indexOf('b=') === 0) {
    try { fillForm(D.decodeCustomData(hash.slice(2))); } catch (e) {
      showErrors({ errors: [e.message], bad: [] });
    }
  } else {
    var draft = loadDraft();
    if (draft && Array.isArray(draft.groups)) fillForm(draft);
  }
  loadDictionary();
})();
