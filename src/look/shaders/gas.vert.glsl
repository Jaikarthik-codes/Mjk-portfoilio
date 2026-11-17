// ─────────────────────────────────────────────────────────────────────────────
//  GAS VERTEX SHADER
//  A flat rectangle showing the reference image. Nothing special happens here;
//  all the work is in gas.frag.glsl.
// ─────────────────────────────────────────────────────────────────────────────

varying vec2 vUv;   // 0..1 across the image

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
