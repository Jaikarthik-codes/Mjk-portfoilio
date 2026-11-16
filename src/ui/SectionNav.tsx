import type { MouseEvent } from 'react'
import { content } from '../data/content'
import { SECTION_IDS, type SectionId } from '../journey/sections'
import { useStore } from '../store/useStore'

/** Scrolls to a section smoothly, unless the visitor has asked for reduced motion. */
function goToSection(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
  const section = document.getElementById(id)
  if (!section) return // fall back to the link's normal jump
  event.preventDefault()
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

/**
 * The floating navigation: the site name in the corner and a column of dots,
 * one per section, with the current section's name beside its dot.
 */
export function SectionNav() {
  const current = useStore((state) => state.currentSection)
  // Out of the way while visiting a star system (the page is inert then anyway).
  const away = useStore((state) => state.activeProject !== null)
  const hide = `transition-opacity duration-500 ${away ? 'pointer-events-none opacity-0' : 'opacity-100'}`

  return (
    <>
      <a
        href="#intro"
        onClick={(event) => goToSection(event, 'intro')}
        className={`${hide} fixed left-5 top-5 z-20 font-mono text-[11px] uppercase tracking-[0.22em] text-white/80 hover:text-white sm:left-7 sm:top-7`}
      >
        Stardust Origin
      </a>

      <nav aria-label="Sections" className={`${hide} fixed right-2 top-1/2 z-20 -translate-y-1/2 sm:right-5`}>
        <ol className="flex flex-col items-end">
          {SECTION_IDS.map((id, index) => {
            const active = index === current
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(event) => goToSection(event, id)}
                  aria-current={active ? 'true' : undefined}
                  className="group flex items-center justify-end gap-3 py-2.5 pl-6 pr-2"
                >
                  {/* The name shows for the current section, and for any dot you hover or focus. */}
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.26em] transition-all duration-300 max-sm:sr-only ${
                      active
                        ? 'text-white opacity-100'
                        : 'translate-x-1 text-white opacity-0 group-hover:translate-x-0 group-hover:opacity-70 group-focus-visible:translate-x-0 group-focus-visible:opacity-70'
                    }`}
                  >
                    {content.sections[id].label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      active
                        ? 'w-6 bg-white shadow-[0_0_12px_rgba(191,168,255,0.9)]'
                        : 'w-1.5 bg-white/35 group-hover:bg-white/80'
                    }`}
                  />
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
