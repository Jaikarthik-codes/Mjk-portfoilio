/**
 * The constellations' titles (see ConstellationTitles.tsx) are placed every
 * frame by the 3D scene, like the tooltip: each title registers its element
 * here and the scene moves it directly, without re-rendering React.
 */
const elements: (HTMLElement | null)[] = []

export function registerTitle(index: number, element: HTMLElement | null) {
  elements[index] = element
}

/** Centres title `index` horizontally on a point on screen (CSS pixels), just below it. */
export function placeTitle(index: number, x: number, y: number, opacity: number) {
  const element = elements[index]
  if (!element) return
  element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translateX(-50%)`
  element.style.opacity = opacity.toFixed(3)
}
