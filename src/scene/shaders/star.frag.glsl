// ─────────────────────────────────────────────────────────────────────────────
//  STAR FRAGMENT SHADER
//  Paints one star inside its square, entirely from maths (no image files):
//    core   — a tiny white-hot centre
//    glow   — a wide soft halo in the star's colour
//    spikes — the four-pointed cross that bright stars show in telescope photos
//    ring   — a thin circle that closes in when you hover the star
//    beacon — (star systems only) a ripple that pulses outward now and then,
//             hinting "you can click this"
// ─────────────────────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uBeacon;   // 1 for star systems, 0 for skill stars
uniform float uSpikes;   // how strong the four-pointed cross is

varying vec2 vCorner;    // -1..1 across the square
varying vec3 vColor;
varying float vLit;      // 0..1 — this star is lit up
varying float vGroupLit; // 0..1 — its group is lit up
varying float vSeed;
varying float vAlpha;
varying float vFar;      // 1 when the star is far away and small on screen

mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, s, -s, c);
}

void main() {
  float d = length(vCorner);              // 0 at the centre, 1 at the edge of the circle
  if (d > 1.0) discard;                   // the square's corners stay empty

  // Gentle twinkle, each star at its own rhythm.
  float twinkle = 0.85 + 0.15 * sin(uTime * (1.3 + vSeed * 1.7) + vSeed * 40.0);

  // Tight white centre. Far away the whole star is only a few dozen pixels
  // across, so the core takes up more of it, or it would vanish.
  float core = exp(-d * d * mix(260.0, 45.0, vFar));
  // Soft halo, plus a faint wide skirt that reaches exactly zero at the edge.
  float glow = exp(-d * 6.0) * 0.55 + pow(1.0 - d, 4.0) * 0.12;

  // The cross: two very thin bright bands, fading toward the tips, slowly turning.
  vec2 p = rotate(0.35 + uTime * 0.03 + vSeed * 3.0) * vCorner;
  float spikes = (exp(-abs(p.x) * 70.0) + exp(-abs(p.y) * 70.0)) * pow(1.0 - d, 3.0);
  spikes *= uSpikes * (0.7 + 0.6 * vLit);

  // Hover ring: starts wide and faint, closes in to hug the star.
  float ringRadius = mix(0.98, 0.74, vLit);
  float ring = smoothstep(0.035, 0.0, abs(d - ringRadius)) * vLit * 0.8;

  // Beacon: a ripple every ~3 seconds, starting at the star and fading as it
  // spreads. Only from afar — once you have arrived there is nothing to invite.
  float wave = fract(uTime * 0.32 + vSeed);
  float beacon = smoothstep(0.04, 0.0, abs(d - wave)) * pow(1.0 - wave, 2.0) * 0.8 * uBeacon * vFar * (1.0 - vLit);

  float brightness = twinkle * (1.0 + 0.5 * vGroupLit + 0.6 * vLit);
  vec3 white = vec3(1.0, 0.98, 0.95);
  vec3 color = vColor * (glow + spikes) * brightness * (1.0 + 0.6 * vFar)
             + mix(vColor, white, 0.75) * core * 1.6
             + mix(vColor, white, 0.4) * (ring + beacon);

  // Fade to nothing at the edge of the circle so the square never shows.
  float edge = smoothstep(1.0, 0.85, d);
  gl_FragColor = vec4(color, edge * vAlpha);
}
