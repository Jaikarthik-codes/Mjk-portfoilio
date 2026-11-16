import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../data/content'
import { rig } from '../journey/rig'
import { CAMERA_ARCS, getCameraPoses, getFocusFraming } from './cameraPoses'
import { CAMERA } from './config'
import { clock } from './frame'
import { GALAXY_NORMAL } from './galaxyFrame'
import { distanceToFit, getNameLayout } from './nameLayout'
import { pointer } from './pointer'
import { layoutSystems, systemWorldPosition } from './projects/systemLayout'
import { layoutConstellations } from './shapeGenerators/constellationLayout'

const { lerp, damp, clamp } = THREE.MathUtils

/** How far the camera leans toward the cursor, in radians (left/right, up/down). */
const PARALLAX = [0.05, 0.035]
/** Extra field of view at the peak of a warp, in degrees — the lens "stretches" with speed. */
const WARP_FOV = 16
/** How much further back the camera pulls mid-hop between two systems (1 = twice as far). */
const HOP_ARC = 1.3
/** How steeply the camera looks down onto a system's orbits (radians above their plane). */
const FOCUS_ELEVATION = 0.62
const STRAIGHT_AHEAD = new THREE.Vector3(0, 0, -1)

/**
 * Where the camera is looking during a warp, for the effects: written here
 * every frame, read by the hyperspace streaks, the colour fringing and the
 * particle shader.
 */
export const warpView = {
  /** Direction of travel in camera space, always pointing ahead of the camera. */
  axis: new THREE.Vector3(0, 0, -1),
  /** +1 flying toward `vanish`, -1 flying away from it. */
  direction: 1,
  /** Where the streaks converge on screen, 0..1 (like a texture coordinate). */
  vanish: new THREE.Vector2(0.5, 0.5),
  /** The point the camera is visiting, how much room to clear around it, and how close we are (0..1). */
  focusCenter: new THREE.Vector3(),
  focusRadius: 1,
  focus: 0,
}

