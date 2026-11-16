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
 * The order shapes appear in as the morph progress goes 0 → 1 → 2 → 3 → 4.
 * One shape per scroll section, in the same order as SECTION_IDS.
 * (If you change this list, the #defines at the top of particles.vert.glsl must match.)
 */
export const SHAPES = ['name', 'nebula', 'constellation', 'galaxy', 'burst'] as const
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

/**
 * Background colour for each stage of the journey: violet → teal → gold.
 * `inner` glows softly behind the middle of the screen, `outer` is the edge colour.
 * Keep these very dark — the particles need a near-black sky to glow against.
 */
export const BACKDROP_GRADES = [
  { inner: '#1c0d40', outer: '#05030d' }, // violet: intro and about
  { inner: '#062a30', outer: '#02080b' }, // teal: skills and projects
  { inner: '#2e1b07', outer: '#0a0503' }, // gold: contact
] as const

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
  /** Largest size the name may take on one line, in world units … */
  width: 11,
  maxHeight: 1.7,
  /** … and when the words are stacked on narrow screens. */
  stackedWidth: 6.4,
  stackedMaxHeight: 3.2,
  /** How thick the letters are front-to-back. */
  depth: 0.07,
  /** Share of particles that float around the letters as loose stardust. */
  dustRatio: 0.09,
}

export const NEBULA_SHAPE = {
  /** Half-size of the cloud along x, y and z. */
  radii: [8.6, 4.7, 4.2] as const,
}

export const CONSTELLATION_SHAPE = {
  /** Space given to each constellation (width, height) on landscape and portrait screens. */
  cell: [6.4, 5.4] as const,
  portraitCell: [5.0, 5.2] as const,
  /** Share of particles that condense into the stars, and that trace the lines between them. */
  starRatio: 0.5,
  lineRatio: 0.14,
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

export const BURST_SHAPE = {
  /** Radius of the bright shock ring. The space inside it is left clear for the contact links. */
  radius: 4.6,
  /** Number of streaks flying out from the ring. */
  rays: 30,
  /** Share of particles in the ring, and in the rays. The rest is loose debris. */
  ringRatio: 0.42,
  rayRatio: 0.38,
}

/**
 * Per-shape particle look.
 *   size       — particle diameter in world units
 *   alpha      — particle opacity
 *   drift      — how far (world units) particles wander while the shape is at rest
 *   driftScale — size of the drift's swirls: small = broad, slow billows; large = fine shimmer
 */
export const SHAPE_LOOK: Record<
  ShapeName,
  { size: number; alpha: number; drift: number; driftScale: number }
> = {
  name: { size: 0.05, alpha: 0.4, drift: 0.028, driftScale: 0.9 },
  nebula: { size: 0.095, alpha: 0.4, drift: 0.42, driftScale: 0.16 },
  constellation: { size: 0.06, alpha: 0.5, drift: 0.03, driftScale: 0.5 },
  galaxy: { size: 0.07, alpha: 0.65, drift: 0, driftScale: 0.3 },
  burst: { size: 0.065, alpha: 0.55, drift: 0.07, driftScale: 0.3 },
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
  /** Furthest the cursor pushes a particle, and how far its influence reaches (1.0 = half the screen height). */
  pointerStrength: 0.05,
  pointerRadius: 0.26,
  /** Length of the opening Big Bang, in seconds. */
  introSeconds: 5.6,
}
