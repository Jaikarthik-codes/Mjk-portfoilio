// ─────────────────────────────────────────────────────────────────────────────
//  CONSTELLATION LINE — FRAGMENT SHADER
//  A line with an anti-aliased edge, in the line colour at the line opacity.
//  Drawn after tone mapping: the colour here is the colour on screen (sRGB).
// ─────────────────────────────────────────────────────────────────────────────

uniform vec3 uColor;
uniform float uOpacity;

varying float vSide;
varying float vHalf;
varying float vAlpha;

void main() {
  // Coverage of this pixel by a line `2 * vHalf` wide (a one-pixel ramp at each edge).
  float coverage = clamp(vHalf + 0.5 - abs(vSide), 0.0, 1.0);
  gl_FragColor = vec4(uColor, coverage * uOpacity * min(vAlpha, 1.6));
}
