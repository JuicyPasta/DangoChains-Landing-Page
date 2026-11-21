"""Writes _pages/{hiragana-chart,katakana-chart,japanese-alphabet}.md. Run: python3 scripts/build_kana_pages.py . (repo root). Edit here, not in the .md files."""
import os, sys
ROOT = sys.argv[1]
STYLE = ('<style>.st-table{border-collapse:collapse;margin:.3em 0 1em;width:100%}.st-table th,.st-table td{border-bottom:1px solid #e6e6e6;padding:.35em .5em;text-align:left;vertical-align:top}'
         '.st-table td[lang=ja]{font-size:1.1em;white-space:nowrap}.st-cta{background:#f6f2ea;border-radius:12px;padding:1em 1.2em;margin:2em 0}'
         '.kana-grid{border-collapse:collapse;margin:.4em 0 1.2em;width:100%;max-width:34rem;table-layout:fixed}'
         '.kana-grid td,.kana-grid th{border:1px solid #e6e6e6;text-align:center;padding:.3em .1em}.kana-grid th{font-size:.8em;opacity:.7}'
         '.kana-grid td span{display:block;font-size:1.7em;line-height:1.2}.kana-grid td small{display:block;font-size:.85em;opacity:.75}</style>')
CTA = ('<div class="st-cta"><p><b>Practise reading with a daily puzzle.</b> DangoChains gives you 16 Japanese words a day to sort into 4 hidden groups. '
       'The Easy board uses everyday words with furigana (kana over every kanji), so it\'s good kana reading practice. Free in your browser; after each game you '
       'see every word\'s reading and English meaning. <a href="/play/?t=easy">Play today\'s Easy puzzle</a></p></div>')
GOJUON = [('', ['a', 'i', 'u', 'e', 'o'], 'あいうえお'), ('k', ['ka', 'ki', 'ku', 'ke', 'ko'], 'かきくけこ'), ('s', ['sa', 'shi', 'su', 'se', 'so'], 'さしすせそ'),
          ('t', ['ta', 'chi', 'tsu', 'te', 'to'], 'たちつてと'), ('n', ['na', 'ni', 'nu', 'ne', 'no'], 'なにぬねの'), ('h', ['ha', 'hi', 'fu', 'he', 'ho'], 'はひふへほ'),
          ('m', ['ma', 'mi', 'mu', 'me', 'mo'], 'まみむめも'), ('y', ['ya', '', 'yu', '', 'yo'], 'や　ゆ　よ'), ('r', ['ra', 'ri', 'ru', 're', 'ro'], 'らりるれろ'),
          ('w', ['wa', '', '', '', 'o (wo)'], 'わ　　　を'), ('n', ['n', '', '', '', ''], 'ん　　　　')]
DAKUTEN = [('g', ['ga', 'gi', 'gu', 'ge', 'go'], 'がぎぐげご'), ('z', ['za', 'ji', 'zu', 'ze', 'zo'], 'ざじずぜぞ'), ('d', ['da', 'ji', 'zu', 'de', 'do'], 'だぢづでど'),
           ('b', ['ba', 'bi', 'bu', 'be', 'bo'], 'ばびぶべぼ'), ('p', ['pa', 'pi', 'pu', 'pe', 'po'], 'ぱぴぷぺぽ')]
YOON = [('ky', 'き'), ('sh', 'し'), ('ch', 'ち'), ('ny', 'に'), ('hy', 'ひ'), ('my', 'み'), ('ry', 'り'), ('gy', 'ぎ'), ('j', 'じ'), ('by', 'び'), ('py', 'ぴ')]

def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)

