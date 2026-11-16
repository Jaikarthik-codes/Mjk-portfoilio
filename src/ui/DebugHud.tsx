import gsap from 'gsap'
import { useEffect, useState } from 'react'
import { rig } from '../journey/rig'
import { JOURNEY_END } from '../journey/sections'
import type { QualityTier } from '../lib/device'
import { PARTICLE_COUNT } from '../scene/config'
import { useStore } from '../store/useStore'

const QUALITY_TIERS: QualityTier[] = ['high', 'low']

/**
 * A small developer panel. Add `?debug` to the page address to show it.
 *
 * It shows the frame rate and the rig's live values, lets you scrub the whole
 * journey with a slider (it simply scrolls the page), and switches the
 * particle count so you can compare quality tiers.
 */
export function DebugHud() {
  const quality = useStore((state) => state.quality)
  const setQuality = useStore((state) => state.setQuality)
  const { fps, journey, morph, camera } = useLiveReadout()

  // Handles for poking at the experience from the browser console (and from
  // automated tests): e.g. stardust.gsap.globalTimeline.timeScale(0.2) plays
  // every animation, warps included, at a fifth of the speed.
  useEffect(() => {
    Object.assign(window, { stardust: { rig, gsap, store: useStore } })
  }, [])

  const scrollToJourney = (value: number) => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: (value / JOURNEY_END) * scrollable, behavior: 'instant' })
  }

  return (
    <section
      aria-label="Debug controls"
      className="fixed bottom-3 left-3 z-30 w-64 rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[10px] text-white/70 backdrop-blur-md"
    >
      <div className="flex justify-between uppercase tracking-[0.16em]">
        <span className="text-white/90">Debug</span>
        <span className="tabular-nums">{fps} fps</span>
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Journey position</span>
        <input
          type="range"
          className="stardust-range"
          min={0}
          max={JOURNEY_END}
          step={0.001}
          value={journey}
          onChange={(event) => scrollToJourney(Number(event.target.value))}
        />
      </label>

      <dl className="mt-1 grid grid-cols-3 gap-1 tabular-nums">
        <Readout label="journey" value={journey} />
        <Readout label="morph" value={morph} />
        <Readout label="camera" value={camera} />
      </dl>

      <div role="group" aria-label="Particle count" className="mt-3 flex overflow-hidden rounded-full border border-white/15">
        {QUALITY_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setQuality(tier)}
            aria-pressed={quality === tier}
            className={`flex-1 px-3 py-1 tabular-nums transition-colors ${
              quality === tier ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {PARTICLE_COUNT[tier] / 1000}k
          </button>
        ))}
      </div>
    </section>
  )
}

function Readout({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-white/40">{label}</dt>
      <dd className="text-white/90">{value.toFixed(2)}</dd>
    </div>
  )
}

/** Samples the frame rate and the rig a few times a second (cheaper than every frame). */
function useLiveReadout() {
  const [readout, setReadout] = useState({ fps: 0, journey: 0, morph: 0, camera: 0 })

  useEffect(() => {
    let frames = 0
    let since = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      frames++
      if (now - since >= 200) {
        setReadout({
          fps: Math.round((frames * 1000) / (now - since)),
          journey: rig.journey,
          morph: rig.morph,
          camera: rig.camera,
        })
        frames = 0
        since = now
      }
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return readout
}
