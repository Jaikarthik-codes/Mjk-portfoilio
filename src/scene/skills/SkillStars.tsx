import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../../data/content'
import { rig } from '../../journey/rig'
import { useStore } from '../../store/useStore'
import { moveTooltip } from '../../ui/tooltipAnchor'
import { LOOK_PALETTE } from '../../look/palette'
import { SHAPE_INDEX } from '../config'
import { createLineGeometry, createSpriteGeometry, type LineSpec } from '../instanced'
import { createLineMaterial, createStarMaterial } from '../materials'
import { isPageControl, nearest, toScreen, type ScreenPoint } from '../picking'
import { pointer } from '../pointer'
import { layoutConstellations } from '../shapeGenerators/constellationLayout'

/** One colour per constellation (interim: Phase C replaces these stars with the new constellation look). */
const GROUP_COLOURS = [LOOK_PALETTE.ice, LOOK_PALETTE.gold, LOOK_PALETTE.seaGreen, LOOK_PALETTE.rose, LOOK_PALETTE.white]

/** How close (CSS pixels) the cursor must be to a star to light it up. */
const HOVER_RADIUS = 26
/** Larger for fingers, which are less precise than a cursor. */
const TAP_RADIUS = 34

interface Star {
  key: string
  label: string
  group: string
  groupIndex: number
  position: [number, number, number]
  css: string
}

/** The constellations are on screen once their particles have gathered, and leave as soon as they scatter. */
function constellationVisibility(morph: number) {
  const { smoothstep } = THREE.MathUtils
  const field = SHAPE_INDEX.field
  return smoothstep(morph, field - 0.16, field - 0.01) * (1 - smoothstep(morph, field + 0.01, field + 0.1))
}

/**
 * The Skills section's constellations, drawn crisply on top of the particles:
 * a bright star for each skill and fine lines joining each figure.
 *
 * Point at a star (or tap it) to see the skill's name. Pointing at a skill in
 * the HTML list beneath lights up its star, and the other way round.
 */
export function SkillStars() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const portrait = size.width < size.height

  // The same layout the camera frames and the star field is spread around.
  const field = useMemo(() => layoutConstellations(content.skills, portrait), [portrait])

  const stars = useMemo<Star[]>(
    () =>
      field.constellations.flatMap((constellation, groupIndex) =>
        constellation.stars.map((star, index) => ({
          key: `${groupIndex}:${index}`,
          label: star.label,
          group: constellation.name,
          groupIndex,
          position: star.position,
          css: GROUP_COLOURS[groupIndex % GROUP_COLOURS.length],
        })),
      ),
    [field],
  )

  const starGeometry = useMemo(
    () =>
      createSpriteGeometry(
        stars.map((star, i) => ({
          center: star.position,
          color: new THREE.Color(star.css),
          // A little variety: some skills shine brighter than others.
          size: 0.34 + 0.12 * ((i * 0.618) % 1),
          tag: [i, star.groupIndex],
          seed: (i * 0.381) % 1,
        })),
      ),
    [stars],
  )

  const lineGeometry = useMemo(() => {
    const lines: LineSpec[] = []
    field.constellations.forEach((constellation, groupIndex) => {
      const color = new THREE.Color(GROUP_COLOURS[groupIndex % GROUP_COLOURS.length])
      for (const [a, b] of constellation.edges) {
        lines.push({
          start: constellation.stars[a].position,
          end: constellation.stars[b].position,
          color,
          alpha: 0.2,
          tag: [groupIndex, -1],
        })
      }
    })
    return createLineGeometry(lines)
  }, [field])

  const starMaterial = useMemo(
    () => createStarMaterial({ pointerPush: true, minPixels: 14, beacon: false, spikes: 0.55 }),
    [],
  )
  const lineMaterial = useMemo(() => createLineMaterial({ width: 1.6, pointerPush: true }), [])

  useEffect(() => () => starGeometry.dispose(), [starGeometry])
  useEffect(() => () => lineGeometry.dispose(), [lineGeometry])
  useEffect(
    () => () => {
      starMaterial.dispose()
      lineMaterial.dispose()
    },
    [starMaterial, lineMaterial],
  )

  // Where each star is on screen this frame (for hovering and tapping).
  const screen = useMemo(() => stars.map((): ScreenPoint => ({ x: 0, y: 0, visible: false })), [stars])
  const live = useRef({ visible: 0, tapped: -1, lit: -1, hover: 0 })
  const group = useRef<THREE.Group>(null)

  // Taps (and clicks): light up the star under the finger until the next tap.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (live.current.visible < 0.5 || isPageControl(event.target)) return
      live.current.tapped = nearest(screen, event.clientX, event.clientY, TAP_RADIUS)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [screen])

  useFrame((_, delta) => {
    const store = useStore.getState()
    const state = live.current
    const visible = store.activeProject === null ? constellationVisibility(rig.morph) : 0
    state.visible = visible
    starMaterial.uniforms.uVisible.value = visible
    lineMaterial.uniforms.uVisible.value = visible
    // Not drawn at all outside the Skills section.
    if (group.current) group.current.visible = visible >= 0.01

    // Nothing to point at: make sure nothing stays lit.
    if (visible < 0.01) {
      state.tapped = -1
      if (state.lit !== -1) light(-1)
      return
    }

    stars.forEach((star, i) => toScreen(star.position, camera, size, screen[i], true))

    // What is lit: the star under the cursor, else the skill pointed at in the
    // list, else the last star tapped.
    const hovered =
      pointer.active && pointer.type !== 'touch' && visible > 0.5
        ? nearest(screen, ((pointer.x + 1) / 2) * size.width, ((1 - pointer.y) / 2) * size.height, HOVER_RADIUS)
        : -1
    const listed = store.listSkill === null ? -1 : stars.findIndex((star) => star.key === store.listSkill)
    const lit = hovered >= 0 ? hovered : listed >= 0 ? listed : state.tapped
    if (lit !== state.lit) light(lit)

    // Animate the light-up in, and keep the label beside its star.
    state.hover = THREE.MathUtils.damp(state.hover, lit >= 0 ? 1 : 0, 10, delta)
    starMaterial.uniforms.uHover.value = state.hover
    lineMaterial.uniforms.uHover.value = state.hover
    if (lit >= 0) moveTooltip(screen[lit].x, screen[lit].y, 34)
  })

  /** Lights up star `index` (-1 = none) and tells the rest of the page. */
  function light(index: number) {
    const store = useStore.getState()
    const star = stars[index]
    live.current.lit = index
    live.current.hover = 0
    starMaterial.uniforms.uHighlight.value = index
    starMaterial.uniforms.uHighlightGroup.value = star ? star.groupIndex : -1
    lineMaterial.uniforms.uHighlight.value = star ? star.groupIndex : -1
    store.setLitSkill(star ? star.key : null)
    store.setTooltip(star ? { eyebrow: star.group, title: star.label, tone: star.css } : null)
  }

  return (
    <group ref={group} visible={false}>
      <mesh geometry={lineGeometry} material={lineMaterial} frustumCulled={false} renderOrder={2} />
      <mesh geometry={starGeometry} material={starMaterial} frustumCulled={false} renderOrder={3} />
    </group>
  )
}
