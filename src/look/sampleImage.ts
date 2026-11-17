import { Color } from 'three'
import { gaussian, type Rng } from '../lib/random'
import { LOOK_PALETTE } from './palette'
import type { ParticleLook } from './scenes'

/**
 * Turning a reference image into particles.
 *
 * The image is drawn onto a small canvas (512 px) and read back pixel by
 * pixel. Particles are then dropped onto pixels at random — but a bright pixel
 * is far more likely to receive one than a dark pixel, so the particles end up
 * tracing the image's own shapes: its arms, rings and filaments. Each particle
 * takes its colour from its pixel, and its depth from the pixel's brightness.
 *
 * Every particle belongs to one of three classes, always in the same order in
 * the arrays (so a particle keeps its class when it morphs between shapes):
 *
 *   heroes   ~2%   the brightest stars, with diffraction spikes — placed on
 *                  the image's own stars (local bright peaks)
 *   mediums  ~13%  noticeable stars, biased toward stars and bright filaments
 *   dust     ~85%  tiny, dim specks that give gas its grain
 */

/** How many particles of each class. Indices: [0, heroes) heroes, then mediums, then dust. */
export interface ParticleLayout {
  count: number
  heroes: number
  mediums: number
}

export function createLayout(count: number): ParticleLayout {
  return { count, heroes: Math.round(count * 0.02), mediums: Math.round(count * 0.13) }
}

/**
 * Per-particle look that never changes, whatever shape the particle is in:
 * its size and opacity (from its class) and a random seed.
 */
export interface ParticleTraits {
  /** Core diameter in CSS pixels. */
  size: Float32Array
  /** Opacity. Dust stays dim (0.15–0.4) so dense areas never sum to white. */
  alpha: Float32Array
  /** 0 dust, 1 medium, 2 hero. */
  kind: Float32Array
  /** Random 0..1 (twinkle rhythm). */
  seed: Float32Array
}

export function createTraits(layout: ParticleLayout, rng: Rng): ParticleTraits {
  const { count, heroes, mediums } = layout
  const traits: ParticleTraits = {
    size: new Float32Array(count),
    alpha: new Float32Array(count),
    kind: new Float32Array(count),
    seed: new Float32Array(count),
  }
  for (let i = 0; i < count; i++) {
    const r = rng()
    if (i < heroes) {
      traits.kind[i] = 2
      traits.size[i] = 2.4 + 2.2 * r * r
      traits.alpha[i] = 1
    } else if (i < heroes + mediums) {
      traits.kind[i] = 1
      traits.size[i] = 1.6 + 1.0 * r
      traits.alpha[i] = 0.45 + 0.3 * rng()
    } else {
      // A power law: most dust is the smallest size, a little is larger.
      traits.kind[i] = 0
      traits.size[i] = 0.9 + 0.9 * r * r * r
      traits.alpha[i] = 0.15 + 0.25 * rng()
    }
    traits.seed[i] = rng()
  }
  return traits
}

/** An image read back from a canvas, in linear light (ready for lighting maths). */
export interface ImagePixels {
  width: number
  height: number
  /** r, g, b per pixel, linear 0..1. */
  rgb: Float32Array
  /** Brightness per pixel, linear 0..1. */
  luma: Float32Array
}

/** sRGB byte → linear light, looked up rather than computed 262,000 times. */
const TO_LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
})

