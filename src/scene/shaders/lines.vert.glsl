// ─────────────────────────────────────────────────────────────────────────────
//  LINE VERTEX SHADER
//  Draws each line segment as a thin rectangle with a fixed width in pixels.
//  (pointer.glsl is pasted above this file.)
//
//  The trick: find where both ends of the segment land on screen, work out
//  the direction between them, then push this corner sideways — at right
//  angles to that direction — by half the line's width. Because the push
//  happens on screen, the line is equally thick near and far.
// ─────────────────────────────────────────────────────────────────────────────

// `position` holds this corner of the rectangle: x = along the line (0 start,
// 1 end), y = which side (-1 or +1).
attribute vec3 aStart;        // where the segment starts …
attribute vec3 aEnd;          // … and ends (world units)
attribute vec4 aColor;        // colour and opacity
attribute vec2 aTag;          // [item, sub-item]: which constellation, or which system and planet

uniform float uPixelHeight;   // canvas height in device pixels
uniform float uWidth;         // line width in device pixels
uniform float uVisible;       // 0..1 — fades everything in and out
uniform float uHighlight;     // the item being lit up (-1 = none) …
uniform float uHighlightSub;  // … and its sub-item (-1 = all of them)
uniform float uHover;         // 0..1 — how far the light-up has animated in
uniform float uActive;        // the item being visited (-1 = none) …
uniform float uFocus;         // … and how close we are to it, 0..1

varying float vSide;
varying vec4 vColor;

void main() {
  vec4 viewA = modelViewMatrix * vec4(aStart, 1.0);
  vec4 viewB = modelViewMatrix * vec4(aEnd, 1.0);
#ifdef POINTER_PUSH
  // Constellation lines bend around the cursor along with their stars.
  viewA = pushFromPointer(viewA);
  viewB = pushFromPointer(viewB);
#endif
  vec4 clipA = projectionMatrix * viewA;
  vec4 clipB = projectionMatrix * viewB;

  // Direction of the line on screen (aspect-corrected so "sideways" is a true right angle).
  vec2 screenA = clipA.xy / clipA.w * vec2(uAspect, 1.0);
  vec2 screenB = clipB.xy / clipB.w * vec2(uAspect, 1.0);
  vec2 along = normalize(screenB - screenA + 0.00001);
  vec2 sideways = vec2(-along.y, along.x);

  // Lit up? Floats from attributes are exact for small whole numbers, so == is safe.
  bool tagged = aTag.x == uHighlight && (uHighlightSub < 0.0 || aTag.y == uHighlightSub);
  float lit = tagged ? uHover : 0.0;
  float visiting = aTag.x == uActive ? uFocus : 0.0;

  float width = uWidth * (1.0 + 0.5 * lit);
  vec4 clip = mix(clipA, clipB, position.x);
  // One screen pixel is 2 / uPixelHeight in clip space; half the width goes each side.
  // Multiplying by clip.w undoes the perspective divide the GPU applies next.
  clip.xy += sideways / vec2(uAspect, 1.0) * position.y * width / uPixelHeight * clip.w;
  gl_Position = clip;

  vSide = position.y;
  vColor = vec4(aColor.rgb, aColor.a * (1.0 + 1.8 * lit + 1.1 * visiting) * uVisible);
}
