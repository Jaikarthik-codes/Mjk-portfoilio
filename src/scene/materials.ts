import * as THREE from 'three'
import { frameUniforms } from './frame'
import linesFragment from './shaders/lines.frag.glsl?raw'
import linesVertex from './shaders/lines.vert.glsl?raw'
import pointerGlsl from './shaders/pointer.glsl?raw'
import spriteVertex from './shaders/sprite.vert.glsl?raw'
import starFragment from './shaders/star.frag.glsl?raw'

/** The light-up controls shared by lines and sprites (see the shaders for what each does). */
function highlightUniforms() {
  return {
    uVisible: { value: 0 },
    uHighlight: { value: -1 },
    uHighlightSub: { value: -1 },
    uHighlightGroup: { value: -1 },
    uHover: { value: 0 },
    uActive: { value: -1 },
    uFocus: { value: 0 },
  }
}

/** Glowing light: each draw adds to what is already on screen, and never hides anything. */
const glowing = {
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  // Flat shapes we build ourselves: draw them whichever way round they face.
  side: THREE.DoubleSide,
} as const

/** Thin lines with a width in pixels. `pointerPush` makes them bend around the cursor like the particles. */
export function createLineMaterial({ width, pointerPush }: { width: number; pointerPush: boolean }) {
  return new THREE.ShaderMaterial({
    vertexShader: `${pointerPush ? '#define POINTER_PUSH\n' : ''}${pointerGlsl}\n${linesVertex}`,
    fragmentShader: linesFragment,
    uniforms: { ...frameUniforms, ...highlightUniforms(), uWidth: { value: width } },
    ...glowing,
  })
}

/** Camera-facing glowing stars (see star.frag.glsl). */
export function createStarMaterial(options: {
  pointerPush: boolean
  /** Smallest size on screen, in CSS pixels. */
  minPixels: number
  /** Pulse an inviting ripple outward (for clickable things). */
  beacon: boolean
  /** Strength of the four-pointed cross. */
  spikes: number
}) {
  return new THREE.ShaderMaterial({
    vertexShader: `${options.pointerPush ? '#define POINTER_PUSH\n' : ''}${pointerGlsl}\n${spriteVertex}`,
    fragmentShader: starFragment,
    uniforms: {
      ...frameUniforms,
      ...highlightUniforms(),
      uMinPixels: { value: options.minPixels },
      uBeacon: { value: options.beacon ? 1 : 0 },
      uSpikes: { value: options.spikes },
    },
    ...glowing,
  })
}
