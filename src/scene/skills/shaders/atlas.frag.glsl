// ─────────────────────────────────────────────────────────────────────────────
//  ATLAS FIGURE — FRAGMENT SHADER
//  The star-atlas engraving behind a constellation: light lines on black,
//  tinted and laid over the sky at a low opacity. Drawn after tone mapping.
// ─────────────────────────────────────────────────────────────────────────────

uniform sampler2D uMap;     // the engraving: white lines on black (one channel)
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  float ink = texture2D(uMap, vUv).r;
  gl_FragColor = vec4(uColor, ink * uOpacity);
}
