import * as THREE from 'three'
import type { Project } from '../../data/content'
import { hash01 } from '../../lib/hash'
import { GALAXY_SHAPE, PALETTE } from '../config'
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
  PALETTE.gold,
  PALETTE.rose,
  PALETTE.mint,
  PALETTE.sky,
  PALETTE.lavender,
  PALETTE.pink,
  PALETTE.teal,
]
const PLANET_COLOURS = [
  PALETTE.lavender,
  PALETTE.pink,
  PALETTE.teal,
  PALETTE.sky,
  PALETTE.gold,
  PALETTE.mint,
  PALETTE.rose,
  PALETTE.violet,
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
 * Places one star system per project along the galaxy's spiral arms, from the
 * inner galaxy outward, alternating arms, and gives each system one planet per
 * technology. Deterministic: the same projects always give the same galaxy.
 */
export function layoutSystems(projects: Project[]): SystemLayout[] {
  const { radius, arms, windings } = GALAXY_SHAPE
  const count = projects.length

  return projects.map((project, index) => {
    // How far out along an arm: 0 = core, 1 = rim. Spread evenly from 0.34 to 0.84.
    const t = 0.34 + 0.5 * (count === 1 ? 0.5 : index / (count - 1))
    const r = 0.45 + t * (radius - 0.45)
    // The same logarithmic spiral the galaxy's arms follow (shapeGenerators/galaxy.ts),
    // nudged a little ahead of the arm so the system sits beside its brightest ridge.
    const armStart = ((index % arms) / arms) * TAU
    const angle = armStart + windings * TAU * (Math.log(1 + 3 * t) / Math.log(4)) + 0.16
    const center = new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r)

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
  return (
    THREE.MathUtils.smoothstep(morph, 2.82, 2.99) * (1 - THREE.MathUtils.smoothstep(morph, 3.02, 3.14))
  )
}
