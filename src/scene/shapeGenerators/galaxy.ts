import { gaussian, type Rng } from '../../lib/random'
import { GALAXY_SHAPE, PALETTE } from '../config'
import type { ShapeData } from './types'
import { clamp01, createGradient, createShape, rgb, tintToward } from './utils'

const PINK = rgb(PALETTE.pink)
const TEAL = rgb(PALETTE.teal)
const coreGradient = createGradient([rgb(PALETTE.white), rgb(PALETTE.cream), rgb(PALETTE.gold)])
const armGradient = createGradient([
  rgb(PALETTE.gold),
  rgb(PALETTE.rose),
  rgb(PALETTE.violet),
  rgb(PALETTE.sky),
  rgb(PALETTE.indigo),
])
const haloGradient = createGradient([rgb(PALETTE.violet), rgb(PALETTE.indigo)])

/**
 * A spiral galaxy lying flat in the x/z plane (y is its spin axis).
 * The vertex shader spins and tilts it, so here we only place the stars.
 *
 * Three populations of particles:
 *   1. the bulge — a dense, warm ball at the centre
 *   2. the arms  — stars scattered around logarithmic spiral curves
 *   3. the halo  — a faint, even disc that fills the gaps between the arms
 */
export function generateGalaxy(count: number, rng: Rng): ShapeData {
  const shape = createShape(count)
  const { radius, arms, windings, bulgeRatio, haloRatio } = GALAXY_SHAPE
  const TAU = Math.PI * 2

  for (let i = 0; i < count; i++) {
    const o = i * 3
    const pick = rng()
    let x: number
    let y: number
    let z: number

    if (pick < bulgeRatio) {
      // 1. Bulge: a gaussian blob, squashed along the spin axis.
      x = gaussian(rng) * 0.6
      y = gaussian(rng) * 0.34
      z = gaussian(rng) * 0.6
      const dist = Math.sqrt(x * x + y * y + z * z)
      coreGradient(dist / 1.5, shape.colors, o, 0.9)
    } else if (pick < 1 - haloRatio) {
      // 2. Arms. `t` is how far out along the arm we are: 0 = core, 1 = rim.
      const t = Math.pow(rng(), 0.9)
      const r = 0.45 + t * (radius - 0.45)

      // A logarithmic spiral: the angle grows quickly near the core and slowly
      // further out, like the arms of real galaxies.
      const armStart = (Math.floor(rng() * arms) / arms) * TAU
      const angle = armStart + windings * TAU * (Math.log(1 + 3 * t) / Math.log(4))

      // Scatter stars around the ideal curve. Most hug it tightly (a bright
      // ridge); the rest stray further (the soft glow around each arm).
      const stray = rng() < 0.4
      const spread = (stray ? 0.15 : 0.05) * radius * (0.4 + 0.75 * t)

      x = Math.cos(angle) * r + gaussian(rng) * spread
      z = Math.sin(angle) * r + gaussian(rng) * spread
      // Thin disc that puffs up slightly toward the centre.
      y = gaussian(rng) * (0.05 + 0.2 * Math.exp(-r * 0.8))

      // Warm near the core, cooling to violet and blue toward the rim.
      const brightness = (stray ? 0.5 : 0.85) * (0.7 + 0.3 * rng())
      armGradient(clamp01(t + gaussian(rng) * 0.07), shape.colors, o, brightness)

      // Star-forming regions: pink and teal knots dotted along the arms.
      const sparkle = rng()
      if (sparkle < 0.07) tintToward(shape.colors, o, PINK, 0.8)
      else if (sparkle < 0.11) tintToward(shape.colors, o, TEAL, 0.8)
    } else {
      // 3. Halo: an even disc (sqrt keeps the density uniform per unit area).
      const r = radius * 1.12 * Math.sqrt(rng())
      const angle = rng() * TAU
      x = Math.cos(angle) * r
      z = Math.sin(angle) * r
      y = gaussian(rng) * 0.4 * (1 - (r / radius) * 0.6)
      haloGradient(r / radius, shape.colors, o, 0.4)
    }

    shape.positions[o] = x
    shape.positions[o + 1] = y
    shape.positions[o + 2] = z
  }

  return shape
}
