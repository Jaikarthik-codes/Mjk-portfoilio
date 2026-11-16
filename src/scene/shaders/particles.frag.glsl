// ─────────────────────────────────────────────────────────────────────────────
//  PARTICLE FRAGMENT SHADER
//  Runs once for every pixel a particle covers. The GPU draws each particle as
//  a small square; this shader paints a soft glowing dot inside that square.
//
//  The material uses additive blending: each dot's colour is ADDED to whatever
//  is already on screen. Where many faint particles overlap they sum toward
//  white, which is what makes dense areas look like they are glowing.
// ─────────────────────────────────────────────────────────────────────────────

varying vec3 vColor;   // from the vertex shader
varying float vAlpha;

void main() {
  // gl_PointCoord runs 0..1 across the square. Re-centre it so that
  // d = 0 at the middle of the dot and d = 1 at the edge of the square.
  float d = length(gl_PointCoord - 0.5) * 2.0;

  // Two layers make a convincing star:
  float halo = pow(max(0.0, 1.0 - d), 2.0);      // wide and soft, fades to nothing at the edge
  float core = smoothstep(0.4, 0.0, d);          // small and bright, in the centre

  float alpha = (halo * 0.55 + core * 0.75) * vAlpha;

  // Push the very centre toward white so the dot looks hot rather than flat.
  vec3 color = vColor * (1.0 + core * 0.6);

  gl_FragColor = vec4(color, alpha);

  // three.js helper: converts our linear-light colour to what the screen expects (sRGB).
  #include <colorspace_fragment>
}
