import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../data/content'
import { rig } from '../journey/rig'
import { createRng } from '../lib/random'
import { useStore } from '../store/useStore'
import { GALAXY_SHAPE, MOTION, PARTICLE_COUNT, SHAPE_LOOK, SHAPES } from './config'
import { getNameLayout, type NameLayout } from './nameLayout'
import { pointer } from './pointer'
import { buildShapes } from './shapeGenerators'
import {
  layoutConstellations,
  type ConstellationField,
} from './shapeGenerators/constellationLayout'
import noiseGlsl from './shaders/noise.glsl?raw'
import fragmentShader from './shaders/particles.frag.glsl?raw'
import vertexShader from './shaders/particles.vert.glsl?raw'

/**
 * The heart of the site: one draw call, tens of thousands of points.
 *
 * JavaScript's whole job here is to (1) hand the GPU every shape once, up
 * front, and (2) update a handful of numbers each frame. All of the motion
 * happens in shaders/particles.vert.glsl.
 */
export function ParticleSystem() {
  const quality = useStore((state) => state.quality)
  const count = PARTICLE_COUNT[quality]

  // Re-renders only when the screen flips between portrait and landscape.
  const portrait = useThree((state) => state.size.width < state.size.height)
  const layout = useMemo(() => getNameLayout(portrait), [portrait])
  const field = useMemo(() => layoutConstellations(content.skills, portrait), [portrait])

  const geometry = useMemo(() => createGeometry(count, layout, field), [count, layout, field])
  const material = useMemo(() => createMaterial(), [])

  // Free GPU memory when the geometry is replaced or the component goes away.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Uniforms that depend on the particle count or the layout.
  useEffect(() => {
    // With fewer particles each one has to carry more light, or the shapes look thin.
    const boost = Math.pow(PARTICLE_COUNT.high / count, 0.25)
    material.uniforms.uShapeSize.value = SHAPES.map((shape) => SHAPE_LOOK[shape].size * boost)
    material.uniforms.uShapeAlpha.value = SHAPES.map((shape) => SHAPE_LOOK[shape].alpha * boost)
    material.uniforms.uNameWidth.value = layout.width
    material.uniforms.uFieldWidth.value = field.width
  }, [material, count, layout, field])

  const smoothPointer = useRef({ x: 0, y: 0, strength: 0 })

  useFrame((state, delta) => {
    const uniforms = material.uniforms

    // Advance the animation clock. The cap stops everything lurching forward
    // after the tab has been in the background for a while.
    uniforms.uTime.value += Math.min(delta, 0.1)

    // The rig is written by GSAP as you scroll (see journey/useJourney.ts).
    uniforms.uProgress.value = rig.morph
    uniforms.uIntro.value = rig.intro

    const dpr = state.viewport.dpr
    uniforms.uPixelHeight.value = state.size.height * dpr
    uniforms.uMinPointSize.value = 1.3 * dpr
    uniforms.uAspect.value = state.size.width / state.size.height

    // Cursor gravity: follow the pointer with a little lag, and fade the push
    // in and out rather than switching it.
    const smooth = smoothPointer.current
    if (smooth.strength < 0.01) {
      // The push is invisible right now, so jump straight to the pointer.
      smooth.x = pointer.x
      smooth.y = pointer.y
    } else {
      smooth.x = THREE.MathUtils.damp(smooth.x, pointer.x, 9, delta)
      smooth.y = THREE.MathUtils.damp(smooth.y, pointer.y, 9, delta)
    }
    smooth.strength = THREE.MathUtils.damp(smooth.strength, pointer.active ? 1 : 0, 4, delta)
    uniforms.uPointer.value.set(smooth.x, smooth.y)
    uniforms.uPointerStrength.value = smooth.strength * MOTION.pointerStrength
  })

  // frustumCulled={false}: three.js would otherwise hide the whole cloud based on
  // the name's bounding box, but the shader moves the points far outside it.
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/** Packs every shape into one geometry, as one attribute per shape. */
function createGeometry(
  count: number,
  layout: NameLayout,
  field: ConstellationField,
): THREE.BufferGeometry {
  const shapes = buildShapes(count, { name: layout, constellations: field })
  const attribute = (data: Float32Array, size: number) => new THREE.BufferAttribute(data, size)

  const geometry = new THREE.BufferGeometry()
  // three.js needs an attribute called `position`, so the name shape gets that slot.
  geometry.setAttribute('position', attribute(shapes.name.positions, 3))
  geometry.setAttribute('aNebula', attribute(shapes.nebula.positions, 3))
  geometry.setAttribute('aConstellation', attribute(shapes.constellation.positions, 3))
  geometry.setAttribute('aGalaxy', attribute(shapes.galaxy.positions, 3))
  geometry.setAttribute('aBurst', attribute(shapes.burst.positions, 3))
  geometry.setAttribute('aColorName', attribute(shapes.name.colors, 3))
  geometry.setAttribute('aColorNebula', attribute(shapes.nebula.colors, 3))
  geometry.setAttribute('aColorConstellation', attribute(shapes.constellation.colors, 3))
  geometry.setAttribute('aColorGalaxy', attribute(shapes.galaxy.colors, 3))
  geometry.setAttribute('aColorBurst', attribute(shapes.burst.colors, 3))

  // Four random numbers per particle (see `aRandom` in the vertex shader).
  const rng = createRng(55)
  const random = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    random[i * 4] = rng() // delay
    random[i * 4 + 1] = Math.pow(rng(), 3) // size, cubed so most particles are small
    random[i * 4 + 2] = rng() // twinkle rhythm
    random[i * 4 + 3] = rng() // spare dice roll
  }
  geometry.setAttribute('aRandom', attribute(random, 4))

  return geometry
}

function createMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `${noiseGlsl}\n${vertexShader}`,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: rig.morph },
      uIntro: { value: rig.intro },
      uShapeSize: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].size) },
      uShapeAlpha: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].alpha) },
      uShapeDrift: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].drift) },
      uShapeDriftScale: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].driftScale) },
      uStagger: { value: MOTION.stagger },
      uTurbulence: { value: MOTION.turbulence },
      uSwirl: { value: MOTION.swirl },
      uTwinkle: { value: MOTION.twinkle },
      uNameWidth: { value: 1 },
      uFieldWidth: { value: 1 },
      uGalaxyRadius: { value: GALAXY_SHAPE.radius },
      uGalaxyTilt: { value: new THREE.Vector2(...GALAXY_SHAPE.tilt) },
      uPixelHeight: { value: 1080 },
      uMinPointSize: { value: 1.3 },
      uAspect: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uPointerStrength: { value: 0 },
      uPointerRadius: { value: MOTION.pointerRadius },
    },
    transparent: true,
    // Additive blending: overlapping particles add their light together.
    blending: THREE.AdditiveBlending,
    // Glowing dots should never hide each other, so they do not write depth.
    depthWrite: false,
  })
}
