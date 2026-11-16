import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rig } from '../journey/rig'
import { BACKDROP_GRADES } from './config'
import fragmentShader from './shaders/backdrop.frag.glsl?raw'
import vertexShader from './shaders/backdrop.vert.glsl?raw'

// Convert the hex colours once, up front.
const GRADES = BACKDROP_GRADES.map((grade) => ({
  inner: new THREE.Color(grade.inner),
  outer: new THREE.Color(grade.outer),
}))

/**
 * The sky behind everything: a full-screen gradient whose colour follows the
 * scroll position (rig.grade: 0 violet, 1 teal, 2 gold).
 */
export function Backdrop() {
  // The material is created here, not with JSX, so the uniforms updated below
  // are guaranteed to be the very objects the GPU program reads.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uInner: { value: GRADES[0].inner.clone() },
          uOuter: { value: GRADES[0].outer.clone() },
          uAspect: { value: 1 },
          uReveal: { value: 0 },
        },
        // Never hide anything, whatever the camera does.
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    const uniforms = material.uniforms

    // Find the two grades we are between and how far along we are.
    const grade = THREE.MathUtils.clamp(rig.grade, 0, GRADES.length - 1)
    const from = Math.min(GRADES.length - 2, Math.floor(grade))
    const blend = grade - from

    uniforms.uInner.value.lerpColors(GRADES[from].inner, GRADES[from + 1].inner, blend)
    uniforms.uOuter.value.lerpColors(GRADES[from].outer, GRADES[from + 1].outer, blend)
    uniforms.uAspect.value = state.size.width / state.size.height
    // The sky fades up out of black as the Big Bang expands.
    uniforms.uReveal.value = THREE.MathUtils.smoothstep(rig.intro, 0.12, 0.6)
  })

  return (
    // renderOrder -1 draws it before everything else.
    <mesh material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
