import { content } from '../../data/content'
import { useStore } from '../../store/useStore'
import { SectionShell } from './SectionShell'

/** Section 1 — the Big Bang. The particles spell the name; HTML adds the title beneath it. */
export function IntroSection() {
  const introDone = useStore((state) => state.introDone)

  return (
    <SectionShell id="intro">
      {/* The particles are the visible name. This heading is for screen readers and search engines. */}
      <h1 id="intro-heading" className="sr-only">
        {content.name}
      </h1>

      {/* Waits for the Big Bang to settle, then drifts in. */}
      <div
        className={`absolute inset-0 transition-[opacity,transform] duration-[1600ms] ease-out ${
          introDone ? 'opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {/* Measured in lvh, like the canvas, so it always sits just under the particle name.
            The left padding balances the letter-spacing, which otherwise pulls centred text left. */}
        <p className="absolute inset-x-0 top-[61lvh] px-6 pl-[calc(1.5rem+0.5em)] text-center font-mono text-xs uppercase tracking-[0.5em] text-white/75 sm:text-sm">
          {content.title}
        </p>

        <div className="absolute inset-x-0 bottom-[max(1.75rem,4svh)] flex flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">
          <span className="pl-[0.4em]">{content.sections.intro.scrollHint}</span>
          <span className="scroll-cue block h-10 w-px bg-gradient-to-b from-white/80 to-transparent" aria-hidden="true" />
        </div>
      </div>
    </SectionShell>
  )
}
