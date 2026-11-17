import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { detectQualityTier, type QualityTier } from '../lib/device'
import { LookEffects } from '../look/LookEffects'
import { LookStage, STAGE_DISTANCE } from '../look/LookStage'
import { LOOK_PALETTE, SPACE_BLACK } from '../look/palette'
import { LOOK_SCENES, type LookSceneId } from '../look/scenes'

/** Particles and gas planes per quality tier (phones get the lighter one). */
const TIERS: Record<QualityTier, { particles: number; gasLayers: 1 | 2; label: string }> = {
  high: { particles: 50_000, gasLayers: 2, label: '50k · 2 gas' },
  low: { particles: 10_000, gasLayers: 1, label: '10k · 1 gas' },
}

const params = new URLSearchParams(window.location.search)
/** ?freeze stops all motion (for comparing screenshots). */
const FREEZE = params.has('freeze')
/** ?gas=0, ?particles=0, ?bloom=0 start with that layer off. */
const startsOn = (name: string) => params.get(name) !== '0'
/** ?ge=1.2 and ?pe=0.8 scale gas and particle exposure, for tuning. */
const GAS_GAIN = Number(params.get('ge') ?? 1)
const PARTICLE_GAIN = Number(params.get('pe') ?? 1)

function sceneFromHash(): LookSceneId {
  const id = window.location.hash.slice(1)
  return (LOOK_SCENES.find((scene) => scene.id === id)?.id ?? 'stardust') as LookSceneId
}

/**
 * The look lab (/lab): each scene of the new look, live, next to the
 * reference image it is built from — for judging colour, shape and softness
 * before the looks are wired into the scroll journey.
 */
export function LabApp() {
  const [sceneId, setSceneId] = useState<LookSceneId>(sceneFromHash)
  const [tier, setTier] = useState<QualityTier>(() => (params.get('tier') as QualityTier) ?? detectQualityTier())
  const [showGas, setShowGas] = useState(() => startsOn('gas'))
  const [showParticles, setShowParticles] = useState(() => startsOn('particles'))
  const [bloom, setBloom] = useState(() => startsOn('bloom'))
  const [paused, setPaused] = useState(FREEZE)
  const reducedMotion = useReducedMotion()
  const [sampleTime, setSampleTime] = useState<number | null>(null)

  useEffect(() => {
    const onHash = () => setSceneId(sceneFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const scene = useMemo(() => {
    const base = LOOK_SCENES.find((s) => s.id === sceneId)!
    if (GAS_GAIN === 1 && PARTICLE_GAIN === 1) return base
    return {
      ...base,
      gas: { ...base.gas, exposure: base.gas.exposure * GAS_GAIN },
      particles: { ...base.particles, exposure: base.particles.exposure * PARTICLE_GAIN },
    }
  }, [sceneId])
  const frozen = paused || reducedMotion
  const { particles, gasLayers, label } = TIERS[tier]

  return (
    <div className="min-h-svh px-4 py-6 sm:px-8" style={{ background: SPACE_BLACK }}>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Stardust Origin · Phase A</p>
          <h1 className="mt-1 text-2xl font-light tracking-tight">Look lab</h1>
        </div>
        <a href="/" className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60 hover:text-white">
          ← Back to the site
        </a>
      </header>

      <nav aria-label="Scenes" className="mt-6 flex flex-wrap gap-2">
        {LOOK_SCENES.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={s.id === sceneId ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              s.id === sceneId
                ? 'border-white/60 bg-white/10 text-white'
                : 'border-white/15 text-white/60 hover:border-white/40 hover:text-white'
            }`}
          >
            {s.title}
          </a>
        ))}
      </nav>

      <p className="mt-4 text-sm text-white/55">
        {scene.title} — used for: {scene.usedFor}.
      </p>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <figure>
          <div
            className="relative w-full overflow-hidden rounded-xl border border-white/10"
            style={{ aspectRatio: String(scene.aspect), background: SPACE_BLACK }}
          >
            <Canvas
              flat
              dpr={[1, 1.5]}
              camera={{ fov: 50, near: 0.1, far: 200, position: [0, 0, STAGE_DISTANCE] }}
              gl={{ antialias: false, powerPreference: 'high-performance' }}
            >
              <LookStage
                key={`${scene.id}-${particles}`}
                scene={scene}
                options={{ particles, gasLayers, showGas, showParticles, frozen }}
                onSampled={setSampleTime}
              />
              <LookEffects bloom={bloom} />
            </Canvas>
          </div>
          <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            Live · {label}
            {sampleTime !== null ? ` · particles placed in ${Math.round(sampleTime)} ms` : ''}
            {frozen ? ' · still' : ''}
          </figcaption>
        </figure>

        <figure>
          <div
            className="w-full overflow-hidden rounded-xl border border-white/10"
            style={{ aspectRatio: String(scene.aspect), background: SPACE_BLACK }}
          >
            <img src={scene.texture} alt={`Reference: ${scene.title}`} className="size-full object-cover" />
          </div>
          <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
            Reference · {scene.credit}
          </figcaption>
        </figure>
      </section>

      <div role="group" aria-label="Layers and settings" className="mt-6 flex flex-wrap gap-2">
        <Toggle on={showGas} onChange={setShowGas}>
          Gas
        </Toggle>
        <Toggle on={showParticles} onChange={setShowParticles}>
          Particles
        </Toggle>
        <Toggle on={bloom} onChange={setBloom}>
          Bloom
        </Toggle>
        <Toggle on={!paused} onChange={(on) => setPaused(!on)}>
          Motion
        </Toggle>
        {(Object.keys(TIERS) as QualityTier[]).map((t) => (
          <Toggle key={t} on={tier === t} onChange={() => setTier(t)}>
            {TIERS[t].label}
          </Toggle>
        ))}
      </div>

      <section aria-label="Palette" className="mt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Palette</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {[['space black', SPACE_BLACK], ...Object.entries(LOOK_PALETTE)].map(([name, hex]) => (
            <li key={name} className="flex items-center gap-2 text-sm text-white/70">
              <span className="size-5 rounded-full border border-white/15" style={{ background: hex }} />
              {name} <span className="font-mono text-[10px] text-white/40">{hex}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (on: boolean) => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
        on ? 'border-white/50 bg-white/10 text-white' : 'border-white/15 text-white/45 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}
