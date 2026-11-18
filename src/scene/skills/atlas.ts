/**
 * The faint star-atlas figures drawn behind the constellations.
 *
 * Each is a plate from Sidney Hall's "Urania's Mirror" (London, 1824; public
 * domain, scans from the Library of Congress via Wikimedia Commons — see
 * CREDITS.md), turned into light engraving on black (public/atlas/).
 *
 * The numbers line each picture up with the real stars. They were found by
 * matching stars on the plate to the catalogue (scripts/atlas/):
 *   rotation — how far the sky chart (north up, east left) is turned so the
 *              figure stands upright as engraved, in radians
 *   box      — where the picture's left, top, right and bottom edges fall on
 *              that turned chart, in radians on the sky
 */
export interface AtlasFigure {
  url: string
  rotation: number
  box: [left: number, top: number, right: number, bottom: number]
}

export const ATLAS: Record<string, AtlasFigure> = {
  orion: { url: '/atlas/orion.webp', rotation: -0.01427, box: [-0.20693, 0.40012, 0.24029, -0.21937] },
  'ursa-major': { url: '/atlas/ursa-major.webp', rotation: -0.06635, box: [-0.34349, 0.29896, 0.64781, -0.41483] },
  cassiopeia: { url: '/atlas/cassiopeia.webp', rotation: 2.88956, box: [-0.19603, 0.26515, 0.15345, -0.19568] },
  cygnus: { url: '/atlas/cygnus.webp', rotation: 0.0808, box: [-0.34786, 0.44016, 0.26492, -0.16736] },
  leo: { url: '/atlas/leo.webp', rotation: 0.03236, box: [-0.39265, 0.16604, 0.39651, -0.475] },
  scorpius: { url: '/atlas/scorpius.webp', rotation: 0.16541, box: [-0.18793, 0.50209, 0.31836, -0.22352] },
}
