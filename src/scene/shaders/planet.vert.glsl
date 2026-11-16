// ─────────────────────────────────────────────────────────────────────────────
//  PLANET VERTEX SHADER
//  The planets are one "instanced" sphere drawn once per planet. three.js
//  hands us `instanceMatrix`, which moves and scales the sphere to where this
//  particular planet is this frame (JavaScript updates it as they orbit).
// ─────────────────────────────────────────────────────────────────────────────

attribute vec3 aColor;        // the planet's colour
attribute vec3 aStar;         // where its star is (same space as the planet), so we know where light comes from
attribute vec2 aTag;          // [system, planet]
attribute float aSeed;        // random 0..1, varies the surface bands

uniform float uHighlight;     // system being lit up (-1 = none) …
uniform float uHighlightSub;  // … and the planet in it (-1 = none)
uniform float uHover;         // 0..1

varying vec3 vNormal;         // surface direction (world space)
varying vec3 vToLight;        // from this point toward the star
varying vec3 vToCamera;       // from this point toward the camera
varying vec3 vColor;
varying float vLatitude;      // -1 (south pole) … 1 (north pole)
varying float vSeed;
varying float vLit;

void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 star = (modelMatrix * vec4(aStar, 1.0)).xyz;
  vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

  // instanceMatrix only moves and scales (no rotation), so the sphere's own
  // "up" stays at right angles to its orbit: the bands below run parallel to it.
  vNormal = normalize(mat3(modelMatrix) * normal);
  vToLight = normalize(star - centre);
  vToCamera = normalize(cameraPosition - world.xyz);
  vColor = aColor;
  vLatitude = normal.y;
  vSeed = aSeed;
  vLit = (aTag.x == uHighlight && aTag.y == uHighlightSub) ? uHover : 0.0;

  gl_Position = projectionMatrix * viewMatrix * world;
}
