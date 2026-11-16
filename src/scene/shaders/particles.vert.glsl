// ─────────────────────────────────────────────────────────────────────────────
//  PARTICLE VERTEX SHADER
//  Runs once per particle, every frame, on the GPU. Its job: decide where this
//  particle is on screen, how big it is, and what colour and brightness to
//  hand to the fragment shader.
//
//  The big idea — morphing without touching JavaScript:
//    Every particle carries its position in EVERY shape at the same time, as
//    separate attributes (position = name, aNebula, aGalaxy). JavaScript only
//    sends one number per frame, uProgress, and this shader blends between the
//    stored positions. 50,000 particles move and the CPU does almost nothing.
//
//  (noise.glsl is pasted above this file, which is where snoise() and flow()
//  come from. three.js also adds a few declarations for us automatically:
//  `position`, `modelViewMatrix` and `projectionMatrix`.)
// ─────────────────────────────────────────────────────────────────────────────

#define PI 3.141592653589793

// Indices into the per-shape arrays below. Must match SHAPES in scene/config.ts.
#define NAME 0
#define NEBULA 1
#define GALAXY 2
#define SHAPE_COUNT 3

// ── Uniforms: values that are the same for every particle this frame ─────────
uniform float uTime;                      // seconds since the scene started
uniform float uProgress;                  // 0 = name, 1 = nebula, 2 = galaxy; 0.5 = halfway to nebula
uniform float uShapeSize[SHAPE_COUNT];    // particle diameter in world units, per shape
uniform float uShapeAlpha[SHAPE_COUNT];   // particle opacity, per shape
uniform float uStagger;                   // 0..1 — how spread out the particles' start times are
uniform float uTurbulence;                // how far particles get blown off course mid-flight
uniform float uSwirl;                     // how much the whole cloud twists mid-flight (radians)
uniform float uTwinkle;                   // 0..1 — strength of the brightness flicker
uniform float uNameWidth;                 // width of the name, to normalise the dissolve sweep
uniform float uGalaxyRadius;
uniform vec2  uGalaxyTilt;                // x = lean toward the camera, y = roll (radians)
uniform float uPixelHeight;               // height of the canvas in real device pixels
uniform float uMinPointSize;              // smallest point we allow, in device pixels
uniform float uAspect;                    // canvas width / height
uniform vec2  uPointer;                   // cursor position, -1..1 on both axes (0,0 = screen centre)
uniform float uPointerStrength;           // how hard the cursor pushes; 0 turns it off
uniform float uPointerRadius;             // reach of the cursor push (1.0 = half the screen height)

// ── Attributes: values that are different for every particle ─────────────────
// `position` (declared by three.js) holds the particle's place in the NAME shape.
attribute vec3 aNebula;        // … its place in the nebula
attribute vec3 aGalaxy;        // … its place in the galaxy (flat, before spin and tilt)
attribute vec3 aColorName;     // its colour in each shape
attribute vec3 aColorNebula;
attribute vec3 aColorGalaxy;
attribute vec4 aRandom;        // four random numbers 0..1, fixed for the particle's whole life:
                               //   x = delay   y = size   z = twinkle rhythm   w = spare dice roll

// ── Varyings: values passed on to the fragment shader ────────────────────────
varying vec3 vColor;
varying float vAlpha;

// 2D rotation matrix. `p.xy = rotate(a) * p.xy` spins p around the z axis.
mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, s, -s, c);
}

