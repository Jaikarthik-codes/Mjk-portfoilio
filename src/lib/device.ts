export type QualityTier = 'high' | 'low'

/**
 * A quick guess at how much the device can handle.
 * 'low' cuts the particle count (see PARTICLE_COUNT in scene/config.ts).
 *
 * This is a first pass — Phase 5 extends it (post effects, explore mode).
 */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  const touchFirst = window.matchMedia('(pointer: coarse)').matches
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4
  const lowMemory = (nav.deviceMemory ?? 8) <= 4
  const saveData = nav.connection?.saveData === true

  return (touchFirst && smallScreen) || fewCores || lowMemory || saveData ? 'low' : 'high'
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** True if the visitor has asked their system for reduced motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}
