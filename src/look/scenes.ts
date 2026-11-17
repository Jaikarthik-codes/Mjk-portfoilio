import { LOOK_PALETTE } from './palette'

/**
 * One "look" per scene: which reference image it is built from, and how its
 * two layers — gas and particles — are tuned to match that image.
 *
 *   gas       — the reference image itself, softened, feathered to black at the
 *               edges and drifting very slowly. Shown on two planes at
 *               different depths, so they shift against each other (parallax).
 *   particles — sampled from the same image: more particles where it is
 *               brighter, each taking its colour from the pixel it came from.
 */
export type LookSceneId = 'stardust' | 'nebulaA' | 'nebulaB' | 'galaxy' | 'supernova'

export interface GasLook {
  /** Overall brightness of the gas. */
  exposure: number
  /** Contrast: above 1 deepens the shadows, below 1 lifts them. */
  gamma: number
  /** 0 = grey, 1 = as in the image, above 1 = more vivid. */
  saturation: number
  /** The radial fade to black: starts at feather[0], fully black at feather[1] (1 = edge of the image). */
  feather: [number, number]
  /** How far the gas drifts, as a share of the image (0.015 = 1.5%). */
  flow: number
  /** Softness of each gas plane, near and far (blur, in texture mip levels). */
  blur: [number, number]
  /** Highlights above `knee` are compressed and tinted toward `tint`, so bright gas never turns to a white blob. */
  knee: number
  kneeTint: string
  kneeAmount: number
}

export interface ParticleLook {
  /** Overall brightness of the particles. */
  exposure: number
  /**
   * Where particles go: pixel brightness raised to this power. Higher packs
   * them into the brightest structures; lower spreads them into fainter gas.
   */
  dustGamma: number
  /** Pixels darker than this get no particles at all (keeps the black of space black). */
  blackLevel: number
  /**
   * Depth. 'relief': brighter pixels come toward the camera, like a cloud
   * lit from the front. 'disc': a thin slab, thicker where brighter (a galaxy).
   */
  depthMode: 'relief' | 'disc'
  /** Depth range, world units, and extra random depth on top. */
  depth: number
  depthJitter: number
  /** How much particle colours lean toward the nearest palette colour (0 = exact pixel colour). */
  paletteSnap: number
  /** Extra vividness for particle colours. */
  saturation: number
  /** How many of the image's brightest stars get diffraction spikes. */
  spikedStars: number
}

export interface LookScene {
  id: LookSceneId
  title: string
  /** Where it is used on the site. */
  usedFor: string
  /** The reference image (also the gas texture). */
  texture: string
  /** Width / height of the image. */
  aspect: number
  /** Credit line for the image. */
  credit: string
  gas: GasLook
  particles: ParticleLook
}

const baseGas: GasLook = {
  exposure: 0.8,
  gamma: 1.08,
  saturation: 1,
  feather: [0.72, 1.14],
  flow: 0.015,
  blur: [0.3, 2.6],
  knee: 0.6,
  kneeTint: LOOK_PALETTE.gold,
  kneeAmount: 0,
}

const baseParticles: ParticleLook = {
  exposure: 0.75,
  dustGamma: 1.35,
  blackLevel: 0.006,
  depthMode: 'relief',
  depth: 2.4,
  depthJitter: 0.5,
  paletteSnap: 0.15,
  saturation: 1.1,
  spikedStars: 1,
}

export const LOOK_SCENES: LookScene[] = [
  {
    id: 'stardust',
    title: 'Stardust',
    usedFor: 'Intro and the star field',
    texture: '/textures/stardust.webp',
    aspect: 2048 / 1512,
    credit: 'ESO/M. Kornmesser (CC BY 4.0) — please confirm',
    gas: { ...baseGas, kneeAmount: 0.3, kneeTint: LOOK_PALETTE.ice },
    particles: { ...baseParticles, dustGamma: 1.2, spikedStars: 1 },
  },
  {
    id: 'nebulaA',
    title: 'Nebula A',
    usedFor: 'About, first half',
    texture: '/textures/nebula-a.webp',
    aspect: 1,
    credit: 'NASA, ESA, J. Hester and A. Loll (Arizona State University) — please confirm',
    gas: { ...baseGas, kneeAmount: 0.35, kneeTint: LOOK_PALETTE.ice },
    particles: { ...baseParticles, dustGamma: 1.3, spikedStars: 2 },
  },
  {
    id: 'nebulaB',
    title: 'Nebula B',
    usedFor: 'About, second half (the ring)',
    texture: '/textures/nebula-b.webp',
    aspect: 1200 / 675,
    credit: 'ESO/VISTA/J. Emerson (CC BY 4.0) — please confirm',
    gas: { ...baseGas, feather: [0.7, 1.1], kneeAmount: 0.3, kneeTint: LOOK_PALETTE.gold },
    particles: { ...baseParticles, dustGamma: 1.5, spikedStars: 5 },
  },
  {
    id: 'galaxy',
    title: 'Galaxy',
    usedFor: 'Projects',
    texture: '/textures/galaxy.webp',
    aspect: 1280 / 1249,
    credit: 'ESA/Hubble & NASA — source to confirm',
    gas: {
      ...baseGas,
      // The arms reach the image's edges, so the fade starts further out.
      feather: [0.8, 1.22],
      // The core must read as cream-gold, never a white blob.
      knee: 0.42,
      kneeTint: LOOK_PALETTE.gold,
      kneeAmount: 0.85,
    },
    particles: { ...baseParticles, depthMode: 'disc', depth: 0.5, depthJitter: 0.15, dustGamma: 1.25, spikedStars: 1 },
  },
  {
    id: 'supernova',
    title: 'Supernova',
    usedFor: 'Contact',
    texture: '/textures/supernova.webp',
    aspect: 1280 / 1112,
    credit: 'NASA, ESA, CSA, STScI, T. Temim (Princeton University) — please confirm',
    gas: { ...baseGas, kneeAmount: 0.4, kneeTint: LOOK_PALETTE.gold },
    // The shell has no prominent stars; spikes would sit on filaments like lens flares.
    particles: { ...baseParticles, dustGamma: 1.3, spikedStars: 0 },
  },
]
