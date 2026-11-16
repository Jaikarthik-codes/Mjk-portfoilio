import { Canvas } from '@react-three/fiber'
import { IntroSequence } from '../journey/useJourney'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { CAMERA } from './config'
import { Effects } from './Effects'
import { FrameTicker } from './frame'
import { ParticleSystem } from './ParticleSystem'
import { PointerTracker } from './pointer'
import { StarSystems } from './projects/StarSystems'
import { SkillStars } from './skills/SkillStars'
import { WarpStreaks } from './warp/WarpStreaks'

/**
 * The WebGL canvas and everything drawn inside it.
 *
 * A note on colour. Screens expect sRGB, a "gamma-encoded" format, while
 * lighting maths (adding glows together, shading planets) is only correct in
 * linear light. Every shader on this site works in linear light and converts
 * to sRGB itself, as its very last line (`sRGBTransferOETF`). The renderer is
 * told not to convert again (`linear` below). Doing it this way means the
 * picture is identical whether it goes straight to the screen or through the
 * post-processing effects first — so turning effects on or off never shifts
 * the colours.
 */
export function Scene() {
  return (
    <Canvas
      linear
      // Cap the pixel ratio: 4K phones would otherwise shade several times the pixels for no visible gain.
      dpr={[1, 1.75]}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [0, 0, 12] }}
      // Antialiasing only smooths triangle edges; soft round points do not need it.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      {/* Shared clock and cursor first, then the camera: everything after sees this frame's values. */}
      <FrameTicker />
      <PointerTracker />
      <CameraRig />

      <Backdrop />
      <ParticleSystem />
      <SkillStars />
      <StarSystems />
      <WarpStreaks />

      <Effects />
      <IntroSequence />
    </Canvas>
  )
}
