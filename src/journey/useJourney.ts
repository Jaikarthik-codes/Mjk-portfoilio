import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { MOTION } from '../scene/config'
import { useStore } from '../store/useStore'
import { rig } from './rig'
import { JOURNEY_END, SECTION_IDS, TIMING } from './sections'

gsap.registerPlugin(ScrollTrigger)
// Phones resize the window when the address bar slides away. Without this,
// ScrollTrigger would recalculate mid-scroll and make the page jump.
ScrollTrigger.config({ ignoreMobileResize: true })

const LAST = SECTION_IDS.length - 1

/**
 * Connects scrolling to the experience.
 *
 * It builds ONE GSAP timeline that describes the whole journey, then hands the
 * playhead to ScrollTrigger: scroll position 0% = start of the timeline, 100% =
 * its end. Nothing on the timeline is animated by time, only by scroll, so the
 * site plays the same forwards and backwards at any speed.
 *
 * The timeline is measured in "journey" units: section k starts at time k.
 *
 * `mainRef` is the element that wraps all the scroll sections.
 */
export function useJourney(mainRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const main = mainRef.current
    if (!main) return

    // gsap.context collects everything created inside it, so one revert()
    // call cleans it all up when the component unmounts.
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: main,
          start: 'top top',
          end: 'bottom bottom',
          // Rather than snapping to the scrollbar, the playhead takes this many
          // seconds to catch up with it. This is what makes scrolling feel smooth.
          scrub: 0.9,
        },
        onUpdate: syncCurrentSection,
      })

      // The raw scroll position, kept on the rig for anything that wants it.
      // This tween spans the whole timeline, which also fixes its total length.
      timeline.to(rig, { journey: JOURNEY_END, duration: JOURNEY_END }, 0)

      // Between each pair of sections: morph the particles and move the camera.
      for (let section = 0; section < LAST; section++) {
        timeline.to(
          rig,
          { morph: section + 1, duration: TIMING.morphLength, ease: 'sine.inOut' },
          section + TIMING.morphStart,
        )
        timeline.to(
          rig,
          { camera: section + 1, duration: TIMING.cameraLength, ease: 'sine.inOut' },
          section + TIMING.cameraStart,
        )
      }

      // Background colour: violet → teal as the constellations form, → gold for the supernova.
      timeline.to(rig, { grade: 1, duration: 0.6 }, 1.4)
      timeline.to(rig, { grade: 2, duration: 0.6 }, 3.35)

      // Fade each section's text in as it arrives and out as it leaves.
      gsap.utils.toArray<HTMLElement>('[data-section-content]').forEach((text, section) => {
        if (section > 0) {
          timeline.fromTo(
            text,
            { opacity: 0 },
            { opacity: 1, duration: TIMING.textInLength },
            section + TIMING.textInStart,
          )
        }
        if (section < LAST) {
          // The intro text leaves early, as soon as you start to scroll.
          const start = section === 0 ? 0.04 : TIMING.textOutStart
          timeline.fromTo(
            text,
            { opacity: 1 },
            { opacity: 0, duration: section === 0 ? 0.2 : TIMING.textOutLength, immediateRender: false },
            section + start,
          )
        }
      })
    }, main)

    // Opened with a link to a section (e.g. /#projects)? The browser looks for
    // that anchor before React has drawn the page and gives up, so jump to it here.
    const target = decodeURIComponent(window.location.hash.slice(1))
    if ((SECTION_IDS as readonly string[]).includes(target)) {
      document.getElementById(target)?.scrollIntoView({ block: 'start' })
    }

    return () => context.revert()
  }, [mainRef])
}

/** Tells React which section is on screen — but only when it actually changes. */
function syncCurrentSection() {
  // A section counts as "current" from a little before its top arrives until
  // the next one takes over.
  const index = Math.min(LAST, Math.max(0, Math.floor(rig.journey + 0.3)))
  const store = useStore.getState()
  if (store.currentSection !== index) store.setCurrentSection(index)
}

/**
 * Plays the opening Big Bang once. Unlike everything else it runs on time, not
 * scroll. Mount it inside the canvas so it starts when the particles exist.
 */
export function useIntro() {
  const setIntroDone = useStore((state) => state.setIntroDone)

  useEffect(() => {
    // Skip the show and go straight to the finished state if the visitor
    // arrived part-way down the page (a reload, or a link to #projects), or
    // has asked their system for reduced motion.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm || window.scrollY > window.innerHeight * 0.2) {
      rig.intro = 1
      setIntroDone(true)
      return
    }

    rig.intro = 0
    const tween = gsap.to(rig, {
      intro: 1,
      duration: MOTION.introSeconds,
      ease: 'none', // the shader does its own easing for each stage
      delay: 0.25,
    })
    // Bring the subtitle in while the last letters are still settling.
    const reveal = gsap.delayedCall(MOTION.introSeconds * 0.78, () => setIntroDone(true))

    return () => {
      tween.kill()
      reveal.kill()
    }
  }, [setIntroDone])
}

/** Tiny component wrapper so the intro can be mounted as a child of the canvas. */
export function IntroSequence() {
  useIntro()
  return null
}
