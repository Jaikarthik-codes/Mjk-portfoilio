// ─────────────────────────────────────────────────────────────────────────────
//  SUPERNOVA FLASH
//  The moment everything has fallen to one point: a white-hot core, a glare
//  around it and a faint horizontal streak, for an instant — then a thin shock
//  ring racing outward with the new shell, cooling from ice blue to gold.
//  Light above 1 on purpose: bloom spreads it and tone mapping rounds it off.
// ─────────────────────────────────────────────────────────────────────────────

uniform float uFlash;       // 0..1, the flash's strength
uniform float uRing;        // 0..1, the shock ring's strength
uniform float uRingRadius;  // 0..1, how far the ring has travelled (1 = the shell's edge)
uniform float uShell;       // the shell's edge, as a share of the square's half-width

varying vec2 vUv;

void main() {
  float r = length(vUv);

  float core = exp(-r * r / 0.00025);
  float glare = exp(-r / 0.035) * 0.5 + exp(-r / 0.11) * 0.05;
  float streak = exp(-abs(vUv.y) / 0.003) * exp(-abs(vUv.x) / 0.12) * 0.16;
  vec3 flash = vec3(0.86, 0.92, 1.0) * (core * 24.0 + glare * 7.0 + streak * 5.0) * uFlash;

  float ringR = uRingRadius * uShell;
  float d = r - ringR;
  float ring = exp(-d * d / 0.00004) * 1.1 + exp(-d * d / 0.002) * 0.1;
  vec3 ringColour = mix(vec3(0.66, 0.8, 1.0), vec3(0.95, 0.79, 0.55), uRingRadius);

  gl_FragColor = vec4(flash + ringColour * ring * uRing, 1.0);
}