/**
 * The camera.
 *
 * Normally it follows the scroll: GSAP moves `rig.camera` from 0 to 4, a whole
 * number means "sit exactly in that section's pose", 1.5 means "halfway from
 * the About pose to the Skills pose", and each frame this blends the two
 * neighbouring poses.
 *
 * During a warp, `rig.warp` blends that scroll pose with a close-up "focus"
 * pose on one star system. Distance is blended on a logarithmic scale, so the
 * approach feels like constant acceleration rather than slowing to a crawl.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const aspect = useThree((state) => state.size.width / state.size.height)
  const portrait = aspect < 1

  // Poses depend on the screen shape, so rebuild them when it changes.
  const poses = useMemo(() => {
    const built = getCameraPoses(
      portrait,
      getNameLayout(portrait),
      layoutConstellations(content.skills, portrait),
    )
    // Work out each pose's distance once, here, rather than every frame.
    return built.map((pose) => ({
      ...pose,
      distance: distanceToFit(pose.frame[0], pose.frame[1], aspect),
    }))
  }, [aspect, portrait])

  const systems = useMemo(() => layoutSystems(content.projects), [])
  const framing = useMemo(() => getFocusFraming(portrait), [portrait])

  // The direction the camera views every system from: on the same side as the
  // Projects pose (so the warp does not swing around), raised to look down
  // onto the orbits at FOCUS_ELEVATION.
  const focusDirection = useMemo(() => {
    const projects = poses[3]
    const fromPose = directionFromAngles(projects.azimuth, projects.elevation, new THREE.Vector3())
    const flat = fromPose.clone().addScaledVector(GALAXY_NORMAL, -fromPose.dot(GALAXY_NORMAL)).normalize()
    return GALAXY_NORMAL.clone()
      .multiplyScalar(Math.sin(FOCUS_ELEVATION))
      .addScaledVector(flat, Math.cos(FOCUS_ELEVATION))
      .normalize()
  }, [poses])

  const lean = useRef({ x: 0, y: 0 })
  const s = useMemo(
    () => ({
      target: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      focus: new THREE.Vector3(),
      lastPosition: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      inverse: new THREE.Quaternion(),
    }),
    [],
  )

  // Priority -1: run before everything that projects things onto the screen
  // (hover tests, labels), so they all see this frame's camera.
  useFrame((state, delta) => {
    // ── 1. The scroll pose ────────────────────────────────────────────────────
    // Which two poses are we between, and how far along?
    const position = clamp(rig.camera, 0, poses.length - 1)
    const index = Math.min(poses.length - 2, Math.floor(position))
    const blend = position - index
    const from = poses[index]
    const to = poses[index + 1]

    let azimuth = lerp(from.azimuth, to.azimuth, blend)
    let elevation = lerp(from.elevation, to.elevation, blend)
    // Mid-move, swell or dip the distance so the camera travels on an arc
    // instead of a straight line. sin(π·blend) is 0 at both ends, 1 in the middle.
    let distance =
      lerp(from.distance, to.distance, blend) * (1 + CAMERA_ARCS[index] * Math.sin(Math.PI * blend))
    s.target.set(
      lerp(from.target[0], to.target[0], blend),
      lerp(from.target[1], to.target[1], blend),
      lerp(from.target[2], to.target[2], blend),
    )
    let shiftX = lerp(from.shift[0], to.shift[0], blend)
    let shiftY = lerp(from.shift[1], to.shift[1], blend)
    let roll = lerp(from.roll, to.roll, blend)

    // ── 2. Blend toward a star system while warping ───────────────────────────
    const warp = rig.warp
    if (warp > 0) {
      const time = clock.time
      const a = systems[rig.hopFrom]
      const b = systems[rig.hopTo]
      systemWorldPosition(a, time, s.from)
      systemWorldPosition(b, time, s.to)
      s.focus.lerpVectors(s.from, s.to, rig.hop)
      const radius = lerp(a.radius, b.radius, rig.hop)
      const focusDistance =
        distanceToFit(radius * framing.frame[0], radius * framing.frame[1], aspect) *
        (1 + HOP_ARC * Math.sin(Math.PI * rig.hop))

      // The camera turns toward the system sooner than it closes in, so the
      // system glides steadily to its spot on screen instead of drifting off.
      const turn = 1 - Math.pow(1 - warp, 2.5)
      directionFromAngles(azimuth, elevation, s.direction).lerp(focusDirection, turn).normalize()
      azimuth = Math.atan2(s.direction.x, s.direction.z)
      elevation = Math.asin(clamp(s.direction.y, -1, 1))
      s.target.lerp(s.focus, turn)
      distance = Math.exp(lerp(Math.log(distance), Math.log(focusDistance), warp))
      shiftX = lerp(shiftX, framing.shift[0], turn)
      shiftY = lerp(shiftY, framing.shift[1], turn)
      roll = lerp(roll, 0, turn)

      warpView.focusCenter.copy(s.focus)
      warpView.focusRadius = radius * 1.6
    }
    warpView.focus = warp

    // ── 3. Life: lean gently toward the cursor, and never sit perfectly still ──
    const leanTarget = pointer.active && pointer.type !== 'touch'
    lean.current.x = damp(lean.current.x, leanTarget ? pointer.x : 0, 2.5, delta)
    lean.current.y = damp(lean.current.y, leanTarget ? pointer.y : 0, 2.5, delta)
    const time = state.clock.elapsedTime
    azimuth += lean.current.x * PARALLAX[0] + Math.sin(time * 0.11) * 0.018
    elevation += lean.current.y * PARALLAX[1] + Math.cos(time * 0.09) * 0.012

    // ── 4. Place the camera ───────────────────────────────────────────────────
    // A wider lens at warp speed: the classic "stretch" of jumping to hyperspace.
    const fov = CAMERA.fov + WARP_FOV * rig.warpFx
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // Orbit: stand `distance` away from the target in the direction the two
    // angles point, then turn to face it.
    directionFromAngles(azimuth, elevation, s.direction)
    camera.position.copy(s.target).addScaledVector(s.direction, distance)
    camera.lookAt(s.target)

    // Shift: slide the camera sideways (in its own left/right, up/down
    // directions) so the target lands off-centre, leaving room for the text.
    // Sliding the camera left moves the subject right, hence the minus signs.
    const halfHeight = distance * Math.tan((fov * Math.PI) / 360)
    camera.translateX(-shiftX * halfHeight * aspect)
    camera.translateY(-shiftY * halfHeight)
    camera.rotateZ(roll)
    camera.updateMatrixWorld()

    // ── 5. Tell the warp effects which way we are flying ──────────────────────
    trackFlight(camera, delta, s)
  }, -1)

  return null
}

/** Unit vector pointing from the target toward the camera, for orbit angles (radians). */
function directionFromAngles(azimuth: number, elevation: number, out: THREE.Vector3) {
  return out.set(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  )
}

/**
 * Works out the camera's direction of travel (in its own space) and where on
 * screen that direction points: the spot hyperspace streaks rush out of.
 */
function trackFlight(
  camera: THREE.PerspectiveCamera,
  delta: number,
  s: { lastPosition: THREE.Vector3; velocity: THREE.Vector3; ahead: THREE.Vector3; inverse: THREE.Quaternion },
) {
  // Velocity in camera space: x right, y up, -z straight ahead.
  s.velocity.subVectors(camera.position, s.lastPosition).divideScalar(Math.max(delta, 0.001))
  s.lastPosition.copy(camera.position)
  if (rig.warpFx < 0.001) return
  s.velocity.applyQuaternion(s.inverse.copy(camera.quaternion).invert())
  if (s.velocity.lengthSq() < 1e-6) return

  // The streaks always sit ahead of the camera. Reversing just flips which way they move.
  const forward = s.velocity.z <= 0
  s.ahead.copy(s.velocity).normalize()
  if (!forward) s.ahead.negate()
  // Lean on the view direction, so a sideways hop still reads as "forward".
  s.ahead.lerp(STRAIGHT_AHEAD, 0.35).normalize()
  warpView.axis.lerp(s.ahead, Math.min(1, delta * 8)).normalize()
  warpView.direction = forward ? 1 : -1

  // Project the direction onto the screen.
  const projected = s.ahead.copy(warpView.axis).applyMatrix4(camera.projectionMatrix)
  warpView.vanish.set(clamp(projected.x * 0.5 + 0.5, -0.2, 1.2), clamp(projected.y * 0.5 + 0.5, -0.2, 1.2))
}
