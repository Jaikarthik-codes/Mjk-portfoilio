import type { ReactNode } from 'react'
import { content } from '../data/content'
import { IMAGE_CREDITS } from '../data/credits'

/** Strips "https://" and "www." so a link reads as "github.com/you". */
function pretty(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

/**
 * The simple view (/simple): everything on the site as plain, fast, readable
 * HTML — no 3D, no scroll effects. For slow devices, screen readers, printing,
 * and anyone in a hurry. All text comes from src/data/content.ts.
 */
export function SimpleApp() {
  const { email, github, linkedin } = content.contact

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-white/85 sm:py-16">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white">{content.name}</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-ice">{content.title}</p>
        </div>
        <nav aria-label="Links" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="/" className="underline decoration-white/30 underline-offset-4 hover:text-white">
            Full 3D site
          </a>
          <a
            href={content.resume.url}
            download={content.resume.fileName}
            className="underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            Download resume
          </a>
        </nav>
      </header>

      <main>
        <Section id="about" title={content.sections.about.label}>
          <p className="text-lg font-light leading-relaxed">{content.bio}</p>
        </Section>

        <Section id="skills" title={content.sections.skills.label}>
          <dl className="grid gap-5 sm:grid-cols-3">
            {content.skills.map((group) => (
              <div key={group.group}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-ice">{group.group}</dt>
                <dd className="mt-2 font-light leading-relaxed">{group.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="projects" title={content.sections.projects.label}>
          <ul className="space-y-10">
            {content.projects.map((project) => (
              <li key={project.id}>
                <h3 className="text-xl font-normal text-white">{project.title}</h3>
                <p className="mt-2 font-light leading-relaxed">{project.description}</p>
                {project.built && (
                  <>
                    <h4 className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">What I built</h4>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 font-light marker:text-ice/70">
                      {project.built.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
                  {project.tech.join(' · ')}
                </p>
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {project.liveUrl && <ExternalLink href={project.liveUrl}>Live site</ExternalLink>}
                  {project.githubUrl && <ExternalLink href={project.githubUrl}>Source</ExternalLink>}
                  {project.docsUrl && <ExternalLink href={project.docsUrl}>API docs</ExternalLink>}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="contact" title={content.sections.contact.label}>
          <ul className="space-y-2 font-light">
            <li>
              Email: <a href={`mailto:${email}`} className="text-white underline decoration-white/30 underline-offset-4">{email}</a>
            </li>
            <li>
              GitHub: <ExternalLink href={github}>{pretty(github)}</ExternalLink>
            </li>
            <li>
              LinkedIn: <ExternalLink href={linkedin}>{pretty(linkedin)}</ExternalLink>
            </li>
          </ul>
        </Section>

        <Section id="credits" title="Image credits">
          <p className="font-light text-white/70">
            The pictures behind the 3D site are real astronomical images and an 1824 star atlas:
          </p>
          <ul className="mt-4 space-y-3 text-sm font-light">
            {IMAGE_CREDITS.map((credit) => (
              <li key={credit.subject}>
                <span className="text-white">{credit.subject}</span> — {credit.credit}.{' '}
                <span className="text-white/50">
                  {credit.licence}. Used for: {credit.usedFor}.
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-b border-white/10 py-10">
      <h2 id={`${id}-heading`} className="mb-5 font-mono text-[11px] uppercase tracking-[0.32em] text-white/50">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
      {children}
    </a>
  )
}
