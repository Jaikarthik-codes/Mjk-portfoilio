/**
 * Look-and-feel constants for the 3D scene.
 * Everything here is tuning, not content — site text lives in src/data/content.ts.
 */

import type { QualityTier } from '../lib/device'

/** How many particles each quality tier gets. */
export const PARTICLE_COUNT: Record<QualityTier, number> = {
  high: 50_000,
  low: 10_000,
}

/**
 * The order shapes appear in as the morph progress goes 0 → 1 → 2 …
 * Later phases append to this list (constellations, contact burst).
 */
export const SHAPES = ['name', 'nebula', 'galaxy'] as const
export type ShapeName = (typeof SHAPES)[number]

/**
 * The cosmic palette. Hex values are sRGB, exactly as you would write them in CSS.
 *
 * These are a little more saturated than the pastels you see on screen: particles
 * are drawn with additive blending, so wherever they overlap the colours add up
 * and drift toward white, which softens them.
 */
export const PALETTE = {
  void: '#05030f',
  white: '#ffffff',
  lavender: '#bfa8ff',
  violet: '#9068ff',
  indigo: '#5b4be0',
  pink: '#ff7cc8',
  rose: '#ffb0da',
  teal: '#3fe0c8',
  mint: '#a4ffe9',
  sky: '#7ab8ff',
  gold: '#ffcc85',
  cream: '#fff0d6',
} as const

export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 300,
}

export const TEXT_SHAPE = {
  /** Font used to draw the name before it is sampled into particles. */
  fontFamily: '"Outfit Variable", system-ui, sans-serif',
  fontWeight: 600,
  uppercase: true,
  /** Extra space between letters, as a fraction of the font size. */
  letterSpacing: 0.14,
  /** Line height for the stacked (narrow screen) layout, as a multiple of the font size. */
  lineHeight: 1.05,
  /** World-space width of the name on one line … */
  width: 11,
  /** … and when the words are stacked on narrow screens. */
  stackedWidth: 6.4,
  /** How thick the letters are front-to-back. */
  depth: 0.07,
  /** Share of particles that float around the letters as loose stardust. */
  dustRatio: 0.09,
}

export const NEBULA_SHAPE = {
  /** Half-size of the cloud along x, y and z. */
  radii: [8.6, 4.7, 4.2] as const,
}

export const GALAXY_SHAPE = {
  radius: 7.2,
  arms: 2,
  /** How many times each arm wraps around the core on its way out. */
  windings: 1.25,
  /** Share of particles in the central bulge, and in the faint outer disc. */
  bulgeRatio: 0.17,
  haloRatio: 0.12,
  /** Tilt (radians): x leans the disc toward the camera, y rolls it on screen. */
  tilt: [0.66, -0.24] as const,
}

/** Per-shape particle look. `size` is a diameter in world units, `alpha` an opacity. */
export const SHAPE_LOOK: Record<ShapeName, { size: number; alpha: number }> = {
  name: { size: 0.05, alpha: 0.4 },
  nebula: { size: 0.095, alpha: 0.4 },
  galaxy: { size: 0.07, alpha: 0.65 },
}

/** How the particles move. These map one-to-one onto uniforms in particles.vert.glsl. */
export const MOTION = {
  /** 0..1 — how spread out particle start times are within a morph. */
  stagger: 0.55,
  /** World units a particle can be blown off course mid-morph. */
  turbulence: 1.3,
  /** Radians the cloud twists mid-morph. */
  swirl: 0.85,
  /** 0..1 — strength of the brightness flicker. */
  twinkle: 0.45,
  /** How quickly the particles catch up with the requested morph value (higher = snappier). */
  morphDamping: 7,
  /** Furthest the cursor pushes a particle, and how far its influence reaches (1.0 = half the screen height). */
  pointerStrength: 0.05,
  pointerRadius: 0.26,
}
