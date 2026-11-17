import { Color } from 'three'
import { gaussian, type Rng } from '../../lib/random'
import type { ParticleLayout, SampledShape } from '../../look/sampleImage'
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

/** Room for about a million particle indices in the low digits of a packed sort value. */
const INDEX_SPACE = 2 ** 20
/** Shifts x so it is never negative before packing. Shapes are far smaller than this. */
const KEY_OFFSET = 1000

/**
 * Re-orders a shape's particles from left to right — separately inside each
 * class of particle (heroes, mediums, dust), so every particle keeps its class.
 *
 * Why: particle `i` is the same particle in every shape. If each shape handed out
 * its positions in random order, every particle would cross the whole scene during
 * a morph and the cloud would briefly collapse into a ball in the middle. Sorting
 * every shape the same way means a particle on the left of the name also ends up
 * on the left of the nebula, so morphs read as "flowing" rather than "shuffling".
 *
 * `jitter` (world units) blurs the ordering so the result still has some chaos.
 */
export function sortWithinClasses(shape: SampledShape, layout: ParticleLayout, rng: Rng, jitter: number): SampledShape {
  const { count, heroes, mediums } = layout
  const sorted: SampledShape = {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    spikes: new Float32Array(count),
  }
  const ranges = [
    [0, heroes],
    [heroes, heroes + mediums],
    [heroes + mediums, count],
  ]

  for (const [start, end] of ranges) {
    // Speed trick: pack "sort key" and "particle index" into one number each, so the
    // browser's built-in numeric sort can do the work without calling back into
    // JavaScript for every comparison. The key (x, in thousandths of a unit) goes in the
    // high digits and decides the order; the index rides along in the low digits.
    const packed = new Float64Array(end - start)
    for (let i = start; i < end; i++) {
      const key = shape.positions[i * 3] + gaussian(rng) * jitter
      packed[i - start] = Math.round((key + KEY_OFFSET) * 1000) * INDEX_SPACE + i
    }
    packed.sort()

    for (let k = 0; k < packed.length; k++) {
      const from = packed[k] % INDEX_SPACE
      const to = start + k
      sorted.positions.set(shape.positions.subarray(from * 3, from * 3 + 3), to * 3)
      sorted.colors.set(shape.colors.subarray(from * 3, from * 3 + 3), to * 3)
      sorted.spikes[to] = shape.spikes[from]
    }
  }
  return sorted
}
