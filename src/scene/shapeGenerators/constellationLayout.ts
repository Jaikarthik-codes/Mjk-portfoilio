import type { SkillGroup } from '../../data/content'
import { hashString } from '../../lib/hash'
import { createRng } from '../../lib/random'
import { CONSTELLATION_SHAPE } from '../config'

export type Vec3 = [number, number, number]

export interface ConstellationStar {
  /** The skill this star stands for, e.g. "React". */
  label: string
  position: Vec3
}

export interface Constellation {
  /** The skill group, e.g. "Frontend". */
  name: string
  center: Vec3
  stars: ConstellationStar[]
  /** Pairs of indices into `stars` that are joined by a line. */
  edges: [number, number][]
}

export interface ConstellationField {
  constellations: Constellation[]
  /** Overall size of the field in world units, for framing the camera. */
  width: number
  height: number
}

/**
 * Turns the skill groups into constellations: one per group, one star per skill.
 *
 * This is the single source of truth for where the stars are: the particle
 * shape, the bright star markers, the drawn lines and the hover tooltips all
 * read the very same positions, so everything lines up.
 *
 * The result is deterministic: the same skills always give the same sky.
 */
export function layoutConstellations(groups: SkillGroup[], portrait: boolean): ConstellationField {
  const [cellWidth, cellHeight] = portrait
    ? CONSTELLATION_SHAPE.portraitCell
    : CONSTELLATION_SHAPE.cell

  // Arrange the constellations on a grid: one row on wide screens, two columns on tall ones.
  const count = groups.length
  const columns = Math.max(1, portrait ? (count <= 2 ? 1 : 2) : Math.min(count, 4))
  const rows = Math.max(1, Math.ceil(count / columns))

  const constellations = groups.map((group, index): Constellation => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const inThisRow = Math.min(columns, count - row * columns) // the last row may be shorter

    const center: Vec3 = [
      (column - (inThisRow - 1) / 2) * cellWidth,
      ((rows - 1) / 2 - row) * cellHeight + (rows === 1 ? (column % 2 === 0 ? 0.45 : -0.45) : 0),
      0,
    ]

    // Seed from the group's name so each constellation keeps its figure even if
    // others are added, removed or reordered.
    const rng = createRng(hashString(group.group) + index * 7919)
    const stars = placeStars(group.items, center, cellWidth * 0.36, cellHeight * 0.33, rng)
    return { name: group.group, center, stars, edges: connectStars(stars) }
  })

  return { constellations, width: columns * cellWidth, height: rows * cellHeight }
}

/**
 * Scatters stars inside an ellipse so that they are well spread out.
 * For each new star we try a handful of random spots and keep the one that is
 * farthest from the stars placed so far ("best-candidate" sampling).
 */
function placeStars(
  labels: string[],
  center: Vec3,
  radiusX: number,
  radiusY: number,
  rng: () => number,
): ConstellationStar[] {
  const stars: ConstellationStar[] = []

  for (const label of labels) {
    let best: Vec3 = center
    let bestDistance = -1

    for (let attempt = 0; attempt < 14; attempt++) {
      // A random point inside the ellipse. sqrt() spreads points evenly by area.
      const angle = rng() * Math.PI * 2
      const reach = Math.sqrt(rng())
      const candidate: Vec3 = [
        center[0] + Math.cos(angle) * reach * radiusX,
        center[1] + Math.sin(angle) * reach * radiusY,
        center[2] + (rng() - 0.5) * 1.4,
      ]

      let nearest = Infinity
      for (const star of stars) {
        nearest = Math.min(nearest, distance2D(candidate, star.position))
      }
      if (nearest > bestDistance) {
        bestDistance = nearest
        best = candidate
      }
    }

    stars.push({ label, position: best })
  }

  return stars
}

/**
 * Joins the stars with the shortest possible set of lines that still connects
 * all of them (a minimum spanning tree, built with Prim's algorithm). This
 * gives the branching stick-figure look of real constellations, with no
 * crossing lines.
 */
function connectStars(stars: ConstellationStar[]): [number, number][] {
  const edges: [number, number][] = []
  if (stars.length < 2) return edges

  const connected = new Set<number>([0])
  while (connected.size < stars.length) {
    let from = -1
    let to = -1
    let shortest = Infinity

    // Find the shortest line from any connected star to any unconnected one.
    for (const a of connected) {
      for (let b = 0; b < stars.length; b++) {
        if (connected.has(b)) continue
        const d = distance2D(stars[a].position, stars[b].position)
        if (d < shortest) {
          shortest = d
          from = a
          to = b
        }
      }
    }

    edges.push([from, to])
    connected.add(to)
  }

  return edges
}

function distance2D(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}
