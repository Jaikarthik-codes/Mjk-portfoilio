import * as THREE from 'three'
import { GALAXY_SHAPE } from './config'

/**
 * The galaxy's orientation, in JavaScript.
 *
 * The particle galaxy is generated lying flat, then spun and tilted on the GPU
 * (restGalaxy() in particles.vert.glsl). The clickable star systems have to
 * ride along with it, so this file builds the very same rotation as a matrix:
 *
 *   world = roll · lean · spin(time) · flat
 *
 * (The shader's rotate() turns the other way round the y axis from three.js's
 * makeRotationY, hence the minus sign on the spin.)
 */
const tilt = new THREE.Matrix4()
  .makeRotationZ(GALAXY_SHAPE.tilt[1]) // roll
  .multiply(new THREE.Matrix4().makeRotationX(GALAXY_SHAPE.tilt[0])) // lean toward the camera

/** Writes the galaxy's rotation at `time` (seconds) into `out`. */
export function getGalaxyMatrix(time: number, out: THREE.Matrix4): THREE.Matrix4 {
  return out.makeRotationY(-time * GALAXY_SHAPE.spin).premultiply(tilt)
}

/** The galaxy's spin axis in world space: "up" for the disc. Spinning never changes it. */
export const GALAXY_NORMAL = new THREE.Vector3(0, 1, 0).applyMatrix4(tilt).normalize()
