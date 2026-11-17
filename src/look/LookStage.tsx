import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createRng } from '../lib/random'
import { GasLayer } from './GasLayer'
import { createLayout, createTraits, sampleImage } from './sampleImage'
import type { LookScene } from './scenes'
import { StarParticles } from './StarParticles'
import { useReferenceImage } from './useReferenceImage'

/** Height of every scene's image in the world; its width follows the image's shape. */
export const STAGE_HEIGHT = 10
const FOV = 50
/** Distance at which the image exactly fills the view's height. */
export const STAGE_DISTANCE = STAGE_HEIGHT / (2 * Math.tan((FOV * Math.PI) / 360))
/** How far behind the main gas plane the second (far) plane sits. */
const FAR_PLANE = 3.2

export interface StageOptions {
  particles: number
  /** 2 = near and far gas planes (parallax); 1 = one plane (phones). */
  gasLayers: 1 | 2
  showGas: boolean
  showParticles: boolean
  /** Stop all drifting and shimmering. */
  frozen: boolean
}

/**
 * One scene in the new two-layer look, built from its reference image:
 * gas planes (the image itself) with particles sampled from it on top.
 */
export function LookStage({
  scene,
  options,
  onSampled,
}: {
  scene: LookScene
  options: StageOptions
  /** Called with how long placing the particles took, in milliseconds. */
  onSampled?: (milliseconds: number) => void
}) {
  const reference = useReferenceImage(scene.texture)
  const width = STAGE_HEIGHT * scene.aspect

  // Lay the particles out once per image and particle count.
  const sampled = useMemo(() => {
    if (!reference) return null
    const started = performance.now()
    const layout = createLayout(options.particles)
    const traits = createTraits(layout, createRng(7))
    const shape = sampleImage(reference.pixels, layout, {
      width,
      height: STAGE_HEIGHT,
      viewDistance: STAGE_DISTANCE,
      look: scene.particles,
      rng: createRng(scene.id.length * 977 + 13),
    })
    return { layout, traits, shape, milliseconds: performance.now() - started }
  }, [reference, options.particles, scene, width])

  useEffect(() => {
    if (sampled) onSampled?.(sampled.milliseconds)
  }, [sampled, onSampled])

  if (!reference || !sampled) return null
  const two = options.gasLayers === 2
  const farScale = ((STAGE_DISTANCE + FAR_PLANE) / STAGE_DISTANCE) * 1.06

  return (
    <>
      <StageCamera frozen={options.frozen} />
      {options.showGas && (
        <>
          {two && (
            <GasLayer
              texture={reference.texture}
              width={width}
              height={STAGE_HEIGHT}
              look={scene.gas}
              z={-FAR_PLANE}
              scale={farScale}
              opacity={0.28}
              blur={scene.gas.blur[1]}
              seed={11}
              frozen={options.frozen}
            />
          )}
          <GasLayer
            texture={reference.texture}
            width={width}
            height={STAGE_HEIGHT}
            look={scene.gas}
            // One plane on its own carries all the gas (the two planes add up to about 1.1).
            opacity={two ? 0.8 : 1.2}
            blur={scene.gas.blur[0]}
            seed={3}
            frozen={options.frozen}
          />
        </>
      )}
      {options.showParticles && (
        <StarParticles
          shape={sampled.shape}
          traits={sampled.traits}
          // With fewer particles (phones) each carries a little more light.
          exposure={scene.particles.exposure * Math.pow(50_000 / options.particles, 0.25)}
          refDepth={STAGE_DISTANCE}
          frozen={options.frozen}
        />
      )}
    </>
  )
}

/**
 * Frames the image to fill the view, and leans a little toward the pointer
 * (plus a slow sway) so the gas planes and particles shift against each other.
 */
function StageCamera({ frozen }: { frozen: boolean }) {
  const camera = useThree((state) => state.camera)
  const lean = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    const pointer = state.pointer
    lean.current.x = THREE.MathUtils.damp(lean.current.x, pointer.x, 2, delta)
    lean.current.y = THREE.MathUtils.damp(lean.current.y, pointer.y, 2, delta)
    const time = frozen ? 0 : state.clock.elapsedTime
    const azimuth = lean.current.x * 0.06 + Math.sin(time * 0.13) * 0.015
    const elevation = lean.current.y * 0.045 + Math.cos(time * 0.11) * 0.01
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * STAGE_DISTANCE,
      Math.sin(elevation) * STAGE_DISTANCE,
      Math.cos(azimuth) * Math.cos(elevation) * STAGE_DISTANCE,
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}
