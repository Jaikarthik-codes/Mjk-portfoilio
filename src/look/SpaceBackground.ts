import { Effect } from 'postprocessing'
import * as THREE from 'three'
import { SPACE_BLACK } from './palette'

/**
 * Space black (#04050A), applied after tone mapping.
 *
 * Tone mapping squashes very dark values to pure black, so a background colour
 * drawn in the scene would vanish. Instead this effect lays the colour under
 * the finished picture with a "screen" blend: where the picture is black you
 * get exactly #04050A; where it is bright, the picture is unchanged.
 */
const fragmentShader = /* glsl */ `
uniform vec3 background;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 screen = 1.0 - (1.0 - clamp(inputColor.rgb, 0.0, 1.0)) * (1.0 - background);
  outputColor = vec4(screen, 1.0);
}
`

export class SpaceBackgroundEffect extends Effect {
  constructor() {
    // The colour in linear light, which is what the effect chain works in.
    const background = new THREE.Color(SPACE_BLACK)
    super('SpaceBackgroundEffect', fragmentShader, {
      uniforms: new Map([['background', new THREE.Uniform(new THREE.Vector3(background.r, background.g, background.b))]]),
    })
  }
}
