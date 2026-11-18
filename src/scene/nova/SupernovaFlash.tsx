import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../../journey/rig'
import { useStore } from '../../store/useStore'
import { SHAPE_INDEX, STAGES } from '../config'
import { supernovaPhase } from '../gasState'
import fragmentShader from './flash.frag.glsl?raw'
import vertexShader from './flash.vert.glsl?raw'

/** Half the flash square's width, world units: room for the glare and the ring's whole journey. */
const SIZE = STAGES.nova.height * 0.75
/** Where the shock ring stops: about the edge of the supernova's shell. */
const SHELL = 0.62

/**
 * The supernova's flash and shock ring (see flash.frag.glsl), in step with the
 * particles: the flash peaks as the last of the galaxy falls into the centre,
 * and the ring rides out with the new shell. Scroll-driven like everything
 * else, so it plays backwards too. Off with reduced motion (the pictures
 * simply dissolve).
 */
export function SupernovaFlash() {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uSize: { value: SIZE },
          uFlash: { value: 0 },
          uRing: { value: 0 },
          uRingRadius: { value: 0 },
          uShell: { value: SHELL },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const t = rig.morph - SHAPE_INDEX.galaxy
    let flash = 0
    let ring = 0
    let radius = 0
    if (t > 0 && t < 1 && !useStore.getState().calm) {
      const { collapse, bloom } = supernovaPhase(t)
      flash = Math.pow(collapse, 10) * Math.pow(1 - bloom, 3)
      ring = Math.sqrt(bloom) * Math.pow(1 - bloom, 1.5) * 1.2
      radius = bloom
    }
    material.uniforms.uFlash.value = flash
    material.uniforms.uRing.value = ring
    material.uniforms.uRingRadius.value = radius
    if (mesh.current) mesh.current.visible = flash > 0.001 || ring > 0.001
  })

  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={5} visible={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
