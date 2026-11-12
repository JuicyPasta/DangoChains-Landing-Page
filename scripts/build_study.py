#!/usr/bin/env python3
"""Build the study pages (BACKLOG #25): one page per past day with all three boards'
groups, readings and English meanings behind a spoiler gate, plus a hub at /study/.

Reads the published feed (feed/v1/{tier}/{YYYY-MM}.json) and writes Jekyll pages:
  study/index.html               hub, newest month first
  study/YYYY-MM-DD/index.html    one page per day, epoch .. --through
  study/topics/, study/jlpt/     topic pages and JLPT N5-N1 word lists (boards 8+ days old)

Only days strictly before today (America/New_York) are published by default, so the
current daily is never spoiled. Re-run after every feed rebuild and on each sweep:
  python3 scripts/build_study.py            # through yesterday ET
  python3 scripts/build_study.py --check    # exit 1 if pages are missing or stale
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEED = os.path.join(ROOT, 'feed', 'v1')
OUT = os.path.join(ROOT, 'study')
TIERS = ['easy', 'medium', 'hard']
TIER_NAMES = {'easy': 'Easy', 'medium': 'Normal', 'hard': 'Hard'}
TIER_BLURB = {
    'easy': 'everyday words, mostly kana',
    'medium': 'about JLPT N4 to N3',
    'hard': 'N2 and up: idioms, 熟語 and readings',
}
LEVEL_MARK = {'easy': '🔴', 'medium': '🟠', 'hard': '🟢', 'expert': '⚪'}
LEVEL_NAME = {'easy': 'easiest', 'medium': 'second', 'hard': 'third', 'expert': 'trickiest'}

e = html.escape


def load_feed():
    """{date: {tier: (puzzle, readings)}} for every board in the feed."""
    days = {}
    with open(os.path.join(FEED, 'index.json'), encoding='utf-8') as f:
        index = json.load(f)
    for tier in TIERS:
        for month in index['tiers'][tier]:
            with open(os.path.join(FEED, tier, month + '.json'), encoding='utf-8') as f:
                data = json.load(f)
            readings = data.get('readings') or {}
            for p in data['puzzles']:
                days.setdefault(p['date'], {})[tier] = (p, readings)
    return days


def long_date(d):
    return d.strftime('%A, %B ') + str(d.day) + d.strftime(', %Y')


def short_date(d):
    return d.strftime('%B ') + str(d.day)


def is_kana(ch):
    o = ord(ch)
    return 0x3040 <= o <= 0x30FF or ch in 'ー・〜'


def segments(word, notation):
    """Split the feed's bracket furigana ("お宮参[みやまい]り") into [(text, reading or None)],
    the same way assets/js/dango-board.js parseBracket does."""
    if not notation or '[' not in notation:
        return [(word, None)]
    out, last = [], 0
    for m in re.finditer(r'([^\[\]]*)\[([^\[\]]*)\]', notation):
        chars = list(m.group(1))
        i = len(chars)
        while i > 0 and not is_kana(chars[i - 1]):
            i -= 1
        lead, core = ''.join(chars[:i]), ''.join(chars[i:])
        if not core:
            core, lead = m.group(1), ''
        if lead:
            out.append((lead, None))
        if core:
            out.append((core, m.group(2) or None))
        last = m.end()
    if last < len(notation):
        out.append((notation[last:], None))
    if ''.join(t for t, _ in out) != word:  # notation doesn't spell the word: show it plain
        return [(word, None)]
    return out


def kana(word, notation):
    return ''.join(r or t for t, r in segments(word, notation))


def ruby(word, notation):
    parts = []
    for t, r in segments(word, notation):
        parts.append(f'<ruby>{e(t)}<rt>{e(r)}</rt></ruby>' if r else e(t))
    return f'<span lang="ja">{"".join(parts)}</span>'


def board_section(date, tier, puzzle, readings):
    num = puzzle.get('number')
    title = f'{TIER_NAMES[tier]} #{num}' if num else TIER_NAMES[tier]
    play = f'/play/?d={date}&amp;t={tier}'
    words = [w for c in puzzle['categories'] for w in c['words']]
    order = sorted(words, key=lambda w: kana(w, readings.get(w)))
    out = [f'<section class="st-board" id="{tier}">',
           f'<h2>{e(title)} <small>({e(TIER_BLURB[tier])})</small></h2>',
           # Normal and Hard play with furigana off (readings can be the trick), so their word lists show no readings.
           '<p class="st-words" lang="ja">The 16 words: '
           + '、'.join(ruby(w, readings.get(w)) if tier == 'easy' else f'<span lang="ja">{e(w)}</span>'
                      for w in (order if tier == 'easy' else sorted(words))) + '</p>',
           f'<p><a class="st-play" href="{play}" target="_self">Play this board first</a></p>',
           '<details class="st-answers">',
           f'<summary>Show the four groups (spoilers for {e(title)})</summary>']
    for c in puzzle['categories']:
        lvl = c.get('difficulty', '')
        name_jp = c.get('nameJp')
        head = e(c['name']) + (f' <span lang="ja">（{e(name_jp)}）</span>' if name_jp else '')
        out.append(f'<h3>{LEVEL_MARK.get(lvl, "")} {head}</h3>')
        out.append(group_table(c, readings))
        slug = topic_of(c['name'])
        if slug:
            h1 = next(t[3] for t in TOPICS if t[0] == slug)
            out.append(f'<p class="st-src">More like this: <a href="/study/topics/{slug}/" target="_self">{e(h1)}</a></p>')
    out += ['</details>', '</section>']
    return '\n'.join(out)


STYLE = """<style>
.st-board{margin:1.6em 0 2.2em}
.st-board h2 small{font-weight:normal;font-size:.6em;color:#666}
.st-words{font-size:1.15em;line-height:2.2}
.st-answers summary{cursor:pointer;font-weight:bold;color:#E8892E;padding:.4em 0}
.st-table{border-collapse:collapse;margin:.3em 0 1em;width:100%}
.st-table th,.st-table td{border-bottom:1px solid #e6e6e6;padding:.35em .5em;text-align:left;vertical-align:top}
.st-table td[lang=ja]{font-size:1.1em;white-space:nowrap}
.st-nav{display:flex;justify-content:space-between;gap:1em;margin:2em 0 1em;flex-wrap:wrap}
.st-cta{background:#f6f2ea;border-radius:12px;padding:1em 1.2em;margin:2em 0}
.st-months h2{margin-top:1.4em}
.st-days{display:flex;flex-wrap:wrap;gap:.4em .9em;padding:0;list-style:none}
.st-src{font-size:.9em;color:#666;margin-top:-.4em}
.st-group{font-size:1.25em;margin-top:1.6em}
.st-topics li{margin:.3em 0}
</style>"""

CTA = ('<div class="st-cta"><p><b>Play tomorrow\'s boards when they open.</b> Three new puzzles every day at '
       '<a href="/play/" target="_self">dangochains.com/play</a>, or keep a streak and collect dango in the app: '
       '<a class="playStoreLink" href="https://play.google.com/store/apps/details?id=com.jacksondarrow.dangochains&amp;referrer=utm_source%3Dstudy">Google Play</a> · '
       '<a class="appStoreLink" href="https://apps.apple.com/app/id6757343508">App Store</a>. '
       'The app\'s one-time archive unlock plays every past board.</p></div>')


def front_matter(title, description, extra=''):
    t = title.replace('"', '\\"')
    d = description.replace('"', '\\"')
    return f'---\nlayout: page\ntitle: "{t}"\ndescription: "{d}"\nsitemap: true\n{extra}---\n'


def day_page(date, tiers, prev_date, next_date):
    d = dt.date.fromisoformat(date)
    nums = sorted({p.get('number') for p, _ in tiers.values() if p.get('number')})
    num = f' #{nums[0]}' if len(nums) == 1 else ''
    # Words, not group names: the words are on the board anyway, the groups are the spoiler.
    sample = [sorted((w for c in tiers[t][0]['categories'] for w in c['words']), key=lambda w: kana(w, tiers[t][1].get(w)))[0]
              for t in TIERS if t in tiers]
    sample += sorted((w for c in tiers[TIERS[-1]][0]['categories'] for w in c['words']) if TIERS[-1] in tiers else [])[:2]
    title = f'Answers for {short_date(d)}, {d.year}{(" (" + num.strip() + ")") if num else ""}: Japanese word groups with readings'
    desc = (f'All three DangoChains boards for {long_date(d)} (Easy, Normal, Hard): 48 Japanese words with '
            f'readings and English meanings, sorted into their groups behind a spoiler gate. Words include '
            + '、'.join(dict.fromkeys(sample)) + '.')
    body = [front_matter(title, desc), '{% raw %}', STYLE,
            f'<h1>DangoChains{e(num)}: {e(long_date(d))}</h1>',
            '<p>Three Japanese word-grouping puzzles for learners: 16 words each, four hidden groups of four. '
            'Each board below lists its words with readings. Play it first, then open the groups to see the '
            'answers with English meanings. <a href="/how-to-play/" target="_self">How to play</a></p>']
    for t in TIERS:
        if t in tiers:
            p, r = tiers[t]
            body.append(board_section(date, t, p, r))
    nav = ['<nav class="st-nav">']
    nav.append(f'<a href="/study/{prev_date}/" target="_self">← {e(short_date(dt.date.fromisoformat(prev_date)))}</a>' if prev_date else '<span></span>')
    nav.append('<a href="/study/" target="_self">All past puzzles</a>')
    nav.append(f'<a href="/study/{next_date}/" target="_self">{e(short_date(dt.date.fromisoformat(next_date)))} →</a>' if next_date else '<span></span>')
    nav.append('</nav>')
    body += ['\n'.join(nav), CTA,
             '<p><small>Meanings are short glosses written for each puzzle. Readings follow the app\'s furigana.</small></p>',
             '{% endraw %}']
    return '\n'.join(body) + '\n'


def hub_page(dates):
    by_month = {}
    for date in dates:
        by_month.setdefault(date[:7], []).append(date)
    title = 'Past puzzles: answers, readings and meanings'
    desc = ('Every past DangoChains board, day by day: Japanese word groups for learners with readings and English '
            'meanings, behind spoiler gates. Easy, Normal and Hard for each day since January 2026.')
    body = [front_matter(title, desc), '{% raw %}', STYLE,
            '<h1>Past puzzles</h1>',
            f'<p>{len(dates)} days of DangoChains, three boards a day. Each page lists the 16 words of every board with '
            'readings, then the four groups with English meanings behind a spoiler gate. Today\'s boards are at '
            '<a href="/play/" target="_self">Play</a>; the last 7 days are free to play there.</p>',
            '<p><b>By topic:</b> <a href="/study/topics/" target="_self">counters, kanji readings, keigo, wasei-eigo, '
            'loanwords, abbreviations and more</a></p>',
            '<p><b>By JLPT level:</b> <a href="/study/jlpt/n5/" target="_self">N5</a> · '
            '<a href="/study/jlpt/n4/" target="_self">N4</a> · <a href="/study/jlpt/n3/" target="_self">N3</a> · '
            '<a href="/study/jlpt/n2/" target="_self">N2</a> · <a href="/study/jlpt/n1/" target="_self">N1</a></p>',
            '<div class="st-months">']
    for month in sorted(by_month, reverse=True):
        m = dt.date.fromisoformat(month + '-01')
        body.append(f'<h2>{m.strftime("%B %Y")}</h2><ul class="st-days">')
        for date in sorted(by_month[month], reverse=True):
            d = dt.date.fromisoformat(date)
            body.append(f'<li><a href="/study/{date}/" target="_self">{e(short_date(d))}</a></li>')
        body.append('</ul>')
    body += ['</div>', CTA, '{% endraw %}']
    return '\n'.join(body) + '\n'


# ---------- topic pages (/study/topics/<slug>/) ----------
# Each topic collects every past group whose English name matches its pattern. Topic pages show answers
# openly, so they only use boards at least TOPIC_LAG_DAYS old: the web daily keeps the last 7 days playable.
TOPIC_LAG_DAYS = 8
TOPICS = [
    # slug, pattern on the group name, page title, h1, intro
    ('counters', r'^Counted with|\b[Cc]ounters?\b',
     'Japanese counters with examples (本, 枚, 羽, 台 and more)', 'Japanese counters',
     'Japanese counts things with counter words chosen by shape or kind: 本 for long thin things, 枚 for flat ones, '
     '羽 for birds (and, traditionally, rabbits). Each group below is four words that take the same counter.'),
    ('special-readings', r'[Ss]pecial readings?|read as a whole',
     'Special readings (jukujikun): 今日, 果物, 眼鏡, 二十歳…', 'Special readings (熟字訓)',
     'Some words are read as a whole, not kanji by kanji: 果物 is くだもの, 二十歳 is はたち. Learn them as units.'),
    ('kanji-readings', r'\bread [぀-ヿ]|\bread as\b',
     'Kanji with unusual readings: example words', 'Kanji read an unusual way',
     'Most kanji have several readings. Each group below shares one kanji or sound read the same, often unexpected, way.'),
    ('two-readings', r'[Tt]wo readings',
     'Japanese words with two readings and two meanings (人気, 一日, 最中…)', 'One spelling, two readings, two meanings',
     'These words are written the same but change meaning with their reading, like 人気 (にんき, popularity; ひとけ, signs of people).'),
    ('collocations', r'^Things you ',
     'Japanese verb collocations: what you 打つ, 結ぶ, 交わす and more', 'Japanese verb collocations',
     'Japanese verbs pair with nouns in ways English doesn\'t: you 打つ an email and an injection, and 結ぶ a contract. '
     'Each group below is four things that go with the same verb.'),
    ('wasei-eigo', r'Made-in-Japan English|[Ww]asei',
     'Wasei-eigo: made-in-Japan English words with meanings', 'Wasei-eigo (和製英語): made-in-Japan English',
     'These look like English but were coined in Japan, and an English speaker may not understand them.'),
    ('loanwords', r'^From (?:German|French|Portuguese|Dutch|Italian|Spanish|Korean|Chinese|Russian|Sanskrit|Ainu)',
     'Japanese loanwords from German, French, Portuguese and Dutch', 'Japanese loanwords that aren\'t from English',
     'Katakana isn\'t only English. Medicine and mountaineering came from German, bread from Portuguese, beer from Dutch.'),
    ('english-from-japanese', r'English borrowed|Japanese words English',
     'English words borrowed from Japanese', 'English words that came from Japanese',
     'Words English took from Japanese, with their original readings and meanings.'),
    ('abbreviations', r'^Shortened',
     'Japanese abbreviations: 就活, 部活, 終電, スマホ and more', 'Japanese abbreviations (略語)',
     'Japanese clips long words and phrases: 就職活動 becomes 就活, スマートフォン becomes スマホ.'),
    ('keigo', r'[Hh]umble|[Hh]onorific|[Kk]eigo|kenjougo|sonkeigo|[Rr]espectful',
     'Keigo verbs: humble (謙譲語) and honorific (尊敬語) forms', 'Keigo: humble and honorific verbs',
     'Polite Japanese swaps everyday verbs for humble forms (about yourself) or honorific forms (about others).'),
    ('idioms', r'[Ii]diom|四字|[Ff]our-character|[Pp]roverb|ことわざ',
     'Japanese idioms and proverbs, grouped', 'Japanese idioms and proverbs',
     'Groups of idioms and proverbs that share a word or an idea.'),
    ('false-friends', r"(?:that|which) (?:isn't|aren't|don't|doesn't)|n't about|not about",
     'Kanji that don\'t mean what they look like (目 that isn\'t an eye…)', 'Kanji that don\'t mean what they look like',
     'A kanji\'s everyday meaning can mislead: 猫背 isn\'t about cats and 目次 isn\'t about eyes.'),
    ('hidden-words', r'^Hidden|\bhides?\b',
     'Hidden words: Japanese words with another word inside', 'Hidden words',
     'Each word hides a smaller one: セミナー hides セミ (cicada), 危ない hides あぶ (horsefly).'),
    ('palindromes', r'[Pp]alindrome',
     'Japanese palindromes (回文) in kana', 'Japanese palindromes (回文)',
     'Words that read the same backwards in kana.'),
    # Everyday-vocabulary topics (2026-11-11). After the wordplay topics, so a group keeps its older page.
    ('onomatopoeia', r'[Oo]nomatop|[Mm]imetic|[Ss]ound words|\b(?:[Aa]nimal|[Kk]itchen|[Vv]ehicle|[Rr]ain|[Ww]ind|[Ww]eather|[Ee]veryday) sounds\b|擬音|擬態|オノマトペ',
     'Japanese onomatopoeia: animal and everyday sounds (モー, ケロケロ, ジュージュー…)', 'Japanese onomatopoeia (擬音語)',
     'Japanese has a set word for most sounds: a cow says モー, a frog ケロケロ, and a frying pan goes ジュージュー. '
     'Each group below is four sound words that belong together.'),
    ('body-parts', r'\b[Bb]ody\b|\b[Ff]ace\b',
     'Japanese body parts vocabulary: 首, 背中, ひざ, 鼻 and more', 'Body parts in Japanese',
     'Words for the body and the face, grouped the way the puzzles use them. Some groups play with the words, '
     'like words that start with a body part.'),
    ('weather', r'[Ww]eather|[Rr]ainy season|\b[Ss]ky\b|[Ss]torm|\b[Ss]now\b|\b[Rr]ain\b|[Tt]yphoon',
     'Japanese weather words: 雨, 雪, 台風, 梅雨, 虹 and more', 'Weather and sky words in Japanese',
     'Rain, storms, the rainy season (梅雨) and what you see in the sky, grouped.'),
    ('animals', r'\b[Aa]nimals?\b|\b[Bb]irds?\b|[Cc]reatures|[Zz]odiac|\b[Ii]nsects?\b|\b[Ff]ish\b|[Pp]ets?\b',
     'Animals in Japanese: 犬, 牛, うさぎ, ペンギン, クジラ and more', 'Animals in Japanese',
     'Pets, zoo and farm animals, birds, insects and sea creatures. Animal names are written in kanji, hiragana '
     'or katakana, and all three are common.'),
    ('food', r'\b[Ff]oods?\b|[Vv]egetables?|\b[Ff]ruits?\b|[Ss]weets|\b[Dd]rinks\b|[Ss]ushi|[Tt]oppings|\b[Dd]ishes\b|[Ss]nacks|[Bb]ento|[Ss]easonings?',
     'Japanese food vocabulary: vegetables, fruit, sweets and drinks', 'Food and drink in Japanese',
     'Vegetables, fruit, Japanese sweets, drinks, sushi toppings and seasonings, grouped.'),
    ('school', r'[Ss]chool|[Cc]lassroom|[Ss]ubjects\b',
     'Japanese school vocabulary: 黒板, 宿題, 国語, 運動会 and more', 'School words in Japanese',
     'School subjects, classroom things and school events: the vocabulary of every Japanese school story.'),
    ('clothes', r'\b[Cc]lothes\b|[Cc]lothing|[Ff]ootwear|[Ww]orn (?:with|on|at)|\b(?:[Ww]inter|[Ss]ummer) wear\b',
     'Japanese clothes vocabulary, and which verb to wear them with (着る, はく, かぶる)', 'Clothes in Japanese',
     'Japanese uses different verbs for wearing: 着る for the upper body, はく for shoes and trousers, かぶる for hats. '
     'The groups below cover clothes, footwear and what goes with each verb.'),
    ('family', r'\b[Ff]amily\b(?! names?)',
     'Japanese family words: 父, 母, 祖父, 孫, いとこ and more', 'Family words in Japanese',
     'Japanese has two sets of family words: plain ones for your own family (父, 母) and polite ones for someone '
     'else\'s (お父さん, お母さん). The groups below cover both.'),
    ('opposites', r'[Oo]pposite',
     'Japanese words made of opposite kanji: 売買, 左右, 勝負, 出入り…', 'Words built from opposites',
     'Japanese often joins two opposites into one word: 売買 (buying and selling), 左右 (left and right), '
     '勝負 (a match: win or lose). Each group below is built on opposites.'),
]


def topic_of(name):
    for slug, pat, *_ in TOPICS:
        if re.search(pat, name):
            return slug
    return None


def collect_topics(days, through):
    """{slug: [(date, tier, category, readings)]}, newest first, one entry per distinct word set."""
    cutoff = (dt.date.fromisoformat(through) - dt.timedelta(days=TOPIC_LAG_DAYS - 1)).isoformat()
    found = {slug: {} for slug, *_ in TOPICS}
    for date in sorted(days, reverse=True):
        if date >= cutoff:
            continue
        for tier in TIERS:
            if tier not in days[date]:
                continue
            puzzle, readings = days[date][tier]
            for c in puzzle['categories']:
                slug = topic_of(c['name'])
                if slug:
                    found[slug].setdefault(frozenset(c['words']), (date, tier, c, readings))
    return {slug: list(groups.values()) for slug, groups in found.items()}


def group_table(c, readings):
    rows = ['<table class="st-table"><thead><tr><th>Word</th><th>Reading</th><th>Meaning</th></tr></thead><tbody>']
    glosses = c.get('glosses') or [''] * len(c['words'])
    for w, g in zip(c['words'], glosses):
        r = kana(w, readings.get(w))
        rows.append(f'<tr><td lang="ja">{e(w)}</td><td lang="ja">{e(r if r != w else "")}</td><td>{e(g or "")}</td></tr>')
    rows.append('</tbody></table>')
    return '\n'.join(rows)


# Hand-written reference sections shown above a topic's puzzle groups (searchers want the basics first).
COUNTER_ROWS = [
    ('人', 'にん', 'people', '三人（さんにん）; but 一人（ひとり）, 二人（ふたり）'),
    ('本', 'ほん', 'long, thin things: pens, bottles, umbrellas, trains', '一本（いっぽん）, 三本（さんぼん）'),
    ('枚', 'まい', 'flat, thin things: paper, shirts, plates, tickets', '二枚（にまい）'),
    ('冊', 'さつ', 'books, notebooks, magazines', '一冊（いっさつ）'),
    ('台', 'だい', 'machines and vehicles: cars, bikes, TVs', '二台（にだい）'),
    ('個', 'こ', 'small, compact things: apples, eggs, erasers', '一個（いっこ）'),
    ('匹', 'ひき', 'small animals: cats, dogs, fish, insects', '一匹（いっぴき）, 三匹（さんびき）'),
    ('頭', 'とう', 'large animals: cows, horses, elephants', '一頭（いっとう）'),
    ('羽', 'わ', 'birds (and, traditionally, rabbits)', '一羽（いちわ）, 三羽（さんば）'),
    ('杯', 'はい', 'cupfuls and bowlfuls; also squid and crabs', '一杯（いっぱい）, 三杯（さんばい）'),
    ('足', 'そく', 'pairs of shoes and socks', '一足（いっそく）, 三足（さんぞく）'),
    ('軒', 'けん', 'houses and shops', '一軒（いっけん）, 三軒（さんげん）'),
    ('階', 'かい', 'floors of a building', '三階（さんがい）'),
    ('回', 'かい', 'times, occurrences', '二回（にかい）'),
    ('つ', 'つ', 'general things, one to nine', '一つ（ひとつ）, 二つ（ふたつ）, 三つ（みっつ）'),
]


def counters_reference():
    rows = ['<h2>Common Japanese counters</h2>',
            '<p>The counter goes after the number, and the two often change sound together: 一本 is いっぽん, '
            '三本 is さんぼん. When you don\'t know the counter, the native つ series works for most things up to nine.</p>',
            '<table class="st-table"><thead><tr><th>Counter</th><th>Reading</th><th>Used for</th><th>Examples</th></tr></thead><tbody>']
    for c, r, use, ex in COUNTER_ROWS:
        rows.append(f'<tr><td lang="ja">{e(c)}</td><td lang="ja">{e(r)}</td><td>{e(use)}</td><td lang="ja">{e(ex)}</td></tr>')
    rows += ['</tbody></table>', '<h2>Counters in DangoChains puzzles</h2>']
    return '\n'.join(rows)


KEIGO_ROWS = [
    ('する', 'なさる', 'いたす'),
    ('行く', 'いらっしゃる', '参る（まいる）、伺う（うかがう: to visit）'),
    ('来る', 'いらっしゃる、お見えになる、お越しになる', '参る（まいる）'),
    ('いる', 'いらっしゃる', 'おる'),
    ('言う', 'おっしゃる', '申す（もうす）、申し上げる'),
    ('見る', 'ご覧になる（ごらんになる）', '拝見する（はいけんする）'),
    ('食べる・飲む', '召し上がる（めしあがる）', 'いただく'),
    ('知っている', 'ご存じだ（ごぞんじだ）', '存じている（ぞんじている）'),
    ('会う', 'お会いになる', 'お目にかかる（おめにかかる）'),
    ('聞く', 'お聞きになる', '伺う（うかがう）、拝聴する（はいちょうする）'),
    ('あげる', '—', '差し上げる（さしあげる）'),
    ('もらう', '—', 'いただく'),
    ('くれる', 'くださる', '—'),
    ('寝る', 'お休みになる（おやすみになる）', '—'),
]


def keigo_reference():
    rows = ['<h2>Common keigo verbs</h2>',
            '<p>Honorific verbs (尊敬語) raise the person doing the action, usually a customer, a boss or a guest. '
            'Humble verbs (謙譲語) lower yourself or your side. Verbs without a special form use the patterns '
            'お〜になる (honorific) and お〜する (humble): お待ちになる, お待ちする.</p>',
            '<table class="st-table"><thead><tr><th>Plain</th><th>Honorific (尊敬語)</th><th>Humble (謙譲語)</th></tr></thead><tbody>']
    for plain, hon, hum in KEIGO_ROWS:
        rows.append(f'<tr><td lang="ja">{e(plain)}</td><td lang="ja">{e(hon)}</td><td lang="ja">{e(hum)}</td></tr>')
    rows += ['</tbody></table>', '<h2>Keigo in DangoChains puzzles</h2>']
    return '\n'.join(rows)


ONOMATOPOEIA_ROWS = [
    ('ワンワン', 'a dog barking'), ('ニャー', 'a cat meowing'), ('モー', 'a cow mooing'),
    ('コケコッコー', 'a rooster crowing'), ('ケロケロ', 'a frog croaking'), ('ブーブー', 'a pig oinking; grumbling'),
    ('ザーザー', 'heavy rain pouring'), ('シトシト', 'light, steady rain'), ('ゴロゴロ', 'thunder rumbling; lazing around'),
    ('キラキラ', 'sparkling, glittering'), ('ドキドキ', 'a pounding heart: nerves or excitement'),
    ('ワクワク', 'excited anticipation'), ('ニコニコ', 'smiling'), ('イライラ', 'irritated'),
    ('フワフワ', 'soft and fluffy'), ('ペラペラ', 'speaking a language fluently'),
]


def onomatopoeia_reference():
    rows = ['<h2>Common Japanese onomatopoeia</h2>',
            '<p>Japanese has two kinds: 擬音語 imitate real sounds (a dog\'s ワンワン, rain\'s ザーザー), and 擬態語 '
            'describe states and feelings that make no sound (キラキラ for sparkle, ドキドキ for a racing heart). '
            'Many are doubled, and most work as adverbs: 雨がザーザー降る.</p>',
            '<table class="st-table"><thead><tr><th>Word</th><th>Meaning</th></tr></thead><tbody>']
    for w, m in ONOMATOPOEIA_ROWS:
        rows.append(f'<tr><td lang="ja">{e(w)}</td><td>{e(m)}</td></tr>')
    rows += ['</tbody></table>', '<h2>Onomatopoeia in DangoChains puzzles</h2>']
    return '\n'.join(rows)


TOPIC_EXTRAS = {'counters': counters_reference, 'keigo': keigo_reference, 'onomatopoeia': onomatopoeia_reference}


def topic_page(slug, groups):
    _, _, title, h1, intro = next(t for t in TOPICS if t[0] == slug)
    words = [w for _, _, c, _ in groups for w in c['words']]
    desc = (f'{len(groups)} groups of Japanese words with readings and English meanings from DangoChains puzzles. '
            + intro.split('. ')[0].rstrip('.') + '. Examples: ' + '、'.join(dict.fromkeys(words[:6])) + '.')
    body = [front_matter(title, desc), '{% raw %}', STYLE,
            f'<h1>{e(h1)}</h1>', f'<p>{e(intro)} Every group comes from a past DangoChains puzzle; '
            f'{len(groups)} so far, newest first.</p>']
    if slug in TOPIC_EXTRAS:
        body.append(TOPIC_EXTRAS[slug]())
    for date, tier, c, readings in groups:
        name_jp = c.get('nameJp')
        head = e(c['name']) + (f' <span lang="ja">（{e(name_jp)}）</span>' if name_jp else '')
        body.append(f'<h2 class="st-group">{head}</h2>')
        body.append(group_table(c, readings))
        d = dt.date.fromisoformat(date)
        body.append(f'<p class="st-src">From the {TIER_NAMES[tier]} board of '
                    f'<a href="/study/{date}/#{tier}" target="_self">{e(short_date(d))}, {d.year}</a></p>')
    body += ['<p><a href="/study/topics/" target="_self">All topics</a> · <a href="/study/" target="_self">All past puzzles</a></p>',
             CTA, '{% endraw %}']
    return '\n'.join(body) + '\n'


def topics_index(topics):
    title = 'Japanese vocabulary by topic: counters, keigo, wasei-eigo and more'
    desc = ('Japanese word groups by topic, with readings and English meanings: counters, kanji readings, verb '
            'collocations, wasei-eigo, loanwords, abbreviations, keigo, idioms and more.')
    body = [front_matter(title, desc), '{% raw %}', STYLE, '<h1>Japanese vocabulary by topic</h1>',
            '<p>Every group from past DangoChains puzzles, sorted by the kind of trick it plays. Each word has its '
            'reading and an English meaning.</p>', '<ul class="st-topics">']
    for slug, _, title_t, h1, _ in TOPICS:
        if topics.get(slug):
            body.append(f'<li><a href="/study/topics/{slug}/" target="_self">{e(h1)}</a> ({len(topics[slug])} groups)</li>')
    body += ['</ul>', '<p><b>By JLPT level:</b> <a href="/study/jlpt/" target="_self">N5 to N1 word lists</a></p>',
             CTA, '{% endraw %}']
    return '\n'.join(body) + '\n'


# ---------- JLPT pages (/study/jlpt/ and /study/jlpt/n5/ .. n1/) ----------
# Words from past boards (same lag as the topic pages) matched to Jonathan Waller's JLPT level
# estimates (scripts/data/jlpt-waller.tsv, CC BY). A word counts only when its spelling is in the list
# and the list's reading agrees with the puzzle's, so a homograph never gets another word's level.
JLPT_FILE = os.path.join(ROOT, 'scripts', 'data', 'jlpt-waller.tsv')
JLPT_LEVELS = [5, 4, 3, 2, 1]
JLPT_SOURCE = ('<p><small>The JLPT publishes no official vocabulary list. Levels are estimates from Jonathan Waller\'s '
               '<a href="http://www.tanos.co.uk/jlpt/">JLPT Resources</a> (CC BY), matched to past DangoChains words by '
               'spelling and reading. Meanings are short glosses written for each puzzle.</small></p>')


def _norm_reading(r):
    return re.sub(r'[()（）〜~・\s.]', '', r or '')


def _hira(text):
    return ''.join(chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ヶ' else ch for ch in text)


def load_jlpt():
    """{word: [(reading, level)]} from the TSV."""
    table = {}
    if not os.path.exists(JLPT_FILE):
        return table
    with open(JLPT_FILE, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            word, reading, level = line.rstrip('\n').split('\t')
            table.setdefault(word, []).append((_norm_reading(reading), int(level)))
    return table


def jlpt_level(word, reading, table):
    entries = table.get(word)
    if not entries:
        return None
    want = _hira(_norm_reading(reading))
    levels = {lvl for r, lvl in entries if _hira(r) == want}
    return max(levels) if levels else None  # max = easiest (N5 = 5)


def collect_jlpt(days, through, table):
    """{level: {word: dict(reading, meaning, date, tier, count)}}, newest sighting kept."""
    cutoff = (dt.date.fromisoformat(through) - dt.timedelta(days=TOPIC_LAG_DAYS - 1)).isoformat()
    found = {lvl: {} for lvl in JLPT_LEVELS}
    for date in sorted(days, reverse=True):
        if date >= cutoff:
            continue
        for tier in TIERS:
            if tier not in days[date]:
                continue
            puzzle, readings = days[date][tier]
            for c in puzzle['categories']:
                glosses = c.get('glosses') or [''] * len(c['words'])
                for w, g in zip(c['words'], glosses):
                    r = kana(w, readings.get(w))
                    lvl = jlpt_level(w, r, table)
                    if lvl is None:
                        continue
                    hit = found[lvl].get(w)
                    if hit:
                        hit['count'] += 1
                    else:
                        found[lvl][w] = {'reading': r, 'meaning': g or '', 'date': date, 'tier': tier, 'count': 1}
    return found


def jlpt_nav(current=None):
    links = []
    for lvl in JLPT_LEVELS:
        label = f'N{lvl}'
        links.append(f'<b>{label}</b>' if lvl == current else f'<a href="/study/jlpt/n{lvl}/" target="_self">{label}</a>')
    return '<p class="st-jlpt-nav">JLPT levels: ' + ' · '.join(links) + ' · <a href="/study/jlpt/" target="_self">All</a></p>'


def jlpt_page(lvl, words):
    items = sorted(words.items(), key=lambda kv: (_hira(kv[1]['reading']), kv[0]))
    n = len(items)
    title = f'JLPT N{lvl} vocabulary: {n} words with readings and meanings'
    examples = '、'.join(w for w, _ in items[:6])
    desc = (f'{n} JLPT N{lvl} words from DangoChains daily Japanese puzzles, each with its reading, an English meaning '
            f'and the puzzle it appeared in. Examples: {examples}.')
    body = [front_matter(title, desc), '{% raw %}', STYLE,
            f'<h1>JLPT N{lvl} words in DangoChains puzzles</h1>',
            f'<p>{n} words estimated at JLPT N{lvl} that have appeared on past DangoChains boards, with their readings and '
            'English meanings. Each links to the day it was played, where you can try the whole board and see how the '
            'groups worked. <a href="/play/" target="_self">Today\'s puzzles</a> mix words from every level.</p>',
            jlpt_nav(lvl),
            '<table class="st-table"><thead><tr><th>Word</th><th>Reading</th><th>Meaning</th><th>Played</th></tr></thead><tbody>']
    for w, h in items:
        d = dt.date.fromisoformat(h['date'])
        seen = (f'<a href="/study/{h["date"]}/#{h["tier"]}" target="_self">{e(short_date(d))}, {d.year}</a>'
                + (f' <small>+{h["count"] - 1} more</small>' if h['count'] > 1 else ''))
        reading = h['reading'] if h['reading'] != w else ''
        body.append(f'<tr><td lang="ja">{e(w)}</td><td lang="ja">{e(reading)}</td><td>{e(h["meaning"])}</td><td>{seen}</td></tr>')
    body += ['</tbody></table>', jlpt_nav(lvl), JLPT_SOURCE, CTA, '{% endraw %}']
    return '\n'.join(body) + '\n'


def jlpt_index(found):
    total = sum(len(v) for v in found.values())
    title = 'JLPT vocabulary by level, N5 to N1, from DangoChains puzzles'
    desc = (f'{total} Japanese words from DangoChains daily puzzles sorted by estimated JLPT level, N5 to N1, '
            'with readings and English meanings.')
    body = [front_matter(title, desc), '{% raw %}', STYLE, '<h1>JLPT vocabulary by level</h1>',
            f'<p>{total} words from past DangoChains boards, sorted by estimated JLPT level. Each list has readings, '
            'English meanings and a link to the puzzle the word appeared in.</p>', '<ul class="st-topics">']
    for lvl in JLPT_LEVELS:
        if found.get(lvl):
            body.append(f'<li><a href="/study/jlpt/n{lvl}/" target="_self">JLPT N{lvl} words</a> ({len(found[lvl])})</li>')
    body += ['</ul>', '<p><a href="/study/topics/" target="_self">Vocabulary by topic</a> · '
             '<a href="/study/" target="_self">All past puzzles</a></p>', JLPT_SOURCE, CTA, '{% endraw %}']
    return '\n'.join(body) + '\n'


def render(through):
    days = load_feed()
    dates = sorted(d for d in days if d <= through)
    files = {os.path.join(OUT, 'index.html'): hub_page(dates)}
    for i, date in enumerate(dates):
        prev_date = dates[i - 1] if i else None
        next_date = dates[i + 1] if i + 1 < len(dates) else None
        files[os.path.join(OUT, date, 'index.html')] = day_page(date, days[date], prev_date, next_date)
    topics = collect_topics(days, through)
    files[os.path.join(OUT, 'topics', 'index.html')] = topics_index(topics)
    for slug, groups in topics.items():
        if groups:
            files[os.path.join(OUT, 'topics', slug, 'index.html')] = topic_page(slug, groups)
    jlpt = collect_jlpt(days, through, load_jlpt())
    if any(jlpt.values()):
        files[os.path.join(OUT, 'jlpt', 'index.html')] = jlpt_index(jlpt)
        for lvl, words in jlpt.items():
            if words:
                files[os.path.join(OUT, 'jlpt', f'n{lvl}', 'index.html')] = jlpt_page(lvl, words)
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--through', help='last date to publish (default: yesterday, America/New_York)')
    ap.add_argument('--check', action='store_true', help='exit 1 if any page is missing or stale; write nothing')
    a = ap.parse_args()
    through = a.through or (dt.datetime.now(ZoneInfo('America/New_York')).date() - dt.timedelta(days=1)).isoformat()
    files = render(through)
    stale = []
    for path, text in files.items():
        old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
        if old != text:
            stale.append(path)
            if not a.check:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(text)
    # Never publish a day after `through` (e.g. after a clock or argument mistake).
    extra = [d for d in os.listdir(OUT) if len(d) == 10 and d[4] == '-' and d > through] if os.path.isdir(OUT) else []
    for d in extra:
        print(f'warning: study/{d}/ is after --through {through}; remove it by hand', file=sys.stderr)
    print(f'{sum(1 for f in files if os.path.basename(os.path.dirname(f))[:2] == "20")} day pages through {through}; {len(stale)} {"stale" if a.check else "written"}')
    if a.check and stale:
        sys.exit(1)


if __name__ == '__main__':
    main()
