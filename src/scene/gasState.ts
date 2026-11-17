import * as THREE from 'three'
import { SHAPE_INDEX } from './config'

const { smoothstep, clamp } = THREE.MathUtils

export interface GasState {
  /** How much of this shape's gas shows, 0..1. */
  weight: number
  /** Size of the gas picture (1 = as designed). */
  scale: number
}

/**
 * How much of shape `index`'s gas shows when the particles are at `morph`
 * (rig.morph: 0 the name … 5 the supernova), and how big it is.
 *
 * While the particles fly from one shape to the next, the old picture fades
 * out over the first two thirds of the move and the new one fades in over the
 * last two thirds, so mid-flight there is a moment of darker sky with the
 * particles streaming through it.
 *
 * Two moves are special:
 *   - the intro: the stardust grows out of the Big Bang
 *   - galaxy → supernova: the galaxy shrinks into a point as its particles
 *     collapse, then the supernova's gas expands out of that point
 * With `calm` (reduced motion) nothing grows or shrinks: pictures only fade.
 */
export function gasState(morph: number, index: number, intro: number, calm = false): GasState {
  const t = morph - index // < 0: still to come; > 0: already left
  if (t <= -1 || t >= 1) return { weight: 0, scale: 1 }

  if (index === SHAPE_INDEX.galaxy && t > 0 && !calm) {
    const { collapse } = supernovaPhase(t)
    return {
      // Brighter as it is squeezed into a smaller and smaller space, then gone.
      weight: (1 + 1.5 * collapse) * (1 - smoothstep(collapse, 0.7, 1)),
      scale: 1 - 0.94 * collapse,
    }
  }
  if (index === SHAPE_INDEX.nova && t < 0 && !calm) {
    const { bloom } = supernovaPhase(t + 1)
    return { weight: Math.pow(bloom, 0.7), scale: 0.06 + 0.94 * bloom }
  }

  let weight = t < 0 ? smoothstep(t + 1, 0.35, 1) : 1 - smoothstep(t, 0, 0.65)
  let scale = 1
  if (index === SHAPE_INDEX.name) {
    // The opening Big Bang: the stardust blooms out of the first flash.
    const reveal = smoothstep(intro, 0.12, 0.6)
    weight *= reveal
    scale = 0.35 + 0.65 * (1 - Math.pow(1 - reveal, 3))
  }
  return { weight, scale }
}

/**
 * The supernova's two stages for a typical particle (see `nova` in
 * particles.vert.glsl): `collapse` 0 → 1 as matter falls to the centre,
 * then `bloom` 0 → 1 as it bursts back out. `t` is the morph's progress, 0..1.
 */
export function supernovaPhase(t: number) {
  const nova = clamp((clamp(t, 0, 1) - 0.5 * 0.22) / 0.78, 0, 1)
  const collapse = Math.pow(Math.min(nova / 0.46, 1), 2.4)
  const bloom = 1 - Math.pow(1 - clamp((nova - 0.52) / 0.48, 0, 1), 3)
  return { collapse, bloom }
}
