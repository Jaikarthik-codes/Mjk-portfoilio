# Turns a fitted atlas plate into a faint line-art figure (light engraving on black)
# and prints its placement for src/scene/skills/atlas.ts.
import sys, json, math, numpy as np
from PIL import Image
cid, plate, fitjson, crop, out = sys.argv[1], sys.argv[2], sys.argv[3], [float(v) for v in sys.argv[4].split(',')], sys.argv[5]
# Optional: rectangles (plate fractions x0,y0,x1,y1; ';'-separated) to paint out, e.g. neighbouring constellations' names.
erase = [[float(v) for v in r.split(',')] for r in sys.argv[6].split(';')] if len(sys.argv) > 6 and sys.argv[6] else []
fit = json.load(open(fitjson))
assert not fit['mirror'], 'mirrored plates are not handled'
a = complex(*fit['a']); b = complex(*fit['b']); W, H = fit['W'], fit['H']
im = Image.open(plate).convert('RGB')
x0, y0, x1, y1 = round(crop[0]*W), round(crop[1]*H), round(crop[2]*W), round(crop[3]*H)
im = im.crop((x0, y0, x1, y1))
s = 1024 / max(im.size)
im = im.resize((round(im.width*s), round(im.height*s)), Image.LANCZOS)
rgb = np.asarray(im).astype(np.float32) / 255
# The brightest channel: hand-coloured washes stay near paper-white, engraved lines go dark.
lum = rgb.max(axis=2)
paper, dark = np.percentile(lum, 88), np.percentile(lum, 0.5)
ink = np.clip((paper - lum) / (paper - dark), 0, 1) ** 1.15
# A noise floor, so the paper's own texture goes fully black.
ink = np.clip((ink - 0.07) / 0.93, 0, 1)
# Paint out the erase rectangles, with soft edges.
h, w = ink.shape
yy, xx = np.mgrid[0:h, 0:w]
px = x0 + (xx + 0.5) / w * (x1 - x0)
py = y0 + (yy + 0.5) / h * (y1 - y0)
feather = 0.012 * max(W, H)
for r in erase:
    dx = np.maximum(np.maximum(r[0]*W - px, px - r[2]*W), 0)
    dy = np.maximum(np.maximum(r[1]*H - py, py - r[3]*H), 0)
    inside = (px > r[0]*W) & (px < r[2]*W) & (py > r[1]*H) & (py < r[3]*H)
    outside = np.hypot(dx, dy)
    ink *= np.where(inside, 0, np.clip(outside / feather, 0, 1))
# Soft oval vignette, so the crop's edges (and neighbouring figures' labels) fade away.
r = np.hypot((xx + 0.5) / w * 2 - 1, (yy + 0.5) / h * 2 - 1)
ink *= 1 - np.clip((r - 0.72) / (1.0 - 0.72), 0, 1) ** 1.5
Image.fromarray((ink * 255).astype(np.uint8), 'L').save(out, 'WEBP', quality=80, method=6)
# Corners of the crop in the turned sky chart (radians): d = (p - b) / |a|.
def chart(px, py):
    d = (complex(px, -py) - b) / abs(a)
    return d.real, d.imag
left, top = chart(x0, y0); right, bottom = chart(x1, y1)
print(json.dumps({'id': cid, 'rotation': round(math.atan2(a.imag, a.real), 5), 'box': [round(v, 5) for v in (left, top, right, bottom)], 'size': [w, h]}))
