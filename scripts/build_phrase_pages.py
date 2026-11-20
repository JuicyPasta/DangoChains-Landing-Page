"""Writes _pages/phrases*.md (the /phrases/ hub and its guides). Run: python3 scripts/build_phrase_pages.py . (repo root). Edit here, not in the .md files."""
import os, sys, html
ROOT = sys.argv[1]
STYLE = '<style>.st-table{border-collapse:collapse;margin:.3em 0 1em;width:100%}.st-table th,.st-table td{border-bottom:1px solid #e6e6e6;padding:.35em .5em;text-align:left;vertical-align:top}.st-table td[lang=ja]{font-size:1.1em;white-space:nowrap}.st-cta{background:#f6f2ea;border-radius:12px;padding:1em 1.2em;margin:2em 0}</style>'
CTA = ('<div class="st-cta"><p><b>Learn words by playing.</b> DangoChains is a free daily puzzle for Japanese learners: '
       'sort 16 Japanese words into 4 hidden groups, at three levels, in your browser. After each game you see every '
       'word\'s reading and English meaning. <a href="/play/">Play today\'s puzzle</a> · '
       '<a href="/learn-japanese-games/">more free Japanese games</a></p></div>')
GUIDES = [('hello-in-japanese', 'Hello'), ('thank-you-in-japanese', 'Thank you'), ('sorry-in-japanese', 'Sorry'),
          ('goodbye-in-japanese', 'Goodbye'), ('good-morning-in-japanese', 'Good morning'),
          ('good-night-in-japanese', 'Good night'), ('how-are-you-in-japanese', 'How are you'),
          ('yes-and-no-in-japanese', 'Yes and no'), ('please-in-japanese', 'Please'), ('happy-birthday-in-japanese', 'Happy birthday'),
          ('cheers-in-japanese', 'Cheers'), ('welcome-in-japanese', 'Welcome'), ('happy-new-year-in-japanese', 'Happy New Year'),
          ('merry-christmas-in-japanese', 'Merry Christmas')]
e = html.escape

