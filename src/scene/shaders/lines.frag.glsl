// ─────────────────────────────────────────────────────────────────────────────
//  LINE FRAGMENT SHADER
//  Soft edges: full strength along the middle of the line, fading to nothing
//  at its sides, so thin lines look smooth instead of jagged.
// ─────────────────────────────────────────────────────────────────────────────

varying float vSide;   // -1 … 1 across the line's width
varying vec4 vColor;

void main() {
  float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
  gl_FragColor = vec4(vColor.rgb, vColor.a * edge);
  gl_FragColor = sRGBTransferOETF(gl_FragColor);   // linear light → screen (see Scene.tsx)
}
