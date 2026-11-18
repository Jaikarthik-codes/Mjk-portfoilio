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
    // overflow-x: clip keeps the text scrims (which reach past their text) from
    // widening the page on phones; unlike `hidden`, it leaves position: sticky working.
    <main ref={main} className="relative z-10 overflow-x-clip">
      <IntroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  )
}