def table(head, rows):
    out = ['<table class="st-table"><thead><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr></thead><tbody>']
    for r in rows:
        cells = []
        for i, c in enumerate(r):
            ja = i == 0 or (i == 1 and head[1] == 'Reading')
            cells.append(f'<td lang="ja">{e(c)}</td>' if ja else f'<td>{c}</td>')
        out.append('<tr>' + ''.join(cells) + '</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)

def more(slug):
    links = ' · '.join(f'<a href="/phrases/{s}/">{l} in Japanese</a>' for s, l in GUIDES if s != slug)
    return (f'<p><b>More everyday phrases:</b> {links} · <a href="/phrases/">all basic phrases</a> · '
            '<a href="/study/topics/greetings/">greetings word groups from past puzzles</a> · '
            '<a href="/japanese-words/">basic Japanese words</a></p>')

def page(path, permalink, title, seo, desc, body, extra_fm=''):
    fm = (f'---\nlayout: page\npermalink: {permalink}\ntitle: "{title}"\nseo_title: "{seo}"\n'
          f'description: "{desc}"\n{extra_fm}---\n\n')
    with open(os.path.join(ROOT, '_pages', path), 'w', encoding='utf-8') as f:
        f.write(fm + STYLE + '\n' + body + '\n')

H = ['Japanese', 'Romaji', 'Politeness', 'When to use it']

# ---- thank you ----
page('phrases-thank-you-in-japanese.md', '/phrases/thank-you-in-japanese/', 'Thank you in Japanese',
 'Thank you in Japanese: ありがとう, ありがとうございます and when to use each',
 'How to say thank you in Japanese: arigatō, arigatō gozaimasu, arigatō gozaimashita, dōmo, sumimasen and more, with romaji, politeness level and when to use each, plus how to answer.',
 '\n'.join(['<h1>How to say thank you in Japanese</h1>',
  '<p>The everyday word is <span lang="ja">ありがとう</span> (<i>arigatō</i>). Add <span lang="ja">ございます</span> to make it polite: '
  'that is the safe choice with strangers, shop staff, teachers and anyone older than you. For something that is already finished, '
  'such as a meal at a restaurant or a lesson, people switch to the past form <span lang="ja">ありがとうございました</span>. '
  'And when someone went to trouble for you, Japanese often says <span lang="ja">すみません</span> ("sorry for the bother") where English says thanks.</p>',
  '<h2>Ways to say thank you</h2>',
  table(H, [
   ('ありがとう', 'arigatō', 'casual', 'friends, family, people younger than you'),
   ('ありがとうございます', 'arigatō gozaimasu', 'polite', 'the default with strangers, staff, teachers and colleagues'),
   ('ありがとうございました', 'arigatō gozaimashita', 'polite, past', 'for something finished: leaving a shop or restaurant, the end of a lesson or a favour'),
   ('どうもありがとうございます', 'dōmo arigatō gozaimasu', 'very polite', 'stronger thanks; <i>dōmo</i> means "very much"'),
   ('本当にありがとう', 'hontō ni arigatō', 'casual, warm', '"really, thank you"'),
   ('どうも', 'dōmo', 'light', 'a quick thanks when someone hands you something or holds a door'),
   ('すみません', 'sumimasen', 'polite', 'thanks mixed with "sorry for the trouble"'),
   ('お世話になりました', 'osewa ni narimashita', 'polite', 'thanks for help over a period: leaving a job, after a homestay'),
   ('感謝しています', 'kansha shite imasu', 'formal, heartfelt', '"I am grateful": speeches, letters, serious thanks'),
   ('恐れ入ります', 'osoreirimasu', 'very formal', 'business and customer service'),
   ('サンキュー', 'sankyū', 'slang', 'playful, from English'),
   ('おおきに', 'ōkini', 'dialect', 'Kansai (Osaka, Kyoto)'),
  ]),
  '<h2>How to answer a thank you</h2>',
  table(['Japanese', 'Romaji', 'Meaning', 'Note'], [
   ('いえいえ', 'ie ie', 'not at all', 'the most common reply in conversation'),
   ('どういたしまして', 'dō itashimashite', 'you\'re welcome', 'the textbook reply; can sound a little stiff'),
   ('とんでもないです', 'tondemo nai desu', 'not at all (polite)', 'humble, for bigger thanks'),
   ('こちらこそ', 'kochira koso', 'thank you, too', 'when you are just as grateful'),
  ]),
  '<h2>Thanks you can only say at the table</h2>',
  '<p>Before eating, people say <span lang="ja">いただきます</span> (<i>itadakimasu</i>); after eating, <span lang="ja">ごちそうさまでした</span> '
  '(<i>gochisōsama deshita</i>), which thanks whoever cooked or paid; it\'s also what you say to the staff as you leave a small restaurant.</p>',
  '<p><small>Where it comes from: <span lang="ja">ありがとう</span> was once written <span lang="ja">有難う</span>, from <span lang="ja">有り難い</span> '
  '(<i>arigatai</i>, "hard to have", so rare and precious). Today it is almost always written in hiragana.</small></p>',
  more('thank-you-in-japanese'), '<p lang="es">En español: <a href="/es/gracias-en-japones/">Gracias en japonés</a></p>', CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/gracias-en-japones/\n')

# ---- hello ----
page('phrases-hello-in-japanese.md', '/phrases/hello-in-japanese/', 'Hello in Japanese',
 'Hello in Japanese: こんにちは and 11 other ways to say hi, with romaji',
 'How to say hello in Japanese: konnichiwa, ohayō, konbanwa, moshi moshi, hisashiburi, hajimemashite and more, with romaji and when each one fits.',
 '\n'.join(['<h1>How to say hello in Japanese</h1>',
  '<p><span lang="ja">こんにちは</span> (<i>konnichiwa</i>) is the hello everyone learns first, but it is a daytime greeting, used roughly from late '
  'morning until dusk. In the morning people say <span lang="ja">おはようございます</span>, in the evening <span lang="ja">こんばんは</span>, and on the phone '
  '<span lang="ja">もしもし</span>. Close friends rarely say <span lang="ja">こんにちは</span> to each other at all; they say <span lang="ja">おはよう</span>, '
  '<span lang="ja">やあ</span> or just each other\'s name. Note the spelling: the last sound of <span lang="ja">こんにちは</span> is written with <span lang="ja">は</span> but read <i>wa</i>.</p>',
  '<h2>Ways to say hello</h2>',
  table(H, [
   ('こんにちは', 'konnichiwa', 'neutral', 'daytime hello to almost anyone'),
   ('おはようございます', 'ohayō gozaimasu', 'polite', 'good morning; at many workplaces, the first greeting of the shift at any hour'),
   ('おはよう', 'ohayō', 'casual', 'good morning to friends and family'),
   ('こんばんは', 'konbanwa', 'neutral', 'good evening, when you meet someone after dark'),
   ('もしもし', 'moshi moshi', 'neutral', 'only on the phone'),
   ('はじめまして', 'hajimemashite', 'polite', 'nice to meet you, the first time you meet someone'),
   ('お久しぶりです', 'o-hisashiburi desu', 'polite', 'long time no see'),
   ('久しぶり', 'hisashiburi', 'casual', 'long time no see, to friends'),
   ('どうも', 'dōmo', 'light', 'a quick hi to an acquaintance'),
   ('お疲れさまです', 'otsukaresama desu', 'polite', 'hello between colleagues at work'),
   ('やあ', 'yā', 'casual', 'hi; a little dated or bookish'),
   ('おっす', 'ossu', 'very casual', 'between close (mostly male) friends'),
  ]),
  '<h2>Greetings that come in pairs</h2>',
  table(['Japanese', 'Romaji', 'Who says it', 'Meaning'], [
   ('ただいま', 'tadaima', 'the person coming home', 'I\'m home'),
   ('おかえり（なさい）', 'okaeri (nasai)', 'the person at home', 'welcome back'),
   ('いらっしゃいませ', 'irasshaimase', 'shop and restaurant staff', 'welcome (customers don\'t answer it; a nod is enough)'),
  ]),
  '<p>To start talking to a stranger, for example to ask the way, Japanese uses <span lang="ja">すみません</span> (<i>sumimasen</i>, "excuse me") rather than hello.</p>',
  more('hello-in-japanese'), '<p lang="es">En español: <a href="/es/hola-en-japones/">Hola en japonés</a></p>', CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/hola-en-japones/\n')

# ---- goodbye ----
page('phrases-goodbye-in-japanese.md', '/phrases/goodbye-in-japanese/', 'Goodbye in Japanese',
 'Goodbye in Japanese: さようなら, じゃあね, またね and when to use each',
 'How to say goodbye in Japanese: sayōnara, jā ne, mata ne, mata ashita, shitsurei shimasu, o-saki ni shitsurei shimasu and more, with romaji and when each fits.',
 '\n'.join(['<h1>How to say goodbye in Japanese</h1>',
  '<p><span lang="ja">さようなら</span> (<i>sayōnara</i>) is the goodbye in every textbook, but adults use it less than you\'d think: it can sound final, as if you won\'t meet again soon. '
  'Children say it to their teachers at the end of the school day. Between friends, goodbye is usually <span lang="ja">じゃあね</span> or '
  '<span lang="ja">またね</span> ("see you"), and at work it is <span lang="ja">失礼します</span> or <span lang="ja">お先に失礼します</span>.</p>',
  '<h2>Ways to say goodbye</h2>',
  table(H, [
   ('さようなら', 'sayōnara', 'neutral', 'goodbye for a while; students to teachers'),
   ('じゃあね', 'jā ne', 'casual', 'see you, to friends'),
   ('またね', 'mata ne', 'casual', 'see you (again)'),
   ('また明日', 'mata ashita', 'casual', 'see you tomorrow'),
   ('では、また', 'dewa, mata', 'polite-ish', 'well then, until next time; also ends emails'),
   ('バイバイ', 'bai bai', 'casual', 'bye-bye; children and young people'),
   ('失礼します', 'shitsurei shimasu', 'polite', 'leaving an office or a teacher\'s room; ending a phone call'),
   ('お先に失礼します', 'o-saki ni shitsurei shimasu', 'polite', 'leaving work before your colleagues'),
   ('お疲れさまでした', 'otsukaresama deshita', 'polite', 'the reply to the line above; the end of a shift or project'),
   ('気をつけて', 'ki o tsukete', 'casual', 'take care (on your way home)'),
   ('お元気で', 'o-genki de', 'polite', 'take care, before a long parting'),
   ('いってきます', 'ittekimasu', 'neutral', 'leaving home: "I\'m off" (answered with <span lang="ja">いってらっしゃい</span>)'),
  ]),
  more('goodbye-in-japanese'), CTA]))

# ---- good morning ----
page('phrases-good-morning-in-japanese.md', '/phrases/good-morning-in-japanese/', 'Good morning in Japanese',
 'Good morning in Japanese: おはよう and おはようございます, with romaji',
 'How to say good morning in Japanese: ohayō (casual) and ohayō gozaimasu (polite), until what time to use them, how to answer, and other morning words with readings.',
 '\n'.join(['<h1>How to say good morning in Japanese</h1>',
  '<p>Good morning is <span lang="ja">おはようございます</span> (<i>ohayō gozaimasu</i>), or <span lang="ja">おはよう</span> (<i>ohayō</i>) to friends and family. '
  'The answer is the same phrase back. It comes from <span lang="ja">お早う</span>, "it\'s early", and is written in hiragana. Use it until about 10 or 11 a.m.; '
  'after that, switch to <span lang="ja">こんにちは</span>. In TV, restaurants and some other workplaces, <span lang="ja">おはようございます</span> is the first greeting of the shift whatever the time.</p>',
  table(H, [
   ('おはようございます', 'ohayō gozaimasu', 'polite', 'teachers, colleagues, neighbours, anyone older'),
   ('おはよう', 'ohayō', 'casual', 'friends, family, classmates'),
   ('おっはー', 'ohhā', 'slang', 'jokey; a 2000s TV catchphrase'),
  ]),
  '<h2>Morning words</h2>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [
   ('朝', 'あさ', 'asa', 'morning'), ('今朝', 'けさ', 'kesa', 'this morning'), ('朝ご飯', 'あさごはん', 'asagohan', 'breakfast'),
   ('早起き', 'はやおき', 'hayaoki', 'getting up early'), ('起きる', 'おきる', 'okiru', 'to get up'), ('目覚まし時計', 'めざましどけい', 'mezamashi-dokei', 'alarm clock'),
   ('よく眠れた？', 'よくねむれた？', 'yoku nemureta?', 'did you sleep well?'), ('いい天気ですね', 'いいてんきですね', 'ii tenki desu ne', 'nice weather, isn\'t it'),
  ]),
  more('good-morning-in-japanese'), CTA]))

# ---- good night ----
page('phrases-good-night-in-japanese.md', '/phrases/good-night-in-japanese/', 'Good night in Japanese',
 'Good night in Japanese: おやすみ, おやすみなさい and こんばんは',
 'How to say good night in Japanese: oyasumi and oyasumi nasai before sleep, and why konbanwa means good evening, not good night. With romaji and night-time words.',
 '\n'.join(['<h1>How to say good night in Japanese</h1>',
  '<p>Before going to bed, or when someone else is about to, say <span lang="ja">おやすみなさい</span> (<i>oyasumi nasai</i>), or <span lang="ja">おやすみ</span> (<i>oyasumi</i>) to friends and family. '
  'It comes from <span lang="ja">休む</span>, "to rest". Don\'t mix it up with <span lang="ja">こんばんは</span> (<i>konbanwa</i>): that means "good evening" and is a hello, said when you meet someone after dark.</p>',
  table(H, [
   ('おやすみなさい', 'oyasumi nasai', 'polite', 'before sleep; also ending a late phone call or chat'),
   ('おやすみ', 'oyasumi', 'casual', 'friends, family, partners'),
   ('こんばんは', 'konbanwa', 'neutral', 'good evening, as a greeting when you meet'),
   ('いい夢を', 'ii yume o', 'casual', 'sweet dreams'),
   ('また明日', 'mata ashita', 'casual', 'see you tomorrow'),
   ('お先に失礼します', 'o-saki ni shitsurei shimasu', 'polite', 'leaving an evening event or work before others'),
  ]),
  '<h2>Night words</h2>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [
   ('夜', 'よる', 'yoru', 'night'), ('今夜', 'こんや', 'kon\'ya', 'tonight'), ('晩ご飯', 'ばんごはん', 'bangohan', 'dinner'),
   ('寝る', 'ねる', 'neru', 'to sleep, go to bed'), ('眠い', 'ねむい', 'nemui', 'sleepy'), ('夢', 'ゆめ', 'yume', 'dream'),
   ('夜更かし', 'よふかし', 'yofukashi', 'staying up late'), ('月', 'つき', 'tsuki', 'the moon'),
  ]),
  more('good-night-in-japanese'), CTA]))

# ---- sorry ----
page('phrases-sorry-in-japanese.md', '/phrases/sorry-in-japanese/', 'Sorry in Japanese',
 'Sorry in Japanese: ごめんなさい, すみません, 申し訳ありません and when to use each',
 'How to say sorry in Japanese: gomen nasai, gomen, sumimasen, mōshiwake arimasen, shitsurei shimashita and more, with romaji, politeness and when to use each, plus how to answer.',
 '\n'.join(['<h1>How to say sorry in Japanese</h1>',
  '<p>Japanese has three everyday apologies. <span lang="ja">ごめんなさい</span> (<i>gomen nasai</i>) is a real "I\'m sorry", said to friends and family (shortened to <span lang="ja">ごめん</span>). '
  '<span lang="ja">すみません</span> (<i>sumimasen</i>) is the polite all-purpose one: sorry, excuse me, and even thank you. '
  '<span lang="ja">申し訳ありません</span> (<i>mōshiwake arimasen</i>) is the formal apology you hear from businesses and at work.</p>',
  table(H, [
   ('ごめんなさい', 'gomen nasai', 'neutral', 'a sincere apology to people close to you'),
   ('ごめん', 'gomen', 'casual', 'sorry, to friends'),
   ('ごめんね', 'gomen ne', 'casual, soft', 'a gentle sorry'),
   ('すみません', 'sumimasen', 'polite', 'sorry or excuse me to strangers, staff and teachers'),
   ('すいません', 'suimasen', 'polite, spoken', 'a relaxed way of saying the same'),
   ('失礼しました', 'shitsurei shimashita', 'polite', '"pardon me" for a small slip'),
   ('申し訳ありません', 'mōshiwake arimasen', 'formal', 'apologising to a boss or customer'),
   ('申し訳ございません', 'mōshiwake gozaimasen', 'very formal', 'customer service, announcements'),
   ('悪い', 'warui', 'casual', '"my bad"; mostly men'),
   ('お詫び申し上げます', 'o-wabi mōshiagemasu', 'very formal, written', 'official apologies and letters'),
  ]),
  '<h2>How to answer an apology</h2>',
  table(['Japanese', 'Romaji', 'Meaning', 'Note'], [
   ('大丈夫です', 'daijōbu desu', 'it\'s fine', 'polite and common'),
   ('いいよ', 'ii yo', 'it\'s OK', 'casual'),
   ('気にしないで', 'ki ni shinaide', 'don\'t worry about it', 'casual'),
   ('こちらこそ', 'kochira koso', 'no, I\'m sorry too', 'when you share the blame'),
  ]),
  more('sorry-in-japanese'), CTA]))

# ---- how are you ----
page('phrases-how-are-you-in-japanese.md', '/phrases/how-are-you-in-japanese/', 'How are you in Japanese',
 'How are you in Japanese: お元気ですか, 元気？ and how to answer',
 'How to say how are you in Japanese: o-genki desu ka, genki?, saikin dō?, chōshi wa dō?, and how to answer (genki desu, okagesama de, mā mā desu), with romaji.',
 '\n'.join(['<h1>How to say "how are you" in Japanese</h1>',
  '<p>The textbook phrase is <span lang="ja">お元気ですか</span> (<i>o-genki desu ka</i>), literally "are you well?". Unlike English "how are you", it isn\'t a daily greeting: '
  'people ask it when they haven\'t seen someone for a while, or in letters. With people you see every day, a plain <span lang="ja">おはよう</span> or <span lang="ja">こんにちは</span> does the job.</p>',
  table(H, [
   ('お元気ですか', 'o-genki desu ka', 'polite', 'after some time apart; letters and emails'),
   ('元気？', 'genki?', 'casual', 'to friends'),
   ('元気だった？', 'genki datta?', 'casual', '"have you been well?" when you meet again'),
   ('最近どう？', 'saikin dō?', 'casual', 'how have you been lately?'),
   ('調子はどう？', 'chōshi wa dō?', 'casual', 'how\'s it going?'),
   ('大丈夫？', 'daijōbu?', 'casual', 'are you OK? (when something seems wrong)'),
  ]),
  '<h2>How to answer</h2>',
  table(['Japanese', 'Romaji', 'Meaning', 'Note'], [
   ('元気です', 'genki desu', 'I\'m fine', 'polite; <span lang="ja">元気</span> alone to friends'),
   ('おかげさまで', 'okagesama de', 'fine, thanks to you', 'polite and very Japanese: credits the other person'),
   ('まあまあです', 'mā mā desu', 'so-so', ''),
   ('ちょっと疲れています', 'chotto tsukarete imasu', 'a bit tired', ''),
   ('〇〇さんは？', '___-san wa?', 'and you?', 'add the person\'s name'),
  ]),
  more('how-are-you-in-japanese'), CTA]))


# ---- yes / no ----
page('phrases-yes-and-no-in-japanese.md', '/phrases/yes-and-no-in-japanese/', 'Yes and no in Japanese',
 'Yes in Japanese: はい, ええ, うん, and how to say no politely',
 'How to say yes in Japanese (hai, ē, un, sō desu) and no (iie, iya, uun, chigaimasu, kekkō desu), with romaji and when each fits, plus the trap with negative questions.',
 '\n'.join(['<h1>How to say yes and no in Japanese</h1>',
  '<p>"Yes" is <span lang="ja">はい</span> (<i>hai</i>), and it also means "I\'m listening" or "here!" when a name is called. Friends say <span lang="ja">うん</span> (<i>un</i>). '
  '"No" is <span lang="ja">いいえ</span> (<i>iie</i>) in textbooks, but people rarely say a flat no: they use <span lang="ja">いや</span>, <span lang="ja">違います</span> ("that\'s not right") '
  'or a soft <span lang="ja">ちょっと…</span> ("that\'s a bit…") and let the sentence trail off.</p>',
  '<h2>Yes</h2>',
  table(H, [('はい', 'hai', 'polite', 'yes; I\'m listening; present!'), ('ええ', 'ē', 'neutral, soft', 'yes, in conversation'), ('うん', 'un', 'casual', 'yeah'),
            ('そうです', 'sō desu', 'polite', 'that\'s right'), ('そうそう', 'sō sō', 'casual', 'exactly, yes yes'), ('もちろん', 'mochiron', 'neutral', 'of course')]),
  '<h2>No</h2>',
  table(H, [('いいえ', 'iie', 'polite', 'no; also "not at all" after thanks'), ('いや', 'iya', 'casual', 'no, nah'), ('ううん', 'uun', 'casual', 'nope'),
            ('違います', 'chigaimasu', 'polite', 'that\'s wrong, that\'s not it'), ('結構です', 'kekkō desu', 'polite', 'no thank you, to an offer'),
            ('大丈夫です', 'daijōbu desu', 'polite', 'I\'m fine, no thanks (e.g. "need a bag?")'), ('ちょっと…', 'chotto…', 'soft', 'a gentle refusal: "that\'s a bit difficult…"')]),
  '<h2>The negative-question trap</h2>',
  '<p>Japanese yes and no answer "is what you said right?". Asked <span lang="ja">行かないの？</span> ("You\'re not going?"), <span lang="ja">はい</span> means "right, I\'m not going", '
  'where English would say "no".</p>',
  more('yes-and-no-in-japanese'), CTA]))

# ---- please ----
page('phrases-please-in-japanese.md', '/phrases/please-in-japanese/', 'Please in Japanese',
 'Please in Japanese: ください, お願いします, どうぞ and when to use each',
 'How to say please in Japanese: kudasai, onegai shimasu, dōzo, -te kudasai and more, with romaji, examples and when each one fits.',
 '\n'.join(['<h1>How to say please in Japanese</h1>',
  '<p>Japanese has two "please"s for asking and one for offering. <span lang="ja">ください</span> (<i>kudasai</i>) and <span lang="ja">お願いします</span> (<i>onegai shimasu</i>) ask for something; '
  '<span lang="ja">どうぞ</span> (<i>dōzo</i>) offers: "please, go ahead", "here you are".</p>',
  table(['Japanese', 'Romaji', 'Use', 'Example'], [
   ('ください', 'kudasai', 'asking for a thing (after を)', '<span lang="ja">水をください</span>: water, please'),
   ('〜てください', '-te kudasai', 'asking someone to do something', '<span lang="ja">ゆっくり話してください</span>: please speak slowly'),
   ('お願いします', 'onegai shimasu', 'requests and orders; a little softer and more polite', '<span lang="ja">コーヒーをお願いします</span>: a coffee, please'),
   ('どうぞ', 'dōzo', 'offering: go ahead, help yourself, here you are', '<span lang="ja">どうぞ、座ってください</span>: please, have a seat'),
   ('〜ないでください', '-naide kudasai', 'please don\'t', '<span lang="ja">写真を撮らないでください</span>: please don\'t take photos'),
   ('お願い', 'onegai', 'casual: please!', '<span lang="ja">お願い、手伝って</span>: please help me'),
   ('〜てくださいませんか', '-te kudasaimasen ka', 'very polite request', '<span lang="ja">教えてくださいませんか</span>: would you tell me?'),
   ('どうか', 'dōka', 'earnest "please" (formal or emotional)', '<span lang="ja">どうかお願いします</span>: I beg you'),
  ]),
  more('please-in-japanese'), CTA]))

# ---- happy birthday ----
page('phrases-happy-birthday-in-japanese.md', '/phrases/happy-birthday-in-japanese/', 'Happy birthday in Japanese',
 'Happy birthday in Japanese: お誕生日おめでとう(ございます) and birthday words',
 'How to say happy birthday in Japanese: otanjōbi omedetō (gozaimasu), with romaji, birthday messages for cards, and birthday words like cake, candles and hatachi.',
 '\n'.join(['<h1>How to say happy birthday in Japanese</h1>',
  '<p>Happy birthday is <span lang="ja">お誕生日おめでとう</span> (<i>o-tanjōbi omedetō</i>) to friends and family, and <span lang="ja">お誕生日おめでとうございます</span> '
  '(<i>o-tanjōbi omedetō gozaimasu</i>) to a teacher, boss or anyone you speak politely to. <span lang="ja">おめでとう</span> alone means "congratulations". '
  'At parties people usually sing the song in English: <span lang="ja">ハッピーバースデー</span>.</p>',
  table(H, [('お誕生日おめでとうございます', 'o-tanjōbi omedetō gozaimasu', 'polite', 'teachers, colleagues, customers'),
            ('誕生日おめでとう', 'tanjōbi omedetō', 'casual', 'friends, family, partners'), ('ハッピーバースデー', 'happī bāsudē', 'casual', 'from English; cards and the song'),
            ('おめでとう', 'omedetō', 'casual', 'congratulations')]),
  '<h2>For a card or message</h2>',
  table(['Japanese', 'Romaji', 'Meaning', ''], [('素敵な一年になりますように', 'suteki na ichinen ni narimasu yō ni', 'wishing you a wonderful year', ''),
   ('いつもありがとう', 'itsumo arigatō', 'thanks for everything, always', ''), ('これからもよろしくね', 'kore kara mo yoroshiku ne', 'here\'s to more years together', 'casual')]),
  '<h2>Birthday words</h2>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [('誕生日', 'たんじょうび', 'tanjōbi', 'birthday'), ('ケーキ', 'ケーキ', 'kēki', 'cake'),
   ('ろうそく', 'ろうそく', 'rōsoku', 'candle'), ('プレゼント', 'プレゼント', 'purezento', 'present'), ('何歳', 'なんさい', 'nansai', 'how old'),
   ('二十歳', 'はたち', 'hatachi', '20 years old (the traditional coming of age; still the drinking age)'), ('還暦', 'かんれき', 'kanreki', '60th birthday, a big celebration')]),
  more('happy-birthday-in-japanese'), CTA]))

# ---- cheers ----
page('phrases-cheers-in-japanese.md', '/phrases/cheers-in-japanese/', 'Cheers in Japanese',
 'Cheers in Japanese: 乾杯 (kanpai) and drinking etiquette',
 'How to say cheers in Japanese: 乾杯 (kanpai), what people say before it, and the words and etiquette of a Japanese drinking party (nomikai).',
 '\n'.join(['<h1>How to say cheers in Japanese: 乾杯 (kanpai)</h1>',
  '<p>Cheers is <span lang="ja">乾杯</span> (<i>kanpai</i>), literally "dry the cup". At a work party nobody drinks until everyone has a glass and someone leads the <span lang="ja">乾杯</span>, '
  'often after <span lang="ja">お疲れさまでした</span> ("thanks for your hard work"). Pour for others rather than yourself, and hold your glass up when someone pours for you.</p>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [('乾杯', 'かんぱい', 'kanpai', 'cheers'), ('お疲れさまでした', 'おつかれさまでした', 'otsukaresama deshita', 'good work today (before the toast at work)'),
   ('飲み会', 'のみかい', 'nomikai', 'drinking party with colleagues or friends'), ('お酌', 'おしゃく', 'o-shaku', 'pouring a drink for someone'),
   ('一気', 'いっき', 'ikki', 'chug it in one go'), ('お代わり', 'おかわり', 'okawari', 'another one, a refill'), ('日本酒', 'にほんしゅ', 'nihonshu', 'sake'),
   ('生ビール', 'なまビール', 'nama bīru', 'draft beer'), ('とりあえずビール', 'とりあえずビール', 'toriaezu bīru', '"beer for now", the classic first order'),
   ('ソフトドリンク', 'ソフトドリンク', 'sofuto dorinku', 'soft drink (fine to toast with)')]),
  more('cheers-in-japanese'), CTA]))

