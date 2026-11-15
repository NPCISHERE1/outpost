#!/usr/bin/env python3
"""Stamp a small "SI-generated" mark on images and write the same note into the PNG metadata.

Usage:   python3 tools/watermark.py assets/new-scene.png [more.png ...]

- Big scenes get the mark in the top-left corner. Narrow sprites get a shorter mark at the bottom.
- Images that are already stamped are skipped, so running it twice is safe.
- Icons (favicon / apple-touch-icon) only get the metadata note: a visible mark would spoil them.
Change TEXT / TOOL below if you used a different generator.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo

TOOL = 'Google Gemini'
TEXT = ['SI-GENERATED: GEMINI', 'SI-GENERATED', 'SI-GEN', 'SI']   # longest first; the first that fits is used
NOTE = f'SI-generated image ({TOOL}). Visible watermark added for the NASA Space Apps Challenge SI-use rules.'
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'PressStart2P.ttf')     # pixel font (SIL Open Font License, see PressStart2P-OFL.txt)
MIN_VISIBLE = 64                                   # smaller than this: metadata only
ICON_WORDS = ('icon', 'favicon')                   # app icons: metadata only, a mark would spoil them


def stamp(path):
    im = Image.open(path)
    if im.info.get('si-watermark'):
        print('skip (already stamped):', path)
        return
    w, h = im.size
    base = im.convert('RGBA')
    visible = min(w, h) >= MIN_VISIBLE and not any(k in os.path.basename(path).lower() for k in ICON_WORDS)
    if visible:
        # font size scales with the picture (scenes by width, tall sprites by height)
        px = 8 * max(1, round(w / 1024 if w >= 600 else h / 300))
        try:
            font = ImageFont.truetype(FONT, px)
        except OSError:
            font = ImageFont.load_default()
        draw = ImageDraw.Draw(base)
        pad = max(3, px // 2)
        text = TEXT[-1]
        for t in TEXT:
            if draw.textlength(t, font=font) + pad * 2 <= w - 4:
                text = t
                break
        tw = int(draw.textlength(text, font=font))
        bw, bh = tw + pad * 2, px + pad * 2 - 1
        if w >= 600:                                          # a scene: top-left corner
            x, y = max(6, round(10 * w / 1024)), max(6, round(10 * w / 1024))
        else:                                                 # a sprite: centred at the bottom
            x, y = (w - bw) // 2, h - bh - 1
        layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rectangle([x, y, x + bw, y + bh], fill=(0, 0, 0, 165), outline=(255, 255, 255, 150))
        ld.text((x + pad, y + pad), text, font=font, fill=(255, 255, 255, 235))
        base = Image.alpha_composite(base, layer)
    out = base if im.mode in ('RGBA', 'LA') else base.convert('RGB')
    meta = PngInfo()
    meta.add_text('si-watermark', TOOL)
    meta.add_text('Description', NOTE)
    meta.add_text('Comment', NOTE)
    out.save(path, pnginfo=meta)
    print('stamped' if visible else 'metadata only', ':', path)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        stamp(p)
