import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rig } from '../journey/rig'
import { SpaceBackgroundEffect } from '../look/SpaceBackground'
import { useStore } from '../store/useStore'
import { warpView } from './CameraRig'
import { QUALITY } from './config'
import { WarpEffect } from './warp/WarpEffect'

/** Colour separation at the corners of the screen at the peak of a warp. */
const WARP_ABERRATION = 0.045

/**
 * The finishing chain, applied to the whole picture (the same as the look lab's):
 *   1. bloom         — only the brightest light (above 0.85) spreads a soft glow
 *                      (skipped on phones: the stars' own spikes carry it)
 *   2. tone mapping  — ACES filmic: squeezes the bright range smoothly instead
 *                      of clipping, so a galaxy core stays cream-gold, not white
 *   3. space black   — lays #04050A under everything (see look/SpaceBackground.ts)
 *   4. warp          — the colour fringing of a jump to a star system
 *
 * The scene is drawn into a half-float image first, so values above 1 survive
 * until tone mapping.
 */
export function Effects() {
  const quality = useStore((state) => state.quality)
  const warp = useMemo(() => new WarpEffect(), [])
  const background = useMemo(() => new SpaceBackgroundEffect(), [])
  useEffect(() => () => warp.dispose(), [warp])
  useEffect(() => () => background.dispose(), [background])

  useFrame(() => {
    // Squared: barely there at low speed, then a sharp rise at full warp.
    warp.strength = WARP_ABERRATION * rig.warpFx * rig.warpFx
    warp.center.copy(warpView.vanish)
  })

  return (
    // multisampling={0}: anti-aliasing would only smooth triangle edges, and
    // almost everything here is soft points.
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <>
        {QUALITY[quality].bloom && (
          <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.12} intensity={0.45} mipmapBlur radius={0.62} />
        )}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <primitive object={background} dispose={null} />
        <primitive object={warp} dispose={null} />
      </>
    </EffectComposer>
  )
}
