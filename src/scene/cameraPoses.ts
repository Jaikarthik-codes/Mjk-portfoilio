import { STAGES } from './config'
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

/**
 * One pose per section, in the same order as SECTION_IDS.
 *
 * Every picture is a photograph on a plane facing the camera, so the camera
 * looks at each one nearly straight on (a slight angle adds depth to the
 * particles; a large one would show the gas as a flat card). Most poses fill
 * the view's height with their picture, as in the look lab.
 */
export function getCameraPoses(
  portrait: boolean,
  name: NameLayout,
  field: ConstellationField,
): CameraPose[] {
  const nebula = STAGES.nebulaA.height
  const galaxy = STAGES.galaxy.height
  const nova = STAGES.nova.height

  // On tall screens the text sits at the bottom, so subjects shift up.
  // On wide screens the text sits on the left, so subjects shift right.
  return portrait
    ? [
        // Intro: the name, straight on.
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [name.width / 0.72, 7], shift: [0, 0.02], roll: 0 },
        // About: the nebulae, above the text.
        { target: [0, 0, 0], azimuth: 0.08, elevation: 0.03, frame: [nebula, 11], shift: [0, 0.34], roll: 0.02 },
        // Skills: the whole constellation field.
        { target: [0, 0, 0], azimuth: -0.06, elevation: 0.03, frame: [field.width + 0.4, field.height + 1], shift: [0, 0.3], roll: 0 },
        // Projects: the galaxy, across the screen's width.
        { target: [0, 0, 0], azimuth: -0.06, elevation: 0.05, frame: [galaxy * 1.02, 10], shift: [0, 0.4], roll: -0.015 },
        // Contact: the supernova, straight on, links in its centre.
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [nova * 1.11, 12], shift: [0, 0], roll: 0 },
      ]
    : [
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [name.width / 0.58, 7], shift: [0, 0.02], roll: 0 },
        { target: [0, 0, 0], azimuth: 0.1, elevation: 0.04, frame: [nebula * 1.42, nebula], shift: [0.36, 0], roll: 0.02 },
        { target: [0, 0, 0], azimuth: -0.06, elevation: 0.03, frame: [field.width + 1.5, field.height + 4.2], shift: [0, 0.16], roll: 0 },
        { target: [0, 0, 0], azimuth: -0.08, elevation: 0.06, frame: [galaxy / 0.56, galaxy], shift: [0.4, 0.02], roll: -0.02 },
        { target: [0, 0, 0], azimuth: 0, elevation: 0, frame: [nova * 1.39, nova * 1.13], shift: [0, 0], roll: 0 },
      ]
}

/**
 * How the camera frames a star system you have warped to, as multiples of the
 * system's radius: `frame` is the width × height to keep in shot and `shift`
 * where the system sits on screen. It is placed beside the project panel: left
 * of it on wide screens, above it on tall ones (where the panel is a sheet
 * along the bottom).
 */
export function getFocusFraming(portrait: boolean): { frame: [number, number]; shift: [number, number] } {
  return portrait
    ? { frame: [2.5, 2.5 / 0.42], shift: [0, 0.46] }
    : { frame: [2.4 / 0.6, 3], shift: [-0.36, 0.02] }
}
