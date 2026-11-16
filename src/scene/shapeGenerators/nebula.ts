import { createNoise3D } from 'simplex-noise'
import { gaussian, type Rng } from '../../lib/random'
import { NEBULA_SHAPE, PALETTE } from '../config'
import type { ShapeData } from './types'
import { createGradient, createShape, rgb, smoothstep, tintToward } from './utils'

const WHITE = rgb(PALETTE.white)
const gasGradient = createGradient([
  rgb(PALETTE.indigo),
  rgb(PALETTE.violet),
  rgb(PALETTE.pink),
  rgb(PALETTE.teal),
])

/**
 * How many particles each accepted point becomes. Finding a point is the slow
 * part (several noise lookups), so dropping a few close neighbours around each
 * one makes generation about three times faster. The tiny clumps this creates
 * read as knots in the gas.
 */
const CLUMP_SIZE = 3
const CLUMP_SPREAD = 0.2

/**
 * A wispy gas cloud.
 *
 * How it works: imagine a 3D "density map" made of smooth noise, with bright
 * ridges where gas is thick and dark gaps where it is thin. We throw random
 * points into the cloud's volume and keep each one with a probability equal to
 * the density at that spot (rejection sampling). Thick areas keep most of their
 * points, thin areas keep few, and filaments appear.
 */
export function generateNebula(count: number, rng: Rng): ShapeData {
  const shape = createShape(count)
  const densityNoise = createNoise3D(rng)
  const colourNoise = createNoise3D(rng)
  const [rx, ry, rz] = NEBULA_SHAPE.radii

  // Safety net: if the noise is unusually sparse, stop being picky after this
  // many tries so the loop always finishes.
  const maxTries = count * 300
  let tries = 0
  let filled = 0

  while (filled < count) {
    // A random point inside a unit ball …
    const ux = rng() * 2 - 1
    const uy = rng() * 2 - 1
    const uz = rng() * 2 - 1
    const distSq = ux * ux + uy * uy + uz * uz
    if (distSq > 1) continue

    const picky = ++tries < maxTries
    const dist = Math.sqrt(distSq)

    // … thinning out toward the edge so the cloud has no hard outline.
    // (Checked first because it is far cheaper than the noise below.)
    const edgeFade = 1 - smoothstep(0.25, 1, dist)
    if (picky && rng() > edgeFade) continue

    // Stretch the ball into the cloud's ellipsoid.
    const x = ux * rx
    const y = uy * ry
    const z = uz * rz

    // Domain warp: nudge the lookup position with another noise so the
    // filaments curl instead of looking like a regular pattern.
    const warpX = densityNoise(x * 0.09, y * 0.09, z * 0.09 + 50) * 1.7
    const warpY = densityNoise(y * 0.09 + 80, z * 0.09, x * 0.09) * 1.7

    // "Ridged" noise, three layers (octaves) of decreasing size. Plain noise is
    // blobby; 1 - |noise| turns its zero-crossings into sharp ridges.
    let sum = 0
    let weightTotal = 0
    let weight = 0.55
    let frequency = 0.15
    for (let octave = 0; octave < 3; octave++) {
      const n = densityNoise(
        (x + warpX) * frequency,
        (y + warpY) * frequency,
        z * frequency + octave * 19.7,
      )
      const ridge = 1 - Math.abs(n)
      sum += ridge * ridge * weight
      weightTotal += weight
      weight *= 0.5
      frequency *= 2.1
    }
    const ridged = sum / weightTotal // 0..1

    // Raise the contrast so gaps are really empty and ridges really dense.
    const density = smoothstep(0.42, 0.9, ridged)
    if (picky && rng() > density) continue

    // Colour comes from a second, much larger noise pattern, so neighbouring
    // particles share a hue and the cloud gets big violet / pink / teal regions.
    const hue = smoothstep(0.26, 0.74, colourNoise(x * 0.085 + 7, y * 0.11, z * 0.085) * 0.5 + 0.5)
    const brightness = 0.5 + 0.5 * density + 0.25 * (1 - dist)

    for (let clump = 0; clump < CLUMP_SIZE && filled < count; clump++) {
      const spread = clump === 0 ? 0 : CLUMP_SPREAD // the first particle sits exactly on the point
      const o = filled * 3
      shape.positions[o] = x + gaussian(rng) * spread
      shape.positions[o + 1] = y + gaussian(rng) * spread
      shape.positions[o + 2] = z + gaussian(rng) * spread
      gasGradient(hue, shape.colors, o, brightness)

      // A sprinkle of young white stars embedded in the gas.
      if (rng() < 0.015) tintToward(shape.colors, o, WHITE, 0.85)

      filled++
    }
  }

  return shape
}
