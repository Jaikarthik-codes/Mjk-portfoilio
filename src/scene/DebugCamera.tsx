import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { SHAPES } from './config'
import { distanceToFit, getNameLayout } from './nameLayout'

/** Height of the area the camera should always keep in view, in world units. */
const FRAME_HEIGHT = 11

/** Zoom level per shape. Below 1 widens the view: the galaxy is larger than the name. */
const ZOOM: Record<(typeof SHAPES)[number], number> = { name: 1, nebula: 1, galaxy: 0.72 }

/**
 * Phase 1 camera: sits back far enough to frame the name on any screen shape,
 * widens its view for the galaxy, and lets you drag to orbit and scroll to zoom
 * so you can inspect the shapes.
 *
 * Phase 2 replaces this with the scroll-driven CameraRig.
 */
export function DebugCamera() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const aspect = useThree((state) => state.size.width / state.size.height)

  const { distance, lookAtY } = useMemo(() => {
    const layout = getNameLayout(aspect < 1)
    // Leave some breathing room either side of the name.
    const frameWidth = layout.width / (layout.stacked ? 0.8 : 0.58)
    const distance = distanceToFit(frameWidth, FRAME_HEIGHT, aspect)
    // Aim a little below the origin so the shapes sit above the debug panel.
    return { distance, lookAtY: -distance * 0.07 }
  }, [aspect])

  useEffect(() => {
    camera.position.set(0, lookAtY, distance)
    camera.lookAt(0, lookAtY, 0)
  }, [camera, distance, lookAtY])

  // A stand-in for Phase 2's camera pull-back. It changes the lens (zoom) rather
  // than the position, so it never fights with OrbitControls over where the camera is.
  useFrame((_, delta) => {
    const morph = useStore.getState().morph
    const from = Math.min(SHAPES.length - 2, Math.floor(morph))
    const blend = THREE.MathUtils.smoothstep(morph - from, 0, 1)
    const target = THREE.MathUtils.lerp(ZOOM[SHAPES[from]], ZOOM[SHAPES[from + 1]], blend)
    const zoom = THREE.MathUtils.damp(camera.zoom, target, 3, delta)
    if (Math.abs(zoom - camera.zoom) > 1e-4) {
      camera.zoom = zoom
      camera.updateProjectionMatrix()
    }
  })

  return (
    <OrbitControls
      target={[0, lookAtY, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
      zoomSpeed={0.6}
      minDistance={3}
      maxDistance={60}
    />
  )
}
