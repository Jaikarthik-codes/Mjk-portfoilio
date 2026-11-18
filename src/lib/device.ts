export type QualityTier = 'ultra' | 'high' | 'low'
export const QUALITY_TIERS: QualityTier[] = ['ultra', 'high', 'low']

/**
 * A quick guess at how much the device can handle (see QUALITY in scene/config.ts):
 *   ultra — a dedicated graphics card (gaming laptops, desktops): the most particles and pixels
 *   high  — most laptops and desktops
 *   low   — phones and low-power devices
 *
 * Add ?quality=ultra (or high, or low) to the address to choose for yourself.
 */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'

  const asked = new URLSearchParams(window.location.search).get('quality')
  if (asked && (QUALITY_TIERS as string[]).includes(asked)) return asked as QualityTier

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  const touchFirst = window.matchMedia('(pointer: coarse)').matches
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820
  const cores = nav.hardwareConcurrency ?? 8
  const memory = nav.deviceMemory ?? 8
  const saveData = nav.connection?.saveData === true

  if ((touchFirst && smallScreen) || cores <= 4 || memory <= 4 || saveData) return 'low'
  if (!touchFirst && cores >= 8 && memory >= 8 && DEDICATED_GPU.test(graphicsCard())) return 'ultra'
  return 'high'
}

/** Graphics cards (by name) that get the ultra tier: NVIDIA, AMD Radeon RX / Pro, Intel Arc, Apple's Pro/Max/Ultra chips. */
const DEDICATED_GPU = /nvidia|geforce|quadro|\brtx\b|\bgtx\b|radeon\s*(\(tm\)\s*)?(rx|pro)|\barc\s*a\d|apple m\d\s*(pro|max|ultra)/i

/**
 * The graphics card's name, as the browser reports it (e.g. "ANGLE (NVIDIA,
 * NVIDIA GeForce RTX 4060 Laptop GPU …)"). Asks for the high-performance GPU,
 * as the site's own canvas does, so laptops with two report the faster one.
 */
function graphicsCard(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ?? canvas.getContext('webgl')
    if (!gl) return ''
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return ''
  }
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** True if the visitor has asked their system for reduced motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}
