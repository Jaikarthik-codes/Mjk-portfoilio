import { content } from '../../data/content'
import { SectionHeading, SectionShell } from './SectionShell'

/** One colour per constellation, in the same order as HUES in shapeGenerators/constellation.ts. */
const GROUP_COLOURS = [
  'text-nebula-lavender',
  'text-nebula-pink',
  'text-nebula-teal',
  'text-nebula-sky',
  'text-star-gold',
]

/** Section 3 — the constellations. The skills are listed as text beneath them. */
export function SkillsSection() {
  return (
    <SectionShell
      id="skills"
      className="flex flex-col justify-end px-6 pb-[max(3rem,7svh)] sm:px-[7vw]"
    >
      <div className="scrim mx-auto w-full max-w-5xl">
        <div className="landscape:text-center">
          <SectionHeading id="skills" label={content.sections.skills.label}>
            {content.sections.skills.heading}
          </SectionHeading>
        </div>

        <ul className="mt-7 grid gap-x-10 gap-y-4 landscape:grid-cols-3 landscape:text-center">
          {content.skills.map((group, index) => (
            <li key={group.group}>
              <h3
                className={`font-mono text-[11px] uppercase tracking-[0.3em] ${GROUP_COLOURS[index % GROUP_COLOURS.length]}`}
              >
                {group.group}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-x-2 text-sm font-light text-white/75 landscape:justify-center">
                {group.items.map((item, itemIndex) => (
                  <li key={item}>
                    {item}
                    {itemIndex < group.items.length - 1 && (
                      <span className="ml-2 text-white/30" aria-hidden="true">
                        ·
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