// How far this particle is through one morph, 0..1.
//   t     — progress of the whole morph, 0..1
//   delay — 0..1, how late this particle sets off
//
// If every particle used `t` directly they would all leave and arrive in
// lockstep — a stiff, linear slide. Instead each particle travels during its
// own shorter time window, placed earlier or later by `delay`:
//
//   whole morph   0 ───────────────────────── 1
//   delay = 0     [ travels ]
//   delay = 0.5           [ travels ]
//   delay = 1                      [ travels ]
//
// Because the windows always fit inside 0..1, dragging uProgress backwards
// plays the exact same motion in reverse.
float morphProgress(float t, float delay) {
  t = clamp(t, 0.0, 1.0);
  float window = 1.0 - uStagger;                               // length of each particle's trip
  float local = clamp((t - delay * uStagger) / window, 0.0, 1.0);
  // "Smootherstep" easing: start gently, speed up, land gently.
  return local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
}

// Blend one value per shape using the particle's morph progress.
// `t.x` is the name→nebula progress, `t.y` is nebula→galaxy.
float blendShapes(float name, float nebula, float galaxy, vec2 t) {
  return mix(mix(name, nebula, t.x), galaxy, t.y);
}
vec3 blendShapes(vec3 name, vec3 nebula, vec3 galaxy, vec2 t) {
  return mix(mix(name, nebula, t.x), galaxy, t.y);
}

// ── Idle motion ──────────────────────────────────────────────────────────────
// Each shape keeps moving while it is "at rest", so nothing ever looks frozen.

// Name: a barely-there shimmer. Any more and the letters stop being readable.
vec3 idleName(vec3 p) {
  return p + flow(p * 0.9 + uTime * 0.12) * 0.028;
}

// Nebula: a slow turn, a gentle twist that breathes in and out, and drifting gas.
vec3 idleNebula(vec3 p) {
  float radius = length(p.xy);
  float angle = uTime * 0.02 + 0.16 * sin(uTime * 0.07 - radius * 0.35);
  p.xy = rotate(angle) * p.xy;
  p += flow(p * 0.16 + vec3(0.0, 0.0, uTime * 0.035)) * 0.42;
  return p;
}

// Galaxy: spin around its own axis first, then tilt the whole disc.
// (Order matters: tilting first would make it wobble like a dropped coin.)
vec3 idleGalaxy(vec3 p) {
  p.xz = rotate(uTime * 0.05) * p.xz;     // spin
  p.yz = rotate(uGalaxyTilt.x) * p.yz;    // lean toward the camera
  p.xy = rotate(uGalaxyTilt.y) * p.xy;    // roll
  return p;
}

