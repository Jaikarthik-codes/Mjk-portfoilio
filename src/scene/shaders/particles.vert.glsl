// ─────────────────────────────────────────────────────────────────────────────
//  PARTICLE VERTEX SHADER
//  Runs once per particle, every frame, on the GPU. Its job: decide where this
//  particle is on screen, how big it is, and what colour and brightness to
//  hand to the fragment shader.
//
//  The big idea — morphing without touching JavaScript:
//    Every particle carries its position AND its colour in EVERY shape at the
//    same time, as separate attributes. JavaScript only sends one number per
//    frame, uProgress, and this shader blends between the stored values.
//    50,000 particles move and the CPU does almost nothing.
//
//  The shapes (see SHAPES in scene/config.ts), all sampled from the reference
//  images except the name and the star field:
//    0 the name (in the stardust)   1 nebula A   2 nebula B
//    3 the Skills star field        4 the galaxy  5 the supernova
//
//  Each particle also has a fixed class — 2% heroes (the brightest stars, some
//  with diffraction spikes), 13% medium stars, 85% faint dust — and keeps its
//  size and opacity whatever shape it is in.
//
//  (noise.glsl and pointer.glsl are pasted above this file, which is where
//  snoise(), flow() and pushFromPointer() come from. three.js also adds a few
//  declarations for us automatically: `position`, `modelViewMatrix` and
//  `projectionMatrix`.)
// ─────────────────────────────────────────────────────────────────────────────

#define PI 3.141592653589793

// Indices into the per-shape arrays below. Must match SHAPES in scene/config.ts.
#define NAME 0
#define NEBULA_A 1
#define NEBULA_B 2
#define FIELD 3
#define GALAXY 4
#define NOVA 5
#define SHAPE_COUNT 6

// ── Uniforms: values that are the same for every particle this frame ─────────
uniform float uTime;                          // seconds since the scene started (frozen for reduced motion)
uniform float uProgress;                      // which shape: 0 … 5 (2.5 = halfway from nebula B to the star field)
uniform float uIntro;                         // the opening Big Bang, 0 → 1. Stays at 1 afterwards.
uniform float uCalm;                          // 1 = reduced motion: shapes dissolve into each other instead of flying
uniform float uShapeDrift[SHAPE_COUNT];       // how far particles wander while a shape is at rest
uniform float uShapeDriftScale[SHAPE_COUNT];  // size of that wander's swirls (small number = big swirls)
uniform float uStagger;                       // 0..1 — how spread out the particles' start times are
uniform float uTurbulence;                    // how far particles get blown off course mid-flight
uniform float uSwirl;                         // how much the whole cloud twists mid-flight (radians)
uniform float uTwinkle;                       // 0..1 — how much medium and hero stars shimmer
uniform float uNameWidth;                     // width of the name, to normalise its dissolve sweep
uniform float uFieldWidth;                    // width of the star field, for the same reason
uniform float uGalaxyRadius;
uniform float uGalaxySpin;                    // how fast the galaxy turns (radians per second)
uniform vec2  uGalaxyTilt;                    // x = stand the flat disc up, y = roll (radians)
uniform float uPixelRatio;                    // device pixels per CSS pixel
uniform float uExposure;                      // overall particle brightness (fewer particles → each a little brighter)
uniform float uRefDepth;                      // camera distance at which stars are exactly their design size
uniform float uSpikeLength;                   // longest diffraction spike arm, CSS pixels
uniform float uMaxPointSize;                  // the GPU's largest point
// Visiting a star system (click one in the galaxy): the dust around it clears
// so the system stands out, and the rest of the galaxy dims a little.
uniform vec3  uFocusCenter;                   // where the system is
uniform float uFocusRadius;                   // how big a space to clear around it
uniform float uFocus;                         // 0 = not visiting, 1 = arrived
// The star systems (one per project) clear a small pocket in the galaxy's dust,
// so they stand out from across it. xyz = centre in the flat galaxy, w = radius.
#define MAX_SYSTEMS 12
uniform vec4  uSystems[MAX_SYSTEMS];
uniform int   uSystemCount;