/** Draws an image onto a canvas no bigger than `maxSize` and reads its pixels. */
export function readPixels(image: CanvasImageSource & { width: number; height: number }, maxSize = 512): ImagePixels {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D is not available')
  context.drawImage(image, 0, 0, width, height)
  const bytes = context.getImageData(0, 0, width, height).data

  const rgb = new Float32Array(width * height * 3)
  const luma = new Float32Array(width * height)
  for (let p = 0; p < width * height; p++) {
    const r = TO_LINEAR[bytes[p * 4]]
    const g = TO_LINEAR[bytes[p * 4 + 1]]
    const b = TO_LINEAR[bytes[p * 4 + 2]]
    rgb[p * 3] = r
    rgb[p * 3 + 1] = g
    rgb[p * 3 + 2] = b
    luma[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  return { width, height, rgb, luma }
}

/** A shape made of particles: a position and a colour for every particle. */
export interface SampledShape {
  positions: Float32Array
  /** Linear RGB. Heroes carry extra brightness (values above 1), which is what makes them bloom. */
  colors: Float32Array
  /** Diffraction spike strength, 0..1 (only heroes have spikes). */
  spikes: Float32Array
}

export interface SampleOptions {
  /** Size of the image in the world, in world units. */
  width: number
  height: number
  /**
   * Distance from which the shape is meant to be seen. Particles pushed
   * toward or away from the camera are moved along the line of sight from
   * there, so from that spot every particle still sits exactly on its pixel —
   * the depth only shows once the camera moves.
   */
  viewDistance: number
  look: ParticleLook
  rng: Rng
}

/** Lays particles out over an image (see the comment at the top of this file). */
export function sampleImage(pixels: ImagePixels, layout: ParticleLayout, options: SampleOptions): SampledShape {
  const { width: W, height: H, rgb, luma } = pixels
  const { look, rng } = options
  const shape: SampledShape = {
    positions: new Float32Array(layout.count * 3),
    colors: new Float32Array(layout.count * 3),
    spikes: new Float32Array(layout.count),
  }

  // A typical bright value for this image (99th percentile), so that colours
  // are judged relative to the image rather than in absolute terms.
  const bright = percentile(luma, 0.99) || 1

  // "Starness": how much brighter a pixel is than its surroundings. Stars and
  // sharp filaments score high; broad gas scores low.
  const surroundings = boxBlur(luma, W, H, 12)
  const starness = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) starness[p] = Math.max(0, luma[p] - surroundings[p])

  // ── Heroes: on the image's own stars ──────────────────────────────────────
  const peaks = findPeaks(starness, luma, W, H, layout.heroes, bright * 0.02)
  const topPeak = peaks.length > 0 ? peaks[0].score : 1

  // ── Weighted pixel picking ────────────────────────────────────────────────
  // Picking pixels "weighted by brightness": each pixel's chance is its weight
  // divided by the total. (Equivalent to rejection sampling, but instead of
  // throwing darts until one sticks, we line all the weights up end to end and
  // pick a random point along that line — every pick succeeds.)
  const black = look.blackLevel
  //  Brightness is capped at the image's typical bright value, so the very
  //  brightest areas (a galaxy core) are not buried under particles — the gas
  //  already shows them, and piled-up particles would sum to white.
  const level = (p: number) => Math.min(1, Math.max(0, luma[p] - black) / bright)
  const dustPicker = createPicker(W * H, (p) => Math.pow(level(p), look.dustGamma))
  const starPicker = createPicker(W * H, (p) => Math.pow(level(p), 1.6) * (0.2 + Math.min(4, starness[p] / (bright * 0.05))))

  const pixelWorld = options.width / W
  for (let i = 0; i < layout.count; i++) {
    const isHero = i < layout.heroes
    const isMedium = !isHero && i < layout.heroes + layout.mediums
    let pixel: number
    let spread: number

    if (isHero && i < peaks.length) {
      pixel = peaks[i].pixel
      // Only the top few stars get diffraction spikes (how many is set per
      // image), longest on the brightest.
      const spiked = look.spikedStars
      shape.spikes[i] = i < spiked ? Math.pow(1 - i / spiked, 0.8) * Math.sqrt(peaks[i].score / topPeak) : 0
      spread = 0.15
    } else {
      pixel = (isHero || isMedium ? starPicker : dustPicker)(rng())
      // Dust is scattered a little around its pixel so it never sits on a grid.
      spread = isHero || isMedium ? 0.3 : 0.7
      if (isHero) shape.spikes[i] = 0
    }

    const px = pixel % W
    const py = Math.floor(pixel / W)
    const x = ((px + 0.5 + gaussian(rng) * spread) / W - 0.5) * options.width
    const y = (0.5 - (py + 0.5 + gaussian(rng) * spread) / H) * options.height
    const brightness = Math.min(1.5, luma[pixel] / bright)

    // Depth from brightness, plus some randomness so it never looks flat.
    let z: number
    if (look.depthMode === 'disc') {
      // A thin slab, puffier where it is brighter (the bulge of a galaxy).
      z = gaussian(rng) * look.depth * (0.2 + 0.8 * brightness) + gaussian(rng) * look.depthJitter
    } else {
      z = (Math.sqrt(brightness) - 0.4) * look.depth + gaussian(rng) * look.depthJitter
    }

    // Slide along the line of sight (see `viewDistance`), so depth never
    // pulls a particle off its pixel as seen from the intended viewpoint.
    z += isHero ? 0 : gaussian(rng) * pixelWorld
    const alongSight = (options.viewDistance - z) / options.viewDistance
    shape.positions[i * 3] = x * alongSight
    shape.positions[i * 3 + 1] = y * alongSight
    shape.positions[i * 3 + 2] = z

    writeColour(shape.colors, i, rgb, pixel, brightness, isHero ? 'hero' : isMedium ? 'medium' : 'dust', look, shape.spikes[i])
  }

  return shape
}

// ── Colour ────────────────────────────────────────────────────────────────────

const PALETTE_COLOURS = Object.values(LOOK_PALETTE).map((hex) => new Color(hex))
const ICE = new Color(LOOK_PALETTE.ice)
const WARM = new Color(LOOK_PALETTE.gold).lerp(new Color(LOOK_PALETTE.ember), 0.35)
const scratch = new Color()

function writeColour(
  out: Float32Array,
  i: number,
  rgb: Float32Array,
  pixel: number,
  level: number,
  kind: 'hero' | 'medium' | 'dust',
  look: ParticleLook,
  spike: number,
) {
  let r = rgb[pixel * 3]
  let g = rgb[pixel * 3 + 1]
  let b = rgb[pixel * 3 + 2]

  // Separate the colour (hue) from its brightness: scale so the strongest channel is 1.
  const max = Math.max(r, g, b, 1e-4)
  r /= max
  g /= max
  b /= max

  // A touch more vivid, then lean toward the site palette.
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b
  r = grey + (r - grey) * look.saturation
  g = grey + (g - grey) * look.saturation
  b = grey + (b - grey) * look.saturation
  if (look.paletteSnap > 0) {
    const nearest = nearestPalette(r, g, b)
    r += (nearest.r / maxOf(nearest) - r) * look.paletteSnap
    g += (nearest.g / maxOf(nearest) - g) * look.paletteSnap
    b += (nearest.b / maxOf(nearest) - b) * look.paletteSnap
  }

  let intensity: number
  const lit = Math.min(1, Math.sqrt(level))
  if (kind === 'hero') {
    // Hero stars: blue-white or warm orange, like the stars in stardust.jpg.
    // The brighter the star, the stronger the tint and the brighter it burns;
    // only the top few go past 1 (which is what makes them bloom).
    const tint = r > b ? WARM : ICE
    const amount = 0.35 + 0.5 * Math.sqrt(spike)
    r += (tint.r / maxOf(tint) - r) * amount
    g += (tint.g / maxOf(tint) - g) * amount
    b += (tint.b / maxOf(tint) - b) * amount
    intensity = 0.45 + 0.4 * lit + 5 * spike
  } else if (kind === 'medium') {
    intensity = 0.15 + 0.35 * lit
  } else {
    intensity = 0.08 + 0.22 * lit
  }

  out[i * 3] = Math.max(0, r) * intensity
  out[i * 3 + 1] = Math.max(0, g) * intensity
  out[i * 3 + 2] = Math.max(0, b) * intensity
}

function maxOf(c: Color) {
  return Math.max(c.r, c.g, c.b, 1e-4)
}

/** The palette colour closest in hue to (r, g, b). */
function nearestPalette(r: number, g: number, b: number): Color {
  let best = PALETTE_COLOURS[0]
  let bestDistance = Infinity
  for (const colour of PALETTE_COLOURS) {
    const m = maxOf(colour)
    scratch.setRGB(colour.r / m - r, colour.g / m - g, colour.b / m - b)
    const distance = scratch.r * scratch.r + scratch.g * scratch.g + scratch.b * scratch.b
    if (distance < bestDistance) {
      bestDistance = distance
      best = colour
    }
  }
  return best
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a function that turns a random number 0..1 into a pixel index, each
 * pixel chosen in proportion to its weight. (A running total of all weights,
 * searched by halving.)
 */
function createPicker(count: number, weight: (pixel: number) => number) {
  const totals = new Float64Array(count)
  let sum = 0
  for (let p = 0; p < count; p++) {
    sum += Math.max(0, weight(p))
    totals[p] = sum
  }
  return (random: number) => {
    const target = random * sum
    let low = 0
    let high = count - 1
    while (low < high) {
      const mid = (low + high) >> 1
      if (totals[mid] < target) low = mid + 1
      else high = mid
    }
    return low
  }
}

/** Average of each pixel's neighbourhood (radius in pixels), using a summed-area table. */
function boxBlur(values: Float32Array, W: number, H: number, radius: number): Float32Array {
  const table = new Float64Array((W + 1) * (H + 1))
  for (let y = 0; y < H; y++) {
    let row = 0
    for (let x = 0; x < W; x++) {
      row += values[y * W + x]
      table[(y + 1) * (W + 1) + x + 1] = table[y * (W + 1) + x + 1] + row
    }
  }
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(H, y + radius + 1)
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(W, x + radius + 1)
      const sum =
        table[y1 * (W + 1) + x1] - table[y0 * (W + 1) + x1] - table[y1 * (W + 1) + x0] + table[y0 * (W + 1) + x0]
      out[y * W + x] = sum / ((x1 - x0) * (y1 - y0))
    }
  }
  return out
}

