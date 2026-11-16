import { gaussian, type Rng } from '../../lib/random'
import { CONSTELLATION_SHAPE, PALETTE } from '../config'
import type { ConstellationField, Vec3 } from './constellationLayout'
import type { ShapeData } from './types'
import { createGradient, createShape, rgb, tintToward, type RGB } from './utils'

const WHITE = rgb(PALETTE.white)
/** Each constellation gets its own tint, cycling through this list. */
const HUES: RGB[] = [
  rgb(PALETTE.lavender),
  rgb(PALETTE.rose),
  rgb(PALETTE.mint),
  rgb(PALETTE.sky),
  rgb(PALETTE.gold),
]
const skyGradient = createGradient([rgb(PALETTE.indigo), rgb(PALETTE.sky), rgb(PALETTE.lavender)])

/**
 * A night sky with constellations in it.
 *
 * Three populations of particles:
 *   1. stars — tight, bright clumps at each star position, with a soft halo
 *   2. lines — a thin trail of dust along each connection
 *   3. sky   — faint background stars scattered around and behind the figures
 */
export function generateConstellation(
  count: number,
  field: ConstellationField,
  rng: Rng,
): ShapeData {
  const shape = createShape(count)

  // Flatten the field into simple lists we can pick from at random.
  const stars: { position: Vec3; hue: RGB }[] = []
  const lines: { from: Vec3; to: Vec3; hue: RGB }[] = []
  field.constellations.forEach((constellation, index) => {
    const hue = HUES[index % HUES.length]
    for (const star of constellation.stars) stars.push({ position: star.position, hue })
    for (const [a, b] of constellation.edges) {
      lines.push({
        from: constellation.stars[a].position,
        to: constellation.stars[b].position,
        hue,
      })
    }
  })

  const starShare = stars.length > 0 ? CONSTELLATION_SHAPE.starRatio : 0
  const lineShare = lines.length > 0 ? CONSTELLATION_SHAPE.lineRatio : 0

  for (let i = 0; i < count; i++) {
    const o = i * 3
    const pick = rng()
    let x: number
    let y: number
    let z: number

    if (pick < starShare) {
      // 1. A star. Most particles pack into a tiny bright core; the rest form its glow.
      const star = stars[Math.floor(rng() * stars.length)]
      const core = rng() < 0.6
      const spread = core ? 0.07 : 0.32
      x = star.position[0] + gaussian(rng) * spread
      y = star.position[1] + gaussian(rng) * spread
      z = star.position[2] + gaussian(rng) * spread

      shape.colors[o] = star.hue[0]
      shape.colors[o + 1] = star.hue[1]
      shape.colors[o + 2] = star.hue[2]
      if (core) tintToward(shape.colors, o, WHITE, 0.5)
      else scale(shape.colors, o, 0.55)
    } else if (pick < starShare + lineShare) {
      // 2. Dust along a connecting line.
      const line = lines[Math.floor(rng() * lines.length)]
      const along = rng()
      x = line.from[0] + (line.to[0] - line.from[0]) * along + gaussian(rng) * 0.035
      y = line.from[1] + (line.to[1] - line.from[1]) * along + gaussian(rng) * 0.035
      z = line.from[2] + (line.to[2] - line.from[2]) * along + gaussian(rng) * 0.035

      shape.colors[o] = line.hue[0] * 0.5
      shape.colors[o + 1] = line.hue[1] * 0.5
      shape.colors[o + 2] = line.hue[2] * 0.5
    } else {
      // 3. Background sky, wider than the figures and mostly behind them.
      x = (rng() - 0.5) * (field.width + 16)
      y = (rng() - 0.5) * (field.height + 10)
      z = gaussian(rng) * 3 - 1.5
      // Cubing the random number makes most background stars faint and a few bright.
      skyGradient(rng(), shape.colors, o, 0.22 + 0.5 * Math.pow(rng(), 3))
    }

    shape.positions[o] = x
    shape.positions[o + 1] = y
    shape.positions[o + 2] = z
  }

  return shape
}

function scale(out: Float32Array, offset: number, factor: number) {
  out[offset] *= factor
  out[offset + 1] *= factor
  out[offset + 2] *= factor
}
