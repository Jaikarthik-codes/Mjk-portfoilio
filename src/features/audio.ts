/**
 * Sound — optional, not built yet (planned for Phase 5).
 *
 * The site already calls playCue() at the moments a sound would play, so
 * adding audio later means filling in this file only: load the sounds, start
 * muted, and offer a toggle in the navigation.
 */
export type Cue = 'warp-in' | 'warp-out' | 'hop'

/** Whether sound is switched on. Always false until audio exists. */
export const audioEnabled = false

export function playCue(cue: Cue): void {
  if (!audioEnabled) return
  void cue // the sounds themselves come with Phase 5
}