/**
 * The image's stars, strongest first, at most `limit` of them: local peaks of
 * `starness`, scored by their flux (the starness summed over a small patch —
 * big glowing stars beat single bright pixels) times their brightness.
 * No two are allowed within a few pixels, so a bright clump of gas yields one
 * star, not a cluster of them.
 */
function findPeaks(starness: Float32Array, luma: Float32Array, W: number, H: number, limit: number, threshold: number) {
  const flux = boxBlur(starness, W, H, 2)
  const peaks: { pixel: number; score: number }[] = []
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x
      const s = starness[p]
      if (s < threshold) continue
      if (
        s < starness[p - 1] || s < starness[p + 1] ||
        s < starness[p - W] || s < starness[p + W] ||
        s < starness[p - W - 1] || s < starness[p - W + 1] ||
        s < starness[p + W - 1] || s < starness[p + W + 1]
      ) {
        continue
      }
      peaks.push({ pixel: p, score: flux[p] * luma[p] })
    }
  }
  peaks.sort((a, b) => b.score - a.score)

  // Keep the strongest, then skip anything too close to one already kept.
  const SPACING = 8
  const taken = new Uint8Array(W * H)
  const kept: typeof peaks = []
  for (const peak of peaks) {
    if (kept.length >= limit) break
    if (taken[peak.pixel]) continue
    kept.push(peak)
    const px = peak.pixel % W
    const py = Math.floor(peak.pixel / W)
    for (let dy = -SPACING; dy <= SPACING; dy++) {
      for (let dx = -SPACING; dx <= SPACING; dx++) {
        const x = px + dx
        const y = py + dy
        if (x >= 0 && x < W && y >= 0 && y < H) taken[y * W + x] = 1
      }
    }
  }
  return kept
}

/** The value below which `fraction` of the values fall (approximate, from a sample). */
function percentile(values: Float32Array, fraction: number): number {
  const step = Math.max(1, Math.floor(values.length / 20000))
  const sample: number[] = []
  for (let i = 0; i < values.length; i += step) sample.push(values[i])
  sample.sort((a, b) => a - b)
  return sample[Math.min(sample.length - 1, Math.floor(sample.length * fraction))]
}
