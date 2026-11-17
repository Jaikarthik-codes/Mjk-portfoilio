import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { content } from '../data/content'
import { rig } from '../journey/rig'
import { createRng } from '../lib/random'
import type { ReferenceImages } from '../look/useReferenceImage'
import { useStore } from '../store/useStore'
import { cameraView, warpView } from './CameraRig'
import { fillDistance, GALAXY_SHAPE, MOTION, PARTICLE_COUNT, SHAPE_LOOK, SHAPES, STAGES } from './config'
import { frameUniforms } from './frame'
import { getNameLayout } from './nameLayout'
import { layoutSystems } from './projects/systemLayout'
import { buildShapes, type ParticleShapes } from './shapeGenerators'
import { layoutConstellations } from './shapeGenerators/constellationLayout'
import noiseGlsl from './shaders/noise.glsl?raw'
import fragmentShader from './shaders/particles.frag.glsl?raw'
import pointerGlsl from './shaders/pointer.glsl?raw'
import vertexShader from './shaders/particles.vert.glsl?raw'

/** Longest diffraction spike arm, as a share of the view's height. */
const SPIKE_SHARE = 0.09

/**
 * The heart of the site: one draw call, tens of thousands of points.
 *
 * JavaScript's whole job here is to (1) hand the GPU every shape once, up
 * front, and (2) update a handful of numbers each frame. All of the motion
 * happens in shaders/particles.vert.glsl.
 */
export function ParticleSystem({ references }: { references: ReferenceImages }) {
  const quality = useStore((state) => state.quality)
  const count = PARTICLE_COUNT[quality]
  const gl = useThree((state) => state.gl)

  // Re-renders only when the screen flips between portrait and landscape.
  const portrait = useThree((state) => state.size.width < state.size.height)
  const nameLayout = useMemo(() => getNameLayout(portrait), [portrait])
  const field = useMemo(() => layoutConstellations(content.skills, portrait), [portrait])

  const built = useMemo(
    () =>
      buildShapes(count, {
        references,
        name: nameLayout,
        constellations: field,
        fieldDistance: fillDistance(STAGES.field.height),
      }),
    [count, references, nameLayout, field],
  )
  const geometry = useMemo(() => createGeometry(built), [built])
  const material = useMemo(() => createMaterial(gl), [gl])

  // Free GPU memory when the geometry is replaced or the component goes away.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Uniforms that depend on the particle count or the layout.
  useEffect(() => {
    // With fewer particles each one has to carry more light, or the shapes look thin.
    material.uniforms.uExposure.value = Math.pow(PARTICLE_COUNT.high / count, 0.25)
    material.uniforms.uNameWidth.value = nameLayout.width
    material.uniforms.uFieldWidth.value = field.width
  }, [material, count, nameLayout, field])

  useFrame((state) => {
    const uniforms = material.uniforms

    // The rig is written by GSAP as you scroll (see journey/useJourney.ts).
    // (The clock, canvas size and cursor are shared uniforms, updated in frame.ts.)
    uniforms.uProgress.value = rig.morph
    uniforms.uIntro.value = rig.intro
    uniforms.uCalm.value = useStore.getState().calm ? 1 : 0
    // Stars are their design size from the scroll camera's distance; nearer, a little bigger.
    uniforms.uRefDepth.value = cameraView.scrollDistance
    // The longest spike arm is about a tenth of the view's height, whatever the screen size.
    uniforms.uSpikeLength.value = state.size.height * SPIKE_SHARE

    // Visiting a star system: clear a space around it (see warp.ts).
    uniforms.uFocus.value = warpView.focus
    uniforms.uFocusCenter.value.copy(warpView.focusCenter)
    uniforms.uFocusRadius.value = warpView.focusRadius
  })

  // frustumCulled={false}: three.js would otherwise hide the whole cloud based on
  // the name's bounding box, but the shader moves the points far outside it.
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/** Packs every shape into one geometry: a position and a colour attribute per shape. */
function createGeometry({ layout, traits, shapes }: ParticleShapes): THREE.BufferGeometry {
  const { count } = layout
  const geometry = new THREE.BufferGeometry()
  const attribute = (data: Float32Array, size: number) => new THREE.BufferAttribute(data, size)

  // Colour and spike strength share one attribute (rgb + w): the GPU only
  // guarantees 16 attributes per particle, and this keeps the total at 14.
  const colourWithSpike = (shape: ParticleShapes['shapes'][keyof ParticleShapes['shapes']]) => {
    const packed = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      packed[i * 4] = shape.colors[i * 3]
      packed[i * 4 + 1] = shape.colors[i * 3 + 1]
      packed[i * 4 + 2] = shape.colors[i * 3 + 2]
      packed[i * 4 + 3] = shape.spikes[i]
    }
    return attribute(packed, 4)
  }

  // three.js needs an attribute called `position`, so the name shape gets that slot.
  geometry.setAttribute('position', attribute(shapes.name.positions, 3))
  geometry.setAttribute('aNebulaA', attribute(shapes.nebulaA.positions, 3))
  geometry.setAttribute('aNebulaB', attribute(shapes.nebulaB.positions, 3))
  geometry.setAttribute('aField', attribute(shapes.field.positions, 3))
  geometry.setAttribute('aGalaxy', attribute(shapes.galaxy.positions, 3))
  geometry.setAttribute('aNova', attribute(shapes.nova.positions, 3))
  geometry.setAttribute('aColorName', colourWithSpike(shapes.name))
  geometry.setAttribute('aColorNebulaA', colourWithSpike(shapes.nebulaA))
  geometry.setAttribute('aColorNebulaB', colourWithSpike(shapes.nebulaB))
  geometry.setAttribute('aColorField', colourWithSpike(shapes.field))
  geometry.setAttribute('aColorGalaxy', colourWithSpike(shapes.galaxy))
  geometry.setAttribute('aColorNova', colourWithSpike(shapes.nova))

  // The particle's fixed look (see look/sampleImage.ts: createTraits).
  const fixed = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    fixed[i * 4] = traits.size[i]
    fixed[i * 4 + 1] = traits.alpha[i]
    fixed[i * 4 + 2] = traits.kind[i]
    fixed[i * 4 + 3] = traits.seed[i]
  }
  geometry.setAttribute('aTraits', attribute(fixed, 4))

  // Four random numbers per particle (see `aRandom` in the vertex shader).
  const rng = createRng(55)
  const random = new Float32Array(count * 4)
  for (let i = 0; i < count * 4; i++) random[i] = rng()
  geometry.setAttribute('aRandom', attribute(random, 4))

  return geometry
}

