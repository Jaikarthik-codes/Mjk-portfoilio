/**
 * Explore mode — optional, not built yet (planned for Phase 4).
 *
 * The idea: leave the scroll journey and fly freely through the galaxy, with
 * a hidden planet holding an "about me" card (content.hobbies). This file is
 * where it plugs in; nothing calls enterExplore() until it exists.
 */
export const exploreAvailable = false

export function enterExplore(): void {
  if (!exploreAvailable) return
}

export function leaveExplore(): void {
  if (!exploreAvailable) return
}
