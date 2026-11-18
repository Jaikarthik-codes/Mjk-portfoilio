/**
 * Look-and-feel constants for the 3D scene.
 * Everything here is tuning, not content — site text lives in src/data/content.ts.
 * The colours and the per-image looks live in src/look/ (palette.ts, scenes.ts).
 */

import type { QualityTier } from '../lib/device'
import type { LookSceneId } from '../look/scenes'

/**
 * What each quality tier draws (see detectQualityTier in lib/device.ts):
 *   particles  — how many
 *   gasLayers  — gas planes per picture (2 = near and far, for parallax)
 *   bloom      — the soft glow around the brightest light
 *   pixelRatio — the most screen pixels drawn per CSS pixel
 *   sampleSize — how finely the pictures are read when placing particles (px)
 *
 * Ultra's extra particles are all fine dust: the same light spread over three
 * times as many grains, so the gas's structure comes out finer and smoother.
 */
export const QUALITY: Record<
  QualityTier,
  { particles: number; gasLayers: 1 | 2; bloom: boolean; pixelRatio: number; sampleSize: number }
> = {
  ultra: { particles: 150_000, gasLayers: 2, bloom: true, pixelRatio: 2, sampleSize: 1024 },
  high: { particles: 50_000, gasLayers: 2, bloom: true, pixelRatio: 1.5, sampleSize: 512 },
  low: { particles: 10_000, gasLayers: 1, bloom: false, pixelRatio: 1.5, sampleSize: 512 },
}

/** How many particles each quality tier gets. */
export const PARTICLE_COUNT: Record<QualityTier, number> = {
  ultra: QUALITY.ultra.particles,
  high: QUALITY.high.particles,
  low: QUALITY.low.particles,
}

/**
 * The shapes the particles take, in scroll order. `rig.morph` counts through
 * them: 0 the name, 1 nebula A, 2 nebula B, 3 the star field, 4 the galaxy,
 * 5 the supernova. The About section holds two of them (nebula A, then B).
 * (If you change this list, the #defines at the top of particles.vert.glsl must match.)
 */
export const SHAPES = ['name', 'nebulaA', 'nebulaB', 'field', 'galaxy', 'nova'] as const
export type ShapeName = (typeof SHAPES)[number]
export const SHAPE_INDEX: Record<ShapeName, number> = {
  name: 0,
  nebulaA: 1,
  nebulaB: 2,
  field: 3,
  galaxy: 4,
  nova: 5,
}

/**
 * Where each shape's picture comes from and how big it is in the world.
 *
 *   scene  — the reference image (src/look/scenes.ts) its gas and particles come from
 *   height — height of that image in world units (its width follows the image's shape)
 *   gas    — how much of the image's gas is shown (1 = as tuned in the look lab)
 *   gasScale — the gas plane's size relative to `height`
 *
 * The star field (Skills) has no picture of its own: it borrows the stardust
 * gas, faint and enlarged, and its particles are spread out procedurally.
 */
export const STAGES: Record<
  ShapeName,
  { scene: LookSceneId; height: number; gas: number; gasScale: number; focus?: [number, number] }
> = {
  name: { scene: 'stardust', height: 11, gas: 0.8, gasScale: 1 },
  nebulaA: { scene: 'nebulaA', height: 9.5, gas: 1, gasScale: 1 },
  nebulaB: { scene: 'nebulaB', height: 7, gas: 1, gasScale: 1 },
  field: { scene: 'stardust', height: 11, gas: 0.12, gasScale: 1.9 },
  galaxy: { scene: 'galaxy', height: 15, gas: 1, gasScale: 1 },
  // The supernova is centred on the calm blue cavity inside its shell (57.5%
  // across, 40.6% down the image), where the contact links sit.
  nova: { scene: 'supernova', height: 11, gas: 1, gasScale: 1, focus: [0.575, 0.406] },
}

/** Where a stage's picture sits, so that its `focus` point (if any) is at the centre of the world. */
export function stageOffset(shape: ShapeName, aspect: number): [number, number] {
  const { focus, height } = STAGES[shape]
  if (!focus) return [0, 0]
  return [(0.5 - focus[0]) * height * aspect, (focus[1] - 0.5) * height]
}

export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 300,
}

/** Distance from which an image of height `height` exactly fills the view's height. */
export function fillDistance(height: number) {
  return height / (2 * Math.tan((CAMERA.fov * Math.PI) / 360))
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
}

/** The intro: which share of each class of particle spells the name (the rest are stardust). */
export const NAME_SHAPE = {
  mediums: 0.4,
  dust: 0.85,
  /** Brightness of the letters (linear light, before tone mapping). */
  brightness: 1.4,
}

export const CONSTELLATION_SHAPE = {
  /** Space given to each constellation (width, height) on landscape and portrait screens. */
  cell: [6.4, 5.4] as const,
  portraitCell: [5.0, 5.2] as const,
}

/** The Skills star field: calm, dim stars spread well beyond the constellations. */
export const FIELD_SHAPE = {
  /** Margin around the constellation field, in world units. */
  margin: 7,
  /** How far behind and in front of the constellations the stars spread. */
  depth: [-10, 2] as const,
  /** Overall brightness (the field is meant to be quiet). */
  brightness: 0.55,
}

export const GALAXY_SHAPE = {
  /** Half the galaxy image's height: the core-to-rim distance in world units. */
  radius: STAGES.galaxy.height / 2,
  /**
   * Orientation (radians). The particle galaxy and the star systems are laid
   * out flat in the x/z plane; x = π/2 stands that disc up to face the
   * camera (as in the photo), y would roll it.
   */
  tilt: [Math.PI / 2, 0] as const,
  /** How fast the galaxy turns, in radians per second (one turn every ~13 minutes). */
  spin: 0.008,
}

/**
 * Resting motion per shape:
 *   drift      — how far (world units) particles wander while the shape is at rest
 *   driftScale — size of the drift's swirls: small = broad, slow billows; large = fine shimmer
 * Kept small: the particles sit on the gas and should not wander away from it.
 */
export const SHAPE_LOOK: Record<ShapeName, { drift: number; driftScale: number }> = {
  name: { drift: 0.02, driftScale: 0.9 },
  nebulaA: { drift: 0.06, driftScale: 0.35 },
  nebulaB: { drift: 0.05, driftScale: 0.35 },
  field: { drift: 0.04, driftScale: 0.3 },
  galaxy: { drift: 0, driftScale: 0.3 },
  nova: { drift: 0.05, driftScale: 0.3 },
}

/** How the particles move. These map one-to-one onto uniforms in particles.vert.glsl. */
export const MOTION = {
  /** 0..1 — how spread out particle start times are within a morph. */
  stagger: 0.55,
  /** World units a particle can be blown off course mid-morph. */
  turbulence: 1.3,
  /** Radians the cloud twists mid-morph. */
  swirl: 0.85,
  /** 0..1 — how much medium and hero stars shimmer. */
  twinkle: 0.25,
  /** Furthest the cursor pushes a particle, and how far its influence reaches (1.0 = half the screen height). */
  pointerStrength: 0.05,
  pointerRadius: 0.26,
  /** Length of the opening Big Bang, in seconds. */
  introSeconds: 5.6,
}
