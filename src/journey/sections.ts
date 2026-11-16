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
