import { useEffect, useMemo, useState } from 'react'
import { content } from '../data/content'
import { layoutConstellations } from '../scene/shapeGenerators/constellationLayout'
import { registerTitle } from './titleAnchors'

/** True while the window is taller than it is wide (the scene's portrait layout). */
function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.innerWidth < window.innerHeight)
  useEffect(() => {
    const update = () => setPortrait(window.innerWidth < window.innerHeight)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return portrait
}

/**
 * The small title under each constellation in the Skills section: the skill
 * group, and the real constellation drawn for it. The 3D scene positions and
 * fades them (scene/skills/Constellations.tsx).
 *
 * Decorative (hidden from screen readers): the skills list names the groups.
 */
export function ConstellationTitles() {
  const portrait = usePortrait()
  const field = useMemo(() => layoutConstellations(content.skills, portrait), [portrait])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {field.constellations.map((constellation, i) => (
        <div
          key={constellation.id}
          ref={(element) => registerTitle(i, element)}
          className="absolute left-0 top-0 select-none whitespace-nowrap text-center opacity-0"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/75">{constellation.name}</p>
          <p className="mt-0.5 text-[11px] italic tracking-wide text-ice/55">{constellation.figure}</p>
        </div>
      ))}
    </div>
  )
}