def grid(rows, conv, heads=('a', 'i', 'u', 'e', 'o')):
    out = ['<table class="kana-grid"><thead><tr><th></th>' + ''.join(f'<th>{h}</th>' for h in heads) + '</tr></thead><tbody>']
    for cons, roms, chars in rows:
        cells = []
        for ch, ro in zip(chars, roms):
            cells.append('<td></td>' if ch == '　' else f'<td><span lang="ja">{conv(ch)}</span><small>{ro}</small></td>')
        out.append(f'<tr><th>{cons or "–"}</th>' + ''.join(cells) + '</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)

def yoon_grid(conv):
    out = ['<table class="kana-grid"><thead><tr><th></th><th>ya</th><th>yu</th><th>yo</th></tr></thead><tbody>']
    for cons, base in YOON:
        cells = ''
        for small, v in (('ゃ', 'a'), ('ゅ', 'u'), ('ょ', 'o')):
            ro = cons + v if cons in ('sh', 'ch', 'j') else cons + 'y'[0:0] + v
            if cons not in ('sh', 'ch', 'j'):
                ro = cons + v  # ky + a = kya
            cells += f'<td><span lang="ja">{conv(base + small)}</span><small>{ro}</small></td>'
        out.append(f'<tr><th>{conv(base)}</th>{cells}</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)

def simple(head, rows, ja_cols=(0,)):
    out = ['<table class="st-table"><thead><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr></thead><tbody>']
    for r in rows:
        out.append('<tr>' + ''.join(f'<td lang="ja">{c}</td>' if i in ja_cols else f'<td>{c}</td>' for i, c in enumerate(r)) + '</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)

def write(name, permalink, title, seo, desc, body, extra_fm=''):
    fm = f'---\nlayout: page\npermalink: {permalink}\ntitle: "{title}"\nseo_title: "{seo}"\ndescription: "{desc}"\n{extra_fm}---\n\n'
    open(os.path.join(ROOT, '_pages', name), 'w', encoding='utf-8').write(fm + STYLE + '\n' + body + '\n')

ident = lambda s: s
NAV = ('<p><b>Japanese scripts:</b> <a href="/japanese-alphabet/">the Japanese alphabet explained</a> · <a href="/hiragana-chart/">hiragana chart</a> · '
       '<a href="/katakana-chart/">katakana chart</a> · <a href="/hiragana-quiz/">hiragana quiz</a> · <a href="/katakana-quiz/">katakana quiz</a> · <a href="/japanese-words/">64 basic words</a> · <a href="/phrases/">basic phrases</a> · '
       '<a href="/study/jlpt/n5/">JLPT N5 words</a></p>')

write('hiragana-chart.md', '/hiragana-chart/', 'Hiragana chart',
 'Hiragana chart with romaji and audio: all 46 characters, dakuten and combinations',
 'Hiragana chart with romaji: the 46 basic hiragana, the voiced ones with dakuten (が, ざ, だ, ば, ぱ), the combinations like きゃ and しょ, the small っ, long vowels, and the characters that trip learners up. Tap any character to hear it.',
 '\n'.join(['<h1>Hiragana chart</h1>',
  '<p>Hiragana is the first Japanese script to learn: 46 basic characters, each one a syllable. It writes grammar (endings and particles like <span lang="ja">は</span>, <span lang="ja">を</span>, <span lang="ja">です</span>), '
  'native words without common kanji, and the furigana printed over kanji. Read the chart by rows: the consonant on the left plus the vowel at the top. '
  'Japanese order runs あいうえお, not a e i o u.</p>',
  '<p><b>Hear them:</b> tap any character in the charts below (it uses your device\'s Japanese voice). <b>Test yourself:</b> <a href="/hiragana-quiz/">hiragana quiz</a> (free, 20 questions a round, with sound).</p>', '<h2>The 46 basic hiragana</h2>', grid(GOJUON, ident),
  '<p><b>Watch these:</b> <span lang="ja">し</span> is <i>shi</i>, <span lang="ja">ち</span> <i>chi</i>, <span lang="ja">つ</span> <i>tsu</i> and <span lang="ja">ふ</span> <i>fu</i> (between f and h). '
  '<span lang="ja">を</span> sounds like <i>o</i> and is only used as a particle. As particles, <span lang="ja">は</span> is read <i>wa</i> and <span lang="ja">へ</span> <i>e</i>. '
  '<span lang="ja">ん</span> is the only consonant that stands alone.</p>',
  '<h2>Dakuten and handakuten: voiced sounds</h2>',
  '<p>Two small marks (<span lang="ja">゛</span>, <i>dakuten</i>) make a sound voiced: k → g, s → z, t → d, h → b. A small circle (<span lang="ja">゜</span>, <i>handakuten</i>) turns h into p. '
  '<span lang="ja">ぢ</span> and <span lang="ja">づ</span> sound like <span lang="ja">じ</span> and <span lang="ja">ず</span> and are rare.</p>', grid(DAKUTEN, ident),
  '<h2>Combinations (yōon)</h2>',
  '<p>A small <span lang="ja">ゃ</span>, <span lang="ja">ゅ</span> or <span lang="ja">ょ</span> after an i-column character makes one syllable: <span lang="ja">き</span> + <span lang="ja">ゃ</span> = <span lang="ja">きゃ</span> <i>kya</i>. '
  'Compare <span lang="ja">びょういん</span> (<i>byōin</i>, hospital) with <span lang="ja">びよういん</span> (<i>biyōin</i>, hair salon).</p>', yoon_grid(ident),
  '<h2>Small っ and long vowels</h2>',
  simple(['Example', 'Romaji', 'Meaning', 'What happens'], [
   ('きって', 'kitte', 'stamp', 'a small <span lang="ja">っ</span> doubles the next consonant (a short pause)'),
   ('きて', 'kite', 'come (and…)', 'without it, no pause'),
   ('おかあさん', 'okāsan', 'mother', 'a vowel written twice is held twice as long'),
   ('おばさん / おばあさん', 'obasan / obāsan', 'aunt / grandmother', 'the length changes the word'),
   ('がっこう', 'gakkō', 'school', 'お + う is a long ō'),
   ('とけい', 'tokei', 'clock', 'え + い is usually read as a long ē'),
  ]),
  '<h2>Characters that look alike</h2>',
  simple(['Pair', 'Romaji', 'Tell them apart'], [
   ('さ / ち', 'sa / chi', 'mirror images'), ('ぬ / め', 'nu / me', 'ぬ has a loop at the end'), ('ね / れ / わ', 'ne / re / wa', 'look at the tail: loop, kick out, curve'),
   ('る / ろ', 'ru / ro', 'る has a loop'), ('は / ほ', 'ha / ho', 'ほ has an extra stroke on top'), ('き / さ', 'ki / sa', 'き has two crossbars'),
   ('い / り', 'i / ri', 'り is longer on the right'), ('う / ら', 'u / ra', 'different first stroke'),
  ]),
  '<h2>First words to read</h2>',
  simple(['Hiragana', 'Romaji', 'Meaning'], [
   ('ねこ', 'neko', 'cat'), ('いぬ', 'inu', 'dog'), ('さくら', 'sakura', 'cherry blossom'), ('すし', 'sushi', 'sushi'),
   ('ありがとう', 'arigatō', 'thank you'), ('おはよう', 'ohayō', 'good morning'), ('ともだち', 'tomodachi', 'friend'), ('みず', 'mizu', 'water'),
  ]),
  '<p>Once these are easy, move on to <a href="/katakana-chart/">katakana</a> (the same sounds, used for foreign words) and then kanji, a few at a time.</p>',
  '<p lang="es">En español: <a href="/es/hiragana/">Hiragana: tabla completa con romaji</a></p>',
  NAV, CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/hiragana/\n  - lang: pt\n    url: /pt/hiragana/\n')

EXT = [('ファ', 'fa', 'ファン (fan)'), ('フィ', 'fi', 'フィルム (film)'), ('フェ', 'fe', 'カフェ (café)'), ('フォ', 'fo', 'フォーク (fork)'),
       ('ティ', 'ti', 'パーティー (party)'), ('ディ', 'di', 'ディナー (dinner)'), ('トゥ', 'tu', 'タトゥー (tattoo)'),
       ('ウィ', 'wi', 'ウィンドウ (window, on a computer)'), ('ウェ', 'we', 'ウェブ (web)'), ('ウォ', 'wo', 'ウォーター (water, in brand names)'),
       ('シェ', 'she', 'シェア (share)'), ('ジェ', 'je', 'ジェット (jet)'), ('チェ', 'che', 'チェック (check)'), ('ヴ', 'vu', 'ヴァイオリン (violin; also バイオリン)')]
write('katakana-chart.md', '/katakana-chart/', 'Katakana chart',
 'Katakana chart with romaji and audio: all 46 characters, extra sounds for foreign words and ー',
 'Katakana chart with romaji: the 46 basic katakana, dakuten (ガ, ザ, ダ, バ, パ), combinations like キャ and ショ, the long-vowel mark ー, the extra sounds for foreign words (ファ, ティ, ウィ) and the lookalikes シ/ツ and ソ/ン. Tap any character to hear it.',
 '\n'.join(['<h1>Katakana chart</h1>',
  '<p>Katakana spells the same sounds as <a href="/hiragana-chart/">hiragana</a>, with sharper shapes. It writes words borrowed from other languages '
  '(<span lang="ja">コーヒー</span> <i>kōhī</i>, coffee; <span lang="ja">テレビ</span> <i>terebi</i>, TV), foreign names, many animal and plant names in science, sound effects, and words written for emphasis, '
  'the way English uses italics. Read the chart by rows: consonant on the left plus vowel at the top.</p>',
  '<p><b>Hear them:</b> tap any character in the charts below (it uses your device\'s Japanese voice). <b>Test yourself:</b> <a href="/katakana-quiz/">katakana quiz</a> (free, 20 questions a round, with sound).</p>', '<h2>The 46 basic katakana</h2>', grid(GOJUON, kata),
  '<h2>Dakuten and handakuten</h2>', grid(DAKUTEN, kata),
  '<h2>Combinations (yōon)</h2>', yoon_grid(kata),
  '<h2>The long-vowel mark ー</h2>',
  '<p>Katakana marks a long vowel with a dash, <span lang="ja">ー</span>, instead of a second vowel: <span lang="ja">コーヒー</span> <i>kōhī</i> (coffee), '
  '<span lang="ja">ケーキ</span> <i>kēki</i> (cake), <span lang="ja">スーパー</span> <i>sūpā</i> (supermarket). In vertical text the dash runs top to bottom. '
  'A small <span lang="ja">ッ</span> doubles the next consonant, as in hiragana: <span lang="ja">ベッド</span> <i>beddo</i> (bed).</p>',
  '<h2>Extra sounds for foreign words</h2>',
  '<p>Japanese has no native <i>fa</i>, <i>ti</i> or <i>we</i>, so katakana combines a full-size character with a small vowel to spell them.</p>',
  simple(['Katakana', 'Romaji', 'Example'], EXT),
  '<h2>Characters that look alike</h2>',
  simple(['Pair', 'Romaji', 'Tell them apart'], [
   ('シ / ツ', 'shi / tsu', 'シ\'s dots sit on the left and its stroke sweeps up from the bottom; ツ\'s dots sit on top and its stroke falls from the top'),
   ('ソ / ン', 'so / n', 'same rule: ソ\'s long stroke falls from the top, ン\'s rises from the bottom'),
   ('ク / ケ / タ', 'ku / ke / ta', 'ケ has a separate crossbar; タ has an inner stroke'), ('ウ / ワ / フ', 'u / wa / fu', 'count the strokes: 3, 2, 1'),
   ('ノ / メ', 'no / me', 'メ adds a crossing stroke'), ('ロ / コ', 'ro / ko', 'ロ is closed'), ('チ / テ', 'chi / te', 'チ has a stroke through the middle'),
   ('カ / 力', 'ka / chikara (kanji for power)', 'the same shape; context tells you which'),
  ]),
  '<h2>First katakana words</h2>',
  simple(['Katakana', 'Romaji', 'Meaning'], [
   ('パン', 'pan', 'bread (from Portuguese)'), ('カメラ', 'kamera', 'camera'), ('テレビ', 'terebi', 'TV'), ('アイス', 'aisu', 'ice cream'),
   ('ホテル', 'hoteru', 'hotel'), ('バス', 'basu', 'bus'), ('トイレ', 'toire', 'toilet'), ('コンビニ', 'konbini', 'convenience store'),
  ]),
  '<p>Many katakana words are shortened or changed from English: see <a href="/study/topics/wasei-eigo/">wasei-eigo</a> and <a href="/study/topics/loanwords/">loanwords</a>.</p>',
  '<p lang="es">En español: <a href="/es/katakana/">Katakana: tabla completa y tu nombre en katakana</a></p>',
  NAV, CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/katakana/\n  - lang: pt\n    url: /pt/katakana/\n')

write('japanese-alphabet.md', '/japanese-alphabet/', 'The Japanese alphabet',
 'The Japanese alphabet: hiragana, katakana and kanji explained for beginners',
 'Japanese has no single alphabet: it mixes hiragana, katakana and kanji, and uses romaji for Latin letters. What each script is for, how they combine in one sentence, and the order to learn them, with charts.',
 '\n'.join(['<h1>The Japanese alphabet, explained</h1>',
  '<p>Japanese doesn\'t have one alphabet. Everyday writing mixes three scripts, often in the same sentence, and a fourth (Latin letters) shows up on signs and keyboards.</p>',
  simple(['Script', 'How many', 'Used for', 'Example'], [
   ('ひらがな hiragana', '46 basic', 'grammar endings and particles, native words, furigana over kanji', '<span lang="ja">ねこ</span> (cat), <span lang="ja">ありがとう</span>'),
   ('カタカナ katakana', '46 basic', 'foreign words and names, sound effects, emphasis', '<span lang="ja">コーヒー</span> (coffee), <span lang="ja">アメリカ</span>'),
   ('漢字 kanji', '2,136 in the official everyday list', 'the meaning-carrying parts: nouns and the stems of verbs and adjectives', '<span lang="ja">山</span> (mountain), <span lang="ja">食べる</span> (to eat)'),
   ('ローマ字 rōmaji', '26 letters', 'Japanese written in Latin letters: typing, station signs, textbooks', '<i>arigatō</i>'),
  ]),
  '<h2>All three in one sentence</h2>',
  '<p lang="ja" style="font-size:1.4em">私はコーヒーを飲みます。</p>',
  '<p><i>Watashi wa kōhī o nomimasu</i>: "I drink coffee." <span lang="ja">私</span> (I) and <span lang="ja">飲</span> (drink) are kanji; <span lang="ja">コーヒー</span> is katakana because it is a borrowed word; '
  '<span lang="ja">は</span>, <span lang="ja">を</span> and the verb ending <span lang="ja">みます</span> are hiragana. Kanji carry the meaning, hiragana carries the grammar, and the mix also shows where words begin, since Japanese doesn\'t use spaces.</p>',
  '<h2>What to learn first</h2>',
  '<ol><li><b><a href="/hiragana-chart/">Hiragana</a></b> first: every sound in the language, and enough to read anything with furigana. Most learners get through it in one to two weeks.</li>'
  '<li><b><a href="/katakana-chart/">Katakana</a></b> next: the same sounds, so it goes faster, and it unlocks menus and signs full of borrowed words.</li>'
  '<li><b>Kanji</b> a few at a time, inside words rather than alone: <a href="/study/jlpt/n5/">JLPT N5 words</a>, <a href="/study/topics/numbers/">numbers</a>, '
  '<a href="/study/topics/days-months/">days of the week</a>. A kanji usually has more than one reading; see <a href="/study/topics/kanji-readings/">onyomi vs kunyomi</a>.</li></ol>',
  '<p>Romaji helps at the very start, but drop it early: Japanese readers never see it, and spellings like <i>ō</i> vs <i>ou</i> hide how words are written.</p>',
  '<p lang="es">En español: <a href="/es/alfabeto-japones/">Alfabeto japonés: hiragana y katakana</a></p>',
  NAV, CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/alfabeto-japones/\n  - lang: pt\n    url: /pt/alfabeto-japones/\n')

# ---- Spanish: alfabeto japonés (letras japonesas / abecedario japonés; ~95,800 searches a month, Keyword Planner 2026-11-20) ----
CTA_ES = ('<div class="st-cta"><p><b>Practica la lectura con un juego diario.</b> Cada día hay tres tableros de 16 palabras japonesas para ordenar en 4 grupos, '
          'gratis en el navegador. El tablero Fácil usa palabras de todos los días con furigana (kana sobre cada kanji), así que sirve para practicar hiragana. '
          'El juego está en inglés y japonés; al final ves la lectura y el significado (en inglés) de cada palabra. <a href="/play/?t=easy">Jugar el Fácil de hoy</a> · '
          '<a href="/es/juegos-para-aprender-japones/">más juegos para aprender japonés</a></p></div>')
write('es-alfabeto-japones.md', '/es/alfabeto-japones/', 'Alfabeto japonés',
 'Alfabeto japonés y letras japonesas: abecedario hiragana y katakana con romaji y audio',
 'El alfabeto japonés explicado en español: las letras japonesas son hiragana, katakana y kanji. Tablas de hiragana y katakana con romaji, sonidos con dakuten, combinaciones, cómo se pronuncia cada sonido para hispanohablantes y audio en cada carácter.',
 '\n'.join(['<h1>Alfabeto japonés y letras japonesas: hiragana y katakana</h1>',
  '<p>El japonés no tiene un solo alfabeto. Lo que se suele llamar «abecedario japonés» o «letras japonesas» son tres sistemas que se mezclan en la misma frase: '
  'el hiragana y el katakana, que son silabarios (cada carácter es una sílaba, como か <i>ka</i>, no una letra), y los kanji, que representan ideas. '
  'El romaji es el japonés escrito con nuestro alfabeto.</p>',
  simple(['Sistema', 'Cuántos', 'Para qué sirve', 'Ejemplo'], [
   ('ひらがな hiragana', '46 básicos', 'la gramática (terminaciones y partículas), palabras japonesas y el furigana sobre los kanji', '<span lang="ja">ねこ</span> (gato), <span lang="ja">ありがとう</span>'),
   ('カタカナ katakana', '46 básicos', 'palabras extranjeras, nombres de otros países, onomatopeyas y énfasis', '<span lang="ja">コーヒー</span> (café), <span lang="ja">スペイン</span> (España)'),
   ('漢字 kanji', '2.136 en la lista oficial de uso común', 'el significado: sustantivos y la raíz de verbos y adjetivos', '<span lang="ja">山</span> (montaña), <span lang="ja">食べる</span> (comer)'),
   ('ローマ字 rōmaji', '26 letras', 'teclados, carteles de estaciones y libros para principiantes', '<i>arigatō</i>'),
  ]),
  '<p><b>Escúchalos:</b> toca cualquier carácter de las tablas para oírlo (usa la voz japonesa de tu dispositivo). Las tablas se leen por filas: la consonante de la izquierda más la vocal de arriba. '
  'El orden japonés es あいうえお (a, i, u, e, o).</p>',
  '<p>Tablas completas de cada uno, con los caracteres que se confunden y primeras palabras: <a href="/es/hiragana/">hiragana</a> · <a href="/es/katakana/">katakana (y tu nombre en katakana)</a>.</p>',
  '<h2>Hiragana: los 46 caracteres básicos</h2>', grid(GOJUON, ident),
  '<p><b>Ojo:</b> <span lang="ja">し</span> es <i>shi</i>, <span lang="ja">ち</span> <i>chi</i>, <span lang="ja">つ</span> <i>tsu</i> y <span lang="ja">ふ</span> <i>fu</i>. '
  '<span lang="ja">を</span> suena <i>o</i> y solo se usa como partícula. Como partículas, <span lang="ja">は</span> se lee <i>wa</i> y <span lang="ja">へ</span> <i>e</i>.</p>',
  '<h2>Katakana: los 46 caracteres básicos</h2>',
  '<p>Los mismos sonidos que el hiragana, con trazos más rectos. Se usa sobre todo para palabras que vienen de otros idiomas: <span lang="ja">パン</span> <i>pan</i> viene del portugués y '
  '<span lang="ja">テレビ</span> <i>terebi</i> del inglés. En katakana una vocal larga se marca con un guion: <span lang="ja">コーヒー</span> <i>kōhī</i>.</p>', grid(GOJUON, kata),
  '<h2>Sonidos sonoros: dakuten y handakuten</h2>',
  '<p>Dos rayitas (<span lang="ja">゛</span>, <i>dakuten</i>) cambian k → g, s → z, t → d y h → b; un circulito (<span lang="ja">゜</span>, <i>handakuten</i>) cambia h → p.</p>',
  grid(DAKUTEN, ident), grid(DAKUTEN, kata),
  '<h2>Combinaciones (yōon)</h2>',
  '<p>Un <span lang="ja">ゃ</span>, <span lang="ja">ゅ</span> o <span lang="ja">ょ</span> pequeño después de un carácter de la columna i forma una sola sílaba: '
  '<span lang="ja">き</span> + <span lang="ja">ゃ</span> = <span lang="ja">きゃ</span> <i>kya</i>. No es lo mismo <span lang="ja">びょういん</span> (<i>byōin</i>, hospital) que '
  '<span lang="ja">びよういん</span> (<i>biyōin</i>, peluquería).</p>', yoon_grid(ident),
  '<h2>Cómo se pronuncia (para hispanohablantes)</h2>',
  '<p>Casi todos los sonidos del japonés existen en español; estos son los que cambian.</p>',
  simple(['Romaji', 'Cómo suena', 'Ejemplo'], [
   ('a, i, u, e, o', 'como en español, pero la <i>u</i> sin redondear los labios; al final de です o ます casi no se oye (<i>des</i>, <i>mas</i>)', '<span lang="ja">です</span> desu'),
   ('h (ha, hi, he, ho)', 'una jota suave, aspirada; nunca muda', '<span lang="ja">はな</span> hana (flor)'),
   ('fu', 'entre «fu» y «ju»: se sopla sin apoyar el labio en los dientes', '<span lang="ja">ふじ</span> Fuji'),
   ('j (ja, ji, ju, jo)', 'como la «y» fuerte de «yo» o la j inglesa de «jeans»; nunca como la jota española', '<span lang="ja">じかん</span> jikan (tiempo)'),
   ('g (ga, gi, gu, ge, go)', 'siempre como en «gato»: <i>gi</i> suena «gui» y <i>ge</i> «gue»', '<span lang="ja">げんき</span> genki (con energía)'),
   ('z (za, zu, ze, zo)', 'una s sonora, como la z del inglés «zoo»', '<span lang="ja">みず</span> mizu (agua)'),
   ('r (ra, ri, ru, re, ro)', 'una r suave de un solo toque, como en «pero»; nunca la rr', '<span lang="ja">さくら</span> sakura'),
   ('sh, ch, ts', '<i>sh</i> como en el inglés «she»; <i>ch</i> como en español; <i>ts</i> como en «tsunami»', '<span lang="ja">しお</span> shio, <span lang="ja">ちず</span> chizu, <span lang="ja">つき</span> tsuki'),
   ('n (ん)', 'una n que forma sílaba propia; antes de b, m o p suena casi como m', '<span lang="ja">ほん</span> hon, <span lang="ja">しんぶん</span> shinbun'),
   ('ā, ī, ū, ē, ō', 'vocal larga: dura el doble y cambia el significado', '<span lang="ja">おばさん</span> obasan (tía) / <span lang="ja">おばあさん</span> obāsan (abuela)'),
   ('っ pequeña', 'una pausa breve que duplica la consonante siguiente', '<span lang="ja">きって</span> kitte (sello)'),
  ], ja_cols=()),
  '<h2>Primeras palabras para leer</h2>',
  simple(['Japonés', 'Romaji', 'Significado'], [
   ('ねこ', 'neko', 'gato'), ('いぬ', 'inu', 'perro'), ('さくら', 'sakura', 'flor de cerezo'), ('すし', 'sushi', 'sushi'),
   ('ありがとう', 'arigatō', 'gracias'), ('おはよう', 'ohayō', 'buenos días'), ('ともだち', 'tomodachi', 'amigo'), ('みず', 'mizu', 'agua'),
   ('パン', 'pan', 'pan (del portugués)'), ('テレビ', 'terebi', 'televisión'), ('ホテル', 'hoteru', 'hotel'), ('スペイン', 'Supein', 'España'),
  ]),
  '<h2>En qué orden aprenderlos</h2>',
  '<ol><li><b>Hiragana</b> primero: tiene todos los sonidos del idioma y con él puedes leer cualquier texto con furigana. La mayoría lo aprende en una o dos semanas.</li>'
  '<li><b>Katakana</b> después: son los mismos sonidos, así que va más rápido, y abre menús y carteles llenos de palabras extranjeras.</li>'
  '<li><b>Kanji</b> poco a poco y dentro de palabras: <a href="/es/numeros-en-japones/">números</a>, <a href="/es/dias-de-la-semana-en-japones/">días de la semana</a>, '
  '<a href="/es/familia-en-japones/">familia</a>. Un kanji suele tener más de una lectura.</li></ol>',
  '<p><b>Ponte a prueba</b> (en inglés, gratis, con sonido): <a href="/hiragana-quiz/">quiz de hiragana</a> · <a href="/katakana-quiz/">quiz de katakana</a>. '
  'El romaji ayuda al principio, pero conviene dejarlo pronto: los japoneses no lo usan.</p>',
  CTA_ES,
  '<p>Más en español: <a href="/es/kanji-japones/">kanji japonés</a> · <a href="/es/nombres-japoneses/">nombres japoneses</a> · <a href="/es/palabras-en-japones/">palabras en japonés</a> · <a href="/es/frases-en-japones/">frases en japonés</a> · <a href="/es/saludos-en-japones/">saludos</a> · '
  '<a href="/es/numeros-en-japones/">números</a> · <a href="/es/colores-en-japones/">colores</a> · <a href="/es/comida-en-japones/">comida</a> · <a href="/es/flores-en-japones/">flores</a></p>',
  '<p>En inglés: <a href="/japanese-alphabet/">The Japanese alphabet</a> · <a href="/hiragana-chart/">Hiragana chart</a> · <a href="/katakana-chart/">Katakana chart</a></p>',
 ]), extra_fm='lang: es\nalternates:\n  - lang: en\n    url: /japanese-alphabet/\n  - lang: pt\n    url: /pt/alfabeto-japones/\n')

# ---- Spanish: hiragana and katakana charts ("hiragana" 550,000 and "katakana" 450,000 searches a month worldwide, all languages; Keyword Planner 2026-11-20) ----
NAV_ES = ('<p><b>Escritura japonesa:</b> <a href="/es/alfabeto-japones/">alfabeto japonés (los tres sistemas)</a> · <a href="/es/hiragana/">tabla de hiragana</a> · '
          '<a href="/es/katakana/">tabla de katakana</a> · <a href="/es/kanji-japones/">kanji japonés</a> · <a href="/es/nombres-japoneses/">nombres japoneses</a> · '
          '<a href="/es/palabras-en-japones/">palabras en japonés</a> · <a href="/es/frases-en-japones/">frases en japonés</a></p>')
write('es-hiragana.md', '/es/hiragana/', 'Hiragana',
 'Hiragana: tabla completa con romaji, pronunciación y audio (los 46 caracteres)',
 'Tabla de hiragana en español: los 46 caracteres básicos con romaji, los sonidos con dakuten (が, ざ, だ, ば, ぱ), las combinaciones como きゃ y しょ, la っ pequeña, las vocales largas, los caracteres que se confunden y cómo aprenderlo rápido. Toca cualquier carácter para oírlo.',
 '\n'.join(['<h1>Hiragana: tabla completa con romaji</h1>',
  '<p>El hiragana es el primer sistema de escritura japonés que se aprende: 46 caracteres básicos y cada uno es una sílaba (か es <i>ka</i>), no una letra. '
  'Con él se escribe la gramática (terminaciones y partículas como <span lang="ja">は</span>, <span lang="ja">を</span> o <span lang="ja">です</span>), las palabras japonesas que no usan kanji '
  'y el furigana, la lectura pequeña que se pone sobre los kanji. La tabla se lee por filas: la consonante de la izquierda más la vocal de arriba. El orden japonés es あいうえお (a, i, u, e, o).</p>',
  '<p><b>Escúchalos:</b> toca cualquier carácter para oírlo (usa la voz japonesa de tu dispositivo). <b>Ponte a prueba:</b> <a href="/hiragana-quiz/">quiz de hiragana</a> (en inglés, gratis, 20 preguntas por ronda, con sonido).</p>',
  '<h2>Los 46 hiragana básicos</h2>', grid(GOJUON, ident),
  '<p><b>Ojo con estos:</b> <span lang="ja">し</span> es <i>shi</i>, <span lang="ja">ち</span> <i>chi</i>, <span lang="ja">つ</span> <i>tsu</i> y <span lang="ja">ふ</span> <i>fu</i> (entre «fu» y «ju»). '
  'La <i>h</i> japonesa se pronuncia como una jota suave, nunca muda. <span lang="ja">を</span> suena <i>o</i> y solo se usa como partícula. Como partículas, <span lang="ja">は</span> se lee <i>wa</i> y '
  '<span lang="ja">へ</span> <i>e</i>. <span lang="ja">ん</span> es la única consonante que va sola.</p>',
  '<h2>Dakuten y handakuten: los sonidos sonoros</h2>',
  '<p>Dos rayitas (<span lang="ja">゛</span>, <i>dakuten</i>) cambian k → g, s → z, t → d y h → b. Un circulito (<span lang="ja">゜</span>, <i>handakuten</i>) cambia h → p. '
  '<span lang="ja">ぢ</span> y <span lang="ja">づ</span> suenan igual que <span lang="ja">じ</span> y <span lang="ja">ず</span> y casi no se usan. '
  'La <i>g</i> suena siempre como en «gato» (<i>gi</i> = «gui») y la <i>j</i> como la «y» fuerte de «yo», nunca como la jota española.</p>', grid(DAKUTEN, ident),
  '<h2>Combinaciones (yōon)</h2>',
  '<p>Un <span lang="ja">ゃ</span>, <span lang="ja">ゅ</span> o <span lang="ja">ょ</span> pequeño después de un carácter de la columna i forma una sola sílaba: '
  '<span lang="ja">き</span> + <span lang="ja">ゃ</span> = <span lang="ja">きゃ</span> <i>kya</i>. No es lo mismo <span lang="ja">びょういん</span> (<i>byōin</i>, hospital) que '
  '<span lang="ja">びよういん</span> (<i>biyōin</i>, peluquería).</p>', yoon_grid(ident),
  '<h2>La っ pequeña y las vocales largas</h2>',
  simple(['Ejemplo', 'Romaji', 'Significado', 'Qué pasa'], [
   ('きって', 'kitte', 'sello (de correos)', 'una <span lang="ja">っ</span> pequeña duplica la consonante siguiente: una pausa breve'),
   ('きて', 'kite', 'ven (y…)', 'sin ella no hay pausa'),
   ('おかあさん', 'okāsan', 'madre', 'una vocal escrita dos veces dura el doble'),
   ('おばさん / おばあさん', 'obasan / obāsan', 'tía / abuela', 'la duración cambia la palabra'),
   ('がっこう', 'gakkō', 'escuela', 'お + う se lee como una ō larga'),
   ('とけい', 'tokei', 'reloj', 'え + い suele leerse como una ē larga'),
  ]),
  '<h2>Caracteres que se confunden</h2>',
  simple(['Pareja', 'Romaji', 'Cómo distinguirlos'], [
   ('さ / ち', 'sa / chi', 'son imágenes en espejo'), ('ぬ / め', 'nu / me', 'ぬ termina con un lazo'), ('ね / れ / わ', 'ne / re / wa', 'mira la cola: lazo, patada hacia fuera, curva'),
   ('る / ろ', 'ru / ro', 'る tiene un lazo abajo'), ('は / ほ', 'ha / ho', 'ほ tiene un trazo más arriba'), ('き / さ', 'ki / sa', 'き tiene dos rayas horizontales'),
   ('い / り', 'i / ri', 'el trazo derecho de り es más largo'), ('う / ら', 'u / ra', 'cambia el primer trazo'),
  ]),
  '<h2>Primeras palabras en hiragana</h2>',
  simple(['Hiragana', 'Romaji', 'Significado'], [
   ('ねこ', 'neko', 'gato'), ('いぬ', 'inu', 'perro'), ('さくら', 'sakura', 'flor de cerezo'), ('すし', 'sushi', 'sushi'),
   ('ありがとう', 'arigatō', 'gracias'), ('おはよう', 'ohayō', 'buenos días'), ('ともだち', 'tomodachi', 'amigo'), ('みず', 'mizu', 'agua'),
   ('はな', 'hana', 'flor'), ('やま', 'yama', 'montaña'), ('うみ', 'umi', 'mar'), ('すき', 'suki', 'me gusta'),
  ]),
  '<h2>¿Cuántos hiragana hay?</h2>',
  '<p>46 básicos, 25 con dakuten o handakuten y 33 combinaciones: con ellos se escribe cualquier sonido del japonés. Además están la <span lang="ja">っ</span> pequeña y las vocales largas, '
  'que no son caracteres nuevos sino formas de escribir los que ya conoces.</p>',
  '<h2>Cómo aprender el hiragana rápido</h2>',
  '<ol><li><b>Una fila al día:</b> あいうえお, luego かきくけこ… En dos semanas tienes la tabla entera.</li>'
  '<li><b>Escríbelo a mano</b> unas cuantas veces y dilo en voz alta: la mano y el oído ayudan a la vista.</li>'
  '<li><b>Lee palabras enseguida,</b> no caracteres sueltos: las de arriba, <a href="/es/palabras-en-japones/">palabras en japonés</a> o <a href="/es/saludos-en-japones/">saludos</a>.</li>'
  '<li><b>Ponte a prueba</b> cada día con el <a href="/hiragana-quiz/">quiz de hiragana</a> y repasa los que fallas.</li>'
  '<li><b>Después, el katakana:</b> son los mismos sonidos con otra forma, así que va mucho más rápido. <a href="/es/katakana/">Tabla de katakana</a>.</li></ol>',
  CTA_ES, NAV_ES,
  '<p>En inglés: <a href="/hiragana-chart/">Hiragana chart</a> · <a href="/katakana-chart/">Katakana chart</a> · <a href="/japanese-alphabet/">The Japanese alphabet</a></p>',
 ]), extra_fm='lang: es\nalternates:\n  - lang: en\n    url: /hiragana-chart/\n  - lang: pt\n    url: /pt/hiragana/\n')

EXT_ES = [('ファ', 'fa', 'ファン (fan, aficionado)'), ('フィ', 'fi', 'フィルム (película fotográfica)'), ('フェ', 'fe', 'カフェ (cafetería)'), ('フォ', 'fo', 'フォーク (tenedor)'),
          ('ティ', 'ti', 'パーティー (fiesta)'), ('ディ', 'di', 'ディエゴ (Diego)'), ('トゥ', 'tu', 'タトゥー (tatuaje)'),
          ('ウィ', 'wi', 'ウィンドウ (ventana, en el ordenador)'), ('ウェ', 'we', 'ウェブ (web)'), ('ウォ', 'wo', 'ウォーター (agua, en nombres de marcas)'),
          ('シェ', 'she', 'シェア (compartir)'), ('ジェ', 'je', 'ジェット (jet)'), ('チェ', 'che', 'チェック (comprobar)'), ('ヴ', 'vu', 'ヴァイオリン (violín; también バイオリン)')]
write('es-katakana.md', '/es/katakana/', 'Katakana',
 'Katakana: tabla completa con romaji y audio, sonidos extranjeros y tu nombre en katakana',
 'Tabla de katakana en español: los 46 caracteres básicos con romaji, dakuten (ガ, ザ, ダ, バ, パ), combinaciones como キャ y ショ, la raya de vocal larga ー, los sonidos para palabras extranjeras (ファ, ティ, ウィ), los que se confunden (シ/ツ, ソ/ン) y cómo se escriben nombres como María o José. Toca cualquier carácter para oírlo.',
 '\n'.join(['<h1>Katakana: tabla completa con romaji</h1>',
  '<p>El katakana tiene los mismos sonidos que el <a href="/es/hiragana/">hiragana</a>, con trazos más rectos. Se usa para las palabras que vienen de otros idiomas '
  '(<span lang="ja">パン</span> <i>pan</i>, del portugués; <span lang="ja">テレビ</span> <i>terebi</i>, televisión), para los nombres extranjeros (también el tuyo), '
  'las onomatopeyas y para dar énfasis, como nuestra cursiva. La tabla se lee por filas: la consonante de la izquierda más la vocal de arriba.</p>',
  '<p><b>Escúchalos:</b> toca cualquier carácter para oírlo (usa la voz japonesa de tu dispositivo). <b>Ponte a prueba:</b> <a href="/katakana-quiz/">quiz de katakana</a> (en inglés, gratis, 20 preguntas por ronda, con sonido).</p>',
  '<h2>Los 46 katakana básicos</h2>', grid(GOJUON, kata),
  '<h2>Dakuten y handakuten</h2>',
  '<p>Igual que en hiragana: dos rayitas cambian k → g, s → z, t → d y h → b; un circulito cambia h → p.</p>', grid(DAKUTEN, kata),
  '<h2>Combinaciones (yōon)</h2>', yoon_grid(kata),
  '<h2>La raya ー: vocales largas</h2>',
  '<p>En katakana una vocal larga se marca con una raya, <span lang="ja">ー</span>, en vez de repetir la vocal: <span lang="ja">コーヒー</span> <i>kōhī</i> (café), '
  '<span lang="ja">ケーキ</span> <i>kēki</i> (pastel), <span lang="ja">スーパー</span> <i>sūpā</i> (supermercado). En texto vertical la raya va de arriba abajo. '
  'Una <span lang="ja">ッ</span> pequeña duplica la consonante siguiente, como en hiragana: <span lang="ja">ベッド</span> <i>beddo</i> (cama).</p>',
  '<h2>Sonidos para palabras extranjeras</h2>',
  '<p>El japonés no tiene <i>fa</i>, <i>ti</i> ni <i>we</i> propios, así que el katakana combina un carácter normal con una vocal pequeña para escribirlos.</p>',
  simple(['Katakana', 'Romaji', 'Ejemplo'], EXT_ES),
  '<h2>Tu nombre en katakana</h2>',
  '<p>Los nombres extranjeros se escriben en katakana según cómo suenan, no según cómo se escriben. El japonés no tiene sílabas que terminen en consonante (salvo <i>n</i>), '
  'así que se añade una vocal: Carlos es <i>Ka-ru-ro-su</i>. La <i>l</i> y la <i>r</i> se escriben igual (fila ラ), la <i>j</i> y la <i>g</i> suave española pasan a la fila ハ '
  '(José es <i>Hose</i>) y la <i>v</i> suele escribirse como <i>b</i>.</p>',
  simple(['Nombre', 'Katakana', 'Romaji'], [
   ('María', 'マリア', 'Maria'), ('José', 'ホセ', 'Hose'), ('Juan', 'フアン', 'Fuan'), ('Carlos', 'カルロス', 'Karurosu'),
   ('Lucía', 'ルシア', 'Rushia'), ('Sofía', 'ソフィア', 'Sofia'), ('Diego', 'ディエゴ', 'Diego'), ('Javier', 'ハビエル', 'Habieru'),
   ('Ana', 'アナ', 'Ana'), ('Pablo', 'パブロ', 'Paburo'), ('Alejandro', 'アレハンドロ', 'Arehandoro'), ('Carmen', 'カルメン', 'Karumen'),
   ('Valentina', 'バレンティナ', 'Barentina'), ('Mateo', 'マテオ', 'Mateo'),
  ], ja_cols=(1,)),
  '<p>Los países también: <span lang="ja">スペイン</span> (España), <span lang="ja">メキシコ</span> (México), <span lang="ja">アルゼンチン</span> (Argentina), '
  '<span lang="ja">コロンビア</span> (Colombia), <span lang="ja">ペルー</span> (Perú), <span lang="ja">チリ</span> (Chile). Para nombres japoneses de verdad, con kanji y significado, mira '
  '<a href="/es/nombres-japoneses/">nombres japoneses</a>. <b>Escribe el tuyo:</b> <a href="/es/tu-nombre-en-japones/">tu nombre en japonés</a> (te lo pasa a katakana al momento).</p>',
  '<h2>Caracteres que se confunden</h2>',
  simple(['Pareja', 'Romaji', 'Cómo distinguirlos'], [
   ('シ / ツ', 'shi / tsu', 'los puntos de シ están a la izquierda y su trazo sube desde abajo; los de ツ están arriba y su trazo cae desde arriba'),
   ('ソ / ン', 'so / n', 'la misma regla: el trazo largo de ソ cae desde arriba y el de ン sube desde abajo'),
   ('ク / ケ / タ', 'ku / ke / ta', 'ケ tiene una raya aparte; タ tiene un trazo dentro'), ('ウ / ワ / フ', 'u / wa / fu', 'cuenta los trazos: 3, 2, 1'),
   ('ノ / メ', 'no / me', 'メ añade un trazo que cruza'), ('ロ / コ', 'ro / ko', 'ロ está cerrado'), ('チ / テ', 'chi / te', 'チ tiene un trazo que baja por el centro'),
   ('カ / 力', 'ka / chikara (kanji de «fuerza»)', 'la misma forma; el contexto dice cuál es'),
  ]),
  '<h2>Primeras palabras en katakana</h2>',
  simple(['Katakana', 'Romaji', 'Significado'], [
   ('パン', 'pan', 'pan (del portugués)'), ('カメラ', 'kamera', 'cámara'), ('テレビ', 'terebi', 'televisión'), ('アイス', 'aisu', 'helado'),
   ('ホテル', 'hoteru', 'hotel'), ('バス', 'basu', 'autobús'), ('トイレ', 'toire', 'baño'), ('コンビニ', 'konbini', 'tienda 24 horas'),
   ('タバコ', 'tabako', 'tabaco (del portugués o el español)'), ('ボタン', 'botan', 'botón (del portugués)'),
  ]),
  '<p>Muchas palabras en katakana se acortan o cambian de sentido al llegar al japonés: <span lang="ja">パソコン</span> <i>pasokon</i> es el ordenador personal y <span lang="ja">スマホ</span> <i>sumaho</i> el móvil.</p>',
  CTA_ES, NAV_ES,
  '<p>En inglés: <a href="/katakana-chart/">Katakana chart</a> · <a href="/hiragana-chart/">Hiragana chart</a> · <a href="/japanese-alphabet/">The Japanese alphabet</a></p>',
 ]), extra_fm='lang: es\nalternates:\n  - lang: en\n    url: /katakana-chart/\n  - lang: pt\n    url: /pt/katakana/\n')

# ---- Portuguese: alfabeto japonês (8,100 searches a month, Keyword Planner 2026-11-20) ----
CTA_PT = ('<div class="st-cta"><p><b>Pratique a leitura com um jogo diário.</b> Todo dia há três tabuleiros de 16 palavras japonesas para separar em 4 grupos, '
          'grátis no navegador. O tabuleiro Fácil usa palavras do dia a dia com furigana (kana sobre cada kanji), ótimo para treinar hiragana. '
          'O jogo está em inglês e japonês; no fim você vê a leitura e o significado (em inglês) de cada palavra. <a href="/play/?t=easy">Jogar o Fácil de hoje</a></p></div>')
write('pt-alfabeto-japones.md', '/pt/alfabeto-japones/', 'Alfabeto japonês',
 'Alfabeto japonês: hiragana e katakana com romaji, pronúncia e áudio',
 'O alfabeto japonês explicado em português: hiragana, katakana e kanji. Tabelas de hiragana e katakana com romaji, sons com dakuten, combinações, como pronunciar cada som para brasileiros e áudio em cada caractere.',
 '\n'.join(['<h1>Alfabeto japonês: hiragana e katakana</h1>',
  '<p>O japonês não tem um único alfabeto. O que se chama de «alfabeto japonês» são três sistemas que se misturam na mesma frase: '
  'o hiragana e o katakana, que são silabários (cada caractere é uma sílaba, como か <i>ka</i>, e não uma letra), e os kanji, que representam ideias. '
  'O romaji é o japonês escrito com o nosso alfabeto.</p>',
  simple(['Sistema', 'Quantos', 'Para que serve', 'Exemplo'], [
   ('ひらがな hiragana', '46 básicos', 'a gramática (terminações e partículas), palavras japonesas e o furigana sobre os kanji', '<span lang="ja">ねこ</span> (gato), <span lang="ja">ありがとう</span>'),
   ('カタカナ katakana', '46 básicos', 'palavras estrangeiras, nomes de outros países, onomatopeias e ênfase', '<span lang="ja">コーヒー</span> (café), <span lang="ja">ブラジル</span> (Brasil)'),
   ('漢字 kanji', '2.136 na lista oficial de uso comum', 'o significado: substantivos e a raiz de verbos e adjetivos', '<span lang="ja">山</span> (montanha), <span lang="ja">食べる</span> (comer)'),
   ('ローマ字 rōmaji', '26 letras', 'teclados, placas de estação e livros para iniciantes', '<i>arigatō</i>'),
  ]),
  '<p><b>Ouça:</b> toque em qualquer caractere das tabelas para ouvi-lo (usa a voz japonesa do seu aparelho). As tabelas se leem por linhas: a consoante da esquerda mais a vogal de cima. '
  'A ordem japonesa é あいうえお (a, i, u, e, o).</p>',
  '<h2>Hiragana: os 46 caracteres básicos</h2>', grid(GOJUON, ident),
  '<p><b>Atenção:</b> <span lang="ja">し</span> é <i>shi</i>, <span lang="ja">ち</span> <i>chi</i>, <span lang="ja">つ</span> <i>tsu</i> e <span lang="ja">ふ</span> <i>fu</i>. '
  '<span lang="ja">を</span> soa <i>o</i> e só é usado como partícula. Como partículas, <span lang="ja">は</span> se lê <i>wa</i> e <span lang="ja">へ</span> <i>e</i>.</p>',
  '<h2>Katakana: os 46 caracteres básicos</h2>',
  '<p>Os mesmos sons do hiragana, com traços mais retos. É usado sobretudo para palavras que vêm de outras línguas: <span lang="ja">パン</span> <i>pan</i> (pão) veio do português, '
  'e <span lang="ja">テレビ</span> <i>terebi</i> do inglês. No katakana, a vogal longa é marcada com um traço: <span lang="ja">コーヒー</span> <i>kōhī</i>.</p>', grid(GOJUON, kata),
  '<h2>Sons sonoros: dakuten e handakuten</h2>',
  '<p>Dois tracinhos (<span lang="ja">゛</span>, <i>dakuten</i>) mudam k → g, s → z, t → d e h → b; um pequeno círculo (<span lang="ja">゜</span>, <i>handakuten</i>) muda h → p.</p>',
  grid(DAKUTEN, ident), grid(DAKUTEN, kata),
  '<h2>Combinações (yōon)</h2>',
  '<p>Um <span lang="ja">ゃ</span>, <span lang="ja">ゅ</span> ou <span lang="ja">ょ</span> pequeno depois de um caractere da coluna i forma uma só sílaba: '
  '<span lang="ja">き</span> + <span lang="ja">ゃ</span> = <span lang="ja">きゃ</span> <i>kya</i>. <span lang="ja">びょういん</span> (<i>byōin</i>, hospital) não é '
  '<span lang="ja">びよういん</span> (<i>biyōin</i>, salão de beleza).</p>', yoon_grid(ident),
  '<h2>Como se pronuncia (para brasileiros)</h2>',
  '<p>Quase todos os sons do japonês existem em português; estes são os que mudam.</p>',
  simple(['Romaji', 'Como soa', 'Exemplo'], [
   ('a, i, u, e, o', 'sempre claras: o <i>e</i> e o <i>o</i> do fim da palavra não viram <i>i</i> nem <i>u</i> (<i>kimono</i>, não «kimonu»), e nenhuma vogal fica nasal', '<span lang="ja">きもの</span> kimono'),
   ('h (ha, hi, he, ho)', 'como o r de «rato» no Brasil, um h aspirado', '<span lang="ja">はな</span> hana (flor)'),
   ('fu', 'entre «fu» e «hu»: sopra-se sem encostar o lábio nos dentes', '<span lang="ja">ふじ</span> Fuji'),
   ('j (ja, ji, ju, jo)', 'como o «di» de «dia» no Brasil: <i>ji</i> soa «dji»', '<span lang="ja">じかん</span> jikan (tempo)'),
   ('ch (cha, chi, chu, cho)', 'como o «ti» de «tia» no Brasil: <i>chi</i> soa «tchi»', '<span lang="ja">ちず</span> chizu (mapa)'),
   ('sh', 'como o «ch» de «chave»', '<span lang="ja">しお</span> shio (sal)'),
   ('g (ga, gi, gu, ge, go)', 'sempre como em «gato»: <i>gi</i> soa «gui» e <i>ge</i> «gue»', '<span lang="ja">げんき</span> genki (com energia)'),
   ('r (ra, ri, ru, re, ro)', 'um r fraco, como em «caro»; nunca o r forte de «rato»', '<span lang="ja">さくら</span> sakura'),
   ('ts', 'como em «tsunami»', '<span lang="ja">つき</span> tsuki (lua)'),
   ('n (ん)', 'um n que forma sílaba sozinho; antes de b, m ou p soa quase como m', '<span lang="ja">ほん</span> hon, <span lang="ja">しんぶん</span> shinbun'),
   ('ā, ī, ū, ē, ō', 'vogal longa: dura o dobro e muda o significado', '<span lang="ja">おばさん</span> obasan (tia) / <span lang="ja">おばあさん</span> obāsan (avó)'),
   ('っ pequeno', 'uma pausa curta que dobra a consoante seguinte', '<span lang="ja">きって</span> kitte (selo)'),
  ], ja_cols=()),
  '<h2>Primeiras palavras para ler</h2>',
  simple(['Japonês', 'Romaji', 'Significado'], [
   ('ねこ', 'neko', 'gato'), ('いぬ', 'inu', 'cachorro'), ('さくら', 'sakura', 'flor de cerejeira'), ('すし', 'sushi', 'sushi'),
   ('ありがとう', 'arigatō', 'obrigado'), ('おはよう', 'ohayō', 'bom dia'), ('ともだち', 'tomodachi', 'amigo'), ('みず', 'mizu', 'água'),
   ('パン', 'pan', 'pão (do português)'), ('テレビ', 'terebi', 'televisão'), ('ホテル', 'hoteru', 'hotel'), ('ブラジル', 'Burajiru', 'Brasil'),
  ]),
  '<h2>Em que ordem aprender</h2>',
  '<ol><li><b>Hiragana</b> primeiro: tem todos os sons da língua e com ele você lê qualquer texto com furigana. A maioria aprende em uma ou duas semanas.</li>'
  '<li><b>Katakana</b> depois: são os mesmos sons, então vai mais rápido, e abre cardápios e placas cheias de palavras estrangeiras.</li>'
  '<li><b>Kanji</b> aos poucos e dentro de palavras: <a href="/pt/numeros-em-japones/">números</a>, <a href="/pt/cores-em-japones/">cores</a>. Um kanji costuma ter mais de uma leitura.</li></ol>',
  '<p><b>Teste-se</b> (em inglês, grátis, com som): <a href="/hiragana-quiz/">quiz de hiragana</a> · <a href="/katakana-quiz/">quiz de katakana</a>.</p>',
  CTA_PT,
  '<p>Tabelas completas: <a href="/pt/hiragana/">hiragana</a> · <a href="/pt/katakana/">katakana (e seu nome em katakana)</a></p>',
  '<p>Mais em português: <a href="/pt/nomes-japoneses/">nomes japoneses (e seu nome em katakana)</a> · <a href="/pt/frases-em-japones/">frases em japonês</a> · <a href="/pt/obrigado-em-japones/">obrigado em japonês</a> · <a href="/pt/eu-te-amo-em-japones/">eu te amo em japonês</a> · <a href="/pt/palavras-em-japones/">palavras em japonês</a> · <a href="/pt/numeros-em-japones/">números</a> · <a href="/pt/cores-em-japones/">cores</a></p>',
  '<p>Em espanhol: <a href="/es/alfabeto-japones/">Alfabeto japonés</a> · em inglês: <a href="/japanese-alphabet/">The Japanese alphabet</a></p>',
 ]), extra_fm='lang: pt\nalternates:\n  - lang: en\n    url: /japanese-alphabet/\n  - lang: es\n    url: /es/alfabeto-japones/\n')
print('ok')

# ---- Portuguese: hiragana and katakana charts ("hiragana e katakana" 3,600/month; "hiragana" 550,000 and "katakana" 450,000 worldwide, all languages; Keyword Planner 2026-11-20/21) ----
NAV_PT = ('<p><b>Escrita japonesa:</b> <a href="/pt/alfabeto-japones/">alfabeto japonês (os três sistemas)</a> · <a href="/pt/hiragana/">tabela de hiragana</a> · '
          '<a href="/pt/katakana/">tabela de katakana</a> · <a href="/pt/nomes-japoneses/">nomes japoneses</a> · <a href="/pt/palavras-em-japones/">palavras em japonês</a> · '
          '<a href="/pt/frases-em-japones/">frases em japonês</a></p>')
write('pt-hiragana.md', '/pt/hiragana/', 'Hiragana',
 'Hiragana: tabela completa com romaji, pronúncia e áudio (os 46 caracteres)',
 'Tabela de hiragana em português: os 46 caracteres básicos com romaji, os sons com dakuten (が, ざ, だ, ば, ぱ), as combinações como きゃ e しょ, o っ pequeno, as vogais longas, os caracteres que se confundem e como aprender rápido. Toque em qualquer caractere para ouvir.',
 '\n'.join(['<h1>Hiragana: tabela completa com romaji</h1>',
  '<p>O hiragana é o primeiro sistema de escrita japonês que se aprende: 46 caracteres básicos, e cada um é uma sílaba (か é <i>ka</i>), não uma letra. '
  'Com ele se escreve a gramática (terminações e partículas como <span lang="ja">は</span>, <span lang="ja">を</span> ou <span lang="ja">です</span>), as palavras japonesas que não usam kanji '
  'e o furigana, a leitura pequena impressa sobre os kanji. A tabela se lê por linhas: a consoante da esquerda mais a vogal de cima. A ordem japonesa é あいうえお (a, i, u, e, o).</p>',
  '<p><b>Ouça:</b> toque em qualquer caractere para ouvir (usa a voz japonesa do seu aparelho). <b>Teste-se:</b> <a href="/hiragana-quiz/">quiz de hiragana</a> (em inglês, grátis, 20 perguntas por rodada, com som).</p>',
  '<h2>Os 46 hiragana básicos</h2>', grid(GOJUON, ident),
  '<p><b>Atenção:</b> <span lang="ja">し</span> é <i>shi</i>, <span lang="ja">ち</span> <i>chi</i> (como o «ti» de «tia»), <span lang="ja">つ</span> <i>tsu</i> e <span lang="ja">ふ</span> <i>fu</i> (soprado, sem encostar os dentes no lábio). '
  'O <i>h</i> japonês soa como o «r» de «rato», nunca mudo, e o <i>r</i> é sempre brando, como em «caro». <span lang="ja">を</span> soa <i>o</i> e só aparece como partícula. Como partículas, <span lang="ja">は</span> se lê <i>wa</i> e '
  '<span lang="ja">へ</span> <i>e</i>. <span lang="ja">ん</span> é a única consoante que fica sozinha.</p>',
  '<h2>Dakuten e handakuten: os sons sonoros</h2>',
  '<p>Dois tracinhos (<span lang="ja">゛</span>, <i>dakuten</i>) mudam k → g, s → z, t → d e h → b. Um circulinho (<span lang="ja">゜</span>, <i>handakuten</i>) muda h → p. '
  '<span lang="ja">ぢ</span> e <span lang="ja">づ</span> soam igual a <span lang="ja">じ</span> e <span lang="ja">ず</span> e quase não se usam. '
  'O <i>g</i> é sempre duro, como em «gato» (<i>gi</i> = «gui»), e o <i>ji</i> soa como o «di» de «dia».</p>', grid(DAKUTEN, ident),
  '<h2>Combinações (yōon)</h2>',
  '<p>Um <span lang="ja">ゃ</span>, <span lang="ja">ゅ</span> ou <span lang="ja">ょ</span> pequeno depois de um caractere da coluna i forma uma só sílaba: '
  '<span lang="ja">き</span> + <span lang="ja">ゃ</span> = <span lang="ja">きゃ</span> <i>kya</i>. Não é a mesma coisa <span lang="ja">びょういん</span> (<i>byōin</i>, hospital) e '
  '<span lang="ja">びよういん</span> (<i>biyōin</i>, salão de beleza).</p>', yoon_grid(ident),
  '<h2>O っ pequeno e as vogais longas</h2>',
  simple(['Exemplo', 'Romaji', 'Significado', 'O que acontece'], [
   ('きって', 'kitte', 'selo (dos correios)', 'um <span lang="ja">っ</span> pequeno dobra a consoante seguinte: uma pausa curta'),
   ('きて', 'kite', 'venha (e…)', 'sem ele, não há pausa'),
   ('おかあさん', 'okāsan', 'mãe', 'uma vogal escrita duas vezes dura o dobro'),
   ('おばさん / おばあさん', 'obasan / obāsan', 'tia / avó', 'a duração muda a palavra'),
   ('がっこう', 'gakkō', 'escola', 'お + う se lê como um ō longo'),
   ('とけい', 'tokei', 'relógio', 'え + い costuma ser lido como um ē longo'),
  ]),
  '<h2>Caracteres que se confundem</h2>',
  simple(['Par', 'Romaji', 'Como diferenciar'], [
   ('さ / ち', 'sa / chi', 'são imagens espelhadas'), ('ぬ / め', 'nu / me', 'ぬ termina com um laço'), ('ね / れ / わ', 'ne / re / wa', 'olhe a cauda: laço, chute para fora, curva'),
   ('る / ろ', 'ru / ro', 'る tem um laço embaixo'), ('は / ほ', 'ha / ho', 'ほ tem um traço a mais em cima'), ('き / さ', 'ki / sa', 'き tem dois traços horizontais'),
   ('い / り', 'i / ri', 'o traço direito de り é mais comprido'), ('う / ら', 'u / ra', 'muda o primeiro traço'),
  ]),
  '<h2>Primeiras palavras em hiragana</h2>',
  simple(['Hiragana', 'Romaji', 'Significado'], [
   ('ねこ', 'neko', 'gato'), ('いぬ', 'inu', 'cachorro'), ('さくら', 'sakura', 'flor de cerejeira'), ('すし', 'sushi', 'sushi'),
   ('ありがとう', 'arigatō', 'obrigado'), ('おはよう', 'ohayō', 'bom dia'), ('ともだち', 'tomodachi', 'amigo'), ('みず', 'mizu', 'água'),
   ('はな', 'hana', 'flor'), ('やま', 'yama', 'montanha'), ('うみ', 'umi', 'mar'), ('すき', 'suki', 'gosto (de você)'),
  ]),
  '<h2>Quantos hiragana existem?</h2>',
  '<p>46 básicos, 25 com dakuten ou handakuten e 33 combinações: com eles se escreve qualquer som do japonês. O <span lang="ja">っ</span> pequeno e as vogais longas '
  'não são caracteres novos, e sim formas de escrever os que você já conhece.</p>',
  '<h2>Como aprender hiragana rápido</h2>',
  '<ol><li><b>Uma linha por dia:</b> あいうえお, depois かきくけこ… Em duas semanas você tem a tabela inteira.</li>'
  '<li><b>Escreva à mão</b> algumas vezes e fale em voz alta: a mão e o ouvido ajudam a memória visual.</li>'
  '<li><b>Leia palavras logo,</b> não caracteres soltos: as de cima, <a href="/pt/palavras-em-japones/">palavras em japonês</a> ou <a href="/pt/frases-em-japones/">frases em japonês</a>.</li>'
  '<li><b>Teste-se</b> todo dia com o <a href="/hiragana-quiz/">quiz de hiragana</a> e revise os que errar.</li>'
  '<li><b>Depois, o katakana:</b> são os mesmos sons com outra forma, então vai bem mais rápido. <a href="/pt/katakana/">Tabela de katakana</a>.</li></ol>',
  CTA_PT, NAV_PT,
  '<p>Em espanhol: <a href="/es/hiragana/">Hiragana: tabla completa</a> · em inglês: <a href="/hiragana-chart/">Hiragana chart</a></p>',
 ]), extra_fm='lang: pt\nalternates:\n  - lang: en\n    url: /hiragana-chart/\n  - lang: es\n    url: /es/hiragana/\n')

EXT_PT = [('ファ', 'fa', 'ファン (fã)'), ('フィ', 'fi', 'フィルム (filme fotográfico)'), ('フェ', 'fe', 'カフェ (café, o lugar)'), ('フォ', 'fo', 'フォーク (garfo)'),
          ('ティ', 'ti', 'パーティー (festa)'), ('ディ', 'di', 'ディナー (jantar)'), ('トゥ', 'tu', 'タトゥー (tatuagem)'),
          ('ウィ', 'wi', 'ウィンドウ (janela, no computador)'), ('ウェ', 'we', 'ウェブ (web)'), ('ウォ', 'wo', 'ウォーター (água, em nomes de marcas)'),
          ('シェ', 'she', 'シェア (compartilhar)'), ('ジェ', 'je', 'ジェット (jato)'), ('チェ', 'che', 'チェック (checar)'), ('ヴ', 'vu', 'ヴァイオリン (violino; também バイオリン)')]
write('pt-katakana.md', '/pt/katakana/', 'Katakana',
 'Katakana: tabela completa com romaji e áudio, sons estrangeiros e seu nome em katakana',
 'Tabela de katakana em português: os 46 caracteres básicos com romaji, dakuten (ガ, ザ, ダ, バ, パ), combinações como キャ e ショ, o traço de vogal longa ー, os sons para palavras estrangeiras (ファ, ティ, ウィ), os que se confundem (シ/ツ, ソ/ン) e como se escrevem nomes como Maria ou João. Toque em qualquer caractere para ouvir.',
 '\n'.join(['<h1>Katakana: tabela completa com romaji</h1>',
  '<p>O katakana tem os mesmos sons do <a href="/pt/hiragana/">hiragana</a>, com traços mais retos. É usado para palavras que vieram de outras línguas '
  '(<span lang="ja">パン</span> <i>pan</i>, do português «pão»; <span lang="ja">テレビ</span> <i>terebi</i>, televisão), para nomes estrangeiros (inclusive o seu), '
  'onomatopeias e para dar ênfase, como o nosso itálico. A tabela se lê por linhas: a consoante da esquerda mais a vogal de cima.</p>',
  '<p><b>Ouça:</b> toque em qualquer caractere para ouvir (usa a voz japonesa do seu aparelho). <b>Teste-se:</b> <a href="/katakana-quiz/">quiz de katakana</a> (em inglês, grátis, 20 perguntas por rodada, com som).</p>',
  '<h2>Os 46 katakana básicos</h2>', grid(GOJUON, kata),
  '<h2>Dakuten e handakuten</h2>',
  '<p>Como no hiragana: dois tracinhos mudam k → g, s → z, t → d e h → b; um circulinho muda h → p.</p>', grid(DAKUTEN, kata),
  '<h2>Combinações (yōon)</h2>', yoon_grid(kata),
  '<h2>O traço ー: vogais longas</h2>',
  '<p>No katakana a vogal longa é marcada com um traço, <span lang="ja">ー</span>, em vez de repetir a vogal: <span lang="ja">コーヒー</span> <i>kōhī</i> (café), '
  '<span lang="ja">ケーキ</span> <i>kēki</i> (bolo), <span lang="ja">スーパー</span> <i>sūpā</i> (supermercado). No texto vertical o traço vai de cima para baixo. '
  'Um <span lang="ja">ッ</span> pequeno dobra a consoante seguinte, como no hiragana: <span lang="ja">ベッド</span> <i>beddo</i> (cama).</p>',
  '<h2>Sons para palavras estrangeiras</h2>',
  '<p>O japonês não tem <i>fa</i>, <i>ti</i> nem <i>we</i> próprios, então o katakana junta um caractere normal com uma vogal pequena para escrevê-los.</p>',
  simple(['Katakana', 'Romaji', 'Exemplo'], EXT_PT),
  '<h2>Seu nome em katakana</h2>',
  '<p>Nomes estrangeiros se escrevem em katakana pelo som: Maria é <span lang="ja">マリア</span>, João <span lang="ja">ジョアン</span>, Lucas <span lang="ja">ルーカス</span>, '
  'Gabriel <span lang="ja">ガブリエル</span>, Júlia <span lang="ja">ジュリア</span>. Como o japonês quase não tem sílabas terminadas em consoante, acrescenta-se uma vogal '
  '(Carlos vira <span lang="ja">カルロス</span>, <i>Karurosu</i>). Mais nomes e o significado dos nomes japoneses em <a href="/pt/nomes-japoneses/">nomes japoneses</a>.</p>',
  '<h2>Caracteres que se confundem</h2>',
  simple(['Par', 'Romaji', 'Como diferenciar'], [
   ('シ / ツ', 'shi / tsu', 'os pontos de シ ficam à esquerda e o traço sobe de baixo; os de ツ ficam em cima e o traço desce de cima'),
   ('ソ / ン', 'so / n', 'a mesma regra: o traço longo de ソ desce de cima e o de ン sobe de baixo'),
   ('ク / ケ / タ', 'ku / ke / ta', 'ケ tem um traço separado; タ tem um traço dentro'), ('ウ / ワ / フ', 'u / wa / fu', 'conte os traços: 3, 2, 1'),
   ('ノ / メ', 'no / me', 'メ tem um traço que cruza'), ('ロ / コ', 'ro / ko', 'ロ é fechado'), ('チ / テ', 'chi / te', 'チ tem um traço que desce pelo meio'),
   ('カ / 力', 'ka / chikara (kanji de «força»)', 'a mesma forma; o contexto diz qual é'),
  ]),
  '<h2>Primeiras palavras em katakana</h2>',
  simple(['Katakana', 'Romaji', 'Significado'], [
   ('パン', 'pan', 'pão (do português)'), ('ボタン', 'botan', 'botão (do português)'), ('カメラ', 'kamera', 'câmera'), ('テレビ', 'terebi', 'televisão'),
   ('アイス', 'aisu', 'sorvete'), ('ホテル', 'hoteru', 'hotel'), ('バス', 'basu', 'ônibus'), ('トイレ', 'toire', 'banheiro'),
   ('コンビニ', 'konbini', 'loja de conveniência'), ('ブラジル', 'Burajiru', 'Brasil'),
  ]),
  CTA_PT, NAV_PT,
  '<p>Em espanhol: <a href="/es/katakana/">Katakana: tabla completa</a> · em inglês: <a href="/katakana-chart/">Katakana chart</a></p>',
 ]), extra_fm='lang: pt\nalternates:\n  - lang: en\n    url: /katakana-chart/\n  - lang: es\n    url: /es/katakana/\n')
