import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../journey/rig'
import { createGasMaterial } from '../look/GasLayer'
import { LOOK_SCENES } from '../look/scenes'
import type { ReferenceImages } from '../look/useReferenceImage'
import { useStore } from '../store/useStore'
import { GALAXY_SHAPE, QUALITY, SHAPE_INDEX, SHAPES, STAGES, type ShapeName } from './config'
import { clock, frameUniforms } from './frame'
import { gasState } from './gasState'
import { getNameLayout } from './nameLayout'

/** How far behind the main gas plane the second (far) plane sits. */
const FAR_PLANE = 3.2
/** Softness of the star field's borrowed gas: a faint wash rather than a picture. */
const FIELD_BLUR = 2.4
/** How much the gas behind the name is darkened, so the letters stay readable. */
const NAME_SHADE = 0.58

interface Stage {
  shape: ShapeName
  width: number
  height: number
  /** How much of the image's gas is shown (STAGES in config.ts). */
  strength: number
  near: THREE.ShaderMaterial
  far: THREE.ShaderMaterial | null
}

/**
 * The gas: each shape's reference image on a plane (two planes at different
 * depths on capable devices, so they shift against each other as the camera
 * moves). As you scroll, one picture fades out while the next fades in, in
 * step with the particles' morph (see gasState.ts).
 */
export function GasStack({ references }: { references: ReferenceImages }) {
  const quality = useStore((state) => state.quality)
  const layers = QUALITY[quality].gasLayers
  const camera = useThree((state) => state.camera)
  const portrait = useThree((state) => state.size.width < state.size.height)

  const stages = useMemo<Stage[]>(
    () =>
      SHAPES.map((shape, i) => {
        const stage = STAGES[shape]
        const scene = LOOK_SCENES.find((s) => s.id === stage.scene)!
        const texture = references[stage.scene].texture
        // Every plane drifts by the shared clock, which stands still for reduced motion.
        const time = frameUniforms.uTime
        const nearBlur = shape === 'field' ? FIELD_BLUR : scene.gas.blur[0]
        return {
          shape,
          width: stage.height * scene.aspect * stage.gasScale,
          height: stage.height * stage.gasScale,
          strength: stage.gas,
          near: createGasMaterial(texture, scene.gas, { blur: nearBlur, seed: 3 + i, time }),
          far: layers === 2 ? createGasMaterial(texture, scene.gas, { blur: scene.gas.blur[1], seed: 11 + i, time }) : null,
        }
      }),
    [references, layers],
  )
  useEffect(
    () => () =>
      stages.forEach((stage) => {
        stage.near.dispose()
        stage.far?.dispose()
      }),
    [stages],
  )

  // The intro's stardust is darkened in an oval behind the name.
  useEffect(() => {
    const name = getNameLayout(portrait)
    const stage = stages[SHAPE_INDEX.name]
    stage.near.uniforms.uShade.value.set(
      0.5,
      0.5,
      ((name.width / stage.width) * 1.2) / 2 + 0.04,
      ((name.maxHeight / stage.height) * 2.6) / 2,
    )
    stage.near.uniforms.uShadeAmount.value = NAME_SHADE
    if (stage.far) {
      stage.far.uniforms.uShade.value.copy(stage.near.uniforms.uShade.value)
      stage.far.uniforms.uShadeAmount.value = NAME_SHADE
    }
  }, [stages, portrait])

  const groups = useRef<(THREE.Group | null)[]>([])
  const farMeshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    // The far plane is enlarged so that, from the camera, it looks the same
    // size as the near one; moving the camera sideways then shifts them
    // against each other (parallax), which is what gives the gas depth.
    const distance = Math.max(1, camera.position.z)
    const farScale = ((distance + FAR_PLANE) / distance) * 1.06
    // Dim the gas a little while visiting a star system, so the system reads.
    const visiting = 1 - 0.35 * rig.warp
    const calm = useStore.getState().calm

    stages.forEach((stage, i) => {
      const group = groups.current[i]
      if (!group) return
      const { weight, scale } = gasState(rig.morph, i, rig.intro, calm)
      const opacity = weight * stage.strength * visiting
      group.visible = opacity > 0.002
      if (!group.visible) return

      group.scale.setScalar(scale)
      // The galaxy turns with its particles and star systems (see galaxyFrame.ts).
      if (stage.shape === 'galaxy') group.rotation.z = -clock.time * GALAXY_SHAPE.spin
      // Two planes carry 0.8 + 0.28 of the gas; one on its own carries a little more (as tuned in the lab).
      stage.near.uniforms.uOpacity.value = opacity * (stage.far ? 0.8 : 1.2)
      if (stage.far) {
        stage.far.uniforms.uOpacity.value = opacity * 0.28
        farMeshes.current[i]?.scale.setScalar(farScale)
      }
    })
  })

  return (
    <>
      {stages.map((stage, i) => (
        <group key={`${stage.shape}-${layers}`} ref={(group) => void (groups.current[i] = group)} visible={false}>
          {stage.far && (
            <mesh
              ref={(mesh) => void (farMeshes.current[i] = mesh)}
              position={[0, 0, -FAR_PLANE]}
              material={stage.far}
              frustumCulled={false}
              renderOrder={-2}
            >
              <planeGeometry args={[stage.width, stage.height]} />
            </mesh>
          )}
          <mesh material={stage.near} frustumCulled={false} renderOrder={-1}>
            <planeGeometry args={[stage.width, stage.height]} />
          </mesh>
        </group>
      ))}
    </>
  )
}
