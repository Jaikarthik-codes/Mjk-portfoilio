import type { Rng } from '../../lib/random'
import { LOOK_PALETTE } from '../../look/palette'
import type { ParticleLayout, SampledShape } from '../../look/sampleImage'
import { FIELD_SHAPE } from '../config'
import type { ConstellationField } from './constellationLayout'
import { rgb, type RGB } from './utils'

/** Star colours in the field, and how common each is: mostly white and ice, a little gold and ember. */
const COLOURS: [RGB, number][] = [
  [rgb(LOOK_PALETTE.white), 0.5],
  [rgb(LOOK_PALETTE.ice), 0.28],
  [rgb(LOOK_PALETTE.gold), 0.14],
  [rgb(LOOK_PALETTE.ember), 0.05],
  [rgb(LOOK_PALETTE.rose), 0.03],
]

function pickColour(rng: Rng): RGB {
  let roll = rng()
  for (const [colour, share] of COLOURS) {
    roll -= share
    if (roll < 0) return colour
  }
  return COLOURS[0][0]
}

/**
 * The Skills section's calm star field: the particles spread out evenly, dim
 * and still, well beyond the constellations, so the figures drawn on top
 * have a quiet sky to sit in.
 *
 * Stars further back are spread wider, so that from the camera the field
 * covers the view evenly at every depth.
 */
export function generateField(
  layout: ParticleLayout,
  field: ConstellationField,
  viewDistance: number,
  rng: Rng,
): SampledShape {
  const { count, heroes, mediums } = layout
  const shape: SampledShape = {
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    spikes: new Float32Array(count),
  }
  const halfWidth = field.width / 2 + FIELD_SHAPE.margin
  const halfHeight = field.height / 2 + FIELD_SHAPE.margin
  const [near, far] = [FIELD_SHAPE.depth[1], FIELD_SHAPE.depth[0]]

  for (let i = 0; i < count; i++) {
    const z = far + (near - far) * rng()
    const widen = (viewDistance - z) / viewDistance
    shape.positions[i * 3] = (rng() * 2 - 1) * halfWidth * widen
    shape.positions[i * 3 + 1] = (rng() * 2 - 1) * halfHeight * widen
    shape.positions[i * 3 + 2] = z

    // Heroes are the field's few bright stars; dust is barely there.
    const r = rng()
    const intensity = (i < heroes ? 0.45 + 0.45 * r : i < heroes + mediums ? 0.18 + 0.14 * r : 0.09 + 0.08 * r) * FIELD_SHAPE.brightness
    const colour = pickColour(rng)
    shape.colors[i * 3] = colour[0] * intensity
    shape.colors[i * 3 + 1] = colour[1] * intensity
    shape.colors[i * 3 + 2] = colour[2] * intensity
  }
  return shape
}
