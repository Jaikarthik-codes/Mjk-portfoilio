import { content } from '../../data/content'
import { SectionHeading, SectionShell } from './SectionShell'

/** Section 2 — the nebula, with the bio beside it (or below it on tall screens). */
export function AboutSection() {
  return (
    <SectionShell
      id="about"
      className="flex px-6 sm:px-[7vw] portrait:items-end portrait:pb-[max(4rem,9svh)] landscape:items-center"
    >
      <div className="scrim max-w-md landscape:max-w-[min(29rem,38vw)]">
        <SectionHeading id="about" label={content.sections.about.label}>
          {content.sections.about.heading}
        </SectionHeading>
        <p className="mt-6 text-[clamp(0.95rem,0.5vw+0.8rem,1.125rem)] font-light leading-relaxed text-white/80">
          {content.bio}
        </p>
      </div>
    </SectionShell>
  )
}
