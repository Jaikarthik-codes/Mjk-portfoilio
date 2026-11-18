# Mirror of src/scene/skills/catalogue.ts (positions only), parsed from the TS file.
import re, math
def load(path=__file__.rsplit('/', 3)[0] + '/src/scene/skills/catalogue.ts'):
    s = open(path).read()
    cons = {}
    for block in re.finditer(r"id: '([\w-]+)',\s*name: '([^']+)',\s*stars: \[(.*?)\],\s*lines: \[(.*?)\],\s*\}", s, re.S):
        cid, name, stars, lines = block.groups()
        st = []
        for m in re.finditer(r"name: '([^']+)', ra: \[([^\]]+)\], dec: \[([^\]]+)\], mag: ([\d.]+)", stars):
            ra = [float(v) for v in m.group(2).split(',')]
            dtxt = [v.strip() for v in m.group(3).split(',')]
            sign = -1 if dtxt[0].startswith('-') else 1
            d = [abs(float(v)) for v in dtxt]
            st.append((m.group(1), (ra[0]+ra[1]/60+ra[2]/3600)/24*2*math.pi, sign*(d[0]+d[1]/60+d[2]/3600)*math.pi/180, float(m.group(4))))
        ln = re.findall(r"\['([^']+)', '([^']+)'\]", lines)
        cons[cid] = {'name': name, 'stars': st, 'lines': ln}
    return cons
def project(stars):
    cx = sum(math.cos(s[1]) for s in stars); cy = sum(math.sin(s[1]) for s in stars)
    ra0 = math.atan2(cy, cx); dec0 = sum(s[2] for s in stars)/len(stars)
    out = {}
    for name, ra, dec, mag in stars:
        cosc = math.sin(dec0)*math.sin(dec) + math.cos(dec0)*math.cos(dec)*math.cos(ra-ra0)
        x = math.cos(dec)*math.sin(ra-ra0)/cosc
        y = (math.cos(dec0)*math.sin(dec) - math.sin(dec0)*math.cos(dec)*math.cos(ra-ra0))/cosc
        out[name] = complex(-x, y)
    return out
