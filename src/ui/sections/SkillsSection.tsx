import { content } from '../../data/content'
import { useStore } from '../../store/useStore'
import { SectionHeading, SectionShell } from './SectionShell'

/**
 * Section 3 — the constellations. The skills are listed as text beneath them;
 * pointing at a skill here (or focusing it with the keyboard, or tapping it)
 * lights up its star and shows its name in the sky, and pointing at a star
 * highlights its skill here.
 */
export function SkillsSection() {
  const lit = useStore((state) => state.litSkill)
  const setListSkill = useStore((state) => state.setListSkill)

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
          {content.skills.map((group, groupIndex) => (
            <li key={group.group}>
              <h3
                className="font-mono text-[11px] uppercase tracking-[0.3em] text-ice"
              >
                {group.group}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-x-2 text-sm font-light landscape:justify-center">
                {group.items.map((item, itemIndex) => {
                  const key = `${groupIndex}:${itemIndex}`
                  const active = lit === key
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        onPointerEnter={() => setListSkill(key)}
                        onPointerLeave={() => setListSkill(null)}
                        onFocus={() => setListSkill(key)}
                        onBlur={() => setListSkill(null)}
                        onClick={() => setListSkill(key)}
                        className={`interactive cursor-default rounded-sm transition-[color,text-shadow] duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ice/70 ${
                          active ? 'text-white [text-shadow:0_0_14px_rgb(255_255_255/0.7)]' : 'text-white/75'
                        }`}
                      >
                        {item}
                      </button>
                      {itemIndex < group.items.length - 1 && (
                        <span className="ml-2 text-white/30" aria-hidden="true">
                          ·
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
