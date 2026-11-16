import { useEffect, useRef, type CSSProperties } from 'react'
import { useStore, type TooltipContent } from '../store/useStore'
import { registerTooltip } from './tooltipAnchor'

/**
 * The small floating label beside a star or planet. Its text comes from the
 * store; its position is set directly by the 3D scene every frame (see
 * tooltipAnchor.ts).
 *
 * Hidden from screen readers: everything it says is already on the page as
 * text (the skills list, the project list, the project panel).
 */
export function Tooltip() {
  const tooltip = useStore((state) => state.tooltip)
  const element = useRef<HTMLDivElement>(null)

  // Keep showing the last text while the label fades out.
  const last = useRef<TooltipContent | null>(null)
  if (tooltip) last.current = tooltip
  const shown = tooltip ?? last.current

  useEffect(() => {
    registerTooltip(element.current)
    return () => registerTooltip(null)
  }, [])

  return (
    <div ref={element} aria-hidden="true" className="tooltip pointer-events-none fixed left-0 top-0 z-40">
      <div
        className={`tooltip-card ${tooltip ? 'opacity-100' : 'scale-95 opacity-0'}`}
        style={{ '--tone': shown?.tone ?? '#ffffff' } as CSSProperties}
      >
        {shown?.eyebrow && (
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-(--tone)">{shown.eyebrow}</p>
        )}
        <p className="text-[15px] leading-tight font-normal text-white">{shown?.title}</p>
        {shown?.hint && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-white/50">{shown.hint}</p>
        )}
      </div>
    </div>
  )
}
