// ─────────────────────────────────────────────────────────────────────────────
//  CONSTELLATION STAR — FRAGMENT SHADER
//  A crisp white disc (anti-aliased over about one pixel), a small halo, and
//  a thin ring when the star is lit. Drawn after tone mapping, so the colour
//  written here is the colour on screen (sRGB).
// ─────────────────────────────────────────────────────────────────────────────

uniform vec3 uColor;        // star white, sRGB

varying float vRadius;
varying float vPixel;
varying float vBright;
varying float vLit;
varying float vGroupLit;

void main() {
  vec2 p = (gl_PointCoord - 0.5) * 2.0;
  float d = length(p);
  float r = vRadius;

  float disc = 1.0 - smoothstep(r - vPixel * 0.7, r + vPixel * 0.7, d);
  float halo = exp(-max(d - r, 0.0) / (r * 0.7)) * 0.28 * (1.0 - disc);
  float ring = (1.0 - smoothstep(vPixel * 0.5, vPixel * 1.3, abs(d - r * 2.1))) * vLit * 0.85;

  // The disc is solid white; when its constellation is lit, the halo glows a little more.
  float alpha = clamp(disc + halo * (1.0 + 0.6 * vGroupLit) + ring, 0.0, 1.0) * vBright;
  gl_FragColor = vec4(uColor, alpha);
}
