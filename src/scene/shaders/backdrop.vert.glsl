// ─────────────────────────────────────────────────────────────────────────────
//  BACKDROP VERTEX SHADER
//  The backdrop is a flat rectangle that always covers the whole screen, no
//  matter where the camera is. The trick: skip the camera maths entirely.
//  The rectangle's corners are already at -1..1, which is exactly the range of
//  "clip space" (the screen), so we pass them straight through.
// ─────────────────────────────────────────────────────────────────────────────

varying vec2 vUv;   // 0..1 across the screen, handed to the fragment shader

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
