/* Spanish names → katakana, by sound. Used by /es/tu-nombre-en-japones/; tested by
   scripts/ui-tests/test-nombre-katakana.js (node). Spanish spelling is phonetic, so a few
   rules cover almost every name: c/z → s (seseo), j/ge/gi → h, ll → ジャ row, v → b,
   l and r → ラ row, a consonant with no vowel after it gets ウ (オ after t/d), n → ン. */
(function (root) {
  'use strict';
  var V = 'aeiou';
  var VI = { a: 0, i: 1, u: 2, e: 3, o: 4 };            // row order あいうえお
  // [kana, romaji] for consonant row + vowel index (a i u e o)
  var ROWS = {
    '': [['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o']],
    k: [['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko']],
    g: [['ガ', 'ga'], ['ギ', 'gi'], ['グ', 'gu'], ['ゲ', 'ge'], ['ゴ', 'go']],
    s: [['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so']],
    sh: [['シャ', 'sha'], ['シ', 'shi'], ['シュ', 'shu'], ['シェ', 'she'], ['ショ', 'sho']],
    t: [['タ', 'ta'], ['ティ', 'ti'], ['トゥ', 'tu'], ['テ', 'te'], ['ト', 'to']],
    d: [['ダ', 'da'], ['ディ', 'di'], ['ドゥ', 'du'], ['デ', 'de'], ['ド', 'do']],
    n: [['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no']],
    h: [['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho']],
    b: [['バ', 'ba'], ['ビ', 'bi'], ['ブ', 'bu'], ['ベ', 'be'], ['ボ', 'bo']],
    p: [['パ', 'pa'], ['ピ', 'pi'], ['プ', 'pu'], ['ペ', 'pe'], ['ポ', 'po']],
    f: [['ファ', 'fa'], ['フィ', 'fi'], ['フ', 'fu'], ['フェ', 'fe'], ['フォ', 'fo']],
    m: [['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo']],
    y: [['ヤ', 'ya'], ['イ', 'i'], ['ユ', 'yu'], ['イェ', 'ye'], ['ヨ', 'yo']],
    r: [['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro']],
    w: [['ワ', 'wa'], ['ウィ', 'wi'], ['ウ', 'u'], ['ウェ', 'we'], ['ウォ', 'wo']],
    ch: [['チャ', 'cha'], ['チ', 'chi'], ['チュ', 'chu'], ['チェ', 'che'], ['チョ', 'cho']],
    ny: [['ニャ', 'nya'], ['ニ', 'ni'], ['ニュ', 'nyu'], ['ニェ', 'nye'], ['ニョ', 'nyo']],
    j: [['ジャ', 'ja'], ['ジ', 'ji'], ['ジュ', 'ju'], ['ジェ', 'je'], ['ジョ', 'jo']]
  };
  // a consonant with no vowel after it
  var CODA = {
    n: ['ン', 'n'], s: ['ス', 'su'], r: ['ル', 'ru'], t: ['ト', 'to'], d: ['ド', 'do'], k: ['ク', 'ku'], g: ['グ', 'gu'],
    b: ['ブ', 'bu'], p: ['プ', 'pu'], f: ['フ', 'fu'], h: ['フ', 'fu'], m: ['ム', 'mu'], y: ['イ', 'i'], w: ['ウ', 'u'],
    ch: ['チ', 'chi'], sh: ['シュ', 'shu'], ny: ['ニ', 'ni'], j: ['ジュ', 'ju']
  };

  function normalize(s) {
    return String(s || '').toLowerCase()
      .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôö]/g, 'o').replace(/[úùû]/g, 'u')
      .replace(/ç/g, 's');
  }

  // letters → list of tokens {c: consonant row} or {v: vowel}
  function tokens(w) {
    var out = [], i = 0, n = w.length;
    function isV(ch) { return ch && V.indexOf(ch) >= 0; }
    while (i < n) {
      var ch = w[i], nx = w[i + 1] || '', nx2 = w[i + 2] || '';
      if (isV(ch)) { out.push({ v: ch }); i++; continue; }
      if (ch === 'ü') { out.push({ v: 'u' }); i++; continue; }
      if (ch === 'h') { i++; continue; }                       // silent h
      if (ch === 'c' && nx === 'h') { out.push({ c: 'ch' }); i += 2; continue; }
      if (ch === 's' && nx === 'h') { out.push({ c: 'sh' }); i += 2; continue; }
      if (ch === 'l' && nx === 'l') { out.push({ c: 'j' }); i += 2; continue; }
      if (ch === 'q') { out.push({ c: 'k' }); i += (nx === 'u' && (nx2 === 'e' || nx2 === 'i')) ? 2 : 1; continue; }
      if (ch === 'g' && nx === 'u' && (nx2 === 'e' || nx2 === 'i')) { out.push({ c: 'g' }); i += 2; continue; }
      if (ch === 'g') { out.push({ c: (nx === 'e' || nx === 'i') ? 'h' : 'g' }); i++; continue; }
      if (ch === 'c') { out.push({ c: (nx === 'e' || nx === 'i') ? 's' : 'k' }); i++; continue; }
      if (ch === 'x') {
        if (i === 0) out.push({ c: 'h' }); else { out.push({ c: 'k' }); out.push({ c: 's' }); }
        i++; continue;
      }
      if (ch === 'y') { out.push(isV(nx) ? { c: 'y' } : { v: 'i' }); i++; continue; }
      if (ch === 'ñ') { out.push({ c: 'ny' }); i++; continue; }
      var map = { j: 'h', z: 's', v: 'b', l: 'r', k: 'k', b: 'b', d: 'd', f: 'f', m: 'm', n: 'n', p: 'p', r: 'r', s: 's', t: 't', w: 'w' };
      if (map[ch]) {
        var c = map[ch];
        var prev = out[out.length - 1];
        if (!(prev && prev.c === c && ch === w[i - 1])) out.push({ c: c });   // emma → ema, rr → r
        i++; continue;
      }
      i++;                                                    // anything else is dropped
    }
    return out;
  }

  function word(w) {
    var t = tokens(w), parts = [];
    for (var i = 0; i < t.length; i++) {
      var a = t[i], b = t[i + 1];
      if (a.v) { parts.push(ROWS[''][VI[a.v]]); continue; }
      if (b && b.v) { parts.push(ROWS[a.c][VI[b.v]]); i++; continue; }
      if (a.c === 'n' || (a.c === 'm' && b && (b.c === 'b' || b.c === 'p'))) { parts.push(['ン', 'n']); continue; }
      parts.push(CODA[a.c] || ['', '']);
    }
    return parts.filter(function (p) { return p[0]; });
  }

  function toKatakana(name) {
    var words = normalize(name).split(/[^a-zñü]+/).filter(Boolean).slice(0, 4);
    var ws = words.map(function (w) { return { src: w, parts: word(w.slice(0, 24)) }; }).filter(function (w) { return w.parts.length; });
    return {
      kana: ws.map(function (w) { return w.parts.map(function (p) { return p[0]; }).join(''); }).join('・'),
      romaji: ws.map(function (w) { return w.parts.map(function (p) { return p[1]; }).join('-'); }).join(' '),
      words: ws
    };
  }

  var api = { toKatakana: toKatakana };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NombreKatakana = api;
})(this);
