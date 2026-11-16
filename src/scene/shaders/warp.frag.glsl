// ─────────────────────────────────────────────────────────────────────────────
//  WARP POST EFFECT
//  Runs once per screen pixel, after the whole scene has been drawn into an
//  image (`inputBuffer`). During a warp it splits colours apart radially —
//  red pushed outward, blue inward — and smears them along the direction of
//  travel, like light through a lens at impossible speed.
//
//  Written for the postprocessing library: it calls mainImage() for every
//  pixel, with that pixel's colour and position (uv, 0..1 across the screen).
// ─────────────────────────────────────────────────────────────────────────────

uniform float strength;   // how far colours separate, as a share of the distance from `center`. 0 = off.
uniform vec2 center;      // the vanishing point (where we are flying toward), 0..1

#define SAMPLES 8

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Off most of the time: just pass the picture through untouched.
  if (strength <= 0.0001) {
    outputColor = inputColor;
    return;
  }

  // Pixels far from the vanishing point separate the most; at the centre, not at all.
  vec2 offset = (uv - center) * strength;

  // Take several samples along a line through this pixel, toward and away from
  // the centre. Each sample contributes a different colour of the rainbow, so
  // sharp points spread into little spectra.
  vec3 sum = vec3(0.0);
  vec3 weight = vec3(0.0);
  for (int i = 0; i < SAMPLES; i++) {
    float t = float(i) / float(SAMPLES - 1) * 2.0 - 1.0;   // -1 (inward) … +1 (outward)
    vec3 tint = vec3(
      smoothstep(-1.0, 1.0, -t),   // red comes from inward samples, so it appears pushed outward
      1.0 - abs(t),                // green from the middle
      smoothstep(-1.0, 1.0, t)     // blue from outward samples
    );
    sum += texture2D(inputBuffer, uv + offset * t).rgb * tint;
    weight += tint;
  }

  outputColor = vec4(sum / weight, inputColor.a);
}
