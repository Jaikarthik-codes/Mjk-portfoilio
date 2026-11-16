import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * The pointer in "normalised device coordinates": x and y from -1 to 1 with
 * (0, 0) at the centre of the canvas and +y pointing up — the same space the
 * vertex shader measures the cursor push in.
 *
 * `active` is false when there is no pointer to follow: the mouse has left the
 * window, or (on touch screens) no finger is down.
 *
 * Like the rig, this is a plain shared object: it changes constantly and is
 * only ever read inside the render loop. (The smoothed copy the shaders use
 * lives in frame.ts.)
 */
export const pointer = {
  x: 0,
  y: 0,
  active: false,
  /** 'mouse', 'pen' or 'touch'. Only a mouse or pen can hover; a finger taps. */
  type: 'mouse' as string,
}

/** Keeps `pointer` up to date. Mount once, inside the canvas. */
export function PointerTracker() {
  const canvas = useThree((state) => state.gl.domElement)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = 1 - ((event.clientY - rect.top) / rect.height) * 2
      pointer.active = true
      pointer.type = event.pointerType
    }
    const deactivate = () => {
      pointer.active = false
    }
    // A finger only "hovers" while it is touching the screen.
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') deactivate()
    }

    // Listen on the window, not the canvas: the HTML sections sit on top of
    // the canvas and would otherwise swallow the events.
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', deactivate)
    window.addEventListener('blur', deactivate)
    document.documentElement.addEventListener('pointerleave', deactivate)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', deactivate)
      window.removeEventListener('blur', deactivate)
      document.documentElement.removeEventListener('pointerleave', deactivate)
    }
  }, [canvas])

  return null
}