# ---- welcome ----
page('phrases-welcome-in-japanese.md', '/phrases/welcome-in-japanese/', 'Welcome in Japanese',
 'Welcome in Japanese: いらっしゃいませ, ようこそ and おかえり',
 'How to say welcome in Japanese: irasshaimase in shops, yōkoso for guests, irasshai at home, okaeri for welcome home, with romaji and when each is used.',
 '\n'.join(['<h1>How to say welcome in Japanese</h1>',
  '<p>Which "welcome" depends on where you are. Shop and restaurant staff call out <span lang="ja">いらっしゃいませ</span>; you don\'t need to answer. '
  'To welcome someone to a place, say <span lang="ja">ようこそ</span> (<span lang="ja">日本へようこそ</span>, "welcome to Japan"). And to family coming home, <span lang="ja">おかえり</span>.</p>',
  table(H, [('いらっしゃいませ', 'irasshaimase', 'very polite', 'staff to customers in shops and restaurants'), ('いらっしゃい', 'irasshai', 'casual', 'welcoming a guest to your home'),
   ('ようこそ', 'yōkoso', 'polite', 'welcome (to a place or event)'), ('おかえりなさい', 'okaeri nasai', 'neutral', 'welcome home (reply to ただいま)'),
   ('歓迎します', 'kangei shimasu', 'formal', 'you are welcome here; we welcome you'), ('どういたしまして', 'dō itashimashite', 'polite', '"you\'re welcome" after thanks: a different welcome')]),
  more('welcome-in-japanese'), CTA]))

