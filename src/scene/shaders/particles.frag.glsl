// ─────────────────────────────────────────────────────────────────────────────
//  PARTICLE FRAGMENT SHADER
//  Paints one particle inside its square point:
//    core   — a Gaussian (bell-curve) falloff: bright centre, no hard edge
//    halo   — heroes only: a faint, wide glow around the core
//    spikes — heroes only: the four-pointed cross a telescope adds to bright stars
//
//  The material uses additive blending: each dot's light is ADDED to whatever
//  is already on screen. The colour stays in linear light; bloom, tone mapping
//  and the space-black background are applied afterwards (scene/Effects.tsx).
// ─────────────────────────────────────────────────────────────────────────────

varying vec3 vColor;
varying float vCore;
varying float vSpike;
varying float vSpikeAngle;
varying float vKind;
varying float vPixel;

mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, s, -s, c);
}

void main() {
  vec2 p = (gl_PointCoord - 0.5) * 2.0;   // -1..1 across the point
  float r = length(p);

  // Gaussian core. Its width (sigma) is about half the core radius, so the
  // glow is mostly gone by the core's edge and reaches zero well inside the point.
  float sigma = max(vCore * 0.5, 0.02);
  float core = exp(-(r * r) / (2.0 * sigma * sigma));

  float halo = 0.0;
  float spikes = 0.0;
  if (vKind > 1.5) {
    halo = exp(-r / (sigma * 4.0)) * 0.06;
    if (vSpike > 0.0) {
      // Two thin lines through the centre, fading along their length.
      // `thin` is the line's half-width (never under ~0.7 of a pixel, or it
      // would shimmer); `reach` is the arm's length, both in -1..1 units.
      vec2 a = abs(rotate(vSpikeAngle) * p);
      float thin = max(sigma * 0.3, vPixel * 0.7);
      float reach = vSpike * 2.0;
      spikes = exp(-a.y / thin) * exp(-a.x * 2.5 / reach) + exp(-a.x / thin) * exp(-a.y * 2.5 / reach);
      spikes *= 0.75;
    }
  }

  gl_FragColor = vec4(vColor * (core + halo + spikes), 1.0);
}
