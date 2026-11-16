// ─────────────────────────────────────────────────────────────────────────────
//  PARTICLE VERTEX SHADER
//  Runs once per particle, every frame, on the GPU. Its job: decide where this
//  particle is on screen, how big it is, and what colour and brightness to
//  hand to the fragment shader.
//
//  The big idea — morphing without touching JavaScript:
//    Every particle carries its position in EVERY shape at the same time, as
//    separate attributes (position = name, aNebula, aConstellation, aGalaxy,
//    aBurst). JavaScript only sends one number per frame, uProgress, and this
//    shader blends between the stored positions. 50,000 particles move and the
//    CPU does almost nothing.
//
//  (noise.glsl is pasted above this file, which is where snoise() and flow()
//  come from. three.js also adds a few declarations for us automatically:
//  `position`, `modelViewMatrix` and `projectionMatrix`.)
// ─────────────────────────────────────────────────────────────────────────────

#define PI 3.141592653589793

// Indices into the per-shape arrays below. Must match SHAPES in scene/config.ts.
#define NAME 0
#define NEBULA 1
#define CONSTELLATION 2
#define GALAXY 3
#define BURST 4
#define SHAPE_COUNT 5

// ── Uniforms: values that are the same for every particle this frame ─────────
uniform float uTime;                          // seconds since the scene started
uniform float uProgress;                      // 0 name · 1 nebula · 2 constellations · 3 galaxy · 4 burst
                                              //   (2.5 = halfway from constellations to galaxy)
uniform float uIntro;                         // the opening Big Bang, 0 → 1. Stays at 1 afterwards.
uniform float uShapeSize[SHAPE_COUNT];        // particle diameter in world units, per shape
uniform float uShapeAlpha[SHAPE_COUNT];       // particle opacity, per shape
uniform float uShapeDrift[SHAPE_COUNT];       // how far particles wander while a shape is at rest
uniform float uShapeDriftScale[SHAPE_COUNT];  // size of that wander's swirls (small number = big swirls)
uniform float uStagger;                       // 0..1 — how spread out the particles' start times are
uniform float uTurbulence;                    // how far particles get blown off course mid-flight
uniform float uSwirl;                         // how much the whole cloud twists mid-flight (radians)
uniform float uTwinkle;                       // 0..1 — strength of the brightness flicker
uniform float uNameWidth;                     // width of the name, to normalise its dissolve sweep
uniform float uFieldWidth;                    // width of the constellation field, for the same reason
uniform float uGalaxyRadius;
uniform vec2  uGalaxyTilt;                    // x = lean toward the camera, y = roll (radians)
uniform float uPixelHeight;                   // height of the canvas in real device pixels
uniform float uMinPointSize;                  // smallest point we allow, in device pixels
uniform float uAspect;                        // canvas width / height
uniform vec2  uPointer;                       // cursor position, -1..1 on both axes (0,0 = screen centre)
uniform float uPointerStrength;               // how hard the cursor pushes; 0 turns it off
uniform float uPointerRadius;                 // reach of the cursor push (1.0 = half the screen height)

// ── Attributes: values that are different for every particle ─────────────────
// `position` (declared by three.js) holds the particle's place in the NAME shape.
attribute vec3 aNebula;             // … its place in the nebula
attribute vec3 aConstellation;      // … in the constellations
attribute vec3 aGalaxy;             // … in the galaxy (flat, before spin and tilt)
attribute vec3 aBurst;              // … in the supernova burst
attribute vec3 aColorName;          // its colour in each shape
attribute vec3 aColorNebula;
attribute vec3 aColorConstellation;
attribute vec3 aColorGalaxy;
attribute vec3 aColorBurst;
attribute vec4 aRandom;             // four random numbers 0..1, fixed for the particle's whole life:
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

