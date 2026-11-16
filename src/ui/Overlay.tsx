import { useRef } from 'react'
import { useJourney } from '../journey/useJourney'
import { AboutSection } from './sections/AboutSection'
import { ContactSection } from './sections/ContactSection'
import { IntroSection } from './sections/IntroSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { SkillsSection } from './sections/SkillsSection'

/**
 * All the HTML that sits on top of the canvas: five scroll sections of real,
 * selectable, screen-reader-friendly text. Scrolling through them is what
 * drives the 3D scene.
 */
export function Overlay() {
  const main = useRef<HTMLElement>(null)
  useJourney(main)

  return (
    <main ref={main} className="relative z-10">
      <IntroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  )
}
