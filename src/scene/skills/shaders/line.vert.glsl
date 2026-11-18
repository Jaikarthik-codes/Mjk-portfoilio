// ─────────────────────────────────────────────────────────────────────────────
//  CONSTELLATION LINE — VERTEX SHADER
//  Each line is a thin rectangle drawn between two stars, a fixed number of
//  pixels wide however far away it is. During the draw-in it grows from its
//  first star to its second. It stops a few pixels short of each star, as in
//  a printed star chart, so the stars stay crisp.
//  (pointer.glsl is pasted above this file, for pushFromPointer().)
// ─────────────────────────────────────────────────────────────────────────────

attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec2 aCorner;     // x: 0 = start end, 1 = far end; y: -1 / +1 = which side
attribute vec2 aTiming;     // when this line starts drawing (0..1 of the draw-in), and for how long
attribute vec2 aGap;        // how far short of each star it stops, CSS pixels
attribute float aGroup;

uniform float uPixelRatio;
uniform vec2  uViewport;    // canvas size, device pixels
uniform float uWidth;       // line width, CSS pixels
uniform float uDraw;
uniform float uVisible;
uniform float uHighlightGroup;
uniform float uHover;

varying float vSide;        // device pixels from the line's centre
varying float vHalf;        // half the line's width, device pixels
varying float vAlpha;

vec2 toScreen(vec4 clip) {
  return clip.xy / clip.w * uViewport * 0.5;
}

void main() {
  float grow = clamp((uDraw - aTiming.x) / aTiming.y, 0.0, 1.0);
  vec3 tip = mix(aStart, aEnd, grow);

  vec4 a = projectionMatrix * pushFromPointer(modelViewMatrix * vec4(aStart, 1.0));
  vec4 b = projectionMatrix * pushFromPointer(modelViewMatrix * vec4(tip, 1.0));
  vec2 sa = toScreen(a);
  vec2 sb = toScreen(b);
  vec2 along = sb - sa;
  float length = max(length(along), 0.0001);
  vec2 dir = along / length;
  vec2 normal = vec2(-dir.y, dir.x);

  // Stop short of both stars (the far end only once the line has reached it).
  float gapStart = aGap.x * uPixelRatio;
  float gapEnd = aGap.y * uPixelRatio * smoothstep(0.85, 1.0, grow);
  float room = max(length - gapStart - gapEnd, 0.0);
  sa += dir * gapStart;
  sb = sa + dir * room;

  vec4 clip = aCorner.x < 0.5 ? a : b;
  vec2 screen = aCorner.x < 0.5 ? sa : sb;
  float halfQuad = uWidth * uPixelRatio * 0.5 + 1.0;   // one extra pixel to fade the edge
  screen += normal * aCorner.y * halfQuad;
  gl_Position = vec4(screen / (uViewport * 0.5) * clip.w, clip.z, clip.w);

  vSide = aCorner.y * halfQuad;
  vHalf = uWidth * uPixelRatio * 0.5;
  float groupLit = abs(aGroup - uHighlightGroup) < 0.5 ? uHover : 0.0;
  vAlpha = uVisible * step(0.0001, room) * step(0.0001, grow) * (1.0 + 0.6 * groupLit);
}
