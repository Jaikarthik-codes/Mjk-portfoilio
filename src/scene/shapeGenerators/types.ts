/**
 * One target shape for the particle system.
 *
 * Both arrays hold three numbers per particle, so particle `i` lives at
 * index `i * 3`. Every shape uses the same particle count: particle 7 in the
 * name is the same particle as number 7 in the nebula, just somewhere else.
 */
export interface ShapeData {
  /** x, y, z in world units. */
  positions: Float32Array
  /** r, g, b in linear colour space (what the shader works in). */
  colors: Float32Array
}
