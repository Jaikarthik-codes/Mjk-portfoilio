import { Canvas } from '@react-three/fiber'
import { IntroSequence } from '../journey/useJourney'
import type { ReferenceImages } from '../look/useReferenceImage'
import { useStore } from '../store/useStore'
import { CameraRig } from './CameraRig'
import { CAMERA, QUALITY } from './config'
import { Effects } from './Effects'
import { FrameTicker } from './frame'
import { GasStack } from './GasStack'
import { SupernovaFlash } from './nova/SupernovaFlash'
import { ParticleSystem } from './ParticleSystem'
import { PointerTracker } from './pointer'
import { StarSystems } from './projects/StarSystems'
import { Constellations } from './skills/Constellations'
import { WarpStreaks } from './warp/WarpStreaks'

/**
 * The WebGL canvas and everything drawn inside it.
 *
 * Two layers make every picture: the gas (each section's reference image on
 * a plane, see GasStack) and the particles on top of it (ParticleSystem).
 *
 * A note on colour. Every shader on this site works in linear light, and
 * light can add up past 1 (a bright star, a galaxy core). The scene is drawn
 * into a high-range image; Effects then blooms the brightest light, tone maps
 * it (ACES filmic), lays space black under it, and converts it for the screen.
 * `flat` tells three.js not to tone map a second time.
 */
export function Scene({ references }: { references: ReferenceImages }) {
  const quality = useStore((state) => state.quality)
  return (
    <Canvas
      flat
      // Cap the pixel ratio: high-density screens would otherwise shade several
      // times the pixels for little visible gain (2 on ultra, 1.5 otherwise).
      dpr={[1, QUALITY[quality].pixelRatio]}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [0, 0, 12] }}
      // Antialiasing only smooths triangle edges; soft round points do not need it.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      {/* Shared clock and cursor first, then the camera: everything after sees this frame's values. */}
      <FrameTicker />
      <PointerTracker />
      <CameraRig />

      <GasStack references={references} />
      <ParticleSystem references={references} />
      <Constellations />
      <StarSystems />
      <WarpStreaks />
      <SupernovaFlash />

      <Effects />
      <IntroSequence />
    </Canvas>
  )
}
