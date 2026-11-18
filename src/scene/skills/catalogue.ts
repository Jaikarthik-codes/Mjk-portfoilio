/**
 * Real constellations, for the Skills section: one per skill group.
 *
 * Positions are J2000 right ascension (hours, minutes, seconds) and
 * declination (degrees, arcminutes, arcseconds), magnitudes are visual (smaller
 * = brighter), and the lines are the usual stick figures. Skills go on the
 * brightest stars, brightest first.
 *
 * `atlas` names the faint figure drawn behind the stars (public/atlas/), from
 * Sidney Hall's "Urania's Mirror" (1824, public domain — see CREDITS.md).
 */

export interface CatalogueStar {
  name: string
  /** Right ascension [h, m, s]. */
  ra: [number, number, number]
  /** Declination [±d, m, s]; the sign of the degrees applies to all three. */
  dec: [number, number, number]
  /** Apparent visual magnitude. */
  mag: number
}

export interface CatalogueConstellation {
  id: string
  name: string
  stars: CatalogueStar[]
  /** Pairs of star names joined by a line. */
  lines: [string, string][]
}

export const CONSTELLATIONS: CatalogueConstellation[] = [
  {
    id: 'orion',
    name: 'Orion',
    stars: [
      { name: 'Betelgeuse', ra: [5, 55, 10.3], dec: [7, 24, 25], mag: 0.5 },
      { name: 'Rigel', ra: [5, 14, 32.3], dec: [-8, 12, 6], mag: 0.13 },
      { name: 'Bellatrix', ra: [5, 25, 7.9], dec: [6, 20, 59], mag: 1.64 },
      { name: 'Mintaka', ra: [5, 32, 0.4], dec: [-0, 17, 57], mag: 2.23 },
      { name: 'Alnilam', ra: [5, 36, 12.8], dec: [-1, 12, 7], mag: 1.69 },
      { name: 'Alnitak', ra: [5, 40, 45.5], dec: [-1, 56, 34], mag: 1.77 },
      { name: 'Saiph', ra: [5, 47, 45.4], dec: [-9, 40, 11], mag: 2.06 },
      { name: 'Meissa', ra: [5, 35, 8.3], dec: [9, 56, 3], mag: 3.39 },
    ],
    lines: [
      ['Betelgeuse', 'Meissa'],
      ['Meissa', 'Bellatrix'],
      ['Betelgeuse', 'Alnitak'],
      ['Bellatrix', 'Mintaka'],
      ['Mintaka', 'Alnilam'],
      ['Alnilam', 'Alnitak'],
      ['Alnitak', 'Saiph'],
      ['Mintaka', 'Rigel'],
    ],
  },
  {
    id: 'ursa-major',
    name: 'Ursa Major',
    stars: [
      { name: 'Dubhe', ra: [11, 3, 43.7], dec: [61, 45, 3], mag: 1.79 },
      { name: 'Merak', ra: [11, 1, 50.5], dec: [56, 22, 57], mag: 2.37 },
      { name: 'Phecda', ra: [11, 53, 49.8], dec: [53, 41, 41], mag: 2.44 },
      { name: 'Megrez', ra: [12, 15, 25.6], dec: [57, 1, 57], mag: 3.31 },
      { name: 'Alioth', ra: [12, 54, 1.7], dec: [55, 57, 35], mag: 1.77 },
      { name: 'Mizar', ra: [13, 23, 55.5], dec: [54, 55, 31], mag: 2.23 },
      { name: 'Alkaid', ra: [13, 47, 32.4], dec: [49, 18, 48], mag: 1.86 },
    ],
    lines: [
      ['Dubhe', 'Merak'],
      ['Merak', 'Phecda'],
      ['Phecda', 'Megrez'],
      ['Megrez', 'Dubhe'],
      ['Megrez', 'Alioth'],
      ['Alioth', 'Mizar'],
      ['Mizar', 'Alkaid'],
    ],
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    stars: [
      { name: 'Schedar', ra: [0, 40, 30.4], dec: [56, 32, 14], mag: 2.24 },
      { name: 'Caph', ra: [0, 9, 10.7], dec: [59, 8, 59], mag: 2.28 },
      { name: 'Navi', ra: [0, 56, 42.5], dec: [60, 43, 0], mag: 2.47 },
      { name: 'Ruchbah', ra: [1, 25, 48.9], dec: [60, 14, 7], mag: 2.68 },
      { name: 'Segin', ra: [1, 54, 23.7], dec: [63, 40, 12], mag: 3.37 },
    ],
    lines: [
      ['Caph', 'Schedar'],
      ['Schedar', 'Navi'],
      ['Navi', 'Ruchbah'],
      ['Ruchbah', 'Segin'],
    ],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    stars: [
      { name: 'Deneb', ra: [20, 41, 25.9], dec: [45, 16, 49], mag: 1.25 },
      { name: 'Sadr', ra: [20, 22, 13.7], dec: [40, 15, 24], mag: 2.23 },
      { name: 'Aljanah', ra: [20, 46, 12.7], dec: [33, 58, 13], mag: 2.48 },
      { name: 'Fawaris', ra: [19, 44, 58.5], dec: [45, 7, 51], mag: 2.87 },
      { name: 'Albireo', ra: [19, 30, 43.3], dec: [27, 57, 35], mag: 3.08 },
      { name: 'Zeta Cygni', ra: [21, 12, 56.2], dec: [30, 13, 37], mag: 3.21 },
      { name: 'Eta Cygni', ra: [19, 56, 18.4], dec: [35, 5, 1], mag: 3.89 },
    ],
    lines: [
      ['Deneb', 'Sadr'],
      ['Sadr', 'Eta Cygni'],
      ['Eta Cygni', 'Albireo'],
      ['Fawaris', 'Sadr'],
      ['Sadr', 'Aljanah'],
      ['Aljanah', 'Zeta Cygni'],
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    stars: [
      { name: 'Regulus', ra: [10, 8, 22.3], dec: [11, 58, 2], mag: 1.36 },
      { name: 'Algieba', ra: [10, 19, 58.4], dec: [19, 50, 29], mag: 2.01 },
      { name: 'Denebola', ra: [11, 49, 3.6], dec: [14, 34, 19], mag: 2.14 },
      { name: 'Zosma', ra: [11, 14, 6.5], dec: [20, 31, 25], mag: 2.56 },
      { name: 'Ras Elased', ra: [9, 45, 51.1], dec: [23, 46, 27], mag: 2.98 },
      { name: 'Chertan', ra: [11, 14, 14.4], dec: [15, 25, 46], mag: 3.33 },
      { name: 'Adhafera', ra: [10, 16, 41.4], dec: [23, 25, 2], mag: 3.44 },
      { name: 'Eta Leonis', ra: [10, 7, 19.9], dec: [16, 45, 45], mag: 3.48 },
      { name: 'Rasalas', ra: [9, 52, 45.8], dec: [26, 0, 25], mag: 3.88 },
    ],
    lines: [
      ['Regulus', 'Eta Leonis'],
      ['Eta Leonis', 'Algieba'],
      ['Algieba', 'Adhafera'],
      ['Adhafera', 'Rasalas'],
      ['Rasalas', 'Ras Elased'],
      ['Algieba', 'Zosma'],
      ['Zosma', 'Denebola'],
      ['Denebola', 'Chertan'],
      ['Chertan', 'Regulus'],
    ],
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    stars: [
      { name: 'Antares', ra: [16, 29, 24.5], dec: [-26, 25, 55], mag: 0.96 },
      { name: 'Shaula', ra: [17, 33, 36.5], dec: [-37, 6, 14], mag: 1.62 },
      { name: 'Sargas', ra: [17, 37, 19.1], dec: [-42, 59, 52], mag: 1.86 },
      { name: 'Dschubba', ra: [16, 0, 20.0], dec: [-22, 37, 18], mag: 2.29 },
      { name: 'Larawag', ra: [16, 50, 9.8], dec: [-34, 17, 36], mag: 2.29 },
      { name: 'Girtab', ra: [17, 42, 29.3], dec: [-39, 1, 48], mag: 2.39 },
      { name: 'Acrab', ra: [16, 5, 26.2], dec: [-19, 48, 19], mag: 2.62 },
      { name: 'Lesath', ra: [17, 30, 45.8], dec: [-37, 17, 45], mag: 2.7 },
      { name: 'Paikauhale', ra: [16, 35, 53.0], dec: [-28, 12, 58], mag: 2.82 },
      { name: 'Fang', ra: [15, 58, 51.1], dec: [-26, 6, 51], mag: 2.89 },
      { name: 'Alniyat', ra: [16, 21, 11.3], dec: [-25, 35, 34], mag: 2.9 },
      { name: 'Iota Scorpii', ra: [17, 47, 35.1], dec: [-40, 7, 37], mag: 2.99 },
      { name: 'Xamidimura', ra: [16, 51, 52.2], dec: [-38, 2, 51], mag: 3.04 },
      { name: 'Eta Scorpii', ra: [17, 12, 9.2], dec: [-43, 14, 21], mag: 3.33 },
      { name: 'Zeta Scorpii', ra: [16, 54, 35.0], dec: [-42, 21, 41], mag: 3.62 },
    ],
    lines: [
      ['Acrab', 'Dschubba'],
      ['Dschubba', 'Fang'],
      ['Dschubba', 'Alniyat'],
      ['Alniyat', 'Antares'],
      ['Antares', 'Paikauhale'],
      ['Paikauhale', 'Larawag'],
      ['Larawag', 'Xamidimura'],
      ['Xamidimura', 'Zeta Scorpii'],
      ['Zeta Scorpii', 'Eta Scorpii'],
      ['Eta Scorpii', 'Sargas'],
      ['Sargas', 'Iota Scorpii'],
      ['Iota Scorpii', 'Girtab'],
      ['Girtab', 'Shaula'],
      ['Shaula', 'Lesath'],
    ],
  },
]

/** Right ascension and declination in radians. */
export function toRadians(star: CatalogueStar): { ra: number; dec: number } {
  const [h, m, s] = star.ra
  const [d, am, as] = star.dec
  // "-0°17′" has to stay negative even though -0 === 0.
  const sign = d < 0 || Object.is(d, -0) ? -1 : 1
  const ra = ((h + m / 60 + s / 3600) / 24) * Math.PI * 2
  const dec = ((sign * (Math.abs(d) + am / 60 + as / 3600)) / 180) * Math.PI
  return { ra, dec }
}

/**
 * Projects stars onto a flat chart centred on the constellation (a gnomonic
 * projection, the one star atlases use for small areas). North is up and, as
 * seen from Earth, east is to the left. Units: radians on the sky.
 */
export function projectStars(stars: CatalogueStar[]): [number, number][] {
  const points = stars.map(toRadians)
  // Centre on the middle of the figure (RA wraps around 24h, so average unit vectors).
  let cx = 0
  let cy = 0
  let decSum = 0
  for (const p of points) {
    cx += Math.cos(p.ra)
    cy += Math.sin(p.ra)
    decSum += p.dec
  }
  const ra0 = Math.atan2(cy, cx)
  const dec0 = decSum / points.length

  return points.map(({ ra, dec }) => {
    const cosC = Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(ra - ra0)
    const x = (Math.cos(dec) * Math.sin(ra - ra0)) / cosC
    const y = (Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(ra - ra0)) / cosC
    return [-x, y]
  })
}