# ---- new year ----
page('phrases-happy-new-year-in-japanese.md', '/phrases/happy-new-year-in-japanese/', 'Happy New Year in Japanese',
 'Happy New Year in Japanese: あけましておめでとう and Japanese New Year words',
 'How to say Happy New Year in Japanese (akemashite omedetō gozaimasu), what to say before January 1 (yoi otoshi o), and Japanese New Year words: oshōgatsu, hatsumōde, osechi, otoshidama, nengajō.',
 '\n'.join(['<h1>Happy New Year in Japanese, and the words of お正月</h1>',
  '<p>From January 1, say <span lang="ja">あけましておめでとうございます</span> (<i>akemashite omedetō gozaimasu</i>), usually followed by <span lang="ja">今年もよろしくお願いします</span> '
  '("I look forward to another year with you"). Before the new year, in late December, the parting words are <span lang="ja">良いお年を</span> (<i>yoi otoshi o</i>, "have a good new year"). '
  'New Year (<span lang="ja">お正月</span>) is Japan\'s biggest family holiday; 2027 is the year of the sheep (<span lang="ja">未年</span>, <i>hitsuji-doshi</i>).</p>',
  table(H, [('あけましておめでとうございます', 'akemashite omedetō gozaimasu', 'polite', 'Happy New Year, from January 1'),
   ('あけおめ', 'akeome', 'slang', 'short form in messages to friends'), ('今年もよろしくお願いします', 'kotoshi mo yoroshiku onegai shimasu', 'polite', 'said right after; "kotoyoro" in slang'),
   ('良いお年を', 'yoi otoshi o', 'neutral', 'the last goodbye of the year, before January 1'), ('謹賀新年', 'kinga shinnen', 'formal, written', 'on New Year cards')]),
  '<h2>New Year words</h2>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [('お正月', 'おしょうがつ', 'oshōgatsu', 'New Year holidays'), ('大晦日', 'おおみそか', 'ōmisoka', 'New Year\'s Eve'),
   ('年越しそば', 'としこしそば', 'toshikoshi soba', 'soba eaten on New Year\'s Eve'), ('除夜の鐘', 'じょやのかね', 'joya no kane', 'temple bells rung 108 times at midnight'),
   ('初詣', 'はつもうで', 'hatsumōde', 'first shrine or temple visit of the year'), ('おせち料理', 'おせちりょうり', 'osechi ryōri', 'New Year food in lacquer boxes'),
   ('お雑煮', 'おぞうに', 'ozōni', 'soup with mochi'), ('お年玉', 'おとしだま', 'otoshidama', 'money gifts for children'), ('年賀状', 'ねんがじょう', 'nengajō', 'New Year cards'),
   ('門松', 'かどまつ', 'kadomatsu', 'pine and bamboo by the door'), ('鏡餅', 'かがみもち', 'kagami mochi', 'stacked mochi decoration'), ('初日の出', 'はつひので', 'hatsuhinode', 'the first sunrise'),
   ('福袋', 'ふくぶくろ', 'fukubukuro', 'lucky bags sold in January sales'), ('干支', 'えと', 'eto', 'the zodiac animal of the year')]),
  '<p>More: <a href="/study/topics/festivals/">Japanese festivals</a> · <a href="/study/topics/days-months/">months and dates</a></p>',
  more('happy-new-year-in-japanese'), CTA]))

