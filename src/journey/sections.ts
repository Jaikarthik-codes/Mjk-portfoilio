/** The scroll sections, in page order. The ids double as URL anchors (#about, #skills …). */
export const SECTION_IDS = ['intro', 'about', 'skills', 'projects', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

/**
 * How long each section is, in screen heights. Longer = slower, calmer scrolling.
 * The last section is shorter because nothing comes after it.
 */
export const SECTION_SCREENS = 2
export const LAST_SECTION_SCREENS = 1.5

/**
 * Scroll position is measured in "journey" units: one unit per section, so
 * journey = 2 means the top of the third section has just reached the top of
 * the screen. This is where the journey ends (the very bottom of the page).
 */
export const JOURNEY_END =
  SECTION_IDS.length - 1 + (LAST_SECTION_SCREENS - 1) / SECTION_SCREENS

/**
 * When things happen inside each section, in journey units after the section's
 * top reaches the top of the screen (negative = before it arrives).
 *
 *   0.00 ─ the section is at rest: text pinned and fully visible, shape fully formed
 *   0.26 ─ the camera starts moving to the next pose
 *   0.36 ─ the shape starts morphing into the next one
 *   0.46 → 0.60 ─ the text fades out
 *   0.82 → 0.97 ─ the next section's text fades in (its textInStart is -0.18)
 *   0.94 ─ the next shape is fully formed; 0.98 the camera arrives
 *
 * Everything settles before the next section's top arrives, so jumping straight
 * to a section (the nav dots, a link to #projects) always lands on a finished scene.
 */
export const TIMING = {
  morphStart: 0.36,
  morphLength: 0.58,
  cameraStart: 0.26,
  cameraLength: 0.72,
  textInStart: -0.18,
  textInLength: 0.15,
  textOutStart: 0.46,
  textOutLength: 0.14,
}

/**
 * The particle shapes' schedule: when each morph starts and how long it takes,
 * in journey units. There is one more shape than there are sections: About
 * shows nebula A first, then turns into nebula B (the ring) while its text is
 * on screen, so its move on to Skills starts (and ends) a little later.
 */
export const MORPHS: { start: number; length: number }[] = [
  { start: 0 + TIMING.morphStart, length: TIMING.morphLength }, // name → nebula A
  { start: 1.08, length: 0.26 }, //                                   nebula A → nebula B
  { start: 1.48, length: 0.46 }, //                                   nebula B → star field
  { start: 2 + TIMING.morphStart, length: TIMING.morphLength }, // star field → galaxy
  { start: 3 + TIMING.morphStart, length: TIMING.morphLength }, // galaxy → supernova
]

/** The camera's schedule: one move per pair of sections (About's starts once nebula B has formed). */
export const CAMERA_MOVES: { start: number; length: number }[] = [
  { start: 0 + TIMING.cameraStart, length: TIMING.cameraLength },
  { start: 1.4, length: 0.58 },
  { start: 2 + TIMING.cameraStart, length: TIMING.cameraLength },
  { start: 3 + TIMING.cameraStart, length: TIMING.cameraLength },
]
