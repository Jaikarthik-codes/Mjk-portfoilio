import { create } from 'zustand'
import { detectQualityTier, type QualityTier } from '../lib/device'

/**
 * Global app state — only things React components need to re-render for.
 * Values that change every frame (scroll position, morph progress) live in
 * src/journey/rig.ts instead.
 */
interface StardustState {
  /** Index into SECTION_IDS of the section currently on screen. */
  currentSection: number
  setCurrentSection: (index: number) => void

  /** True once the opening Big Bang has (nearly) finished and the intro text may appear. */
  introDone: boolean
  setIntroDone: (done: boolean) => void

  /** Decides the particle count. */
  quality: QualityTier
  setQuality: (quality: QualityTier) => void
}

export const useStore = create<StardustState>((set) => ({
  currentSection: 0,
  setCurrentSection: (currentSection) => set({ currentSection }),

  introDone: false,
  setIntroDone: (introDone) => set({ introDone }),

  quality: detectQualityTier(),
  setQuality: (quality) => set({ quality }),
}))
