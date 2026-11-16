// ─────────────────────────────────────────────────────────────────────────────
//  SPRITE VERTEX SHADER
//  Draws each star as a square that always faces the camera (a "billboard").
//  (pointer.glsl is pasted above this file.)
//
//  Why not plain GL points, like the particles? Points have a maximum size
//  that some GPUs set as low as 64 pixels, and a star you fly up to needs to
//  be much bigger than that. A real square has no such limit.
// ─────────────────────────────────────────────────────────────────────────────

// `position` holds this corner of the square, -1..1 on x and y.
attribute vec3 aCenter;       // where the star is
attribute vec3 aColor;
attribute float aSize;        // diameter, world units
attribute vec2 aTag;          // [which star, which group]
attribute float aSeed;        // random 0..1

uniform float uPixelHeight;   // canvas height in device pixels
uniform float uPixelRatio;    // device pixels per CSS pixel
uniform float uMinPixels;     // never draw a star smaller than this many CSS pixels across
uniform float uVisible;       // 0..1 — fades everything in and out
uniform float uHighlight;     // the star being lit up (-1 = none)
uniform float uHighlightGroup;// its group: the rest of the group brightens a little too (-1 = none)
uniform float uHover;         // 0..1 — how far the light-up has animated in
uniform float uActive;        // the star being visited (-1 = none) …
uniform float uFocus;         // … and how close we are to it, 0..1

varying vec2 vCorner;
varying vec3 vColor;
varying float vLit;
varying float vGroupLit;
varying float vSeed;
varying float vAlpha;
varying float vFar;           // 0 up close … 1 when the star is far away and held at its minimum size

void main() {
  vec4 view = modelViewMatrix * vec4(aCenter, 1.0);
#ifdef POINTER_PUSH
  // Skill stars sit on top of particle clusters, so they get the same cursor push.
  view = pushFromPointer(view);
#endif

  float lit = aTag.x == uHighlight ? uHover : 0.0;
  float groupLit = aTag.y == uHighlightGroup ? uHover : 0.0;
  float visiting = aTag.x == uActive ? uFocus : 0.0;

  // Pop into place as the stars appear.
  float size = aSize * (0.6 + 0.4 * uVisible);

  // Never shrink below uMinPixels on screen, however far away. Stars held at
  // that minimum are "far": the fragment shader makes them read as markers.
  float depth = max(-view.z, 0.001);
  float pixels = size * projectionMatrix[1][1] * uPixelHeight * 0.5 / depth;
  float enlarge = max(1.0, uMinPixels * uPixelRatio / pixels);
  size *= enlarge;

  // Grow when lit, so the hover ring sits clear of the star's glow.
  size *= 1.0 + 0.9 * lit;

  // Spread the corners out in camera space, where "right" and "up" are the screen's.
  view.xy += position.xy * size * 0.5;
  gl_Position = projectionMatrix * view;

  vCorner = position.xy;
  vColor = aColor;
  vLit = lit;
  vGroupLit = groupLit;
  vSeed = aSeed;
  vAlpha = uVisible * (1.0 + 0.4 * visiting);
  vFar = smoothstep(1.0, 1.6, enlarge);
}