# ---- christmas ----
page('phrases-merry-christmas-in-japanese.md', '/phrases/merry-christmas-in-japanese/', 'Merry Christmas in Japanese',
 'Merry Christmas in Japanese: メリークリスマス and how Japan celebrates',
 'How to say Merry Christmas in Japanese (merī kurisumasu), and Christmas in Japan: Christmas Eve dates, strawberry Christmas cake, KFC, illuminations, with readings and romaji.',
 '\n'.join(['<h1>Merry Christmas in Japanese</h1>',
  '<p>Merry Christmas is simply <span lang="ja">メリークリスマス</span> (<i>merī kurisumasu</i>). Christmas in Japan isn\'t a religious or family holiday, and December 25 is a normal working day. '
  'Christmas Eve is a night for couples, families order a strawberry <span lang="ja">クリスマスケーキ</span>, and fried chicken from KFC has been a Christmas dinner since the 1970s. '
  'The family holiday comes a week later: <a href="/phrases/happy-new-year-in-japanese/">New Year</a>.</p>',
  table(['Japanese', 'Reading', 'Romaji', 'Meaning'], [('メリークリスマス', 'メリークリスマス', 'merī kurisumasu', 'Merry Christmas'),
   ('クリスマスイブ', 'クリスマスイブ', 'kurisumasu ibu', 'Christmas Eve'), ('クリスマスケーキ', 'クリスマスケーキ', 'kurisumasu kēki', 'Christmas cake (strawberry shortcake)'),
   ('サンタさん', 'サンタさん', 'santa-san', 'Santa'), ('トナカイ', 'トナカイ', 'tonakai', 'reindeer'), ('プレゼント', 'プレゼント', 'purezento', 'present'),
   ('イルミネーション', 'イルミネーション', 'iruminēshon', 'Christmas lights displays'), ('雪', 'ゆき', 'yuki', 'snow'), ('聖夜', 'せいや', 'seiya', 'holy night (songs, cards)'),
   ('冬休み', 'ふゆやすみ', 'fuyuyasumi', 'winter holidays'), ('忘年会', 'ぼうねんかい', 'bōnenkai', 'end-of-year party with colleagues')]),
  more('merry-christmas-in-japanese'), CTA]))

