import { Canvas } from '@react-three/fiber'
import { IntroSequence } from '../journey/useJourney'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { CAMERA, PALETTE } from './config'
import { ParticleSystem } from './ParticleSystem'
import { PointerTracker } from './pointer'

/** The WebGL canvas and everything drawn inside it. */
export function Scene() {
  return (
    <Canvas
      // Cap the pixel ratio: 4K phones would otherwise shade several times the pixels for no visible gain.
      dpr={[1, 1.75]}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: [0, 0, 12] }}
      // Antialiasing only smooths triangle edges; soft round points do not need it.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[PALETTE.void]} />
      <PointerTracker />
      <CameraRig />
      <Backdrop />
      <ParticleSystem />
      <IntroSequence />
    </Canvas>
  )
}
