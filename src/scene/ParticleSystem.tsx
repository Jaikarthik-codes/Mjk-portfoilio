import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createRng } from '../lib/random'
import { useStore } from '../store/useStore'
import { GALAXY_SHAPE, MOTION, PARTICLE_COUNT, SHAPE_LOOK, SHAPES } from './config'
import { getNameLayout, type NameLayout } from './nameLayout'
import { buildShapes } from './shapeGenerators'
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

  const geometry = useMemo(() => createGeometry(count, layout), [count, layout])
  const material = useMemo(() => createMaterial(), [])

  // Free GPU memory when the geometry is replaced or the component goes away.
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Uniforms that depend on the particle count or the name layout.
  useEffect(() => {
    // With fewer particles each one has to carry more light, or the shapes look thin.
    const boost = Math.pow(PARTICLE_COUNT.high / count, 0.25)
    material.uniforms.uShapeSize.value = SHAPES.map((shape) => SHAPE_LOOK[shape].size * boost)
    material.uniforms.uShapeAlpha.value = SHAPES.map((shape) => SHAPE_LOOK[shape].alpha * boost)
    material.uniforms.uNameWidth.value = layout.width
  }, [material, count, layout])

  const pointer = usePointer()
  const smoothPointer = useRef({ x: 0, y: 0, strength: 0 })

  useFrame((state, delta) => {
    const uniforms = material.uniforms

    // Advance the animation clock. The cap stops everything lurching forward
    // after the tab has been in the background for a while.
    uniforms.uTime.value += Math.min(delta, 0.1)

    // Glide toward the requested morph value instead of jumping to it, so slider
    // drags (and later, scroll) always feel smooth.
    uniforms.uProgress.value = THREE.MathUtils.damp(
      uniforms.uProgress.value,
      useStore.getState().morph, // read directly: no React re-render per frame
      MOTION.morphDamping,
      delta,
    )

    const dpr = state.viewport.dpr
    uniforms.uPixelHeight.value = state.size.height * dpr
    uniforms.uMinPointSize.value = 1.3 * dpr
    uniforms.uAspect.value = state.size.width / state.size.height

    // Cursor gravity: follow the pointer with a little lag, and fade the push
    // in and out rather than switching it.
    const smooth = smoothPointer.current
    if (smooth.strength < 0.01) {
      // The push is invisible right now, so jump straight to the pointer.
      smooth.x = pointer.current.x
      smooth.y = pointer.current.y
    } else {
      smooth.x = THREE.MathUtils.damp(smooth.x, pointer.current.x, 9, delta)
      smooth.y = THREE.MathUtils.damp(smooth.y, pointer.current.y, 9, delta)
    }
    smooth.strength = THREE.MathUtils.damp(smooth.strength, pointer.current.active ? 1 : 0, 4, delta)
    uniforms.uPointer.value.set(smooth.x, smooth.y)
    uniforms.uPointerStrength.value = smooth.strength * MOTION.pointerStrength
  })

  // frustumCulled={false}: three.js would otherwise hide the whole cloud based on
  // the name's bounding box, but the shader moves the points far outside it.
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/** Packs every shape into one geometry, as one attribute per shape. */
function createGeometry(count: number, layout: NameLayout): THREE.BufferGeometry {
  const shapes = buildShapes(count, { nameLines: layout.lines, nameWidth: layout.width })

  const geometry = new THREE.BufferGeometry()
  // three.js needs an attribute called `position`, so the name shape gets that slot.
  geometry.setAttribute('position', new THREE.BufferAttribute(shapes.name.positions, 3))
  geometry.setAttribute('aNebula', new THREE.BufferAttribute(shapes.nebula.positions, 3))
  geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(shapes.galaxy.positions, 3))
  geometry.setAttribute('aColorName', new THREE.BufferAttribute(shapes.name.colors, 3))
  geometry.setAttribute('aColorNebula', new THREE.BufferAttribute(shapes.nebula.colors, 3))
  geometry.setAttribute('aColorGalaxy', new THREE.BufferAttribute(shapes.galaxy.colors, 3))

  // Four random numbers per particle (see `aRandom` in the vertex shader).
  const rng = createRng(55)
  const random = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    random[i * 4] = rng() // delay
    random[i * 4 + 1] = Math.pow(rng(), 3) // size, cubed so most particles are small
    random[i * 4 + 2] = rng() // twinkle rhythm
    random[i * 4 + 3] = rng() // spare dice roll
  }
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(random, 4))

  return geometry
}

function createMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `${noiseGlsl}\n${vertexShader}`,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: useStore.getState().morph },
      uShapeSize: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].size) },
      uShapeAlpha: { value: SHAPES.map((shape) => SHAPE_LOOK[shape].alpha) },
      uStagger: { value: MOTION.stagger },
      uTurbulence: { value: MOTION.turbulence },
      uSwirl: { value: MOTION.swirl },
      uTwinkle: { value: MOTION.twinkle },
      uNameWidth: { value: 1 },
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

/**
 * Tracks the pointer in "normalised device coordinates": x and y from -1 to 1
 * with (0, 0) at the centre of the canvas and +y pointing up — the same space
 * the vertex shader measures the cursor push in.
 */
function usePointer() {
  const canvas = useThree((state) => state.gl.domElement)
  const pointer = useRef({ x: 0, y: 0, active: false })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.current.y = 1 - ((event.clientY - rect.top) / rect.height) * 2
      pointer.current.active = true
    }
    const deactivate = () => {
      pointer.current.active = false
    }
    // A finger only "hovers" while it is touching the screen.
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') deactivate()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', deactivate)
    window.addEventListener('blur', deactivate)
    document.documentElement.addEventListener('pointerleave', deactivate)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', deactivate)
      window.removeEventListener('blur', deactivate)
      document.documentElement.removeEventListener('pointerleave', deactivate)
    }
  }, [canvas])

  return pointer
}
