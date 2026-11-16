import { content } from '../data/content'
import { CAMERA, TEXT_SHAPE } from './config'

export interface NameLayout {
  /** The name split into the lines it is drawn on. */
  lines: string[]
  /** The name grows until it hits this width or this height (world units). */
  width: number
  maxHeight: number
  stacked: boolean
}

/**
 * Decides how the name is laid out: one line on landscape screens, one word
 * per line on portrait screens so the letters stay large enough to read.
 */
export function getNameLayout(portrait: boolean): NameLayout {
  const text = TEXT_SHAPE.uppercase ? content.name.toUpperCase() : content.name
  const words = text.trim().split(/\s+/)
  const stacked = portrait && words.length > 1
  return stacked
    ? {
        lines: words,
        width: TEXT_SHAPE.stackedWidth,
        maxHeight: TEXT_SHAPE.stackedMaxHeight,
        stacked,
      }
    : {
        lines: [words.join(' ')],
        width: TEXT_SHAPE.width,
        maxHeight: TEXT_SHAPE.maxHeight,
        stacked,
      }
}

/** How far back the camera must sit for a `width` × `height` area at the origin to fit on screen. */
export function distanceToFit(width: number, height: number, aspect: number): number {
  const halfFov = Math.tan((CAMERA.fov * Math.PI) / 360)
  return Math.max(height / (2 * halfFov), width / (2 * halfFov * aspect))
}