# ---- hub ----
rows = [
 ('こんにちは', 'konnichiwa', 'hello (daytime)', 'hello-in-japanese'),
 ('おはようございます', 'ohayō gozaimasu', 'good morning', 'good-morning-in-japanese'),
 ('こんばんは', 'konbanwa', 'good evening', 'good-night-in-japanese'),
 ('おやすみなさい', 'oyasumi nasai', 'good night', 'good-night-in-japanese'),
 ('さようなら', 'sayōnara', 'goodbye', 'goodbye-in-japanese'),
 ('じゃあね / またね', 'jā ne / mata ne', 'see you', 'goodbye-in-japanese'),
 ('ありがとうございます', 'arigatō gozaimasu', 'thank you', 'thank-you-in-japanese'),
 ('いえいえ', 'ie ie', 'you\'re welcome; not at all', 'thank-you-in-japanese'),
 ('すみません', 'sumimasen', 'excuse me; sorry', 'sorry-in-japanese'),
 ('ごめんなさい', 'gomen nasai', 'I\'m sorry', 'sorry-in-japanese'),
 ('お元気ですか', 'o-genki desu ka', 'how are you?', 'how-are-you-in-japanese'),
 ('元気です', 'genki desu', 'I\'m fine', 'how-are-you-in-japanese'),
 ('はじめまして', 'hajimemashite', 'nice to meet you', 'hello-in-japanese'),
 ('よろしくお願いします', 'yoroshiku onegai shimasu', 'said after introducing yourself: "I look forward to working with you"', None),
 ('はい / いいえ', 'hai / iie', 'yes / no', 'yes-and-no-in-japanese'),
 ('お願いします', 'onegai shimasu', 'please (when asking for something)', 'please-in-japanese'),
 ('ください', 'kudasai', 'please give me (after a noun: 水をください)', 'please-in-japanese'),
 ('大丈夫です', 'daijōbu desu', 'it\'s OK; I\'m fine; no thanks', None),
 ('分かりました', 'wakarimashita', 'I understand; got it', None),
 ('分かりません', 'wakarimasen', 'I don\'t understand', None),
 ('もう一度お願いします', 'mō ichido onegai shimasu', 'once more, please', None),
 ('日本語を勉強しています', 'nihongo o benkyō shite imasu', 'I\'m studying Japanese', None),
 ('いくらですか', 'ikura desu ka', 'how much is it?', None),
 ('トイレはどこですか', 'toire wa doko desu ka', 'where is the toilet?', None),
 ('いただきます', 'itadakimasu', 'said before eating', 'thank-you-in-japanese'),
 ('ごちそうさまでした', 'gochisōsama deshita', 'said after eating: thanks for the meal', 'thank-you-in-japanese'),
 ('いってきます', 'ittekimasu', 'leaving home: "I\'m off"', 'goodbye-in-japanese'),
 ('ただいま', 'tadaima', 'coming home: "I\'m home"', 'hello-in-japanese'),
 ('お疲れさまです', 'otsukaresama desu', 'hello / thanks for your work, between colleagues', 'goodbye-in-japanese'),
 ('おめでとうございます', 'omedetō gozaimasu', 'congratulations', 'happy-birthday-in-japanese'),
]
hub_rows = []
for ja, ro, mean, link in rows:
    m = mean + (f' · <a href="/phrases/{link}/">more</a>' if link else '')
    hub_rows.append((ja, ro, m))
