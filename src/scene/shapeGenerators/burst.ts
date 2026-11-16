import { gaussian, type Rng } from '../../lib/random'
import { BURST_SHAPE, PALETTE } from '../config'
import type { ShapeData } from './types'
import { createGradient, createShape, rgb, tintToward } from './utils'

const PINK = rgb(PALETTE.pink)
const TEAL = rgb(PALETTE.teal)
const ringGradient = createGradient([rgb(PALETTE.white), rgb(PALETTE.cream), rgb(PALETTE.gold)])
const rayGradient = createGradient([
  rgb(PALETTE.cream),
  rgb(PALETTE.gold),
  rgb(PALETTE.rose),
  rgb(PALETTE.violet),
])
const debrisGradient = createGradient([rgb(PALETTE.gold), rgb(PALETTE.rose), rgb(PALETTE.teal)])

/**
 * A supernova remnant, seen face-on: the shape behind the contact section.
 * (The intro's Big Bang reuses it as the place particles are flung to.)
 *
 * Three populations of particles:
 *   1. the ring   — a bright shock wave. Its middle is left empty on purpose,
 *                   so the contact links have a dark, readable place to sit.
 *   2. the rays   — streaks flying outward from the ring
 *   3. the debris — loose sparks scattered further out
 */
export function generateBurst(count: number, rng: Rng): ShapeData {
  const shape = createShape(count)
  const { radius, rays: rayCount, ringRatio, rayRatio } = BURST_SHAPE
  const TAU = Math.PI * 2

  // Decide each ray's direction and length once, so particles can share them.
  const rays = Array.from({ length: rayCount }, (_, index) => ({
    angle: ((index + (rng() - 0.5) * 0.8) / rayCount) * TAU,
    length: 0.45 + rng() * 0.85,
  }))

  for (let i = 0; i < count; i++) {
    const o = i * 3
    const pick = rng()
    let x: number
    let y: number
    let z: number

    if (pick < ringRatio) {
      // 1. Ring. Sharp on the inside edge, feathering outward like a shock front.
      const offset = gaussian(rng) * 0.2
      const r = radius + (offset > 0 ? offset * 2.4 : offset)
      const angle = rng() * TAU
      x = Math.cos(angle) * r
      y = Math.sin(angle) * r
      z = gaussian(rng) * 0.4

      ringGradient(Math.abs(offset) * 2.2, shape.colors, o, 0.9)
      const sparkle = rng()
      if (sparkle < 0.06) tintToward(shape.colors, o, PINK, 0.75)
      else if (sparkle < 0.1) tintToward(shape.colors, o, TEAL, 0.75)
    } else if (pick < ringRatio + rayRatio) {
      // 2. Rays. `t` is how far along the ray we are; squaring the random number
      //    bunches particles near the ring so each ray fades as it flies out.
      const ray = rays[Math.floor(rng() * rays.length)]
      const t = rng() * rng()
      const r = radius * (1.03 + t * ray.length)
      const angle = ray.angle + gaussian(rng) * 0.012 * (1 + 3 * t) // rays fan out slightly
      x = Math.cos(angle) * r
      y = Math.sin(angle) * r
      z = gaussian(rng) * 0.25 * (1 + 2 * t)

      rayGradient(t * 1.15, shape.colors, o, 0.85 - 0.45 * t)
    } else {
      // 3. Debris: sparks in every direction, flattened toward the screen plane.
      const r = radius * (0.95 + 2.1 * Math.pow(rng(), 1.6))
      const angle = rng() * TAU
      x = Math.cos(angle) * r
      y = Math.sin(angle) * r
      z = gaussian(rng) * 1.6
      debrisGradient(rng(), shape.colors, o, 0.22 + 0.4 * Math.pow(rng(), 3))
    }

    shape.positions[o] = x
    shape.positions[o + 1] = y
    shape.positions[o + 2] = z
  }

  return shape
}
