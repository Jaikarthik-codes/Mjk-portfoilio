import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../../journey/rig'
import { createRng } from '../../lib/random'
import { useStore } from '../../store/useStore'
import { warpView } from '../CameraRig'
import { LOOK_PALETTE } from '../../look/palette'
import { frameUniforms } from '../frame'
import streakFragment from '../shaders/streak.frag.glsl?raw'
import streakVertex from '../shaders/streak.vert.glsl?raw'

const STREAKS = { ultra: 700, high: 420, low: 160 }
/** Streak-space units flown per second at full warp, and the longest streak. */
const TOP_SPEED = 46
const MAX_LENGTH = 9

/**
 * Hyperspace: streaks of starlight rushing past during a warp. Drawn only
 * while `rig.warpFx` is above zero; the rest of the time they cost nothing.
 */
export function WarpStreaks() {
  const quality = useStore((state) => state.quality)
  const count = STREAKS[quality]

  const geometry = useMemo(() => {
    const geometry = new THREE.InstancedBufferGeometry()
    // One thin rectangle: x = along the streak (0 tail, 1 head), y = side.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3))
    geometry.setIndex([0, 2, 1, 1, 2, 3])

    const rng = createRng(909)
    const palette = [LOOK_PALETTE.white, LOOK_PALETTE.white, LOOK_PALETTE.ice, LOOK_PALETTE.ice, LOOK_PALETTE.gold, LOOK_PALETTE.rose].map(
      (hex) => new THREE.Color(hex),
    )
    const seed = new Float32Array(count * 4)
    const color = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      seed.set([rng(), rng(), rng(), rng()], i * 4)
      const c = palette[Math.floor(rng() * palette.length)]
      color.set([c.r, c.g, c.b], i * 3)
    }
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4))
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
    geometry.instanceCount = count
    return geometry
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: streakVertex,
        fragmentShader: streakFragment,
        uniforms: {
          uPixelHeight: frameUniforms.uPixelHeight,
          uAspect: frameUniforms.uAspect,
          uTravel: { value: 0 },
          uLength: { value: 0 },
          uIntensity: { value: 0 },
          uAxis: { value: warpView.axis },
          uDirection: { value: 1 },
          uWidth: { value: 2 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const fx = rig.warpFx
    const uniforms = material.uniforms
    uniforms.uIntensity.value = Math.min(1, fx * 1.6)
    // Not drawn at all outside a warp.
    if (mesh.current) mesh.current.visible = fx > 0.001
    if (fx <= 0.001) return
    const speed = TOP_SPEED * fx * fx
    uniforms.uTravel.value += speed * Math.min(delta, 0.05) * warpView.direction
    uniforms.uLength.value = MAX_LENGTH * fx * fx
    uniforms.uDirection.value = warpView.direction
    uniforms.uWidth.value = 1.5 * state.viewport.dpr
  })

  // Positions are in camera space (see the shader), so frustum culling cannot apply.
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} visible={false} />
}
