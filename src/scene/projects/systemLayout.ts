import * as THREE from 'three'
import type { Project } from '../../data/content'
import { hash01 } from '../../lib/hash'
import { LOOK_PALETTE } from '../../look/palette'
import { LOOK_SCENES } from '../../look/scenes'
import { SHAPE_INDEX, STAGES } from '../config'
import { getGalaxyMatrix } from '../galaxyFrame'

/** One planet: one technology used in the project. */
export interface PlanetLayout {
  tech: string
  /** Radius of its (circular) orbit, in world units. */
  orbit: number
  /** Radius of the planet itself. */
  size: number
  /** Orbital speed in radians per second. Inner planets are faster, as in real systems. */
  speed: number
  /** Starting angle around the star. */
  phase: number
  /** CSS hex colour. The same tech has the same colour in every system. */
  color: string
}

/** One star system: one project. */
export interface SystemLayout {
  project: Project
  index: number
  /** Position in the galaxy before it is spun and tilted (see galaxyFrame.ts). */
  center: THREE.Vector3
  /** The star's colour (CSS hex). */
  color: string
  /** Outer edge of the system: the furthest orbit plus its planet. */
  radius: number
  planets: PlanetLayout[]
}

const TAU = Math.PI * 2
const STAR_COLOURS = [
  LOOK_PALETTE.gold,
  LOOK_PALETTE.ice,
  LOOK_PALETTE.rose,
  LOOK_PALETTE.seaGreen,
  LOOK_PALETTE.white,
  LOOK_PALETTE.ember,
]
const PLANET_COLOURS = [
  LOOK_PALETTE.ice,
  LOOK_PALETTE.rose,
  LOOK_PALETTE.seaGreen,
  LOOK_PALETTE.gold,
  LOOK_PALETTE.ember,
  LOOK_PALETTE.white,
]

/**
 * Spots on the spiral arms of the galaxy picture (galaxy.jpg) where star
 * systems go, as fractions of the image: (0, 0) is its top left corner.
 * Each is the brightest point of an arm at a different distance from the core
 * (found by blurring the image and searching rings around the centre). They
 * are listed in the order systems take them, so the first few are spread
 * around the galaxy. There is room for 12 projects.
 */
const ARM_SLOTS: [number, number][] = [
  [0.6615, 0.3967],
  [0.4067, 0.7364],
  [0.2372, 0.4228],
  [0.6666, 0.2471],
  [0.2524, 0.7626],
  [0.5444, 0.3414],
  [0.5332, 0.8232],
  [0.3708, 0.318],
  [0.4908, 0.6347],
  [0.57, 0.1625],
  [0.832, 0.6807],
  [0.6834, 0.8532],
]

export const SYSTEM_LOOK = {
  /** Orbit radius of the innermost planet, and the furthest any orbit may be. */
  innerOrbit: 0.3,
  maxOrbit: 0.95,
  /** Gap between neighbouring orbits (shrinks if a project lists lots of tech). */
  orbitGap: 0.2,
  /** Planet radius: the smallest, plus up to this much more. */
  planetSize: 0.042,
  planetSizeRange: 0.03,
  /** Orbital speed at a distance of 1; nearer planets go faster (Kepler: speed ∝ r^-1.5). */
  orbitSpeed: 0.2,
  /** Diameter of the glow around each star. */
  starSize: 0.46,
}

/**
 * Places one star system per project on the galaxy's spiral arms (ARM_SLOTS),
 * and gives each system one planet per technology. Deterministic: the same
 * projects always give the same galaxy.
 */
export function layoutSystems(projects: Project[]): SystemLayout[] {
  const height = STAGES.galaxy.height
  const width = height * LOOK_SCENES.find((scene) => scene.id === STAGES.galaxy.scene)!.aspect

  return projects.map((project, index) => {
    // From the picture to the galaxy's flat frame (x/z, see galaxyFrame.ts):
    // image x → x, image y (downward) → z.
    const [u, v] = ARM_SLOTS[index % ARM_SLOTS.length]
    const center = new THREE.Vector3((u - 0.5) * width, 0, (v - 0.5) * height)

    const planets = project.tech.map((tech, k): PlanetLayout => {
      const n = project.tech.length
      const gap = Math.min(SYSTEM_LOOK.orbitGap, (SYSTEM_LOOK.maxOrbit - SYSTEM_LOOK.innerOrbit) / Math.max(1, n - 1))
      const orbit = SYSTEM_LOOK.innerOrbit + (n === 1 ? 0.12 : k * gap)
      const key = tech.toLowerCase()
      return {
        tech,
        orbit,
        size: SYSTEM_LOOK.planetSize + SYSTEM_LOOK.planetSizeRange * hash01(`${key}:size`),
        speed: SYSTEM_LOOK.orbitSpeed * Math.pow(orbit, -1.5),
        phase: hash01(`${project.id}:${key}`) * TAU,
        color: PLANET_COLOURS[Math.floor(hash01(key) * PLANET_COLOURS.length)],
      }
    })

    const outer = planets.reduce((edge, planet) => Math.max(edge, planet.orbit + planet.size), 0.4)
    return {
      project,
      index,
      center,
      color: STAR_COLOURS[index % STAR_COLOURS.length],
      radius: outer,
      planets,
    }
  })
}

/** Where a planet is relative to its star, at `time`, in the flat galaxy's orientation. */
export function planetOffset(planet: PlanetLayout, time: number, out: THREE.Vector3): THREE.Vector3 {
  const angle = planet.phase + planet.speed * time
  return out.set(Math.cos(angle) * planet.orbit, 0, Math.sin(angle) * planet.orbit)
}

const galaxyMatrix = new THREE.Matrix4()

/** Where a star system is in the world at `time`, after the galaxy's spin and tilt. */
export function systemWorldPosition(system: SystemLayout, time: number, out: THREE.Vector3) {
  return out.copy(system.center).applyMatrix4(getGalaxyMatrix(time, galaxyMatrix))
}

/** Where a planet is in the world at `time`. */
export function planetWorldPosition(
  system: SystemLayout,
  planet: PlanetLayout,
  time: number,
  out: THREE.Vector3,
) {
  return planetOffset(planet, time, out).add(system.center).applyMatrix4(getGalaxyMatrix(time, galaxyMatrix))
}

/** How visible the star systems are, from the particle morph: only while the galaxy has formed. */
export function galaxyVisibility(morph: number): number {
  const galaxy = SHAPE_INDEX.galaxy
  return (
    THREE.MathUtils.smoothstep(morph, galaxy - 0.18, galaxy - 0.01) *
    (1 - THREE.MathUtils.smoothstep(morph, galaxy + 0.02, galaxy + 0.14))
  )
}
