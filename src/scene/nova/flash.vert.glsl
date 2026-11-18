// A square that always faces the camera, centred where the supernova goes off.
uniform float uSize;    // half the square's width, world units

varying vec2 vUv;       // -1..1 across the square

void main() {
  vUv = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  gl_Position = projectionMatrix * (center + vec4(position.xy * uSize, 0.0, 0.0));
}
