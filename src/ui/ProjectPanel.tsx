import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react'
import { content } from '../data/content'
import { closeProject, stepProject } from '../journey/warp'
import { layoutSystems } from '../scene/projects/systemLayout'
import { useStore } from '../store/useStore'

/** How long the panel takes to fade out (matches .panel-body in index.css). */
const FADE_MS = 320

/**
 * The glass panel that opens when you warp to a project's star system.
 *
 * It is a real modal <dialog>: focus moves into it, Tab stays inside it,
 * Escape closes it, and the rest of the page is inert while it is open.
 * The browser handles all of that for us via showModal().
 */
export function ProjectPanel() {
  const panelProject = useStore((state) => state.panelProject)
  const visible = useStore((state) => state.panelVisible)
  const litPlanet = useStore((state) => state.litPlanet)
  const setListPlanet = useStore((state) => state.setListPlanet)
  const dialog = useRef<HTMLDialogElement>(null)
  const systems = useMemo(() => layoutSystems(content.projects), [])

  // Keep the last project's content while the panel fades out.
  const [shown, setShown] = useState(0)
  if (panelProject !== null && panelProject !== shown) setShown(panelProject)

  // Open and close the dialog with the store.
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (panelProject !== null) {
      if (!element.open) element.showModal()
      return
    }
    if (!element.open) return
    const timer = window.setTimeout(() => element.close(), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [panelProject])

  const project = content.projects[shown]
  const system = systems[shown]
  const count = content.projects.length
  const previous = content.projects[(shown - 1 + count) % count]
  const next = content.projects[(shown + 1) % count]
  const number = (index: number) => String(index + 1).padStart(2, '0')

  // Escape: fly back, rather than letting the browser close the dialog instantly.
  const onCancel = (event: SyntheticEvent) => {
    event.preventDefault()
    closeProject()
  }

  // A click outside the glass (on the dialog's see-through backdrop) also flies
  // back — unless it was on a planet, which the visitor may be exploring.
  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return
    const panel = event.currentTarget.querySelector('.panel-body')?.getBoundingClientRect()
    const inside =
      panel &&
      event.clientX >= panel.left &&
      event.clientX <= panel.right &&
      event.clientY >= panel.top &&
      event.clientY <= panel.bottom
    const onPlanet = useStore.getState().litPlanet !== null && useStore.getState().listPlanet === null
    if (!inside && !onPlanet) closeProject()
  }

  // ← and → step through the systems.
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft') stepProject(-1)
    if (event.key === 'ArrowRight') stepProject(1)
  }

  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      data-visible={visible}
      aria-labelledby="project-title"
      aria-describedby="project-description"
      onCancel={onCancel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <article className="glass panel-body" style={{ '--tone': system.color } as CSSProperties}>
        <header className="flex items-start justify-between gap-4">
          <p className="pt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">
            Star system <span className="text-(--tone)">{number(shown)}</span>
            <span className="text-white/30"> / {number(count - 1)}</span>
          </p>
          <button
            type="button"
            autoFocus
            onClick={closeProject}
            aria-label="Back to the galaxy"
            className="-mr-2 -mt-2 grid size-10 place-items-center rounded-full text-xl font-light text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <h2 id="project-title" className="mt-3 text-[clamp(1.6rem,2vw+1rem,2.3rem)] font-light leading-tight tracking-tight">
          {project.title}
        </h2>
        <p id="project-description" className="mt-3 font-light leading-relaxed text-white/75">
          {project.description}
        </p>

        <h3 className="mt-7 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
          Planets in this system
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {project.tech.map((tech, index) => {
            const colour = system.planets[index]?.color ?? '#ffffff'
            const lit = litPlanet === index
            return (
              <li
                key={tech}
                onPointerEnter={() => setListPlanet(index)}
                onPointerLeave={() => setListPlanet(null)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-light transition-colors ${
                  lit ? 'border-white/40 bg-white/12 text-white' : 'border-white/12 bg-white/4 text-white/80'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: colour, boxShadow: `0 0 ${lit ? 12 : 6}px ${colour}` }}
                />
                {tech}
              </li>
            )
          })}
        </ul>

        {(project.liveUrl || project.githubUrl) && (
          <div className="mt-7 flex flex-wrap gap-3">
            {project.liveUrl && (
              <PanelLink href={project.liveUrl} primary>
                Visit live site
              </PanelLink>
            )}
            {project.githubUrl && <PanelLink href={project.githubUrl}>View source</PanelLink>}
          </div>
        )}

        {count > 1 && (
          <nav aria-label="Other star systems" className="mt-8 flex justify-between gap-4 border-t border-white/10 pt-4 text-sm">
            <button
              type="button"
              onClick={() => stepProject(-1)}
              className="group min-w-0 text-left text-white/60 transition-colors hover:text-white"
            >
              <span className="block font-mono text-[9px] uppercase tracking-[0.26em] text-white/40">Previous</span>
              <span className="block truncate">
                <span aria-hidden="true" className="mr-1.5 inline-block transition-transform group-hover:-translate-x-0.5">←</span>
                {previous.title}
              </span>
            </button>
            <button
              type="button"
              onClick={() => stepProject(1)}
              className="group min-w-0 text-right text-white/60 transition-colors hover:text-white"
            >
              <span className="block font-mono text-[9px] uppercase tracking-[0.26em] text-white/40">Next</span>
              <span className="block truncate">
                {next.title}
                <span aria-hidden="true" className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </button>
          </nav>
        )}

        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.26em] text-white/35 pointer-coarse:hidden">
          Esc to return · ← → to travel
        </p>
      </article>
    </dialog>
  )
}

function PanelLink({ href, primary = false, children }: { href: string; primary?: boolean; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-full px-4 py-2 text-sm transition-colors ${
        primary
          ? 'bg-white/90 text-void hover:bg-white'
          : 'border border-white/20 text-white/85 hover:border-white/50 hover:text-white'
      }`}
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}
