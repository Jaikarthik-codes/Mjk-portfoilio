// ─────────────────────────────────────────────────────────────────────────────
//  GAS FRAGMENT SHADER
//  Particles alone cannot show gas: smooth glowing clouds need a picture. So
//  each scene shows its reference image on a plane, and this shader:
//    1. makes it drift   — nudges where it reads the image with slow noise,
//                          by 1–2% of the image, so the gas seems to flow
//    2. softens it       — reads a blurrier copy of the image (a "mip level"),
//                          leaving the sharp detail to the particles on top
//    3. grades it        — contrast, saturation, and a highlight "knee" that
//                          stops bright gas from burning out to white
//    4. feathers it      — fades to black toward the edges, so no rectangle shows
//  (noise.glsl is pasted above this file, for snoise().)
// ─────────────────────────────────────────────────────────────────────────────

uniform sampler2D uMap;      // the reference image
uniform float uTime;         // seconds
uniform float uSeed;         // makes each plane drift differently
uniform float uFlow;         // drift distance, as a share of the image (0.015 = 1.5%)
uniform float uBlur;         // softness: how many mip levels down to read (0 = sharp)
uniform float uOpacity;
uniform float uExposure;
uniform float uGamma;
uniform float uSaturation;
uniform vec2  uFeather;      // the fade to black starts at .x and is complete at .y (1 = edge)
uniform float uKnee;         // brightness above which highlights are tamed …
uniform vec3  uKneeTint;     // … and tinted toward this colour …
uniform float uKneeAmount;   // … by this much (0 = off)

varying vec2 vUv;

void main() {
  // 1. Drift: two smooth noise values make a direction to read the image from.
  //    The noise changes very slowly over time, so the gas crawls.
  float t = uTime * 0.02 + uSeed;
  vec2 p = vUv * 2.2;
  vec2 drift = vec2(snoise(vec3(p, t)), snoise(vec3(p + 17.3, t + 4.1)));
  vec2 uv = vUv + drift * uFlow;

  // 2. Soften: the third argument asks the GPU for a blurrier, pre-shrunk copy.
  vec3 gas = texture2D(uMap, uv, uBlur).rgb;

  // 3. Grade.
  gas = pow(max(gas, 0.0), vec3(uGamma));
  float luma = dot(gas, vec3(0.2126, 0.7152, 0.0722));
  gas = max(mix(vec3(luma), gas, uSaturation), 0.0);

  //    The knee: above uKnee, brightness grows only half as fast, and the
  //    colour leans toward uKneeTint at the same brightness. A white-hot
  //    galaxy core becomes a warm cream-gold glow instead.
  float over = smoothstep(uKnee, 1.0, luma) * uKneeAmount;
  float tamed = luma <= uKnee ? luma : uKnee + (luma - uKnee) * 0.5;
  vec3 tinted = uKneeTint / max(dot(uKneeTint, vec3(0.2126, 0.7152, 0.0722)), 0.001) * tamed;
  gas = mix(gas, tinted, over);

  // 4. Feather: distance from the centre, 0 in the middle, 1 at the edge.
  float r = length((vUv - 0.5) * 2.0);
  float mask = 1.0 - smoothstep(uFeather.x, uFeather.y, r);
  mask *= mask;   // a softer, longer fade

  // Additive light: the plane adds its glow to whatever is behind it.
  gl_FragColor = vec4(gas * uExposure * uOpacity * mask, 1.0);
}
