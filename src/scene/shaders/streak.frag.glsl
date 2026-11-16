// ─────────────────────────────────────────────────────────────────────────────
//  HYPERSPACE STREAK FRAGMENT SHADER
//  Bright at the head, fading to nothing along the tail, soft at the sides.
// ─────────────────────────────────────────────────────────────────────────────

varying float vAlong;   // 0 tail … 1 head
varying float vSide;    // -1 … 1 across the width
varying float vAlpha;
varying vec3 vColor;

void main() {
  float trail = vAlong * vAlong;                      // most of the light at the head
  float edge = 1.0 - smoothstep(0.15, 1.0, abs(vSide));
  vec3 color = mix(vColor, vec3(1.0), vAlong * 0.6);  // white-hot at the very front
  gl_FragColor = vec4(color, trail * edge * vAlpha);
  gl_FragColor = sRGBTransferOETF(gl_FragColor);      // linear light → screen (see Scene.tsx)
}