// "Smootherstep" easing: start gently, speed up, land gently. x and result are 0..1.
float ease(float x) {
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// How far this particle is through one morph, 0..1 (not yet eased).
//   t       — progress of the whole morph, 0..1
//   delay   — 0..1, how late this particle sets off
//   stagger — 0..1, how much of the morph is spent on staggered take-offs
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
// Because the windows always fit inside 0..1, scrolling backwards plays the
// exact same motion in reverse.
float travel(float t, float delay, float stagger) {
  t = clamp(t, 0.0, 1.0);
  float window = 1.0 - stagger;                         // length of each particle's trip
  return clamp((t - delay * stagger) / window, 0.0, 1.0);
}

// Blend one value per shape. `w` holds the particle's progress through each of
// the four morphs, in order:
//   w.x name → nebula                 w.y nebula → constellations
//   w.z constellations → galaxy       w.w galaxy → burst
// Each mix() replaces the running result with the next shape as its weight
// goes 0 → 1, so at any moment only two neighbouring shapes are really mixed.
float blendShapes(float values[SHAPE_COUNT], vec4 w) {
  float result = mix(values[NAME], values[NEBULA], w.x);
  result = mix(result, values[CONSTELLATION], w.y);
  result = mix(result, values[GALAXY], w.z);
  return mix(result, values[BURST], w.w);
}
vec3 blendShapes(vec3 name, vec3 nebula, vec3 constellation, vec3 galaxy, vec3 burst, vec4 w) {
  vec3 result = mix(name, nebula, w.x);
  result = mix(result, constellation, w.y);
  result = mix(result, galaxy, w.z);
  return mix(result, burst, w.w);
}

// ── Resting motion ───────────────────────────────────────────────────────────
// Each shape keeps moving while it is "at rest", so nothing ever looks frozen.
// These are the big, rigid movements; the fine wandering is added in main().

// Name: this is also where the opening Big Bang happens.
//   uIntro 0.00 → 0.14   every particle sits at the centre: one glowing point
//          0.14 → 0.40   they are flung outward
//          0.34 → 1.00   they spiral back in and settle into the letters
vec3 restName(vec3 home) {
  if (uIntro >= 1.0) return home;                       // intro finished: nothing to do

  // Explosion. pow(…, 4.0) is an "ease-out": violent at first, then coasting.
  float launch = clamp((uIntro - 0.14 - 0.05 * aRandom.x) / 0.24, 0.0, 1.0);
  launch = 1.0 - pow(1.0 - launch, 4.0);

  // Where this particle gets flung to: its place in the burst shape, pushed
  // nearer or further at random, plus some depth so a few rush past the camera.
  vec3 flung = aBurst * (0.45 + 1.2 * aRandom.w);
  flung.z += (aRandom.z - 0.5) * 9.0;

  // Gathering, staggered per particle like any other morph.
  float gather = ease(travel((uIntro - 0.34) / 0.66, aRandom.z, 0.5));

  vec3 p = mix(flung * launch, home, gather);
  // Spin the cloud as it expands, and unwind the spin as it gathers:
  // particles spiral out, then spiral home.
  p.xy = rotate((1.0 - gather) * launch * 2.2) * p.xy;
  return p;
}

// Nebula: a slow turn plus a gentle twist that breathes in and out.
vec3 restNebula(vec3 p) {
  float radius = length(p.xy);
  float angle = uTime * 0.02 + 0.16 * sin(uTime * 0.07 - radius * 0.35);
  p.xy = rotate(angle) * p.xy;
  return p;
}

// Galaxy: spin around its own axis first, then tilt the whole disc.
// (Order matters: tilting first would make it wobble like a dropped coin.)
vec3 restGalaxy(vec3 p) {
  p.xz = rotate(uTime * 0.05) * p.xz;     // spin
  p.yz = rotate(uGalaxyTilt.x) * p.yz;    // lean toward the camera
  p.xy = rotate(uGalaxyTilt.y) * p.xy;    // roll
  return p;
}

// Burst: turns slowly while a ripple travels outward through it.
vec3 restBurst(vec3 p) {
  p.xy = rotate(uTime * 0.02) * p.xy;
  p *= 1.0 + 0.03 * sin(uTime * 0.7 - length(p.xy) * 0.9);
  return p;
}

void main() {
  // ── 1. When does this particle set off? ────────────────────────────────────
  // Pure randomness looks like noise; pure order looks mechanical. So each
  // delay is part random (aRandom.x) and part a pattern we choose per morph.

  // Name → nebula: sweep left to right, as if a breeze blows the letters away.
  float nameSweep = clamp(position.x / uNameWidth + 0.5, 0.0, 1.0);
  // Nebula → constellations: the figures form one after another across the sky.
  float skySweep = clamp(aConstellation.x / uFieldWidth + 0.5, 0.0, 1.0);
  // Constellations → galaxy: the core forms first and the arms grow outward.
  float fromCore = clamp(length(aGalaxy) / uGalaxyRadius, 0.0, 1.0);

  // ── 2. How far along is it? ────────────────────────────────────────────────
  // uProgress - 0.0 covers the first morph, uProgress - 1.0 the second, and so on.
  float toNebula        = ease(travel(uProgress - 0.0, mix(aRandom.x, nameSweep, 0.5), uStagger));
  float toConstellation = ease(travel(uProgress - 1.0, mix(aRandom.x, skySweep, 0.45), uStagger));
  float toGalaxy        = ease(travel(uProgress - 2.0, mix(aRandom.x, fromCore, 0.6), uStagger));

  // Galaxy → burst is a supernova, so it does not travel in a straight line:
  // first everything COLLAPSES to the centre, then it BLOOMS back out.
  // Very little stagger here, so the particles all arrive at the centre together.
  float nova = travel(uProgress - 3.0, aRandom.x, 0.22);
  float collapse = pow(min(nova / 0.46, 1.0), 2.4);                          // slow, then faster and faster
  float bloom = 1.0 - pow(1.0 - clamp((nova - 0.52) / 0.48, 0.0, 1.0), 3.0); // violent, then coasting
  float implosion = collapse * (1.0 - bloom);                                // rises as matter falls in, gone once it bursts
  float flash = smoothstep(0.65, 1.0, collapse) * (1.0 - bloom);             // only in the last moments at the centre

  // One weight per morph, used to blend sizes, colours and so on.
  vec4 w = vec4(toNebula, toConstellation, toGalaxy, bloom);

  // ── 3. Blend the shapes ────────────────────────────────────────────────────
  vec3 pos = mix(restName(position), restNebula(aNebula), toNebula);
  pos = mix(pos, aConstellation, toConstellation);
  pos = mix(pos, restGalaxy(aGalaxy), toGalaxy);
  pos = mix(pos, vec3(0.0), collapse);                 // implode to a single point …
  pos = mix(pos, restBurst(aBurst), bloom);            // … then burst out of it

  // ── 4. Make the journey organic ────────────────────────────────────────────
  // `flight` is 0 while the particle sits in a shape and rises to 1 at the
  // midpoint of its trip (half a sine wave). Multiplying an effect by it means
  // "only while travelling", and guarantees every shape is exact on arrival.
  float flight = sin(toNebula * PI) + sin(toConstellation * PI) + sin(toGalaxy * PI);

  // Twist around the centre of the screen, so particles spiral rather than
  // slide in straight lines. aRandom.w varies the amount per particle.
  // The supernova gets its own, stronger twist: matter spirals in as it
  // collapses and unwinds as it blooms.
  float twist = flight * uSwirl * (0.6 + 0.8 * aRandom.w) + implosion * 2.6;
  pos.xy = rotate(twist) * pos.xy;

  // Wander along the noise "wind". At rest this is each shape's own gentle
  // drift (a shimmer for the name, billowing for the nebula). In flight it
  // grows into real turbulence. One flow() lookup serves both.
  float drift = blendShapes(uShapeDrift, w) + uTurbulence * flight;
  float driftScale = mix(blendShapes(uShapeDriftScale, w), 0.2, min(flight, 1.0));
  pos += flow(pos * driftScale + uTime * 0.05) * drift;

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
  float size = blendShapes(uShapeSize, w);
  size *= mix(0.55, 2.0, aRandom.y);                   // aRandom.y is biased small: many specks, few big stars
  size *= 1.0 - 0.5 * flash;                           // packed tight at the heart of the supernova

  // About 1 in 28 particles is a "puff": six times larger but very faint.
  // A few thousand of these overlap into the soft haze around the sharp points,
  // which is much cheaper than making every particle big.
  float puff = step(0.965, aRandom.w);
  size *= mix(1.0, 6.0, puff);

  // Perspective: convert world-space size to pixels. Things twice as far away
  // are drawn half as big. projectionMatrix[1][1] encodes the camera's zoom.
  float pixels = size * projectionMatrix[1][1] * uPixelHeight * 0.5 / max(depth, 0.001);

  // ── 8. Brightness ──────────────────────────────────────────────────────────
  float alpha = blendShapes(uShapeAlpha, w);
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

  // The very start of the intro fades up from a black screen.
  alpha *= smoothstep(0.0, 0.07, uIntro);

  gl_PointSize = clamp(pixels, uMinPointSize, uPixelHeight * 0.12);

  // ── 9. Colour ──────────────────────────────────────────────────────────────
  vColor = blendShapes(aColorName, aColorNebula, aColorConstellation, aColorGalaxy, aColorBurst, w);
  vColor *= 1.0 + 0.35 * flight;                       // glow a little hotter while in flight
  // At the centre of the supernova everything turns white-hot. Thousands of
  // particles stacked on one spot add up (additive blending) into one blazing point.
  vColor = mix(vColor, vec3(1.0, 0.95, 0.85), flash * 0.85) * (1.0 + 0.6 * flash);
  vAlpha = alpha;
}
