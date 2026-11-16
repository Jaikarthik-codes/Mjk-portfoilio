/**
 * The floating label (see Tooltip.tsx) is moved every frame by whichever 3D
 * object it is describing. Going through React for that would re-render 60
 * times a second, so the label registers its element here and the scene moves
 * it directly.
 */
let element: HTMLElement | null = null

export function registerTooltip(el: HTMLElement | null) {
  element = el
}

/**
 * Places the label beside a point on screen (CSS pixels), `gap` pixels away.
 * It sits to the right, or to the left when there is no room on the right.
 */
export function moveTooltip(x: number, y: number, gap: number) {
  if (!element) return
  const flip = x > window.innerWidth - Math.min(260, window.innerWidth * 0.45)
  element.style.transform = flip
    ? `translate3d(${Math.round(x - gap)}px, ${Math.round(y)}px, 0) translate(-100%, -50%)`
    : `translate3d(${Math.round(x + gap)}px, ${Math.round(y)}px, 0) translateY(-50%)`
  element.dataset.side = flip ? 'left' : 'right'
}
