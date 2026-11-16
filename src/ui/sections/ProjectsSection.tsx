import { content } from '../../data/content'
import { SectionHeading, SectionShell } from './SectionShell'

/**
 * Section 4 — the galaxy. For now the projects are a plain list beside it;
 * Phase 3 turns each one into a clickable star system with its own panel.
 */
export function ProjectsSection() {
  return (
    <SectionShell
      id="projects"
      className="flex px-6 sm:px-[7vw] portrait:items-end portrait:pb-[max(3rem,7svh)] landscape:items-center"
    >
      <div className="scrim w-full max-w-md landscape:max-w-[min(27rem,36vw)]">
        <SectionHeading id="projects" label={content.sections.projects.label}>
          {content.sections.projects.heading}
        </SectionHeading>

        <ul className="mt-6 space-y-4">
          {content.projects.map((project) => (
            <li key={project.id} className="border-l border-white/15 pl-4">
              <h3 className="text-lg font-normal">{project.title}</h3>
              <p className="mt-1 text-sm font-light leading-snug text-white/65">
                {project.description}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                {project.tech.join(' · ')}
              </p>
              {(project.liveUrl || project.githubUrl) && (
                <p className="mt-2 flex gap-5 text-sm">
                  {project.liveUrl && (
                    <ExternalLink href={project.liveUrl} label={`${project.title}, live site`}>
                      Live
                    </ExternalLink>
                  )}
                  {project.githubUrl && (
                    <ExternalLink href={project.githubUrl} label={`${project.title}, source on GitHub`}>
                      GitHub
                    </ExternalLink>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}

function ExternalLink({ href, label, children }: { href: string; label: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="interactive text-nebula-lavender underline-offset-4 transition-colors hover:text-white hover:underline"
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}
