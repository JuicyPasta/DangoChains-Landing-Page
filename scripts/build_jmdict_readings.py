#!/usr/bin/env python3
"""Build assets/data/readings-jmdict.json (kana readings) and assets/data/glosses-jmdict.json (short
English meanings) for JMdict's common words: the maker's fallback after the app's own dictionary
(assets/data/readings.json wins on overlap) and its meaning suggestions.

Input: jmdict-simplified's "jmdict-eng-common-<version>.json" (https://github.com/scriptin/jmdict-simplified
releases; JMdict © EDRDG, CC BY-SA 4.0, https://www.edrdg.org/edrdg/licence.html). Output:

  {"version": 1, "source": "...", "license": "CC BY-SA 4.0", "count": N,
   "readings": {"<kanji form, NFKC>": "<kana>"}}

Only kanji forms are kept (kana-only words need no reading). For each kanji form the reading is
the first kana form that applies to it, preferring common kana forms; irregular/outdated/search-only
kanji forms are skipped.

  python3 scripts/build_jmdict_readings.py /path/to/jmdict-eng-common-3.6.2.json
"""
import json
import os
import re
import sys
import unicodedata

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'data')
OUT = os.path.join(DATA, 'readings-jmdict.json')
GLOSS_OUT = os.path.join(DATA, 'glosses-jmdict.json')
GLOSS_MAX = 40
SKIP_KANJI_TAGS = {'iK', 'oK', 'rK', 'sK', 'ateji'}
SKIP_KANA_TAGS = {'ik', 'ok', 'rk', 'sk'}


def reading_for(form, kana):
    """First kana that applies to `form`, common ones first."""
    ok = [k for k in kana
          if not (set(k.get('tags', [])) & SKIP_KANA_TAGS)
          and ('*' in k.get('appliesToKanji', ['*']) or form in k.get('appliesToKanji', []))]
    ok.sort(key=lambda k: not k.get('common'))
    return ok[0]['text'] if ok else ''


def short_gloss(word, form, is_kanji):
    """First English gloss of the first sense that applies to `form`, without parentheticals,
    plus a second one if both fit in GLOSS_MAX characters."""
    key = 'appliesToKanji' if is_kanji else 'appliesToKana'
    for sense in word.get('sense', []):
        applies = sense.get(key, ['*'])
        if '*' not in applies and form not in applies:
            continue
        texts = [re.sub(r'\s*\([^)]*\)', '', g['text']).strip() for g in sense.get('gloss', []) if g.get('lang') == 'eng']
        texts = [t for t in texts if t]
        if not texts:
            continue
        out = texts[0] if len(texts[0]) <= GLOSS_MAX else texts[0][:GLOSS_MAX - 1].rstrip() + '…'
        if len(texts) > 1 and texts[1] != texts[0] and len(out) + 2 + len(texts[1]) <= GLOSS_MAX:
            out += '; ' + texts[1]
        return out
    return ''


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8') as f:
        doc = json.load(f)
    readings, glosses = {}, {}
    for w in doc['words']:
        for k in w.get('kana', []):
            form = unicodedata.normalize('NFKC', k['text'])
            if k.get('common') and form not in glosses and not (set(k.get('tags', [])) & SKIP_KANA_TAGS):
                g = short_gloss(w, k['text'], False)
                if g:
                    glosses[form] = g
        for k in w.get('kanji', []):
            if set(k.get('tags', [])) & SKIP_KANJI_TAGS:
                continue
            form = unicodedata.normalize('NFKC', k['text'])
            r = reading_for(k['text'], w.get('kana', []))
            if r and form not in readings:
                readings[form] = r
            if k.get('common') and form not in glosses:
                g = short_gloss(w, k['text'], True)
                if g:
                    glosses[form] = g
    out = {'version': 1,
           'source': f"JMdict (EDRDG) common entries via jmdict-simplified {doc.get('version')}, dict date {doc.get('dictDate')}",
           'license': 'CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html)',
           'count': len(readings),
           'readings': dict(sorted(readings.items()))}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(readings)} readings -> {os.path.relpath(OUT)}')
    gout = {'version': 1, 'source': out['source'], 'license': out['license'], 'count': len(glosses),
            'glosses': dict(sorted(glosses.items()))}
    with open(GLOSS_OUT, 'w', encoding='utf-8') as f:
        json.dump(gout, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(glosses)} glosses -> {os.path.relpath(GLOSS_OUT)}')


if __name__ == '__main__':
    main()
