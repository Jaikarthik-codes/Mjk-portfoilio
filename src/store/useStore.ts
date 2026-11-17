import { create } from 'zustand'
import { detectQualityTier, prefersReducedMotion, type QualityTier } from '../lib/device'

/** What the floating label next to a star or planet says. */
export interface TooltipContent {
  /** Small line above the title, e.g. the constellation name. */
  eyebrow?: string
  title: string
  /** Small line below, e.g. "Click to warp in". */
  hint?: string
  /** Accent colour (CSS), matching the star or planet. */
  tone?: string
}

/**
 * Global app state — only things React components need to re-render for.
 * Values that change every frame (scroll position, morph progress, the warp)
 * live in src/journey/rig.ts instead.
 */
interface StardustState {
  /** Index into SECTION_IDS of the section currently on screen. */
  currentSection: number
  setCurrentSection: (index: number) => void

  /** True once the opening Big Bang has (nearly) finished and the intro text may appear. */
  introDone: boolean
  setIntroDone: (done: boolean) => void

  /** Decides the particle count and which effects run. */
  quality: QualityTier
  setQuality: (quality: QualityTier) => void

  /** The visitor has asked for reduced motion: still pictures that dissolve into each other. */
  calm: boolean
  setCalm: (calm: boolean) => void

  // ── Skills ──────────────────────────────────────────────────────────────────
  // Stars are identified by a key "group:star", e.g. "0:2" is the third skill of the first group.
  /** The skill the visitor is pointing at in the HTML list (the 3D star lights up). */
  listSkill: string | null
  setListSkill: (key: string | null) => void
  /** The skill lit up right now, from the list or from hovering its star. */
  litSkill: string | null
  setLitSkill: (key: string | null) => void

  // ── Projects ────────────────────────────────────────────────────────────────
  /** The project the visitor is pointing at in the HTML list. */
  listProject: number | null
  setListProject: (index: number | null) => void
  /** The project whose star system is lit up right now. */
  litProject: number | null
  setLitProject: (index: number | null) => void

  /**
   * The star system the camera is visiting, flying to or flying back from
   * (null = the normal scroll camera). Set by journey/warp.ts.
   */
  activeProject: number | null
  /** The project whose panel is open (the dialog), or null. */
  panelProject: number | null
  /** False while the camera is still in flight: the panel is open but its contents are hidden. */
  panelVisible: boolean
  /** The planet (tech) the visitor is pointing at in the panel's list. */
  listPlanet: number | null
  setListPlanet: (index: number | null) => void
  /** The planet lit up right now in the open system, from the panel or by hovering it. */
  litPlanet: number | null
  setLitPlanet: (index: number | null) => void

  /** The floating label, shared by stars and planets. */
  tooltip: TooltipContent | null
  setTooltip: (tooltip: TooltipContent | null) => void
}

export const useStore = create<StardustState>((set) => ({
  currentSection: 0,
  setCurrentSection: (currentSection) => set({ currentSection }),

  introDone: false,
  setIntroDone: (introDone) => set({ introDone }),

  quality: detectQualityTier(),
  setQuality: (quality) => set({ quality }),

  calm: prefersReducedMotion(),
  setCalm: (calm) => set({ calm }),

  listSkill: null,
  setListSkill: (listSkill) => set({ listSkill }),
  litSkill: null,
  setLitSkill: (litSkill) => set({ litSkill }),

  listProject: null,
  setListProject: (listProject) => set({ listProject }),
  litProject: null,
  setLitProject: (litProject) => set({ litProject }),

  activeProject: null,
  panelProject: null,
  panelVisible: false,
  listPlanet: null,
  setListPlanet: (listPlanet) => set({ listPlanet }),
  litPlanet: null,
  setLitPlanet: (litPlanet) => set({ litPlanet }),

  tooltip: null,
  setTooltip: (tooltip) => set({ tooltip }),
}))
