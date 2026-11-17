import { createRng } from '../../lib/random'
import {
  createLayout,
  createTraits,
  sampleImage,
  type ParticleLayout,
  type ParticleTraits,
  type SampledShape,
} from '../../look/sampleImage'
import { LOOK_SCENES, type ParticleLook } from '../../look/scenes'
import type { ReferenceImages } from '../../look/useReferenceImage'
import { fillDistance, NAME_SHAPE, SHAPES, STAGES, type ShapeName } from '../config'
import type { NameLayout } from '../nameLayout'
import type { ConstellationField } from './constellationLayout'
import { generateField } from './field'
import { generateText } from './text'
import { sortWithinClasses } from './utils'

export interface BuildShapesOptions {
  /** The five reference images (the gas pictures the particles are sampled from). */
  references: ReferenceImages
  /** How the name is split into lines and how large it may be. */
  name: NameLayout
  /** Where the constellations are (the star field is spread around them). */
  constellations: ConstellationField
  /** Distance the Skills camera sits from the field, for spreading the far stars wider. */
  fieldDistance: number
}

/** Every particle's place in every shape, plus the look each particle keeps throughout. */
export interface ParticleShapes {
  layout: ParticleLayout
  traits: ParticleTraits
  /**
   * One per shape. The galaxy is stored lying flat in the x/z plane (the
   * shader stands it up and spins it, see restGalaxy in particles.vert.glsl);
   * every other shape is as seen, facing the camera.
   */
  shapes: Record<ShapeName, SampledShape>
}

/**
 * Generates every shape for `count` particles.
 *
 * Most shapes are sampled from their reference image (see look/sampleImage.ts):
 * more particles where the image is brighter, each taking its colour from its
 * pixel. The name is the stardust image with most of its particles moved into
 * the letters; the Skills star field is spread out procedurally.
 *
 * Each shape gets its own seeded random stream, so tweaking one shape never
 * reshuffles the others.
 */
export function buildShapes(count: number, options: BuildShapesOptions): ParticleShapes {
  const layout = createLayout(count)
  const traits = createTraits(layout, createRng(7))
  const { references } = options

  const raw: Record<ShapeName, SampledShape> = {
    name: buildName(layout, options),
    nebulaA: sampleStage('nebulaA', layout, references),
    nebulaB: sampleStage('nebulaB', layout, references),
    field: generateField(layout, options.constellations, options.fieldDistance, createRng(66)),
    galaxy: layFlat(sampleStage('galaxy', layout, references)),
    nova: sampleStage('nova', layout, references),
  }

  // Give every shape the same left-to-right ordering (see sortWithinClasses for why).
  // The number is how much each ordering is blurred, in world units.
  const jitter: Record<ShapeName, number> = { name: 0.5, nebulaA: 1.4, nebulaB: 1.4, field: 1.6, galaxy: 1.2, nova: 1.5 }
  const sortRng = createRng(44)
  const shapes = Object.fromEntries(
    SHAPES.map((shape) => [shape, sortWithinClasses(raw[shape], layout, sortRng, jitter[shape])]),
  ) as Record<ShapeName, SampledShape>

  return { layout, traits, shapes }
}

/**
 * Sampling an image is the slow part (tens of milliseconds each), and only the
 * name and the star field change when the screen turns between portrait and
 * landscape, so sampled images are kept for reuse.
 */
const sampled = new Map<string, SampledShape>()

/** Samples a shape's reference image (see look/sampleImage.ts), at the shape's size in the world. */
function sampleStage(
  shape: ShapeName,
  layout: ParticleLayout,
  references: ReferenceImages,
  override: Partial<ParticleLook> = {},
): SampledShape {
  const key = `${shape}:${layout.count}`
  const cached = sampled.get(key)
  if (cached) return cached

  const stage = STAGES[shape]
  const scene = LOOK_SCENES.find((s) => s.id === stage.scene)!
  const look = { ...scene.particles, ...override }
  const result = sampleImage(references[stage.scene].pixels, layout, {
    width: stage.height * scene.aspect,
    height: stage.height,
    viewDistance: fillDistance(stage.height),
    look,
    rng: createRng(stage.scene.length * 977 + 13),
  })
  // Bake the image's particle exposure (as tuned in the look lab) into the colours.
  for (let i = 0; i < result.colors.length; i++) result.colors[i] *= look.exposure

  sampled.set(key, result)
  return result
}

/**
 * The intro: the stardust image, with most of its particles gathered into the
 * name. Heroes stay where they are (the field's bright stars), as do some
 * medium stars and some dust, so the name sits inside a living star field.
 */
function buildName(layout: ParticleLayout, { references, name }: BuildShapesOptions): SampledShape {
  // No diffraction spikes: the brightest stardust star sits right behind the name.
  const stardust = sampleStage('name', layout, references, { spikedStars: 0 })
  const shape: SampledShape = {
    positions: stardust.positions.slice(),
    colors: stardust.colors.slice(),
    spikes: stardust.spikes.slice(),
  }

  // Which particles move into the letters.
  const rng = createRng(11)
  const letters: number[] = []
  const firstDust = layout.heroes + layout.mediums
  for (let i = layout.heroes; i < layout.count; i++) {
    if (rng() < (i < firstDust ? NAME_SHAPE.mediums : NAME_SHAPE.dust)) letters.push(i)
  }

  const text = generateText(letters.length, { lines: name.lines, width: name.width, maxHeight: name.maxHeight, rng })
  letters.forEach((i, k) => {
    shape.positions.set(text.positions.subarray(k * 3, k * 3 + 3), i * 3)
    for (let c = 0; c < 3; c++) shape.colors[i * 3 + c] = text.colors[k * 3 + c] * NAME_SHAPE.brightness
    shape.spikes[i] = 0
  })
  return shape
}

/**
 * The galaxy image lies in the x/y plane, facing the camera. The galaxy's own
 * frame lies flat in x/z (so it can spin about y, see galaxyFrame.ts):
 * image x → x, image y → -z, depth → y.
 */
function layFlat(shape: SampledShape): SampledShape {
  const positions = new Float32Array(shape.positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = shape.positions[i]
    positions[i + 1] = shape.positions[i + 2]
    positions[i + 2] = -shape.positions[i + 1]
  }
  return { ...shape, positions }
}
