/**
 * The "rig": a handful of numbers that describe where the visitor is in the
 * journey. GSAP writes them as you scroll; the 3D scene reads them every frame.
 *
 * It is a plain object rather than React state on purpose. These values change
 * up to 60 times a second, and putting them in state would re-render React
 * components on every frame for no benefit.
 */
export const rig = {
  /** Raw scroll position, one unit per section (0 … JOURNEY_END). */
  journey: 0,
  /** Which shape the particles form: 0 name, 1 nebula, 2 constellations, 3 galaxy, 4 burst. */
  morph: 0,
  /** Which camera pose is in use, on the same 0–4 scale. */
  camera: 0,
  /** Background colour: 0 violet, 1 teal, 2 gold. */
  grade: 0,
  /** The opening Big Bang, 0 → 1. Plays once on load; it is not tied to scroll. */
  intro: 0,
}
