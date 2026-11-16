import { createRng } from '../../lib/random'
import type { ShapeName } from '../config'
import { generateGalaxy } from './galaxy'
import { generateNebula } from './nebula'
import { generateText } from './text'
import type { ShapeData } from './types'
import { sortLeftToRight } from './utils'

export type { ShapeData } from './types'
export { generateGalaxy, generateNebula, generateText }

export interface BuildShapesOptions {
  /** The name, already split into the lines it should be drawn on. */
  nameLines: string[]
  /** World-space width of the name. */
  nameWidth: number
}

/**
 * Generates every target shape for `count` particles.
 *
 * Each generator gets its own seeded random stream, so tweaking one shape
 * never reshuffles the others.
 */
export function buildShapes(
  count: number,
  { nameLines, nameWidth }: BuildShapesOptions,
): Record<ShapeName, ShapeData> {
  const name = generateText(count, { lines: nameLines, width: nameWidth, rng: createRng(11) })
  const nebula = generateNebula(count, createRng(22))
  const galaxy = generateGalaxy(count, createRng(33))

  // Give every shape the same left-to-right ordering (see sortLeftToRight for why).
  const sortRng = createRng(44)
  return {
    name: sortLeftToRight(name, sortRng, 0.5),
    nebula: sortLeftToRight(nebula, sortRng, 1.4),
    galaxy: sortLeftToRight(galaxy, sortRng, 1.2),
  }
}
