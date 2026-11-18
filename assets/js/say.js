/* Listen buttons for the text pages (phrase guides, word lists, kana charts, study tables).
   Uses the browser's own Japanese text-to-speech (Web Speech API): no audio files, nothing sent anywhere.
   It only adds buttons when the device has a Japanese voice, so nothing shows where it can't speak.

   - Table cells marked lang="ja" get a small speaker button. When the next cell is a pure-kana
     reading (word | reading | …), the word's button speaks the reading, so kanji are never misread.
   - Kana chart cells (a lang="ja" span + romaji) become tap-to-hear.
   GA4: one `pronounce` event per click (no text sent). */
(function () {
  'use strict';
  var synth = window.speechSynthesis;
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return;
  var root = document.querySelector('.prose');
  if (!root || !root.querySelector('[lang="ja"]')) return;

  var KANA = /^[\u3040-\u30ff\u30fc\u30fb\s\u301c~\u3001]+$/;
  var PARTICLE = { '\u306f': { wa: '\u308f' }, '\u3078': { e: '\u3048' }, '\u3092': { o: '\u304a' } }; // は→わ, へ→え, を→お
  var L = {
    en: ['Listen', 'Tap a kana to hear it.'],
    es: ['Escuchar', 'Toca un kana para oírlo.'],
    pt: ['Ouvir', 'Toque num kana para ouvi-lo.']
  }[(document.documentElement.lang || 'en').slice(0, 2)] || ['Listen', 'Tap a kana to hear it.'];
  var voice = null;

  function clean(t) {
    return t.replace(/[（）()「」『』]/g, '').replace(/\s*\/\s*/g, '、').replace(/[〜~…]/g, '').trim();
  }
  function cellText(el) {
    var c = el.cloneNode(true);
    var junk = c.querySelectorAll('rt, rp, .say-btn, small');
    for (var i = 0; i < junk.length; i++) junk[i].remove();
    return clean(c.textContent || '');
  }
  function speak(text, from) {
    if (!text) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (voice) u.voice = voice;
    u.rate = 0.85;
    if (from) {
      from.classList.add('is-speaking');
      u.onend = u.onerror = function () { from.classList.remove('is-speaking'); };
    }
    synth.speak(u);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'pronounce', { kind: from && from.classList.contains('say-kana') ? 'kana' : 'word' });
    }
  }

  var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

  function addButton(cell, text, label) {
    if (!text || cell.querySelector('.say-btn')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'say-btn';
    b.setAttribute('aria-label', L[0] + ': ' + (label || text));
    b.title = L[0];
    b.innerHTML = ICON;
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); speak(text, b); });
    cell.appendChild(b);
  }

  function decorate() {
    var cells = root.querySelectorAll('table td[lang="ja"]');
    for (var i = 0; i < cells.length; i++) {
      var td = cells[i];
      if (td.dataset.sayDone) continue;
      var next = td.nextElementSibling;
      var text = cellText(td);
      if (next && next.tagName === 'TD' && next.getAttribute('lang') === 'ja') {
        var reading = cellText(next);
        if (reading && KANA.test(reading) && !KANA.test(text)) {
          addButton(td, reading);
          td.dataset.sayDone = next.dataset.sayDone = '1';
          continue;
        }
      }
      // Particles: は, へ and を alone would be read ha / he / wo; as particles they are wa / e / o.
      var rom = next && next.tagName === 'TD' ? (next.textContent || '').trim().toLowerCase() : '';
      addButton(td, PARTICLE[text] && PARTICLE[text][rom] ? PARTICLE[text][rom] : text, text);
      td.dataset.sayDone = '1';
    }
    // Kana charts: <td><span lang="ja">か</span><small>ka</small></td>
    var kana = root.querySelectorAll('table td > span[lang="ja"]:first-child');
    var firstTable = null;
    for (var k = 0; k < kana.length; k++) {
      var span = kana[k], cell = span.parentElement;
      if (cell.dataset.sayDone || !cell.querySelector('small')) continue;
      var t = cellText(span);
      if (!t || !KANA.test(t)) continue;
      cell.dataset.sayDone = '1';
      cell.classList.add('say-kana');
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', L[0] + ': ' + t);
      (function (c, s) {
        c.addEventListener('click', function () { speak(s, c); });
        c.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speak(s, c); }
        });
      })(cell, t);
      if (!firstTable) firstTable = cell.closest('table');
    }
    if (firstTable && !root.querySelector('.say-hint')) {
      var p = document.createElement('p');
      p.className = 'say-hint';
      p.textContent = '🔊 ' + L[1];
      firstTable.parentNode.insertBefore(p, firstTable);
    }
  }

  function pick() {
    var vs = synth.getVoices() || [];
    var ja = vs.filter(function (v) { return /^ja(-|_|$)/i.test(v.lang); });
    if (!ja.length) return false;
    voice = ja.filter(function (v) { return v.localService; })[0] || ja[0];
    decorate();
    return true;
  }

  if (!pick()) {
    var done = false;
    var onv = function () { if (!done && pick()) { done = true; synth.removeEventListener && synth.removeEventListener('voiceschanged', onv); } };
    if (synth.addEventListener) synth.addEventListener('voiceschanged', onv);
    else synth.onvoiceschanged = onv;
    setTimeout(onv, 1500);
  }
})();
