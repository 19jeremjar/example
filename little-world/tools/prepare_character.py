#!/usr/bin/env python3
"""
Turn a character picture into a Little World sprite.

    python3 tools/prepare_character.py path/to/garfield.jpg garfield
    python3 tools/prepare_character.py path/to/buzz.jpg buzz --checker

What it does:
  1. Removes a plain white/grey background, or (with --checker) a fake
     "transparency" checkerboard baked into a JPG, including the pockets
     enclosed by arms and legs.
  2. Trims to the character and adds the scene's thick warm-brown outline.
  3. Saves public/characters/<id>.webp at 640 px tall.

Already-transparent PNGs work too (step 1 is skipped where alpha exists).
Requires: pip install pillow numpy scipy opencv-python-headless
"""
import argparse
import pathlib

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUTLINE_RGB = (58, 42, 28)


def remove_background(rgb: np.ndarray, checker: bool) -> np.ndarray:
    mx, mn = rgb.max(2), rgb.min(2)
    sat = mx - mn
    bgish = (sat < (24 if checker else 28)) & (mx > (185 if checker else 200))
    lab, n = ndi.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    if checker:
        # Enclosed checkerboard pockets: big regions mixing ~white and ~light-grey squares.
        for i in range(1, n + 1):
            m = lab == i
            if m.sum() < 1500 or i in border:
                continue
            v = mx[m]
            if (v > 243).mean() > 0.12 and ((v > 190) & (v < 222)).mean() > 0.12:
                bg |= m
        # Soft grey drop shadow under the feet.
        h = rgb.shape[0]
        rows = np.arange(h)[:, None].repeat(rgb.shape[1], 1)
        shadow = (sat < 26) & (mx > 70) & (rows > h * 0.82)
        lab2, _ = ndi.label(shadow | bg)
        ids = np.unique(lab2[bg])
        bg = np.isin(lab2, ids[ids > 0]) & (shadow | bg)
    fg = ~bg
    lab3, n3 = ndi.label(fg)
    if n3 == 0:
        raise SystemExit('Nothing left after background removal; try without --checker.')
    sizes = ndi.sum(fg, lab3, range(1, n3 + 1))
    keep = np.zeros(n3 + 1, bool)
    keep[1:] = sizes > sizes.max() * 0.003
    fg = ndi.binary_opening(keep[lab3], iterations=1)
    return cv2.GaussianBlur(fg.astype(np.float32), (3, 3), 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('id', help='character id, e.g. garfield, buzz')
    ap.add_argument('--checker', action='store_true', help='background is a baked-in checkerboard')
    args = ap.parse_args()

    im = Image.open(args.src).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.int16)
    has_alpha = (arr[:, :, 3] < 250).mean() > 0.05
    alpha = arr[:, :, 3] / 255.0 if has_alpha else remove_background(rgb, args.checker)

    ys, xs = np.where(alpha > 0.5)
    crop = np.dstack([arr[:, :, :3], (alpha * 255).astype(np.uint8)])[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    pad = 12
    sprite = Image.new('RGBA', (crop.shape[1] + pad * 2, crop.shape[0] + pad * 2), (0, 0, 0, 0))
    sprite.paste(Image.fromarray(crop, 'RGBA'), (pad, pad))

    a = np.array(sprite)[:, :, 3]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    ring = cv2.GaussianBlur(cv2.dilate((a > 100).astype(np.uint8) * 255, k), (3, 3), 0)
    outline = np.zeros((*a.shape, 4), np.uint8)
    outline[..., :3] = OUTLINE_RGB
    outline[..., 3] = ring
    out = Image.fromarray(outline, 'RGBA')
    out.alpha_composite(sprite)
    out = out.resize((round(out.width * 640 / out.height), 640), Image.LANCZOS)

    dest = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'characters' / f'{args.id}.webp'
    out.save(dest, 'WEBP', quality=86, method=6)
    print(f'wrote {dest} ({out.width}x{out.height}, aspect {out.width / out.height:.3f})')


if __name__ == '__main__':
    main()
