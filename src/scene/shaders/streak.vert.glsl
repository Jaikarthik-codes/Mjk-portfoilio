// ─────────────────────────────────────────────────────────────────────────────
//  HYPERSPACE STREAK VERTEX SHADER
//  Hundreds of thin lines that rush past the camera during a warp.
//
//  They live in CAMERA space (the camera at the origin, looking down -z), so
//  they are always around you wherever the camera is in the world. Picture a
//  long tunnel of stars pointing the way you are flying (uAxis): each streak
//  has a fixed spot on the tunnel wall, and slides along the tunnel as you
//  travel. When a streak passes the camera it wraps round to the far end.
// ─────────────────────────────────────────────────────────────────────────────

// `position` holds this corner: x = along the streak (0 tail … 1 head), y = side (-1 / +1).
attribute vec4 aSeed;       // x angle around the tunnel, y distance from its middle,
                            // z starting depth, w speed and brightness — all 0..1
attribute vec3 aColor;

uniform float uTravel;      // how far we have flown in total (grows during a warp)
uniform float uLength;      // how long the streaks are right now (longer = faster)
uniform float uIntensity;   // 0..1 — fades the whole effect in and out
uniform vec3  uAxis;        // direction of travel, in camera space
uniform float uDirection;   // +1 flying forward, -1 backing out
uniform float uPixelHeight; // canvas height in device pixels
uniform float uWidth;       // line width in device pixels
uniform float uAspect;

varying float vAlong;
varying float vSide;
varying float vAlpha;
varying vec3 vColor;

const float DEPTH = 46.0;   // length of the tunnel, camera-space units
const float NEAR = 0.7;     // streaks wrap round before they reach the camera

void main() {
  // A frame of reference for the tunnel: `ahead` along it, `right` and `up` across it.
  vec3 ahead = normalize(uAxis);
  vec3 helper = abs(ahead.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 right = normalize(cross(helper, ahead));
  vec3 up = cross(ahead, right);

  // The streak's fixed spot on the tunnel wall. Squaring the random number
  // packs more streaks toward the middle, where they look the most dramatic.
  float angle = aSeed.x * 6.2831853;
  float radius = mix(0.35, 7.0, aSeed.y * aSeed.y);
  vec3 across = (right * cos(angle) + up * sin(angle)) * radius;

  // How far ahead it is: counts down as we travel, then wraps to the far end.
  float speed = 0.6 + 0.8 * aSeed.w;
  float distanceAhead = NEAR + mod(aSeed.z * DEPTH - uTravel * speed, DEPTH - NEAR);

  // Head and tail. Flying forward, stars come at us, so the trail stretches away
  // behind them; backing out it is the other way round.
  float len = uLength * speed;
  float tailDistance = max(NEAR, distanceAhead + len * uDirection);
  vec3 head = across + ahead * distanceAhead;
  vec3 tail = across + ahead * tailDistance;
  // These are already camera-space positions. Flying sideways can swing the
  // edge of the tunnel behind the camera; those streaks are simply hidden.
  float inFront = step(head.z, -0.3) * step(tail.z, -0.3);
  head.z = min(head.z, -0.3);
  tail.z = min(tail.z, -0.3);

  vec4 clipTail = projectionMatrix * vec4(tail, 1.0);
  vec4 clipHead = projectionMatrix * vec4(head, 1.0);

  // Give the line its width on screen (the same method as lines.vert.glsl).
  vec2 screenTail = clipTail.xy / clipTail.w * vec2(uAspect, 1.0);
  vec2 screenHead = clipHead.xy / clipHead.w * vec2(uAspect, 1.0);
  vec2 along = normalize(screenHead - screenTail + 0.00001);
  vec2 sideways = vec2(-along.y, along.x);
  vec4 clip = mix(clipTail, clipHead, position.x);
  clip.xy += sideways / vec2(uAspect, 1.0) * position.y * uWidth / uPixelHeight * clip.w;
  gl_Position = clip;

  // Fade in at the far end of the tunnel and out as it reaches us, so nothing pops.
  float fade = smoothstep(DEPTH, DEPTH * 0.6, distanceAhead) * smoothstep(NEAR, NEAR + 3.0, distanceAhead);

  vAlong = position.x;
  vSide = position.y;
  vAlpha = fade * inFront * uIntensity * (0.35 + 0.65 * aSeed.w);
  vColor = aColor;
}
