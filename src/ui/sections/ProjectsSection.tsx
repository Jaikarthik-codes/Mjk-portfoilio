import { content } from '../../data/content'
import { openProject } from '../../journey/warp'
import { useStore } from '../../store/useStore'
import { SectionHeading, SectionShell } from './SectionShell'

/**
 * Section 4 — the galaxy. Each project is a star system in it; this list is
 * the same projects as text. Pointing at a project here lights up its system,
 * and choosing one (click, tap, or Enter) warps there and opens its panel.
 */
export function ProjectsSection() {
  const lit = useStore((state) => state.litProject)
  const away = useStore((state) => state.activeProject !== null)
  const setListProject = useStore((state) => state.setListProject)

  return (
    <SectionShell
      id="projects"
      className="flex px-6 sm:px-[7vw] portrait:items-end portrait:pb-[max(3rem,7svh)] landscape:items-center"
    >
      {/* Steps aside while you are off visiting a system. */}
      <div
        className={`scrim w-full max-w-md transition-opacity duration-500 landscape:max-w-[min(27rem,36vw)] ${
          away ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <SectionHeading id="projects" label={content.sections.projects.label}>
          {content.sections.projects.heading}
        </SectionHeading>

        <p className="mt-3 text-sm font-light text-white/55">
          <span className="pointer-coarse:hidden">Click</span>
          <span className="hidden pointer-coarse:inline">Tap</span> a star system to warp in.
        </p>

        <ul className="mt-6 space-y-2 portrait:space-y-1">
          {content.projects.map((project, index) => {
            const active = lit === index
            const describedBy = `project-${project.id}-summary`
            return (
              <li
                key={project.id}
                className={`relative border-l py-1.5 pl-4 transition-colors duration-300 ${
                  active ? 'border-white/70' : 'border-white/15'
                }`}
              >
                <h3 className="text-lg font-normal">
                  {/* The button's ::after stretches over the whole card, so all of it is clickable. */}
                  <button
                    type="button"
                    aria-describedby={describedBy}
                    onClick={() => openProject(index)}
                    onPointerEnter={() => setListProject(index)}
                    onPointerLeave={() => setListProject(null)}
                    onFocus={() => setListProject(index)}
                    onBlur={() => setListProject(null)}
                    className="interactive group flex items-baseline gap-3 text-left after:absolute after:inset-0 after:content-['']"
                  >
                    <span className="font-mono text-[10px] tracking-[0.2em] text-white/40">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`transition-colors ${active ? 'text-white' : 'text-white/90'}`}>{project.title}</span>
                    <span
                      aria-hidden="true"
                      className={`text-nebula-lavender transition-[opacity,transform] duration-300 ${
                        active ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'
                      }`}
                    >
                      →
                    </span>
                  </button>
                </h3>
                <div id={describedBy} className="portrait:hidden">
                  <p className="mt-1 text-sm font-light leading-snug text-white/65">{project.description}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                    {project.tech.join(' · ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </SectionShell>
  )
}
