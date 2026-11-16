import { gaussian, type Rng } from '../../lib/random'
import { PALETTE, TEXT_SHAPE } from '../config'
import type { ShapeData } from './types'
import { createGradient, createShape, rgb, tintToward } from './utils'

export interface TextShapeOptions {
  /** One entry per line of text. */
  lines: string[]
  /** The text is scaled up until it reaches this width or this height, whichever comes first. */
  width: number
  maxHeight: number
  rng: Rng
}

/** Font size used on the hidden canvas. Bigger = finer letter edges. */
const FONT_PX = 180

const WHITE = rgb(PALETTE.white)
const letterGradient = createGradient([
  rgb(PALETTE.lavender),
  rgb(PALETTE.rose),
  rgb(PALETTE.cream),
  rgb(PALETTE.mint),
])
const dustGradient = createGradient([rgb(PALETTE.violet), rgb(PALETTE.pink), rgb(PALETTE.teal)])

/**
 * Turns text into particle positions.
 *
 * How it works: draw the text onto a hidden 2D canvas, read the pixels back,
 * and remember which pixels got ink. Each particle is then dropped onto one of
 * those inked pixels. A small share is scattered around the letters as loose dust.
 *
 * The font must already be loaded (see useFontsReady) or the browser will
 * silently draw with a fallback font.
 */
export function generateText(
  count: number,
  { lines, width: maxWidth, maxHeight, rng }: TextShapeOptions,
): ShapeData {
  const shape = createShape(count)
  const ink = rasterise(lines, rng)

  // World units per canvas pixel. Short names would become enormous if we only
  // fitted the width, so the height is capped too.
  const scale = ink ? Math.min(maxWidth / ink.boundsWidth, maxHeight / ink.boundsHeight) : 1
  const width = ink ? ink.boundsWidth * scale : maxWidth
  const height = ink ? ink.boundsHeight * scale : maxHeight

  for (let i = 0; i < count; i++) {
    const o = i * 3
    const isDust = !ink || rng() < TEXT_SHAPE.dustRatio

    if (isDust) {
      // Loose stardust: a soft, wide halo around the letters.
      const x = gaussian(rng) * width * 0.34
      shape.positions[o] = x
      shape.positions[o + 1] = gaussian(rng) * height * 1.1
      shape.positions[o + 2] = gaussian(rng) * 0.9
      dustGradient(x / width + 0.5, shape.colors, o, 0.5)
      continue
    }

    // Walk through the (shuffled) inked pixels in order rather than picking at
    // random: every pixel gets the same number of particles, so the letters fill
    // in evenly with no clumps or bald patches.
    const pixel = ink.pixels[i % ink.pixels.length]
    const px = (pixel % ink.canvasWidth) + rng() // + rng(): random spot inside the pixel
    const py = Math.floor(pixel / ink.canvasWidth) + rng()

    const x = (px - ink.centerX) * scale
    shape.positions[o] = x
    shape.positions[o + 1] = -(py - ink.centerY) * scale // canvas y points down, world y points up
    shape.positions[o + 2] = gaussian(rng) * TEXT_SHAPE.depth

    // Pastel gradient across the name, pulled part-way to white so it stays readable.
    letterGradient(x / width + 0.5, shape.colors, o)
    tintToward(shape.colors, o, WHITE, 0.2)
  }

  return shape
}

interface Ink {
  /** Canvas indices (y * canvasWidth + x) of every inked pixel, in shuffled order. */
  pixels: Uint32Array
  canvasWidth: number
  /** Centre and size of the inked area, in canvas pixels. */
  centerX: number
  centerY: number
  boundsWidth: number
  boundsHeight: number
}

function rasterise(lines: string[], rng: Rng): Ink | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const font = `${TEXT_SHAPE.fontWeight} ${FONT_PX}px ${TEXT_SHAPE.fontFamily}`
  const spacing = TEXT_SHAPE.letterSpacing * FONT_PX
  const lineHeight = TEXT_SHAPE.lineHeight * FONT_PX

  // Measure each line letter by letter. Drawing letters one at a time lets us add
  // letter-spacing in every browser (canvas letterSpacing is not universal yet).
  ctx.font = font
  const measured = lines.map((line) => {
    const chars = Array.from(line)
    const advances = chars.map((ch) => ctx.measureText(ch).width)
    const lineWidth =
      advances.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, chars.length - 1)
    return { chars, advances, lineWidth }
  })
  const textWidth = Math.max(1, ...measured.map((m) => m.lineWidth))

  const padding = Math.ceil(FONT_PX * 0.3)
  canvas.width = Math.ceil(textWidth) + padding * 2
  canvas.height = Math.ceil(lineHeight * lines.length) + padding * 2

  // Resizing a canvas resets its drawing state, so set the font again.
  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  measured.forEach((line, lineIndex) => {
    let x = padding + (textWidth - line.lineWidth) / 2 // centre each line
    const y = padding + lineHeight * (lineIndex + 0.5)
    line.chars.forEach((ch, charIndex) => {
      ctx.fillText(ch, x, y)
      x += line.advances[charIndex] + spacing
    })
  })

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const total = canvas.width * canvas.height

  // Pass 1: count inked pixels and find their bounding box.
  let inked = 0
  let minX = canvas.width
  let maxX = 0
  let minY = canvas.height
  let maxY = 0
  for (let p = 0; p < total; p++) {
    if (data[p * 4 + 3] > 127) {
      inked++
      const x = p % canvas.width
      const y = (p - x) / canvas.width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (inked === 0) return null

  // Pass 2: collect them.
  const pixels = new Uint32Array(inked)
  let n = 0
  for (let p = 0; p < total; p++) {
    if (data[p * 4 + 3] > 127) pixels[n++] = p
  }

  // Shuffle (Fisher–Yates) so that taking the first N pixels gives an even spread
  // over all the letters, not just the top rows.
  for (let i = inked - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = pixels[i]
    pixels[i] = pixels[j]
    pixels[j] = swap
  }

  return {
    pixels,
    canvasWidth: canvas.width,
    centerX: (minX + maxX + 1) / 2,
    centerY: (minY + maxY + 1) / 2,
    boundsWidth: maxX - minX + 1,
    boundsHeight: maxY - minY + 1,
  }
}
