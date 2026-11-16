import * as THREE from 'three'
import type { Vec3 } from './shapeGenerators/constellationLayout'

/**
 * Builders for "instanced" geometry: one tiny shape (a flat square, two
 * triangles) that the GPU draws many times in one go, once per instance, each
 * time with its own attributes (where, what colour, how big). Hundreds of
 * lines or stars cost a single draw call.
 *
 * The square's corners go in the `position` attribute; each shader decides
 * what they mean (see lines.vert.glsl and sprite.vert.glsl).
 */
function createQuad(corners: number[], index: number[]): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  // The corner order of each triangle must run anticlockwise as seen from the
  // camera; the GPU skips triangles that run clockwise ("back faces").
  geometry.setIndex(index)
  return geometry
}

function instanceAttribute(
  geometry: THREE.InstancedBufferGeometry,
  name: string,
  data: Float32Array,
  size: number,
) {
  geometry.setAttribute(name, new THREE.InstancedBufferAttribute(data, size))
}

/** One straight line segment. */
export interface LineSpec {
  start: Vec3
  end: Vec3
  color: THREE.Color
  alpha: number
  /** Two numbers the shader uses to light up related lines together (e.g. one constellation). */
  tag: [number, number]
}

/**
 * Line segments with a real width in pixels (WebGL's own lines are always
 * one pixel wide, which disappears on high-density screens).
 * Corners: x = along the line (0 start, 1 end), y = side (-1 / +1).
 */
export function createLineGeometry(lines: LineSpec[]): THREE.InstancedBufferGeometry {
  const geometry = createQuad([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], [0, 2, 1, 1, 2, 3])
  const start = new Float32Array(lines.length * 3)
  const end = new Float32Array(lines.length * 3)
  const color = new Float32Array(lines.length * 4)
  const tag = new Float32Array(lines.length * 2)
  lines.forEach((line, i) => {
    start.set(line.start, i * 3)
    end.set(line.end, i * 3)
    color.set([line.color.r, line.color.g, line.color.b, line.alpha], i * 4)
    tag.set(line.tag, i * 2)
  })
  instanceAttribute(geometry, 'aStart', start, 3)
  instanceAttribute(geometry, 'aEnd', end, 3)
  instanceAttribute(geometry, 'aColor', color, 4)
  instanceAttribute(geometry, 'aTag', tag, 2)
  geometry.instanceCount = lines.length
  return geometry
}

/** Splits a circle into short straight segments, ready for createLineGeometry. */
export function circleSegments(
  center: THREE.Vector3,
  radius: number,
  segments: number,
  style: Omit<LineSpec, 'start' | 'end'>,
): LineSpec[] {
  const lines: LineSpec[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const b = ((i + 1) / segments) * Math.PI * 2
    lines.push({
      ...style,
      start: [center.x + Math.cos(a) * radius, center.y, center.z + Math.sin(a) * radius],
      end: [center.x + Math.cos(b) * radius, center.y, center.z + Math.sin(b) * radius],
    })
  }
  return lines
}

/** One glowing sprite: a square that always faces the camera. */
export interface SpriteSpec {
  center: Vec3
  color: THREE.Color
  /** Diameter in world units. */
  size: number
  /** Two numbers for lighting up: [which item, which group]. */
  tag: [number, number]
  /** A random number 0..1 so sprites don't all twinkle in unison. */
  seed: number
}

/** Corners run -1..1 on both axes. */
export function createSpriteGeometry(sprites: SpriteSpec[]): THREE.InstancedBufferGeometry {
  const geometry = createQuad([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], [0, 1, 2, 2, 1, 3])
  const center = new Float32Array(sprites.length * 3)
  const color = new Float32Array(sprites.length * 3)
  const size = new Float32Array(sprites.length)
  const tag = new Float32Array(sprites.length * 2)
  const seed = new Float32Array(sprites.length)
  sprites.forEach((sprite, i) => {
    center.set(sprite.center, i * 3)
    color.set([sprite.color.r, sprite.color.g, sprite.color.b], i * 3)
    size[i] = sprite.size
    tag.set(sprite.tag, i * 2)
    seed[i] = sprite.seed
  })
  instanceAttribute(geometry, 'aCenter', center, 3)
  instanceAttribute(geometry, 'aColor', color, 3)
  instanceAttribute(geometry, 'aSize', size, 1)
  instanceAttribute(geometry, 'aTag', tag, 2)
  instanceAttribute(geometry, 'aSeed', seed, 1)
  geometry.instanceCount = sprites.length
  return geometry
}
