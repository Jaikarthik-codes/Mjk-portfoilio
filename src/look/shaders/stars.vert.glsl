// ─────────────────────────────────────────────────────────────────────────────
//  STAR PARTICLE VERTEX SHADER
//  Each particle is one GL point. This decides how big that point is on
//  screen and how bright, from its class (dust, medium, hero) and its depth.
// ─────────────────────────────────────────────────────────────────────────────

attribute vec3 aColor;      // linear colour; heroes carry extra brightness (above 1)
attribute float aSize;      // core diameter, CSS pixels
attribute float aAlpha;     // opacity
attribute float aKind;      // 0 dust, 1 medium, 2 hero
attribute float aSpike;     // diffraction spike strength, 0..1 (heroes only)
attribute float aSeed;      // random 0..1

uniform float uPixelRatio;  // device pixels per CSS pixel
uniform float uTime;
uniform float uExposure;
uniform float uTwinkle;     // 0..1 — how much stars shimmer
uniform float uRefDepth;    // the camera distance at which sizes are exactly as specified
uniform float uSpikeLength; // spike length (each arm) for the strongest hero, CSS pixels
uniform float uMaxPointSize;// the GPU's limit

varying vec3 vColor;
varying float vCore;        // core size, as a share of the point
varying float vSpike;       // spike length, as a share of the point
varying float vKind;
varying float vPixel;       // one device pixel, in the fragment shader's -1..1 units

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;

  // Nearer particles are a little bigger, but sizes stay close to their
  // design values: stars are points of light, not balls.
  float depth = max(-view.z, 0.001);
  float perspective = clamp(sqrt(uRefDepth / depth), 0.6, 2.2);

  float core = aSize * uPixelRatio * perspective;          // device pixels
  if (aKind > 1.5) core *= 0.75 + 0.9 * aSpike;            // brighter heroes are bigger
  float spike = aKind > 1.5 ? aSpike * uSpikeLength * uPixelRatio * perspective : 0.0;

  // Very small cores flicker as they move between pixels. Keep at least one
  // device pixel and dim instead, by the area that was "lost".
  float dim = 1.0;
  if (core < 1.0) {
    dim = core * core;
    core = 1.0;
  }

  // Room for the soft tail of the glow (3x the core) and for the spikes.
  float size = clamp(max(core * 3.0, spike * 2.0 + core), 2.0, uMaxPointSize);
  gl_PointSize = size;

  // Medium stars and heroes shimmer gently, each at its own pace. Dust does not.
  float shimmer = 1.0;
  if (aKind > 0.5) shimmer = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.7 + 2.0 * aSeed) + aSeed * 40.0));

  vColor = aColor * aAlpha * dim * shimmer * uExposure;
  vCore = core / size;
  vSpike = spike / size;
  vKind = aKind;
  vPixel = 2.0 / size;
}
