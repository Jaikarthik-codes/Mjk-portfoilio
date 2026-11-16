import { createRng } from '../../lib/random'
import type { ShapeName } from '../config'
import type { NameLayout } from '../nameLayout'
import { generateBurst } from './burst'
import { generateConstellation } from './constellation'
import type { ConstellationField } from './constellationLayout'
import { generateGalaxy } from './galaxy'
import { generateNebula } from './nebula'
import { generateText } from './text'
import type { ShapeData } from './types'
import { sortLeftToRight } from './utils'

export type { ShapeData } from './types'
export { generateBurst, generateConstellation, generateGalaxy, generateNebula, generateText }

export interface BuildShapesOptions {
  /** How the name is split into lines and how large it may be. */
  name: NameLayout
  /** Where the constellation stars are (from layoutConstellations). */
  constellations: ConstellationField
}

/**
 * Generates every target shape for `count` particles.
 *
 * Each generator gets its own seeded random stream, so tweaking one shape
 * never reshuffles the others.
 */
export function buildShapes(
  count: number,
  { name, constellations }: BuildShapesOptions,
): Record<ShapeName, ShapeData> {
  const shapes: Record<ShapeName, ShapeData> = {
    name: generateText(count, {
      lines: name.lines,
      width: name.width,
      maxHeight: name.maxHeight,
      rng: createRng(11),
    }),
    nebula: generateNebula(count, createRng(22)),
    constellation: generateConstellation(count, constellations, createRng(66)),
    galaxy: generateGalaxy(count, createRng(33)),
    burst: generateBurst(count, createRng(77)),
  }

  // Give every shape the same left-to-right ordering (see sortLeftToRight for why).
  // The second number is how much each ordering is blurred, in world units.
  const sortRng = createRng(44)
  return {
    name: sortLeftToRight(shapes.name, sortRng, 0.5),
    nebula: sortLeftToRight(shapes.nebula, sortRng, 1.4),
    constellation: sortLeftToRight(shapes.constellation, sortRng, 1.6),
    galaxy: sortLeftToRight(shapes.galaxy, sortRng, 1.2),
    burst: sortLeftToRight(shapes.burst, sortRng, 1.5),
  }
}
