# Fits sky → plate (similarity, optionally mirrored) from hand-picked star positions,
# and draws the predicted positions of every star and line on the plate to check.
import sys, json, numpy as np
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from catalogue import load, project
from PIL import Image, ImageDraw
cid, plate, picks_json, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
picks = json.loads(picks_json)
con = load()[cid]
sky = project(con['stars'])
im = Image.open(plate).convert('RGB'); W, H = im.size
names = list(picks)
P = np.array([complex(picks[n][0]*W, -picks[n][1]*H) for n in names])   # plate, y up
best = None
for mirror in (False, True):
    S = np.array([sky[n].conjugate() if mirror else sky[n] for n in names])
    M = np.stack([S, np.ones_like(S)], 1)
    (a, b), *_ = np.linalg.lstsq(M, P, rcond=None)
    res = np.abs(M @ np.array([a, b]) - P)
    if best is None or res.mean() < best[3].mean(): best = (mirror, a, b, res)
mirror, a, b, res = best
print(f"{cid}: mirror={mirror} rotation={np.degrees(np.angle(a)):.1f}deg scale={abs(a):.1f}px/rad residuals(px)={np.round(res,1).tolist()} (plate {W}x{H})")
def to_plate(z):
    z = z.conjugate() if mirror else z
    p = a*z + b
    return p.real, -p.imag
d = ImageDraw.Draw(im)
for s1, s2 in con['lines']:
    d.line([to_plate(sky[s1]), to_plate(sky[s2])], fill=(0, 140, 255), width=4)
for name, *_ in con['stars']:
    x, y = to_plate(sky[name]); r = 22
    d.ellipse([x-r, y-r, x+r, y+r], outline=(255, 0, 80), width=5)
for n in names:
    x, y = picks[n][0]*W, picks[n][1]*H
    d.line([(x-30, y), (x+30, y)], fill=(0, 200, 0), width=4); d.line([(x, y-30), (x, y+30)], fill=(0, 200, 0), width=4)
scale = 1000/max(W, H)
im.resize((round(W*scale), round(H*scale))).save(out)
json.dump({'mirror': mirror, 'a': [a.real, a.imag], 'b': [b.real, b.imag], 'W': W, 'H': H}, open(out.replace('.png', '.json'), 'w'))
