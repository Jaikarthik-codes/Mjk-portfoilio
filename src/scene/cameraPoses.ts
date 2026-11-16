import { BURST_SHAPE, GALAXY_SHAPE } from './config'
import type { NameLayout } from './nameLayout'
import type { ConstellationField } from './shapeGenerators/constellationLayout'

/**
 * Where the camera sits for one section.
 *
 * Poses are described the way a camera operator would think — "orbit a bit to
 * the right, keep this much in shot, put the subject on the right of the
 * frame" — rather than as raw x/y/z coordinates. CameraRig turns a pose into an
 * actual position, and works out the distance from `frame`, so every pose
 * adapts to any screen shape on its own.
 */
export interface CameraPose {
  /** The point the camera orbits and looks at. */
  target: [number, number, number]
  /** Orbit angles in radians: azimuth swings the camera around the target, elevation lifts it. */
  azimuth: number
  elevation: number
  /** A width × height area around the target (world units) that must stay in shot. Sets the distance. */
  frame: [number, number]
  /** Where the target sits on screen, -1..1: [0, 0] centre, [0.4, 0] right of centre, [0, 0.3] above it. */
  shift: [number, number]
  /** Tilt of the horizon, in radians. */
  roll: number
}

/**
 * How the camera's distance swells or dips halfway between two poses, as a
 * fraction: -0.12 pushes 12% closer mid-move, 0.14 pulls 14% further back.
 * One entry per move (intro→about, about→skills, skills→projects, projects→contact).
 */
export const CAMERA_ARCS = [-0.12, 0.1, 0.14, -0.22]

/** One pose per section, in the same order as SECTION_IDS. */
export function getCameraPoses(
  portrait: boolean,
  name: NameLayout,
  field: ConstellationField,
): CameraPose[] {
  const galaxy = GALAXY_SHAPE.radius * 2
  const ring = BURST_SHAPE.radius * 2

  // On tall screens the text sits at the bottom, so subjects shift up.
  // On wide screens the text sits on the left, so subjects shift right.
  return portrait
    ? [
        // Intro: the name, straight on.
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [name.width / 0.72, 7], shift: [0, 0.02], roll: 0 },
        // About: inside the nebula.
        { target: [0, 0, 0], azimuth: 0.4, elevation: 0.1, frame: [8.5, 11], shift: [0, 0.34], roll: 0.03 },
        // Skills: the whole constellation field.
        { target: [0, 0, 0], azimuth: -0.1, elevation: 0.05, frame: [field.width + 0.4, field.height + 1], shift: [0, 0.3], roll: 0 },
        // Projects: pulled back to take in the galaxy.
        { target: [0, 0, 0], azimuth: -0.2, elevation: 0.16, frame: [galaxy + 3, 10], shift: [0, 0.56], roll: -0.02 },
        // Contact: the ring, straight on, links in its centre.
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [ring / 0.9, 12], shift: [0, 0], roll: 0 },
      ]
    : [
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [name.width / 0.58, 7], shift: [0, 0.02], roll: 0 },
        { target: [0, 0, 0], azimuth: 0.5, elevation: 0.12, frame: [13.5, 9.5], shift: [0.36, 0], roll: 0.04 },
        { target: [0, 0, 0], azimuth: -0.14, elevation: 0.06, frame: [field.width + 1.5, field.height + 4.2], shift: [0, 0.16], roll: 0 },
        { target: [0, 0, 0], azimuth: -0.28, elevation: 0.2, frame: [galaxy / 0.56, 12], shift: [0.4, 0.02], roll: -0.03 },
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [ring / 0.6, ring / 0.74], shift: [0, 0], roll: 0 },
      ]
}
