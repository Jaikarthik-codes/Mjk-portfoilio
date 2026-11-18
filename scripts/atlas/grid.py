import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
crop = [float(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0, 0, 1, 1]
im = Image.open(src).convert('RGB')
W, H = im.size
box = (int(crop[0]*W), int(crop[1]*H), int(crop[2]*W), int(crop[3]*H))
im = im.crop(box)
scale = 1000 / max(im.size)
im = im.resize((round(im.width*scale), round(im.height*scale)))
d = ImageDraw.Draw(im)
# grid every 0.05 of the FULL image, labelled in full-image fractions
for i in range(21):
    f = i / 20
    x = (f*W - box[0]) * scale
    y = (f*H - box[1]) * scale
    if 0 <= x < im.width:
        d.line([(x, 0), (x, im.height)], fill=(0, 160, 255), width=1)
        d.text((x+2, 2), f"{f:.2f}", fill=(0, 90, 200))
    if 0 <= y < im.height:
        d.line([(0, y), (im.width, y)], fill=(255, 60, 0), width=1)
        d.text((2, y+2), f"{f:.2f}", fill=(200, 40, 0))
im.save(out)
