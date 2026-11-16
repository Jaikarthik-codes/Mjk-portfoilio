import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../data/content'
import { rig } from '../journey/rig'
import { CAMERA_ARCS, getCameraPoses } from './cameraPoses'
import { CAMERA } from './config'
import { distanceToFit, getNameLayout } from './nameLayout'
import { pointer } from './pointer'
import { layoutConstellations } from './shapeGenerators/constellationLayout'

const { lerp, damp, clamp } = THREE.MathUtils
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

/** How far the camera leans toward the cursor, in radians (left/right, up/down). */
const PARALLAX = [0.05, 0.035]

/**
 * The scroll-driven camera.
 *
 * GSAP moves one number, `rig.camera`, from 0 to 4 as you scroll. A whole
 * number means "sit exactly in that section's pose"; 1.5 means "halfway from
 * the About pose to the Skills pose". Every frame this component blends the
 * two neighbouring poses and places the camera.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const aspect = useThree((state) => state.size.width / state.size.height)

  // Poses depend on the screen shape, so rebuild them when it changes.
  const poses = useMemo(() => {
    const portrait = aspect < 1
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
  }, [aspect])

  const lean = useRef({ x: 0, y: 0 })
  const target = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
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
    const distance =
      lerp(from.distance, to.distance, blend) *
      (1 + CAMERA_ARCS[index] * Math.sin(Math.PI * blend))
    target.set(
      lerp(from.target[0], to.target[0], blend),
      lerp(from.target[1], to.target[1], blend),
      lerp(from.target[2], to.target[2], blend),
    )

    // Life: lean gently toward the cursor, and never sit perfectly still.
    lean.current.x = damp(lean.current.x, pointer.active ? pointer.x : 0, 2.5, delta)
    lean.current.y = damp(lean.current.y, pointer.active ? pointer.y : 0, 2.5, delta)
    const time = state.clock.elapsedTime
    azimuth += lean.current.x * PARALLAX[0] + Math.sin(time * 0.11) * 0.018
    elevation += lean.current.y * PARALLAX[1] + Math.cos(time * 0.09) * 0.012

    // Orbit: stand `distance` away from the target in the direction the two
    // angles point, then turn to face it.
    camera.position.set(
      target.x + distance * Math.sin(azimuth) * Math.cos(elevation),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(azimuth) * Math.cos(elevation),
    )
    camera.lookAt(target)

    // Shift: slide the camera sideways (in its own left/right, up/down
    // directions) so the target lands off-centre, leaving room for the text.
    // Sliding the camera left moves the subject right, hence the minus signs.
    const halfHeight = distance * TAN_HALF_FOV
    camera.translateX(-lerp(from.shift[0], to.shift[0], blend) * halfHeight * aspect)
    camera.translateY(-lerp(from.shift[1], to.shift[1], blend) * halfHeight)
    camera.rotateZ(lerp(from.roll, to.roll, blend))
  })

  return null
}
