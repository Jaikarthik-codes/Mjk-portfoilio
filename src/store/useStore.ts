import { create } from 'zustand'
import { detectQualityTier, type QualityTier } from '../lib/device'
import { SHAPES } from '../scene/config'

/** Highest valid morph value: one unit per step between shapes. */
export const MAX_MORPH = SHAPES.length - 1

interface StardustState {
  /**
   * Where the particles are along the shape sequence.
   * 0 = name, 1 = nebula, 2 = galaxy; 0.5 is halfway between name and nebula.
   * Phase 1 drives this from the debug slider; Phase 2 hands it to scroll.
   */
  morph: number
  setMorph: (value: number) => void

  /** Decides the particle count. */
  quality: QualityTier
  setQuality: (quality: QualityTier) => void
}

export const useStore = create<StardustState>((set) => ({
  morph: 0,
  setMorph: (value) => set({ morph: Math.min(MAX_MORPH, Math.max(0, value)) }),

  quality: detectQualityTier(),
  setQuality: (quality) => set({ quality }),
}))
