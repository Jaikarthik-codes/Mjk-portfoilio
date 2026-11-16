// ─────────────────────────────────────────────────────────────────────────────
//  CURSOR GRAVITY  (shared by the particles, the skill stars and their lines)
//  Pasted above any vertex shader that wants it. Its JavaScript twin is
//  pushFromPointer() in scene/frame.ts, used for hover tests.
// ─────────────────────────────────────────────────────────────────────────────

uniform float uAspect;            // canvas width / height
uniform vec2  uPointer;           // cursor position, -1..1 on both axes (0,0 = screen centre)
uniform float uPointerStrength;   // how hard the cursor pushes; 0 turns it off
uniform float uPointerRadius;     // reach of the push (1.0 = half the screen height)

// Takes a point in camera space and returns it nudged away from the cursor.
//
// Work out where the point lands on screen, measure how far that is from the
// cursor, and push it directly away. The push follows the curve
// reach * exp(-reach²): zero right at the cursor, strongest a little way out,
// fading to nothing beyond. Starting from zero is what keeps it gentle: a push
// that is strongest at the cursor would fling every nearby point outward and
// punch a hard-edged hole. This one spreads points apart like a lens instead.
// (2.33 scales the curve's peak to 1.)
vec4 pushFromPointer(vec4 viewPosition) {
  vec4 clip = projectionMatrix * viewPosition;
  vec2 fromPointer = clip.xy / clip.w - uPointer;      // both in -1..1 screen space
  fromPointer.x *= uAspect;                            // undo the stretch of wide screens
  float reach = length(fromPointer) / uPointerRadius;  // 0 at the cursor, 1 at the edge of its reach
  float push = uPointerStrength * 2.33 * reach * exp(-reach * reach);

  // "* depth / projectionMatrix[1][1]" converts a screen-space distance into
  // camera-space units, so far points move as far on screen as near ones.
  float depth = -viewPosition.z;
  viewPosition.xy += normalize(fromPointer + 0.00001) * push * depth / projectionMatrix[1][1];
  return viewPosition;
}
