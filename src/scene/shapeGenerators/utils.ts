import { Color } from 'three'
import { gaussian, type Rng } from '../../lib/random'
import type { ShapeData } from './types'

export type RGB = readonly [number, number, number]

export function createShape(count: number): ShapeData {
  return {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
  }
}

/** Converts a CSS hex colour to linear RGB, the colour space the shader blends in. */
export function rgb(hex: string): RGB {
  const c = new Color(hex)
  return [c.r, c.g, c.b]
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Builds a colour ramp from a list of evenly spaced stops.
 * The returned function writes the colour at `t` (0..1) into `out` at `offset`,
 * multiplied by `intensity`.
 */
export function createGradient(stops: RGB[]) {
  const last = stops.length - 1
  return (t: number, out: Float32Array, offset: number, intensity = 1) => {
    const scaled = clamp01(t) * last
    const i = Math.min(last - 1, Math.floor(scaled))
    const f = scaled - i
    const a = stops[i]
    const b = stops[i + 1]
    out[offset] = (a[0] + (b[0] - a[0]) * f) * intensity
    out[offset + 1] = (a[1] + (b[1] - a[1]) * f) * intensity
    out[offset + 2] = (a[2] + (b[2] - a[2]) * f) * intensity
  }
}

/** Blends the colour stored at `offset` toward `target` by `amount` (0..1). */
export function tintToward(out: Float32Array, offset: number, target: RGB, amount: number) {
  out[offset] += (target[0] - out[offset]) * amount
  out[offset + 1] += (target[1] - out[offset + 1]) * amount
  out[offset + 2] += (target[2] - out[offset + 2]) * amount
}

/** Room for about a million particle indices in the low digits of a packed sort value. */
const INDEX_SPACE = 2 ** 20
/** Shifts x so it is never negative before packing. Shapes are far smaller than this. */
const KEY_OFFSET = 1000

/**
 * Re-orders the particles of a shape from left to right.
 *
 * Why: particle `i` is the same particle in every shape. If each shape handed out
 * its positions in random order, every particle would cross the whole scene during
 * a morph and the cloud would briefly collapse into a ball in the middle. Sorting
 * every shape the same way means a particle on the left of the name also ends up
 * on the left of the nebula, so morphs read as "flowing" rather than "shuffling".
 *
 * `jitter` (world units) blurs the ordering so the result still has some chaos.
 */
export function sortLeftToRight(shape: ShapeData, rng: Rng, jitter: number): ShapeData {
  const count = shape.positions.length / 3

  // Speed trick: pack "sort key" and "particle index" into one number each, so the
  // browser's built-in numeric sort can do the work without calling back into
  // JavaScript for every comparison. The key (x, in thousandths of a unit) goes in the
  // high digits and decides the order; the index rides along in the low digits.
  const packed = new Float64Array(count)
  for (let i = 0; i < count; i++) {
    const key = shape.positions[i * 3] + gaussian(rng) * jitter
    packed[i] = Math.round((key + KEY_OFFSET) * 1000) * INDEX_SPACE + i
  }
  packed.sort()

  const sorted = createShape(count)
  for (let i = 0; i < count; i++) {
    const from = (packed[i] % INDEX_SPACE) * 3
    const to = i * 3
    sorted.positions[to] = shape.positions[from]
    sorted.positions[to + 1] = shape.positions[from + 1]
    sorted.positions[to + 2] = shape.positions[from + 2]
    sorted.colors[to] = shape.colors[from]
    sorted.colors[to + 1] = shape.colors[from + 1]
    sorted.colors[to + 2] = shape.colors[from + 2]
  }
  return sorted
}
