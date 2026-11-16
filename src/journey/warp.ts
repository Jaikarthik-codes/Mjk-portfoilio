import gsap from 'gsap'
import { content } from '../data/content'
import { useStore } from '../store/useStore'
import { rig } from './rig'

/**
 * Warping to a star system and back.
 *
 * Everything here animates numbers on the rig with GSAP; the camera, the
 * particles, the hyperspace streaks and the colour fringing all read them
 * every frame:
 *
 *   rig.warp    0 → 1   the camera leaves its scroll pose and flies to the system
 *   rig.warpFx  0 → 1 → 0   effect strength: rises as we pick up speed, fades as we brake
 *   rig.hop     0 → 1   (already visiting) fly from system hopFrom to system hopTo
 *
 * The project panel opens as the camera starts to brake, and the page cannot
 * scroll while you are away from it.
 */

const WARP_IN = 2.2
const WARP_OUT = 1.7
const HOP = 2
/** When the panel fades in, as a share of the flight. */
const PANEL_AT = 0.72

let flight: gsap.core.Timeline | null = null

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True while the camera is moving, so prev/next presses can wait for it to arrive. */
export function isInFlight() {
  return flight?.isActive() ?? false
}

/** Warps to project `index`'s star system and opens its panel. */
export function openProject(index: number) {
  const store = useStore.getState()
  if (index < 0 || index >= content.projects.length) return

  // Already visiting: hop across instead.
  if (store.activeProject !== null) {
    hopTo(index)
    return
  }

  flight?.kill()
  lockScroll(true)
  rig.hopFrom = rig.hopTo = index
  rig.hop = 1
  useStore.setState({ activeProject: index, panelProject: index, panelVisible: false })

  if (calm()) {
    // Reduced motion: no flight, just cut to the system.
    rig.warp = 1
    rig.warpFx = 0
    useStore.setState({ panelVisible: true })
    return
  }

  flight = gsap
    .timeline()
    .to(rig, { warp: 1, duration: WARP_IN, ease: 'power3.inOut' }, 0)
    .add(fxPulse(WARP_IN), 0)
    .call(() => useStore.setState({ panelVisible: true }), [], WARP_IN * PANEL_AT)
}

/** From one system straight to another, without returning to the galaxy view. */
function hopTo(index: number) {
  const store = useStore.getState()
  if (index === store.activeProject || isInFlight()) return

  rig.hopFrom = store.activeProject ?? index
  rig.hopTo = index
  rig.hop = 0
  useStore.setState({ activeProject: index, panelProject: index, panelVisible: false, listPlanet: null })

  if (calm()) {
    rig.hop = 1
    useStore.setState({ panelVisible: true })
    return
  }

  flight?.kill()
  flight = gsap
    .timeline()
    .to(rig, { hop: 1, duration: HOP, ease: 'power2.inOut' }, 0)
    .add(fxPulse(HOP * 0.9), HOP * 0.05)
    .call(() => useStore.setState({ panelVisible: true }), [], HOP * PANEL_AT)
}

/** The next or previous project, wrapping around at the ends. */
export function stepProject(direction: 1 | -1) {
  const store = useStore.getState()
  if (store.activeProject === null) return
  const count = content.projects.length
  openProject((store.activeProject + direction + count) % count)
}

/** Closes the panel and flies back to where the visitor was on the page. */
export function closeProject() {
  const store = useStore.getState()
  if (store.activeProject === null) return

  // The panel goes at once, so the page is usable again while the camera returns.
  useStore.setState({ panelProject: null, panelVisible: false, listPlanet: null })

  const finish = () => {
    rig.hop = 1
    rig.warpFx = 0
    useStore.setState({ activeProject: null })
    lockScroll(false)
  }

  flight?.kill()
  if (calm()) {
    rig.warp = 0
    finish()
    return
  }

  // A shorter trip if we never got all the way there.
  const duration = Math.max(0.5, WARP_OUT * rig.warp)
  flight = gsap
    .timeline({ onComplete: finish })
    .to(rig, { warp: 0, duration, ease: 'power3.inOut' }, 0)
    .to(rig, { hop: 1, duration: duration * 0.5, ease: 'power2.out' }, 0)
    .add(fxPulse(duration), 0)
}

/** Effect strength over a flight: builds while accelerating, fades while braking. */
function fxPulse(duration: number) {
  return gsap
    .timeline()
    .to(rig, { warpFx: 1, duration: duration * 0.45, ease: 'sine.in' })
    .to(rig, { warpFx: 0, duration: duration * 0.55, ease: 'sine.out' })
}

/**
 * Stops the page scrolling while visiting a system (otherwise scrolling would
 * move the scroll camera underneath the warp). `scrollbar-gutter: stable` in
 * index.css keeps the layout from shifting when the scrollbar hides.
 */
function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
