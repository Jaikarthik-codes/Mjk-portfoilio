/** A function that returns a pseudo-random number in [0, 1). */
export type Rng = () => number

/**
 * Small, fast seeded random generator (mulberry32).
 * Seeding means the shapes come out identical on every visit instead of
 * reshuffling each time the page loads.
 */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Normally-distributed random number (mean 0, standard deviation 1). */
export function gaussian(rng: Rng): number {
  // Box–Muller transform. 1 - rng() keeps the log away from zero.
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
}
