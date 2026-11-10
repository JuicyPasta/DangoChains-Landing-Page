#!/usr/bin/env python3
"""Build assets/data/readings-jmdict.json: kana readings for JMdict's common words, the maker's
fallback after the app's own dictionary (assets/data/readings.json wins on overlap).

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
import sys
import unicodedata

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'data', 'readings-jmdict.json')
SKIP_KANJI_TAGS = {'iK', 'oK', 'rK', 'sK', 'ateji'}
SKIP_KANA_TAGS = {'ik', 'ok', 'rk', 'sk'}


def reading_for(form, kana):
    """First kana that applies to `form`, common ones first."""
    ok = [k for k in kana
          if not (set(k.get('tags', [])) & SKIP_KANA_TAGS)
          and ('*' in k.get('appliesToKanji', ['*']) or form in k.get('appliesToKanji', []))]
    ok.sort(key=lambda k: not k.get('common'))
    return ok[0]['text'] if ok else ''


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8') as f:
        doc = json.load(f)
    readings = {}
    for w in doc['words']:
        for k in w.get('kanji', []):
            if set(k.get('tags', [])) & SKIP_KANJI_TAGS:
                continue
            form = unicodedata.normalize('NFKC', k['text'])
            r = reading_for(k['text'], w.get('kana', []))
            if r and form not in readings:
                readings[form] = r
    out = {'version': 1,
           'source': f"JMdict (EDRDG) common entries via jmdict-simplified {doc.get('version')}, dict date {doc.get('dictDate')}",
           'license': 'CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html)',
           'count': len(readings),
           'readings': dict(sorted(readings.items()))}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(readings)} readings -> {os.path.relpath(OUT)}')


if __name__ == '__main__':
    main()
