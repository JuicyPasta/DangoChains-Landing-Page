#!/usr/bin/env python3
"""Build the site's share card, assets/og-card.png (1200x630).

Every page's og:image / twitter:image (see _includes/head.html), so it is what Reddit, X,
Discord and chat apps show for a dangochains.com link and for every shared result grid.

The mini board uses groups from past boards only (2026-09, nothing playable on the web),
so the card spoils nothing current.

Needs Pillow and the site's font, M PLUS Rounded 1c (SIL OFL), Bold + Medium:
    https://github.com/google/fonts/tree/main/ofl/mplusrounded1c
Usage:
    python3 scripts/build_og_card.py --fonts <dir with MPLUSRounded1c-*.ttf> [--out assets/og-card.png]
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
# Colours from DESIGN.md (light theme).
BG, TILE, INK, INK2, MUTED, LINK = "#FBF7EF", "#ECE6D8", "#25241F", "#4E4D43", "#6A685C", "#A3470A"
EASY = "#FF9FB2"

SOLVED = ("猫 words that aren't about cats", ["猫背", "猫舌", "猫ばば", "猫なで声"])
TILES = ["セミナー", "過労死", "ハト", "朝食",
         "絵文字", "ペンギン", "飲み物", "布団",
         "うさぎ", "危ない", "盆栽", "カラス"]


def font(dirpath, weight, size):
    return ImageFont.truetype(os.path.join(dirpath, f"MPLUSRounded1c-{weight}.ttf"), size)


def fit(draw, text, dirpath, weight, size, max_w):
    """Largest font size <= size whose rendering of text fits max_w."""
    while size > 10:
        f = font(dirpath, weight, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 1
    return font(dirpath, weight, size)


def dango(draw, x, y, r):
    """Four balls on a stick, bottom-left to top-right (the site's mark)."""
    colours = ["#FF9FB2", "#FFAD5C", "#B6CF6A", "#C8C8C8"]
    step = r * 1.25
    lw = max(3, r // 7)
    x0, y0 = x - step * 0.7, y + step * 0.7
    x1, y1 = x + step * 3 + step * 0.7, y - step * 3 - step * 0.7
    draw.line([(x0, y0), (x1, y1)], fill=INK, width=lw + 2)
    for i, c in enumerate(colours):
        cx, cy = x + step * i, y - step * i
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline=INK, width=lw)
        draw.arc([cx - r * 0.55, cy - r * 0.6, cx + r * 0.45, cy + r * 0.2], 200, 320, fill=INK, width=max(2, lw - 1))


def build(fonts, out):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Left: mark, name, pitch.
    left = 70
    dango(d, left + 40, 205, 30)
    d.text((left, 255), "DangoChains", font=font(fonts, "Bold", 70), fill=INK)
    d.text((left, 350), "A daily Japanese", font=font(fonts, "Bold", 40), fill=INK2)
    d.text((left, 398), "word puzzle", font=font(fonts, "Bold", 40), fill=INK2)
    d.text((left, 470), "16 words · 4 hidden groups", font=font(fonts, "Medium", 26), fill=MUTED)
    d.text((left, 506), "Easy, Normal, Hard every day", font=font(fonts, "Medium", 26), fill=MUTED)
    d.text((left, 552), "Free in your browser · dangochains.com", font=font(fonts, "Bold", 24), fill=LINK)

    # Right: a mini board, one group solved.
    bx, bw, gap = 610, 530, 12
    tw = (bw - 3 * gap) // 4
    th = 100
    solved_h = 118
    top = (H - (solved_h + 3 * th + 3 * gap)) // 2
    d.rounded_rectangle([bx, top, bx + bw, top + solved_h], radius=18, fill=EASY)
    title, words = SOLVED
    d.text((bx + bw / 2, top + 36), title, font=fit(d, title, fonts, "Bold", 26, bw - 40), fill=INK, anchor="mm")
    line = "・".join(words)
    d.text((bx + bw / 2, top + 82), line, font=fit(d, line, fonts, "Bold", 34, bw - 40), fill=INK, anchor="mm")
    y = top + solved_h + gap
    # One size for every tile (the longest word decides), like the game's own grid.
    tile_font = min((fit(d, w, fonts, "Bold", 32, tw - 18) for w in TILES), key=lambda f: f.size)
    for row in range(3):
        for col in range(4):
            x = bx + col * (tw + gap)
            d.rounded_rectangle([x, y, x + tw, y + th], radius=14, fill=TILE)
            word = TILES[row * 4 + col]
            d.text((x + tw / 2, y + th / 2), word, font=tile_font, fill=INK, anchor="mm")
        y += th + gap

    img.save(out, optimize=True)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "og-card.png"))
    a = ap.parse_args()
    print(build(a.fonts, os.path.abspath(a.out)))
