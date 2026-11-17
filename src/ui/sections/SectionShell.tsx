import type { FocusEvent, ReactNode } from 'react'
import {
  LAST_SECTION_SCREENS,
  SECTION_IDS,
  SECTION_SCREENS,
  type SectionId,
} from '../../journey/sections'
import { useStore } from '../../store/useStore'

interface SectionShellProps {
  id: SectionId
  /** Tailwind classes that place the content inside the screen-sized frame. */
  className?: string
  children: ReactNode
}

/**
 * The frame every scroll section shares.
 *
 * The <section> is tall (two screens) to give you something to scroll through.
 * Inside it, a screen-sized "sticky" box holds the text: it stays pinned in
 * place while its section passes by. Its fade in and out is driven by the
 * scroll timeline (see journey/useJourney.ts), which looks for the
 * `data-section-content` attribute.
 *
 * Sections never block the mouse — the 3D canvas underneath still needs it —
 * so links inside must opt back in with the `interactive` class.
 */
export function SectionShell({ id, className = '', children }: SectionShellProps) {
  const index = SECTION_IDS.indexOf(id)
  const isLast = index === SECTION_IDS.length - 1
  const active = useStore((state) => state.currentSection === index)

  // Keyboard users reach links by pressing Tab, without scrolling. If focus
  // lands in a section that is not on screen (its text would still be faded
  // out), bring the section to its resting position.
  const revealOnFocus = (event: FocusEvent<HTMLElement>) => {
    const top = event.currentTarget.offsetTop
    const pinned = window.scrollY >= top - 4 && window.scrollY <= top + window.innerHeight * 0.8
    if (!pinned) window.scrollTo({ top: top + 2 })
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-active={active}
      onFocusCapture={revealOnFocus}
      className="group/section pointer-events-none relative"
      style={{ height: `${(isLast ? LAST_SECTION_SCREENS : SECTION_SCREENS) * 100}vh` }}
    >
      <div className="sticky top-0 h-svh">
        <div data-section-content className={`relative h-full ${className}`}>
          {children}
        </div>
      </div>
    </section>
  )
}

interface SectionHeadingProps {
  id: SectionId
  label: string
  children: ReactNode
}

/** The small numbered label and large heading at the top of a section. */
export function SectionHeading({ id, label, children }: SectionHeadingProps) {
  const number = String(SECTION_IDS.indexOf(id)).padStart(2, '0')
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
        <span className="text-ice">{number}</span>
        <span className="mx-3 inline-block h-px w-8 bg-white/30 align-middle" aria-hidden="true" />
        {label}
      </p>
      <h2
        id={`${id}-heading`}
        className="mt-4 text-balance text-[clamp(1.7rem,3.4vw+0.6rem,3.1rem)] font-light leading-[1.08] tracking-tight"
      >
        {children}
      </h2>
    </>
  )
}
