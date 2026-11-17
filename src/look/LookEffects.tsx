import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { SpaceBackgroundEffect } from './SpaceBackground'

/**
 * The finishing chain for the new look, applied to the whole picture:
 *   1. bloom         — only the brightest light (above 0.85) spreads a soft glow
 *   2. tone mapping  — ACES filmic: squeezes the bright range smoothly instead
 *                      of clipping, so a galaxy core stays cream-gold, not white
 *   3. space black   — lays #04050A under everything (see SpaceBackground.ts)
 *
 * The scene is drawn into a half-float image first, so values above 1 survive
 * until tone mapping.
 */
export function LookEffects({ bloom = true }: { bloom?: boolean }) {
  const background = useMemo(() => new SpaceBackgroundEffect(), [])
  useEffect(() => () => background.dispose(), [background])

  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <>
        {bloom && <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.12} intensity={0.45} mipmapBlur radius={0.62} />}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <primitive object={background} dispose={null} />
      </>
    </EffectComposer>
  )
}
