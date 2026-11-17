import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { MOTION } from './config'
import { pointer } from './pointer'

/**
 * Uniforms that many shaders need and that change every frame: the clock, the
 * canvas size and the cursor.
 *
 * Each material spreads these into its own `uniforms` (`{ ...frameUniforms, … }`).
 * That copies references, not values, so every material reads the very same
 * objects and one update per frame (in <FrameTicker>) reaches all of them.
 */
export const frameUniforms = {
  /** Seconds of animation so far. Every moving thing reads this one clock, so the
   *  particle galaxy and the star systems inside it spin in perfect lockstep. */
  uTime: { value: 0 },
  /** Height of the canvas in real device pixels (for sizing points in pixels). */
  uPixelHeight: { value: 1080 },
  /** Canvas width / height. */
  uAspect: { value: 1 },
  /** Device pixels per CSS pixel (2 on most phones and Retina screens). */
  uPixelRatio: { value: 1 },
  /** Cursor position -1..1 (smoothed), how hard it pushes, and how far it reaches. */
  uPointer: { value: new THREE.Vector2() },
  uPointerStrength: { value: 0 },
  uPointerRadius: { value: MOTION.pointerRadius },
}

/** The same clock, for JavaScript. */
export const clock = {
  get time() {
    return frameUniforms.uTime.value
  },
}

/**
 * Advances the shared uniforms. Mount once, first thing inside the canvas.
 * Priority -2 makes it run before every other per-frame callback.
 */
export function FrameTicker() {
  useFrame((state, delta) => {
    // The cap stops everything lurching forward after the tab has been in the background.
    const step = Math.min(delta, 0.1)
    // Reduced motion: the clock stands still, so nothing drifts, spins or twinkles.
    if (!useStore.getState().calm) frameUniforms.uTime.value += step

    frameUniforms.uPixelHeight.value = state.size.height * state.viewport.dpr
    frameUniforms.uAspect.value = state.size.width / state.size.height
    frameUniforms.uPixelRatio.value = state.viewport.dpr

    // Cursor gravity: follow the pointer with a little lag, and fade the push
    // in and out rather than switching it on and off.
    const smooth = frameUniforms.uPointer.value
    const strength = frameUniforms.uPointerStrength.value / MOTION.pointerStrength
    if (strength < 0.01) {
      // The push is invisible right now, so jump straight to the pointer.
      smooth.set(pointer.x, pointer.y)
    } else {
      smooth.x = THREE.MathUtils.damp(smooth.x, pointer.x, 9, step)
      smooth.y = THREE.MathUtils.damp(smooth.y, pointer.y, 9, step)
    }
    const target = pointer.active ? 1 : 0
    frameUniforms.uPointerStrength.value =
      THREE.MathUtils.damp(strength, target, 4, step) * MOTION.pointerStrength
  }, -2)

  return null
}

/**
 * JavaScript twin of the cursor push in shaders/pointer.glsl.
 * Moves a point given in screen space (-1..1) exactly as the shaders do, so
 * hover tests line up with what is drawn.
 */
export function pushFromPointer(ndc: THREE.Vector2): THREE.Vector2 {
  const aspect = frameUniforms.uAspect.value
  const strength = frameUniforms.uPointerStrength.value
  if (strength <= 0) return ndc
  const from = frameUniforms.uPointer.value
  const dx = (ndc.x - from.x) * aspect
  const dy = ndc.y - from.y
  const length = Math.hypot(dx, dy) + 0.00001
  const reach = length / frameUniforms.uPointerRadius.value
  const push = strength * 2.33 * reach * Math.exp(-reach * reach)
  ndc.x += ((dx / length) * push) / aspect
  ndc.y += (dy / length) * push
  return ndc
}
