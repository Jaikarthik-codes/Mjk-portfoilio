import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import type { QualityTier } from '../lib/device'
import { PARTICLE_COUNT, SHAPES } from '../scene/config'
import { MAX_MORPH, useStore } from '../store/useStore'

const QUALITY_TIERS: QualityTier[] = ['high', 'low']

/**
 * Phase 1 control panel: a slider that scrubs the morph by hand, buttons that
 * glide to each shape, and an auto-play loop.
 *
 * It only ever writes one number to the store (`morph`). From Phase 2 that
 * number comes from scrolling instead, and this panel becomes a debug extra.
 */
export function DebugPanel() {
  const morph = useStore((state) => state.morph)
  const setMorph = useStore((state) => state.setMorph)
  const quality = useStore((state) => state.quality)
  const setQuality = useStore((state) => state.setQuality)

  const [autoPlaying, setAutoPlaying] = useState(false)
  const fps = useFps()

  // GSAP animates this plain object; every tick we copy its value into the store.
  const proxy = useRef({ value: 0 })
  const animation = useRef<gsap.core.Animation | null>(null)

  const stop = () => {
    animation.current?.kill()
    animation.current = null
    setAutoPlaying(false)
  }

  // Stop any running animation when the panel unmounts.
  useEffect(() => () => void animation.current?.kill(), [])

  const push = () => setMorph(proxy.current.value)

  /** Glide to a shape. Longer trips take a little longer. */
  const glideTo = (target: number, onComplete?: () => void) => {
    proxy.current.value = useStore.getState().morph
    const distance = Math.abs(target - proxy.current.value)
    animation.current = gsap.to(proxy.current, {
      value: target,
      duration: distance === 0 ? 0 : 0.8 + 2.4 * distance,
      ease: 'sine.inOut',
      onUpdate: push,
      onComplete,
    })
  }

  /** Loop through every shape and back again, pausing on each one. */
  const startLoop = () => {
    const timeline = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 1.8, onUpdate: push })
    for (let shape = 1; shape <= MAX_MORPH; shape++) {
      timeline.to(
        proxy.current,
        { value: shape, duration: 3.6, ease: 'sine.inOut' },
        shape === 1 ? 1.2 : '+=1.8',
      )
    }
    animation.current = timeline
  }

  const toggleAutoPlay = () => {
    if (autoPlaying) return stop()
    stop()
    setAutoPlaying(true)
    glideTo(0, startLoop) // always start the loop from the name
  }

  return (
    <section
      aria-label="Morph debug controls"
      className="fixed inset-x-0 bottom-4 z-10 mx-auto w-[min(38rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-white/[0.045] p-4 font-mono text-[11px] text-white/70 shadow-[0_8px_40px_rgba(5,3,15,0.6)] backdrop-blur-xl sm:p-5"
    >
      <header className="mb-3 flex items-center justify-between gap-3 whitespace-nowrap uppercase tracking-[0.18em]">
        <span className="text-white/90">Morph engine</span>
        <span className="tabular-nums text-white/50">{fps} fps</span>
      </header>

      <label className="block">
        <span className="sr-only">Morph progress</span>
        <input
          type="range"
          className="stardust-range"
          min={0}
          max={MAX_MORPH}
          step={0.001}
          value={morph}
          onChange={(event) => {
            stop()
            setMorph(Number(event.target.value))
          }}
        />
      </label>

      {/* One button per shape, lined up under its stop on the slider. */}
      <div className="mt-1 flex justify-between">
        {SHAPES.map((shape, index) => {
          const active = Math.abs(morph - index) < 0.02
          return (
            <button
              key={shape}
              type="button"
              onClick={() => {
                stop()
                glideTo(index)
              }}
              className={`rounded-full px-2.5 py-1 uppercase tracking-[0.18em] transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60 ${
                active ? 'text-white' : 'text-white/50'
              }`}
            >
              {shape}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={toggleAutoPlay}
          aria-pressed={autoPlaying}
          className={`rounded-full border px-3.5 py-1.5 uppercase tracking-[0.18em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60 ${
            autoPlaying
              ? 'border-teal-200/60 bg-teal-200/10 text-teal-100'
              : 'border-white/15 text-white/80 hover:border-white/40 hover:text-white'
          }`}
        >
          {autoPlaying ? '■ Stop' : '▶ Auto-play'}
        </button>

        <span className="tabular-nums text-white/50">progress {morph.toFixed(2)}</span>

        <div
          role="group"
          aria-label="Particle count"
          className="flex overflow-hidden rounded-full border border-white/15"
        >
          {QUALITY_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setQuality(tier)}
              aria-pressed={quality === tier}
              className={`px-3 py-1.5 tabular-nums transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/60 ${
                quality === tier ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {PARTICLE_COUNT[tier] / 1000}k
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Frames per second, refreshed twice a second. */
function useFps(): number {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frames = 0
    let since = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      frames++
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)))
        frames = 0
        since = now
      }
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return fps
}
