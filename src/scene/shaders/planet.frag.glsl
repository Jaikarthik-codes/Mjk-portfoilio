// ─────────────────────────────────────────────────────────────────────────────
//  PLANET FRAGMENT SHADER
//  Lights a small world by its star:
//    day side   — lit from the direction of the star, with a soft terminator
//                 (the line between day and night)
//    bands      — faint stripes, like a gas giant's cloud belts
//    atmosphere — a glow around the rim, brightest on the sunny side
// ─────────────────────────────────────────────────────────────────────────────

uniform float uVisible;   // 0..1

varying vec3 vNormal;
varying vec3 vToLight;
varying vec3 vToCamera;
varying vec3 vColor;
varying float vLatitude;
varying float vSeed;
varying float vLit;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 toLight = normalize(vToLight);
  vec3 toCamera = normalize(vToCamera);

  // How directly the star shines on this spot: 1 facing it, 0 side-on, negative = night.
  // The smoothstep blurs the terminator, as if through a thin atmosphere.
  float sunlight = dot(normal, toLight);
  float day = smoothstep(-0.2, 0.65, sunlight);

  // Cloud belts: a few stripes by latitude, wobbling a little so they look natural.
  float bands = 0.86 + 0.14 * sin(vLatitude * (9.0 + vSeed * 8.0) + sin(vLatitude * 5.0 + vSeed * 30.0));
  vec3 surface = vColor * bands;

  // Rim: 0 where the surface faces us, 1 at the very edge of the disc.
  float rim = pow(1.0 - max(dot(normal, toCamera), 0.0), 2.6);

  vec3 color = surface * (0.03 + 1.05 * day)          // a hint of light on the night side
             + vColor * rim * (0.2 + 0.9 * day) * 0.9  // atmosphere
             + vColor * rim * vLit * 1.4;              // brighter halo when pointed at

  gl_FragColor = vec4(color, uVisible);
}
