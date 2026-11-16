import { Effect, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'
import fragmentShader from '../shaders/warp.frag.glsl?raw'

/**
 * The warp's chromatic aberration (see shaders/warp.frag.glsl), packaged as a
 * postprocessing Effect. Set `strength` and `center` each frame.
 */
export class WarpEffect extends Effect {
  constructor() {
    super('WarpEffect', fragmentShader, {
      // It reads neighbouring pixels, so it cannot share a pass with other such effects.
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['strength', new THREE.Uniform(0)],
        ['center', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
      ]),
    })
  }

  get strength(): number {
    return this.uniforms.get('strength')!.value
  }

  set strength(value: number) {
    this.uniforms.get('strength')!.value = value
  }

  get center(): THREE.Vector2 {
    return this.uniforms.get('center')!.value
  }
}
