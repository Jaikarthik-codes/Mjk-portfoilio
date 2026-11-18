# Star-atlas figures

How `public/atlas/*.webp` and the numbers in `src/scene/skills/atlas.ts` were made.

The figures are plates from Sidney Hall's *Urania's Mirror* (London, 1824),
public domain; the scans are the Library of Congress's, via Wikimedia Commons
(`source` in `plates.json`; 1920 px thumbnails were used).

For each plate, `plates.json` lists a few stars picked by eye on the plate
(`picks`, as fractions of the image), the crop around the figure, and
rectangles to paint out (the names of neighbouring constellations).

1. `grid.py plate.jpg preview.png` — draws a grid on the plate, for picking stars.
2. `fit.py <id> plate.jpg '<picks as JSON>' fit.png` — fits sky → plate (rotation,
   scale, offset) from the picks, against the real positions in
   `src/scene/skills/catalogue.ts`, and draws every catalogue star on the plate
   to check the fit (it writes `fit.json` beside `fit.png`).
3. `process.py <id> plate.jpg fit.json '<crop>' public/atlas/<id>.webp '<erase>'`
   — turns the engraving into light lines on black, fades its edges, and prints
   the `rotation` and `box` for `atlas.ts`.

Needs Python 3 with numpy and Pillow.