// ── Attributes: values that are different for every particle ─────────────────
// `position` (declared by three.js) holds the particle's place in the NAME shape.
attribute vec3 aNebulaA;            // … its place in nebula A
attribute vec3 aNebulaB;            // … in nebula B
attribute vec3 aField;              // … in the Skills star field
attribute vec3 aGalaxy;             // … in the galaxy (flat, before spin and tilt)
attribute vec3 aNova;               // … in the supernova
// Its colour in each shape (linear light; heroes can go above 1, which is
// what makes them bloom). w = diffraction spike strength, 0..1.
attribute vec4 aColorName;
attribute vec4 aColorNebulaA;
attribute vec4 aColorNebulaB;
attribute vec4 aColorField;
attribute vec4 aColorGalaxy;
attribute vec4 aColorNova;
attribute vec4 aTraits;             // fixed look: x = core size (CSS px), y = opacity, z = class (0 dust, 1 medium, 2 hero), w = random 0..1
attribute vec4 aRandom;             // four random numbers 0..1, fixed for the particle's whole life:
                                    //   x = delay   y = how far the Big Bang flings it   z = gathering delay   w = twist

// ── Varyings: values passed on to the fragment shader ────────────────────────
varying vec3 vColor;
varying float vCore;        // core size, as a share of the point
varying float vSpike;       // spike length, as a share of the point
varying float vSpikeAngle;  // the spikes turn with the galaxy
varying float vKind;
varying float vPixel;       // one device pixel, in the fragment shader's -1..1 units

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
vec4 ease(vec4 x) {
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

// Blend one value per shape. `w` holds the particle's progress through the
// first four morphs (name → A, A → B, B → field, field → galaxy) and `nova`
// through the last (galaxy → supernova). Each mix() replaces the running
// result with the next shape as its weight goes 0 → 1, so at any moment only
// two neighbouring shapes are really mixed.
float blendShapes(float values[SHAPE_COUNT], vec4 w, float nova) {
  float result = mix(values[NAME], values[NEBULA_A], w.x);
  result = mix(result, values[NEBULA_B], w.y);
  result = mix(result, values[FIELD], w.z);
  result = mix(result, values[GALAXY], w.w);
  return mix(result, values[NOVA], nova);
}

// ── Resting motion ───────────────────────────────────────────────────────────
// The particles sit on top of their gas picture, so at rest they barely move
// (a little drift is added in main()). Two shapes have a bigger movement:

// Name: this is also where the opening Big Bang happens.
//   uIntro 0.00 → 0.14   every particle sits at the centre: one glowing point
//          0.14 → 0.40   they are flung outward
//          0.34 → 1.00   they spiral back in and settle into the letters
vec3 restName(vec3 home) {
  if (uIntro >= 1.0) return home;                       // intro finished: nothing to do

  // Explosion. pow(…, 4.0) is an "ease-out": violent at first, then coasting.
  float launch = clamp((uIntro - 0.14 - 0.05 * aRandom.x) / 0.24, 0.0, 1.0);
  launch = 1.0 - pow(1.0 - launch, 4.0);

  // Where this particle gets flung to: its place in the supernova, pushed
  // nearer or further at random, plus some depth so a few rush past the camera.
  vec3 flung = aNova * (0.45 + 1.2 * aRandom.y);
  flung.z += (aRandom.z - 0.5) * 9.0;

  // Gathering, staggered per particle like any other morph.
  float gather = ease(travel((uIntro - 0.34) / 0.66, aRandom.z, 0.5));

  vec3 p = mix(flung * launch, home, gather);
  // Spin the cloud as it expands, and unwind the spin as it gathers:
  // particles spiral out, then spiral home.
  p.xy = rotate((1.0 - gather) * launch * 2.2) * p.xy;
  return p;
}

// Galaxy: spin around its own axis first, then stand the disc up.
// (Order matters: tilting first would make it wobble like a dropped coin.)
// scene/galaxyFrame.ts repeats this exact sequence in JavaScript, so the
// clickable star systems and the gas picture ride along with the particles.
vec3 restGalaxy(vec3 p) {
  p.xz = rotate(uTime * uGalaxySpin) * p.xz;     // spin
  p.yz = rotate(uGalaxyTilt.x) * p.yz;           // stand up to face the camera
  p.xy = rotate(uGalaxyTilt.y) * p.xy;           // roll
  return p;
}

void main() {
  float size = aTraits.x;
  float opacity = aTraits.y;
  float kind = aTraits.z;
  float seed = aTraits.w;

  // ── 1. When does this particle set off? ────────────────────────────────────
  // Pure randomness looks like noise; pure order looks mechanical. So each
  // delay is part random (aRandom.x) and part a pattern we choose per morph.

  // Name → nebula A: sweep left to right, as if a breeze blows the letters away.
  float nameSweep = clamp(position.x / uNameWidth + 0.5, 0.0, 1.0);
  // Nebula A → B: from the centre outward, like a ring opening up.
  float ringOut = clamp(length(aNebulaB.xy) / 6.0, 0.0, 1.0);
  // Nebula B → star field: the field fills in across the sky.
  float skySweep = clamp(aField.x / uFieldWidth + 0.5, 0.0, 1.0);
  // Star field → galaxy: the core forms first and the arms grow outward.
  float fromCore = clamp(length(aGalaxy) / uGalaxyRadius, 0.0, 1.0);

  // ── 2. How far along is it? ────────────────────────────────────────────────
  // uProgress - 0.0 covers the first morph, uProgress - 1.0 the second, and so on.
  vec4 trip = vec4(
    travel(uProgress - 0.0, mix(aRandom.x, nameSweep, 0.5), uStagger),
    travel(uProgress - 1.0, mix(aRandom.x, ringOut, 0.5), uStagger),
    travel(uProgress - 2.0, mix(aRandom.x, skySweep, 0.45), uStagger),
    travel(uProgress - 3.0, mix(aRandom.x, fromCore, 0.6), uStagger)
  );

  // Galaxy → supernova does not travel in a straight line: first everything
  // COLLAPSES to the centre, then it BLOOMS back out into the shell.
  // Very little stagger here, so the particles all arrive at the centre together.
  float nova = travel(uProgress - 4.0, aRandom.x, 0.22);
  float collapse = pow(min(nova / 0.46, 1.0), 2.4);                          // slow, then faster and faster
  float bloom = 1.0 - pow(1.0 - clamp((nova - 0.52) / 0.48, 0.0, 1.0), 3.0); // violent, then coasting

  // Reduced motion: nothing flies. Each particle fades out where it is and
  // fades back in at its new place, so one picture dissolves into the next.
  vec4 w = ease(trip);
  float dissolve = 1.0;
  if (uCalm > 0.5) {
    w = step(0.5, trip);
    collapse = 0.0;
    bloom = step(0.5, nova);
    vec4 dip = sin(trip * PI);
    dissolve = (1.0 - max(max(dip.x, dip.y), max(dip.z, dip.w))) * (1.0 - sin(nova * PI));
  }
  float implosion = collapse * (1.0 - bloom);                                // rises as matter falls in, gone once it bursts
  float flash = smoothstep(0.65, 1.0, collapse) * (1.0 - bloom);             // only in the last moments at the centre

  // ── 3. Blend the shapes ────────────────────────────────────────────────────
  vec3 pos = mix(restName(position), aNebulaA, w.x);
  pos = mix(pos, aNebulaB, w.y);
  pos = mix(pos, aField, w.z);
  pos = mix(pos, restGalaxy(aGalaxy), w.w);
  pos = mix(pos, vec3(0.0), collapse);                 // implode to a single point …
  pos = mix(pos, aNova, bloom);                        // … then burst out of it

  vec4 color = mix(aColorName, aColorNebulaA, w.x);
  color = mix(color, aColorNebulaB, w.y);
  color = mix(color, aColorField, w.z);
  color = mix(color, aColorGalaxy, w.w);
  color = mix(color, aColorNova, bloom);

  // ── 4. Make the journey organic ────────────────────────────────────────────
  // `flight` is 0 while the particle sits in a shape and rises to 1 at the
  // midpoint of its trip (half a sine wave). Multiplying an effect by it means
  // "only while travelling", and guarantees every shape is exact on arrival.
  vec4 inFlight = sin(w * PI);
  float flight = inFlight.x + inFlight.y + inFlight.z + inFlight.w;

  // Twist around the centre of the screen, so particles spiral rather than
  // slide in straight lines. aRandom.w varies the amount per particle.
  // The supernova gets its own, stronger twist: matter spirals in as it
  // collapses and unwinds as it blooms.
  float twist = flight * uSwirl * (0.6 + 0.8 * aRandom.w) + implosion * 2.6;
  pos.xy = rotate(twist) * pos.xy;

  // Wander along the noise "wind". At rest this is each shape's own gentle
  // drift. In flight it grows into real turbulence. One flow() lookup serves both.
  float drift = blendShapes(uShapeDrift, w, bloom) + uTurbulence * flight;
  float driftScale = mix(blendShapes(uShapeDriftScale, w, bloom), 0.2, min(flight, 1.0));
  pos += flow(pos * driftScale + uTime * 0.05) * drift;

  // ── 5. World space → camera space ──────────────────────────────────────────
  // After this, the camera sits at the origin looking down the -z axis.
  vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-viewPosition.z, 0.001);           // distance in front of the camera

  // Cursor gravity: particles near the cursor are nudged aside, like a lens (see pointer.glsl).
  viewPosition = pushFromPointer(viewPosition);
  gl_Position = projectionMatrix * viewPosition;

  // ── 6. Size ────────────────────────────────────────────────────────────────
  // Sizes are in screen pixels: stars are points of light, not balls. Nearer
  // particles are a little bigger, but only a little (square root).
  float perspective = clamp(sqrt(uRefDepth / depth), 0.6, 2.2);
  float spike = kind > 1.5 ? color.w : 0.0;
  float core = size * uPixelRatio * perspective;       // device pixels
  if (kind > 1.5) core *= 0.75 + 0.9 * spike;          // brighter heroes are bigger
  core *= 1.0 - 0.5 * flash;                           // packed tight at the heart of the supernova
  float spikeLength = spike * uSpikeLength * uPixelRatio * perspective;

  // Very small cores flicker as they move between pixels. Keep at least one
  // device pixel and dim instead, by the area that was "lost".
  float dim = 1.0;
  if (core < 1.0) {
    dim = core * core;
    core = 1.0;
  }

  // Room for the soft tail of the glow (3x the core) and for the spikes.
  float pointSize = clamp(max(core * 3.0, spikeLength * 2.0 + core), 2.0, uMaxPointSize);
  gl_PointSize = pointSize;

  // ── 7. Brightness ──────────────────────────────────────────────────────────
  float alpha = opacity * dim * uExposure * dissolve;

  // Medium stars and heroes shimmer gently, each at its own pace. Dust does not.
  if (kind > 0.5) alpha *= 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.7 + 2.0 * seed) + seed * 40.0));

  // Fade out particles that are about to hit the camera, so they do not pop.
  // While visiting a star system the camera sits close to the galaxy, so the
  // fade reaches further out: close particles would be big, blurry blobs.
  alpha *= smoothstep(mix(0.15, 0.6, uFocus), mix(1.5, 3.2, uFocus), depth);

  // Star-system pockets, while the galaxy is formed. Both are in the flat
  // galaxy's coordinates (before spin and tilt), so they always line up.
  float galaxy = w.w * (1.0 - collapse) * (1.0 - bloom);
  float pocket = 1.0;
  for (int i = 0; i < MAX_SYSTEMS; i++) {
    if (i >= uSystemCount) break;
    float d = distance(aGalaxy, uSystems[i].xyz) / uSystems[i].w;
    pocket = min(pocket, smoothstep(0.3, 1.2, d));
  }
  alpha *= mix(1.0, 0.2 + 0.8 * pocket, galaxy);

  // Visiting a star system: clear the dust around it and dim the rest.
  float clearing = smoothstep(uFocusRadius * 0.55, uFocusRadius * 1.5, distance(pos, uFocusCenter));
  alpha *= mix(1.0, 0.65 * clearing, uFocus);

  // The supernova: as matter falls in it piles up on one spot, and thousands
  // of faint particles add up (additive blending) into one blazing point —
  // dimmed here so the pile-up is a short flash, not a white screen.
  alpha *= mix(1.0, 0.18, collapse * (1.0 - bloom));

  // The very start of the intro fades up from a black screen.
  alpha *= smoothstep(0.0, 0.07, uIntro);

  // ── 8. Colour ──────────────────────────────────────────────────────────────
  vec3 rgb = color.rgb * (1.0 + 0.25 * flight);        // glow a little hotter while in flight
  // At the centre of the supernova everything turns white-hot.
  rgb = mix(rgb, vec3(1.0, 0.95, 0.85) * max(max(rgb.r, rgb.g), rgb.b), flash * 0.85) * (1.0 + 1.5 * flash);

  vColor = rgb * alpha;
  vCore = core / pointSize;
  vSpike = spikeLength / pointSize;
  vKind = kind;
  vPixel = 2.0 / pointSize;
  // A face-on galaxy's spin turns it on screen, and its stars' spikes with it.
  vSpikeAngle = -uTime * uGalaxySpin * galaxy;
}
