import { useEffect, useState } from 'react'

/**
 * Resolves to true once `font` (a CSS font shorthand such as
 * `600 100px "Outfit Variable"`) can be drawn on a canvas.
 *
 * The particle name is sampled from text drawn on a canvas. If we draw before
 * the web font has arrived, the browser quietly substitutes a system font and
 * the particles spell the name in the wrong typeface.
 *
 * Gives up after `timeoutMs` so a slow font can never block the whole site.
 */
export function useFontReady(font: string, sampleText: string, timeoutMs = 3000): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const done = () => {
      if (!cancelled) setReady(true)
    }
    const timer = window.setTimeout(done, timeoutMs)
    document.fonts.load(font, sampleText).then(done, done)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [font, sampleText, timeoutMs])

  return ready
}
