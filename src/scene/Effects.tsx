import { useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo } from 'react'
import { rig } from '../journey/rig'
import { useStore } from '../store/useStore'
import { warpView } from './CameraRig'
import { WarpEffect } from './warp/WarpEffect'

/** Colour separation at the corners of the screen at the peak of a warp. */
const WARP_ABERRATION = 0.045

/**
 * Post-processing: effects applied to the finished picture.
 * For now that is the warp's colour fringing; Phase 5 adds bloom, film grain
 * and a vignette here. Skipped entirely on low-power devices.
 */
export function Effects() {
  const quality = useStore((state) => state.quality)
  const warp = useMemo(() => new WarpEffect(), [])
  useEffect(() => () => warp.dispose(), [warp])

  useFrame(() => {
    // Squared: barely there at low speed, then a sharp rise at full warp.
    warp.strength = WARP_ABERRATION * rig.warpFx * rig.warpFx
    warp.center.copy(warpView.vanish)
  })

  if (quality === 'low') return null
  return (
    // multisampling={0}: anti-aliasing would only smooth triangle edges, and
    // almost everything here is soft points and lines.
    <EffectComposer multisampling={0}>
      <primitive object={warp} dispose={null} />
    </EffectComposer>
  )
}
