// ─────────────────────────────────────────────────────────────────────────────
//  CONSTELLATION STAR — VERTEX SHADER
//  One point per star. Skill stars are crisp discs 6–10 px across (bigger =
//  brighter star); the figure's other stars are smaller and dimmer.
//  (pointer.glsl is pasted above this file, for pushFromPointer().)
// ─────────────────────────────────────────────────────────────────────────────

attribute float aSize;      // disc diameter, CSS pixels
attribute float aBright;    // 1 for skill stars, less for the others
attribute float aIndex;     // which star (for lighting one up)
attribute float aGroup;     // which constellation
attribute float aAppear;    // when the star appears during the draw-in, 0..1

uniform float uPixelRatio;
uniform float uVisible;     // the Skills section is on screen, 0..1
uniform float uDraw;        // the draw-in, 0 → 1
uniform float uHighlight;   // the lit star (-1 = none)
uniform float uHighlightGroup;
uniform float uHover;       // how far the light-up has animated in, 0..1

varying float vRadius;      // disc radius, in the fragment shader's -1..1 units
varying float vPixel;       // one device pixel, in the same units
varying float vBright;
varying float vLit;
varying float vGroupLit;

void main() {
  vec4 view = pushFromPointer(modelViewMatrix * vec4(position, 1.0));
  gl_Position = projectionMatrix * view;

  vLit = abs(aIndex - uHighlight) < 0.5 ? uHover : 0.0;
  vGroupLit = abs(aGroup - uHighlightGroup) < 0.5 ? uHover : 0.0;

  float diameter = aSize * uPixelRatio * (1.0 + 0.25 * vLit);
  // Room around the disc for its halo and the light-up ring.
  float size = diameter * 3.2 + 6.0 * uPixelRatio;
  gl_PointSize = size;
  vRadius = diameter / size;
  vPixel = 2.0 / size;
  vBright = aBright * uVisible * smoothstep(aAppear, aAppear + 0.08, uDraw);
}
