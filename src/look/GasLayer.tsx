import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import noiseGlsl from '../scene/shaders/noise.glsl?raw'
import type { GasLook } from './scenes'
import fragmentShader from './shaders/gas.frag.glsl?raw'
import vertexShader from './shaders/gas.vert.glsl?raw'

interface GasLayerProps {
  texture: THREE.Texture
  /** Size of the image in the world. */
  width: number
  height: number
  look: GasLook
  /** Distance from the main plane (negative = further away), and extra scale to make up for it. */
  z?: number
  scale?: number
  /** Share of the gas this plane carries (the planes of a scene add up to about 1). */
  opacity?: number
  /** Softness, in mip levels. */
  blur?: number
  /** Makes this plane's drift differ from the others'. */
  seed?: number
  /** Stop the drift (reduced motion, or paused). */
  frozen?: boolean
}

/** One plane of glowing gas: the reference image, softened, drifting and feathered (see gas.frag.glsl). */
export function GasLayer({
  texture,
  width,
  height,
  look,
  z = 0,
  scale = 1,
  opacity = 1,
  blur = look.blur[0],
  seed = 0,
  frozen = false,
}: GasLayerProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: `${noiseGlsl}\n${fragmentShader}`,
        uniforms: {
          uMap: { value: texture },
          uTime: { value: 0 },
          uSeed: { value: seed },
          uFlow: { value: look.flow },
          uBlur: { value: blur },
          uOpacity: { value: opacity },
          uExposure: { value: look.exposure },
          uGamma: { value: look.gamma },
          uSaturation: { value: look.saturation },
          uFeather: { value: new THREE.Vector2(...look.feather) },
          uKnee: { value: look.knee },
          uKneeTint: { value: new THREE.Color(look.kneeTint) },
          uKneeAmount: { value: look.kneeAmount },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [texture, look, blur, opacity, seed],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    if (!frozen) material.uniforms.uTime.value += Math.min(delta, 0.1)
  })

  return (
    <mesh position={[0, 0, z]} scale={scale} material={material} renderOrder={-1}>
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}
