#!/usr/bin/env python3
"""Build assets/data/readings.json, the maker's reading dictionary, from the app's furigana.yaml.

  {"version": 1, "source": "DangoChains assets/furigana.yaml", "count": N,
   "readings": {"<word, NFKC>": "<whole word in kana>"}}

* furigana.yaml maps a word to bracket notation: the reading in [] belongs to the run of
  non-kana characters right before it (お金[かね] -> おかね, 取[と]り消[け]し -> とりけし).
  This is the same parse as parseBracket() in assets/js/dango-board.js.
* Only words with a reading different from the word are kept (kana-only words need none).
* Entries whose notation spells a different word than their key are skipped (data errors).
* Keys are NFKC-normalized (１日 -> 1日); the maker looks words up the same way.

Usage (from the repo root):
  python3 scripts/build_readings.py
  python3 scripts/build_readings.py --furigana ~/code/Projects/DangoChains/assets/furigana.yaml --out assets/data/readings.json
"""
import argparse
import json
import os
import re
import sys
import unicodedata

import yaml

DEFAULT_FURIGANA = os.path.expanduser("~/code/Projects/DangoChains/assets/furigana.yaml")
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "data", "readings.json")
BRACKET = re.compile(r"([^\[\]]*)\[([^\[\]]*)\]")


def is_kana(ch):
    c = ord(ch)
    if c in (0x30F5, 0x30F6):  # ヵ ヶ sit inside compounds (一ヶ月): treat as kanji
        return False
    return 0x3041 <= c <= 0x309F or 0x30A0 <= c <= 0x30FF or 0xFF66 <= c <= 0xFF9F


def parse_bracket(s):
    """[(text, reading or None)], mirroring parseBracket() in dango-board.js."""
    out, last = [], 0
    for m in BRACKET.finditer(s):
        base, rt = m.group(1), m.group(2)
        i = len(base)
        while i > 0 and not is_kana(base[i - 1]):
            i -= 1
        lead, core = base[:i], base[i:]
        if not core:  # base ends in kana: the reading covers all of it
            lead, core = "", base
        if lead:
            out.append((lead, None))
        if core:
            out.append((core, rt or None))
        last = m.end()
    if last < len(s):
        out.append((s[last:], None))
    return out


def plain_reading(word, bracket):
    """The whole word in kana, or None when the notation doesn't spell `word`."""
    segs = parse_bracket(bracket)
    if "".join(t for t, _ in segs) != word:
        return None
    return "".join(r or t for t, r in segs)


def build(furigana_path):
    with open(furigana_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    readings, skipped = {}, []
    for word, bracket in data.items():
        word, bracket = str(word), str(bracket)
        if "[" not in bracket:
            continue  # kana-only (or no reading recorded)
        reading = plain_reading(word, bracket)
        if reading is None:
            skipped.append((word, bracket))
            continue
        if reading != word:
            readings.setdefault(unicodedata.normalize("NFKC", word), reading)
    return dict(sorted(readings.items())), skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--furigana", default=DEFAULT_FURIGANA)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()
    readings, skipped = build(args.furigana)
    doc = {"version": 1, "source": "DangoChains assets/furigana.yaml", "count": len(readings), "readings": readings}
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(readings)} readings -> {os.path.relpath(args.out)} ({os.path.getsize(args.out) // 1024} KB)")
    if skipped:
        print(f"skipped {len(skipped)} entries whose notation spells another word, e.g. {skipped[:3]}", file=sys.stderr)


if __name__ == "__main__":
    main()
