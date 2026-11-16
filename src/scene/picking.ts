import * as THREE from 'three'
import { pushFromPointer } from './frame'

/**
 * Helpers for pointing at things in 3D.
 *
 * Instead of firing rays into the scene, the site works on the screen: every
 * frame it works out where each clickable star lands on screen (a few dozen
 * points — trivial) and compares that with the cursor. That is cheap, exact,
 * and matches what you see, including the cursor push.
 */

const scratch = new THREE.Vector3()
const ndc = new THREE.Vector2()

export interface ScreenPoint {
  /** CSS pixels from the canvas's top-left corner. */
  x: number
  y: number
  /** False when the point is behind the camera. */
  visible: boolean
}

/**
 * Where a world-space point appears on screen, in CSS pixels. With `pushed`,
 * includes the cursor push that the skill stars get (see pointer.glsl).
 * The camera's matrices must be current (CameraRig updates them early each frame).
 */
export function toScreen(
  world: THREE.Vector3 | readonly [number, number, number],
  camera: THREE.Camera,
  size: { width: number; height: number },
  out: ScreenPoint,
  pushed = false,
): ScreenPoint {
  if (world instanceof THREE.Vector3) scratch.copy(world)
  else scratch.set(world[0], world[1], world[2])
  scratch.applyMatrix4(camera.matrixWorldInverse)
  out.visible = scratch.z < 0
  scratch.applyMatrix4(camera.projectionMatrix)
  ndc.set(scratch.x, scratch.y)
  if (pushed) pushFromPointer(ndc)
  out.x = ((ndc.x + 1) / 2) * size.width
  out.y = ((1 - ndc.y) / 2) * size.height
  return out
}

/** How many CSS pixels across `worldSize` units appear at `world`'s distance from the camera. */
export function pixelsAcross(
  worldSize: number,
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  height: number,
): number {
  const depth = Math.max(0.001, scratch.copy(world).applyMatrix4(camera.matrixWorldInverse).z * -1)
  return (worldSize / (2 * depth * Math.tan((camera.fov * Math.PI) / 360))) * height
}

/**
 * True when a click landed on a real control (a link, a button, the project
 * panel …) rather than on empty sky, so the 3D scene should ignore it.
 */
export function isPageControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('a, button, input, dialog, [data-ui]') !== null
}

/** Index of the point nearest to (x, y) within `radius` CSS pixels, or -1. */
export function nearest(points: ScreenPoint[], x: number, y: number, radius: number | number[]): number {
  let best = -1
  let bestScore = 1
  points.forEach((point, i) => {
    if (!point.visible) return
    // Measured relative to each point's own reach, so big targets are easier to hit.
    const reach = typeof radius === 'number' ? radius : radius[i]
    const score = Math.hypot(point.x - x, point.y - y) / reach
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}
