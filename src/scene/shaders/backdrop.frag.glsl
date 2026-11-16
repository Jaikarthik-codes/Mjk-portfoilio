// ─────────────────────────────────────────────────────────────────────────────
//  BACKDROP FRAGMENT SHADER
//  Paints the sky behind the particles: a soft glow of colour in the middle of
//  the screen fading to near-black at the edges. JavaScript changes the two
//  colours as you scroll (violet → teal → gold).
// ─────────────────────────────────────────────────────────────────────────────

uniform vec3 uInner;     // colour at the centre of the screen
uniform vec3 uOuter;     // colour at the edges
uniform float uAspect;   // canvas width / height
uniform float uReveal;   // 0 = black screen (start of the intro), 1 = fully visible

varying vec2 vUv;

void main() {
  // Distance from the centre of the screen. Multiplying x by the aspect ratio
  // keeps the glow round instead of stretching it into an ellipse.
  vec2 fromCentre = vUv - 0.5;
  fromCentre.x *= uAspect;
  float d = length(fromCentre);

  // 1 at the centre, easing down to 0 at about 1.1 screen-heights away.
  // Raising it to a power concentrates the colour toward the middle.
  float glow = pow(smoothstep(1.1, 0.0, d), 1.6);
  vec3 color = mix(uOuter, uInner, glow) * uReveal;

  gl_FragColor = vec4(color, 1.0);

  // Convert our linear-light colour to what the screen expects (sRGB).
  // Every shader on the site does this itself, last thing, rather than leaving
  // it to three.js — see the note on colour in Scene.tsx for why.
  gl_FragColor = sRGBTransferOETF(gl_FragColor);

  // Dithering. A screen can only show 256 levels per colour channel, so a very
  // dark, very smooth gradient breaks into visible stripes ("banding"). Adding
  // a tiny amount of random noise to each pixel hides the steps.
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (noise - 0.5) / 255.0;
}
