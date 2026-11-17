import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ParticleTraits, SampledShape } from './sampleImage'
import fragmentShader from './shaders/stars.frag.glsl?raw'
import vertexShader from './shaders/stars.vert.glsl?raw'

interface StarParticlesProps {
  shape: SampledShape
  traits: ParticleTraits
  exposure: number
  /** Camera distance at which particles are drawn at exactly their design size. */
  refDepth: number
  /** Stop the shimmer (reduced motion, or paused). */
  frozen?: boolean
}

/** Longest diffraction spike arm, as a share of the view's height. */
const SPIKE_SHARE = 0.09

/** Particles in the new look: soft Gaussian stars, power-law sizes, hero stars with spikes. */
export function StarParticles({ shape, traits, exposure, refDepth, frozen = false }: StarParticlesProps) {
  const gl = useThree((state) => state.gl)

  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(shape.positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(shape.colors, 3))
    geometry.setAttribute('aSpike', new THREE.BufferAttribute(shape.spikes, 1))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(traits.size, 1))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(traits.alpha, 1))
    geometry.setAttribute('aKind', new THREE.BufferAttribute(traits.kind, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(traits.seed, 1))
    return geometry
  }, [shape, traits])

  const material = useMemo(() => {
    const range = gl.getContext().getParameter(gl.getContext().ALIASED_POINT_SIZE_RANGE) as Float32Array
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
        uExposure: { value: exposure },
        uTwinkle: { value: 0.25 },
        uRefDepth: { value: refDepth },
        uSpikeLength: { value: 46 }, // CSS pixels; set every frame from the view's height
        uMaxPointSize: { value: range?.[1] ?? 64 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  }, [gl, exposure, refDepth])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    material.uniforms.uPixelRatio.value = state.viewport.dpr
    // The longest spike arm is about a tenth of the view's height, whatever the screen size.
    material.uniforms.uSpikeLength.value = state.size.height * SPIKE_SHARE
    if (!frozen) material.uniforms.uTime.value += Math.min(delta, 0.1)
  })

  // The points spread past the image's bounding box (depth), so skip culling.
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
