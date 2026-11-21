// Unit test for assets/js/nombre-katakana.js: node scripts/ui-tests/test-nombre-katakana.js
// Expected forms are the usual Japanese spellings of these Spanish names.
const { toKatakana } = require('../../assets/js/nombre-katakana.js');
const CASES = [
  ['María', 'マリア', 'ma-ri-a'], ['José', 'ホセ', 'ho-se'], ['Juan', 'フアン', 'fu-a-n'], ['Carlos', 'カルロス', 'ka-ru-ro-su'],
  ['Lucía', 'ルシア', 'ru-shi-a'], ['Sofía', 'ソフィア', 'so-fi-a'], ['Diego', 'ディエゴ'], ['Javier', 'ハビエル'],
  ['Ana', 'アナ'], ['Pablo', 'パブロ'], ['Alejandro', 'アレハンドロ'], ['Carmen', 'カルメン'], ['Valentina', 'バレンティナ'],
  ['Mateo', 'マテオ'], ['Miguel', 'ミゲル'], ['Guillermo', 'ギジェルモ'], ['Jesús', 'ヘスス'], ['Luis', 'ルイス'],
  ['Santiago', 'サンティアゴ'], ['Sebastián', 'セバスティアン'], ['Martín', 'マルティン'], ['Ángel', 'アンヘル'],
  ['Rodrigo', 'ロドリゴ'], ['Pedro', 'ペドロ'], ['Andrea', 'アンドレア'], ['Paula', 'パウラ'], ['Hugo', 'ウゴ'],
  ['Héctor', 'エクトル'], ['Óscar', 'オスカル'], ['Raúl', 'ラウル'], ['Iván', 'イバン'], ['Ignacio', 'イグナシオ'],
  ['Nicolás', 'ニコラス'], ['Benjamín', 'ベンハミン'], ['Emma', 'エマ'], ['Ximena', 'ヒメナ'], ['Guadalupe', 'グアダルペ'],
  ['Eduardo', 'エドゥアルド'], ['Gabriel', 'ガブリエル'], ['Beatriz', 'ベアトリス'], ['Enrique', 'エンリケ'],
  ['Joaquín', 'ホアキン'], ['Jorge', 'ホルヘ'], ['Gonzalo', 'ゴンサロ'], ['Yolanda', 'ヨランダ'], ['Begoña', 'ベゴニャ'],
  ['Iñaki', 'イニャキ'], ['Shakira', 'シャキラ'], ['Alexis', 'アレクシス'], ['Concepción', 'コンセプシオン'],
  ['Cristina', 'クリスティナ'], ['Francisco', 'フランシスコ'], ['Patricia', 'パトリシア'], ['Gloria', 'グロリア'],
  ['Eloy', 'エロイ'], ['Rafael', 'ラファエル'], ['Fernanda', 'フェルナンダ'], ['Chema', 'チェマ'], ['Manuel', 'マヌエル'],
  ['Ambrosio', 'アンブロシオ'], ['Agüero', 'アグエロ'], ['Juan Pablo', 'フアン・パブロ'], ['María José', 'マリア・ホセ'],
  ['  ', ''], ['123', ''],
];
let fail = 0;
for (const [name, kana, romaji] of CASES) {
  const r = toKatakana(name);
  const ok = r.kana === kana && (!romaji || r.romaji === romaji);
  if (!ok) { fail++; console.log('FAIL', name, '→', r.kana, r.romaji, 'expected', kana, romaji || ''); }
}
console.log(CASES.length - fail + '/' + CASES.length + ' passed');
process.exit(fail ? 1 : 0);