page('phrases.md', '/phrases/', 'Basic Japanese phrases',
 'Basic Japanese phrases: 30 everyday phrases with romaji and meanings, plus 14 guides',
 'Basic Japanese phrases for beginners: hello, thank you, sorry, goodbye, please, excuse me, how much, I don\'t understand and more, with romaji, meanings and guides to when each is used.',
 '\n'.join(['<h1>Basic Japanese phrases</h1>',
  '<p>Thirty everyday Japanese phrases with romaji and meanings, from <span lang="ja">こんにちは</span> to <span lang="ja">ごちそうさまでした</span>. '
  'The ones with a guide have more ways to say the same thing and when each fits, because in Japanese the right phrase depends on who you\'re talking to.</p>',
  '<p><b>Guides:</b> ' + ' · '.join(f'<a href="/phrases/{s}/">{l} in Japanese</a>' for s, l in GUIDES) + '</p>',
  table(['Japanese', 'Romaji', 'Meaning'], hub_rows),
  '<p>More: <a href="/japanese-words/">basic Japanese words</a> · <a href="/hiragana-chart/">hiragana chart</a> · <a href="/katakana-chart/">katakana chart</a> · <a href="/study/topics/greetings/">greetings and set phrases from past puzzles</a> · '
  '<a href="/study/topics/numbers/">numbers</a> · <a href="/study/topics/days-months/">days of the week and months</a> · <a href="/study/topics/">all vocabulary topics</a></p>',
  '<p lang="es">En español: <a href="/es/frases-en-japones/">Frases en japonés</a></p>',
  CTA]), extra_fm='alternates:\n  - lang: es\n    url: /es/frases-en-japones/\n')
print('ok')
