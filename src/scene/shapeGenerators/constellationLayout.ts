import type { SkillGroup } from '../../data/content'
import { hash01 } from '../../lib/hash'
import { CONSTELLATION_SHAPE } from '../config'
import { ATLAS } from '../skills/atlas'
import { CONSTELLATIONS, projectStars, type CatalogueConstellation } from '../skills/catalogue'

export type Vec3 = [number, number, number]

export interface ConstellationStar {
  /** The star's own name, e.g. "Rigel". */
  name: string
  /** The skill on this star, e.g. "React" — or null for the figure's other stars. */
  label: string | null
  /** Which of the group's skills (index into `items`), or -1. */
  skill: number
  /** Apparent magnitude (smaller = brighter). */
  magnitude: number
  position: Vec3
}

export interface Constellation {
  /** The skill group, e.g. "Frontend". */
  name: string
  /** The real constellation drawn for it, e.g. "Orion". */
  figure: string
  /** Catalogue id, e.g. "orion". */
  id: string
  center: Vec3
  /** Every star of the figure; the skills sit on the brightest. */
  stars: ConstellationStar[]
  /** Pairs of indices into `stars` that are joined by a line. */
  edges: [number, number][]
  /** The faint star-atlas figure behind the stars: its image and where its edges fall in the world. */
  atlas: { url: string; left: number; right: number; top: number; bottom: number } | null
  /** Where the group's small title goes, just under the figure. */
  titleAnchor: Vec3
}

export interface ConstellationField {
  constellations: Constellation[]
  /** Overall size of the field in world units, for framing the camera. */
  width: number
  height: number
}

/** Share of a cell the figure may fill (the rest is breathing room, and space for the title). */
const FILL = { width: 0.8, height: 0.66 }

/**
 * Turns the skill groups into constellations: one real constellation per
 * group (Orion, Ursa Major, Cassiopeia, …), with the group's skills on its
 * brightest stars — the first skill on the brightest.
 *
 * Each figure keeps its true shape. It is turned to match its star-atlas
 * picture, so the figure drawn behind it stands upright, and scaled to fit
 * its place on the grid.
 *
 * This is the single source of truth for where the stars are: the drawn
 * stars and lines, the atlas figures, the titles, the hover tests and the
 * camera all read the very same positions. Deterministic: the same skills
 * always give the same sky.
 */
export function layoutConstellations(groups: SkillGroup[], portrait: boolean): ConstellationField {
  const [cellWidth, cellHeight] = portrait ? CONSTELLATION_SHAPE.portraitCell : CONSTELLATION_SHAPE.cell

  // Arrange the constellations on a grid: one row on wide screens, two columns on tall ones.
  const count = groups.length
  const columns = Math.max(1, portrait ? (count <= 2 ? 1 : 2) : Math.min(count, 4))
  const rows = Math.max(1, Math.ceil(count / columns))
  const figures = assignFigures(groups)

  const constellations = groups.map((group, index): Constellation => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const inThisRow = Math.min(columns, count - row * columns) // the last row may be shorter
    const cellCenter: [number, number] = [
      (column - (inThisRow - 1) / 2) * cellWidth,
      ((rows - 1) / 2 - row) * cellHeight + (rows === 1 ? (column % 2 === 0 ? 0.3 : -0.3) : 0),
    ]
    return placeFigure(group, figures[index], cellCenter, cellWidth, cellHeight)
  })

  return { constellations, width: columns * cellWidth, height: rows * cellHeight }
}

/** One constellation per group, in catalogue order, each with at least as many stars as the group has skills. */
function assignFigures(groups: SkillGroup[]): CatalogueConstellation[] {
  const used = new Set<string>()
  return groups.map((group) => {
    const free = CONSTELLATIONS.filter((c) => !used.has(c.id))
    const pool = free.length > 0 ? free : CONSTELLATIONS
    const figure =
      pool.find((c) => c.stars.length >= group.items.length) ??
      pool.reduce((largest, c) => (c.stars.length > largest.stars.length ? c : largest))
    used.add(figure.id)
    return figure
  })
}

function placeFigure(
  group: SkillGroup,
  figure: CatalogueConstellation,
  [cx, cy]: [number, number],
  cellWidth: number,
  cellHeight: number,
): Constellation {
  const atlas = ATLAS[figure.id]
  const turn = atlas?.rotation ?? 0
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)

  // Sky chart (radians), turned to match the atlas picture.
  const chart = projectStars(figure.stars).map(([x, y]): [number, number] => [x * cos - y * sin, x * sin + y * cos])
  const xs = chart.map((p) => p[0])
  const ys = chart.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const scale = Math.min((cellWidth * FILL.width) / (maxX - minX), (cellHeight * FILL.height) / (maxY - minY))
  // The figure sits a little above the cell's middle, leaving room for its title below.
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const lift = cellHeight * 0.06
  const toWorld = (x: number, y: number): [number, number] => [cx + (x - midX) * scale, cy + lift + (y - midY) * scale]

  // Skills go on the brightest stars, brightest first.
  const byBrightness = figure.stars.map((_, i) => i).sort((a, b) => figure.stars[a].mag - figure.stars[b].mag)
  const skillOf = new Map(byBrightness.slice(0, group.items.length).map((star, skill) => [star, skill]))

  const stars: ConstellationStar[] = figure.stars.map((star, i) => {
    const [x, y] = toWorld(chart[i][0], chart[i][1])
    const skill = skillOf.get(i) ?? -1
    return {
      name: star.name,
      label: skill >= 0 ? group.items[skill] : null,
      skill,
      magnitude: star.mag,
      // A little depth, so the stars shift against each other as the camera moves.
      position: [x, y, (hash01(`${figure.id}:${star.name}`) - 0.5) * 0.7],
    }
  })

  // A group with more skills than its figure has stars: the rest ring the figure, unconnected.
  for (let skill = figure.stars.length; skill < group.items.length; skill++) {
    const angle = skill * 2.4
    stars.push({
      name: '',
      label: group.items[skill],
      skill,
      magnitude: 4,
      position: [cx + Math.cos(angle) * cellWidth * 0.42, cy + lift + Math.sin(angle) * cellHeight * 0.3, 0],
    })
  }

  const index = new Map(figure.stars.map((star, i) => [star.name, i]))
  const edges = figure.lines.map(([a, b]): [number, number] => [index.get(a)!, index.get(b)!])

  let picture: Constellation['atlas'] = null
  if (atlas) {
    const [left, top] = toWorld(atlas.box[0], atlas.box[1])
    const [right, bottom] = toWorld(atlas.box[2], atlas.box[3])
    picture = { url: atlas.url, left, right, top, bottom }
  }

  return {
    name: group.group,
    figure: figure.name,
    id: figure.id,
    center: [cx, cy + lift, 0],
    stars,
    edges,
    atlas: picture,
    titleAnchor: [cx, cy + lift - ((maxY - minY) / 2) * scale - 0.5, 0],
  }
}