function createMaterial(gl: THREE.WebGLRenderer): THREE.ShaderMaterial {
  const context = gl.getContext()
  const range = context.getParameter(context.ALIASED_POINT_SIZE_RANGE) as Float32Array | null
  return new THREE.ShaderMaterial({
    vertexShader: `${noiseGlsl}\n${pointerGlsl}\n${vertexShader}`,
    fragmentShader,
    uniforms: {
      // Clock, canvas size and cursor: shared with the other shaders (see frame.ts).
      ...frameUniforms,
      uProgress: { value: rig.morph },
      uIntro: { value: rig.intro },
      uCalm: { value: 0 },
      uShapeDrift: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].drift) },
      uShapeDriftScale: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].driftScale) },
      uStagger: { value: MOTION.stagger },
      uTurbulence: { value: MOTION.turbulence },
      uSwirl: { value: MOTION.swirl },
      uTwinkle: { value: MOTION.twinkle },
      uNameWidth: { value: 1 },
      uFieldWidth: { value: 1 },
      uGalaxyRadius: { value: GALAXY_SHAPE.radius },
      uGalaxySpin: { value: GALAXY_SHAPE.spin },
      uGalaxyTilt: { value: new THREE.Vector2(...GALAXY_SHAPE.tilt) },
      uExposure: { value: 1 },
      uRefDepth: { value: 12 },
      uSpikeLength: { value: 46 },
      uMaxPointSize: { value: range?.[1] ?? 64 },
      uFocusCenter: { value: new THREE.Vector3() },
      uFocusRadius: { value: 1 },
      uFocus: { value: 0 },
      ...systemPockets(),
    },
    transparent: true,
    // Additive blending: overlapping particles add their light together.
    blending: THREE.AdditiveBlending,
    // Glowing dots should never hide each other, so they do not write depth.
    depthWrite: false,
  })
}

/** Where the star systems sit in the flat galaxy, for the pockets they clear (see the shader). */
function systemPockets() {
  const MAX_SYSTEMS = 12 // must match MAX_SYSTEMS in particles.vert.glsl
  const systems = layoutSystems(content.projects).slice(0, MAX_SYSTEMS)
  const pockets = Array.from({ length: MAX_SYSTEMS }, () => new THREE.Vector4(0, 0, 0, 1))
  systems.forEach((system, i) => pockets[i].set(system.center.x, system.center.y, system.center.z, system.radius * 1.15))
  return {
    uSystems: { value: pockets },
    uSystemCount: { value: systems.length },
  }
}