void main() {
  // ── 1. When does this particle set off? ────────────────────────────────────
  // Pure randomness looks like noise; pure order looks mechanical. So each
  // delay is part random (aRandom.x) and part a pattern we choose per morph.

  // Name → nebula: sweep left to right, as if a breeze blows the letters away.
  float sweep = clamp(position.x / uNameWidth + 0.5, 0.0, 1.0);
  float delayToNebula = mix(aRandom.x, sweep, 0.5);

  // Nebula → galaxy: the core forms first and the arms grow outward from it.
  float fromCore = clamp(length(aGalaxy) / uGalaxyRadius, 0.0, 1.0);
  float delayToGalaxy = mix(aRandom.x, fromCore, 0.6);

  // ── 2. How far along is it? ────────────────────────────────────────────────
  // uProgress - 0.0 covers the first morph, uProgress - 1.0 the second.
  vec2 t = vec2(
    morphProgress(uProgress - 0.0, delayToNebula),
    morphProgress(uProgress - 1.0, delayToGalaxy)
  );

  // ── 3. Blend the shapes ────────────────────────────────────────────────────
  vec3 pos = blendShapes(idleName(position), idleNebula(aNebula), idleGalaxy(aGalaxy), t);

  // ── 4. Make the journey organic ────────────────────────────────────────────
  // `flight` is 0 while the particle sits in a shape and rises to 1 at the
  // midpoint of its trip (half a sine wave). Multiplying an effect by it means
  // "only while travelling", and guarantees every shape is exact on arrival.
  float flight = sin(t.x * PI) + sin(t.y * PI);

  // Twist around the centre of the screen, so particles spiral rather than
  // slide in straight lines. aRandom.w varies the amount per particle.
  pos.xy = rotate(flight * uSwirl * (0.6 + 0.8 * aRandom.w)) * pos.xy;

  // Blow the particle off course along the noise "wind".
  pos += flow(pos * 0.2 + uTime * 0.05) * uTurbulence * flight;

  // ── 5. World space → camera space ──────────────────────────────────────────
  // After this, the camera sits at the origin looking down the -z axis.
  vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
  float depth = -viewPosition.z;                       // distance in front of the camera

  // ── 6. Cursor gravity ──────────────────────────────────────────────────────
  // Work out where the particle lands on screen, measure how far that is from
  // the cursor, and push it directly away.
  vec4 clip = projectionMatrix * viewPosition;
  vec2 fromPointer = clip.xy / clip.w - uPointer;      // both in -1..1 screen space
  fromPointer.x *= uAspect;                            // undo the stretch of wide screens
  float reach = length(fromPointer) / uPointerRadius;  // 0 at the cursor, 1 at the edge of its reach

  // The push follows the curve  reach * exp(-reach²):  zero right at the cursor,
  // strongest a little way out, fading to nothing beyond. Starting from zero is
  // what keeps it gentle: a push that is strongest at the cursor would fling
  // every nearby particle outward and punch a hard-edged hole. This one spreads
  // particles apart like a lens instead. (2.33 scales the curve's peak to 1.)
  float push = uPointerStrength * 2.33 * reach * exp(-reach * reach);

  // "* depth / projectionMatrix[1][1]" converts a screen-space distance into
  // camera-space units, so far particles move as far on screen as near ones.
  viewPosition.xy += normalize(fromPointer + 0.00001) * push * depth / projectionMatrix[1][1];

  gl_Position = projectionMatrix * viewPosition;

  // ── 7. Size ────────────────────────────────────────────────────────────────
  float size = blendShapes(uShapeSize[NAME], uShapeSize[NEBULA], uShapeSize[GALAXY], t);
  size *= mix(0.55, 2.0, aRandom.y);                   // aRandom.y is biased small: many specks, few big stars

  // About 1 in 28 particles is a "puff": six times larger but very faint.
  // A few thousand of these overlap into the soft haze around the sharp points,
  // which is much cheaper than making every particle big.
  float puff = step(0.965, aRandom.w);
  size *= mix(1.0, 6.0, puff);

  // Perspective: convert world-space size to pixels. Things twice as far away
  // are drawn half as big. projectionMatrix[1][1] encodes the camera's zoom.
  float pixels = size * projectionMatrix[1][1] * uPixelHeight * 0.5 / max(depth, 0.001);

  // ── 8. Brightness ──────────────────────────────────────────────────────────
  float alpha = blendShapes(uShapeAlpha[NAME], uShapeAlpha[NEBULA], uShapeAlpha[GALAXY], t);
  alpha *= mix(1.0, 0.09, puff);

  // Twinkle: each particle pulses at its own speed and phase.
  float pulse = 0.5 + 0.5 * sin(uTime * (0.6 + 2.4 * aRandom.z) + aRandom.z * 50.0);
  alpha *= 1.0 - uTwinkle * pulse;

  // Points smaller than about a pixel flicker as they move. Instead of letting
  // them shrink further, hold the size and dim them by the area they lost.
  float shrink = min(1.0, pixels / uMinPointSize);
  alpha *= shrink * shrink;

  // Fade out particles that are about to hit the camera, so they do not pop.
  alpha *= smoothstep(0.15, 1.5, depth);

  gl_PointSize = clamp(pixels, uMinPointSize, uPixelHeight * 0.12);

  // ── 9. Colour ──────────────────────────────────────────────────────────────
  vColor = blendShapes(aColorName, aColorNebula, aColorGalaxy, t);
  vColor *= 1.0 + 0.35 * flight;                       // glow a little hotter while in flight
  vAlpha = alpha;
}
