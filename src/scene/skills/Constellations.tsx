import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../../data/content'
import { rig } from '../../journey/rig'
import { LOOK_PALETTE } from '../../look/palette'
import { useStore } from '../../store/useStore'
import { placeTitle } from '../../ui/titleAnchors'
import { moveTooltip } from '../../ui/tooltipAnchor'
import { SHAPE_INDEX } from '../config'
import { frameUniforms } from '../frame'
import { isPageControl, nearest, toScreen, type ScreenPoint } from '../picking'
import { pointer } from '../pointer'
import pointerGlsl from '../shaders/pointer.glsl?raw'
import { layoutConstellations, type ConstellationField } from '../shapeGenerators/constellationLayout'
import atlasFragment from './shaders/atlas.frag.glsl?raw'
import atlasVertex from './shaders/atlas.vert.glsl?raw'
import lineFragment from './shaders/line.frag.glsl?raw'
import lineVertex from './shaders/line.vert.glsl?raw'
import starFragment from './shaders/star.frag.glsl?raw'
import starVertex from './shaders/star.vert.glsl?raw'

/** The look, as specified: 1 px lines in #7FA6D9 at 50%, atlas figures at about 10%. */
const LINE = { color: '#7FA6D9', opacity: 0.5, width: 1 }
const ATLAS = { color: '#A9C1E4', opacity: 0.12 }
const STAR_COLOUR = LOOK_PALETTE.white
/** How long the lines take to draw in, in seconds. */
const DRAW_SECONDS = 2.8
/** How much later each constellation starts drawing than the one before, as a share of the draw-in. */
const STAGGER = 0.14
/** Space left between a line and the star it reaches, in CSS pixels (beyond the star's own radius). */
const LINE_GAP = 3.5

/** How close (CSS pixels) the cursor must be to a star to light it up, and a finger to tap one. */
const HOVER_RADIUS = 24
const TAP_RADIUS = 34

/** The constellations are on screen while the star field is formed, and leave as soon as it scatters. */
function constellationVisibility(morph: number) {
  const { smoothstep } = THREE.MathUtils
  const field = SHAPE_INDEX.field
  return smoothstep(morph, field - 0.16, field - 0.01) * (1 - smoothstep(morph, field + 0.01, field + 0.1))
}

/** Disc diameter in CSS pixels: 6–10 px for skill stars (brighter star, bigger disc), smaller for the rest. */
function discSize(magnitude: number, isSkill: boolean) {
  const brightness = THREE.MathUtils.clamp((3.4 - magnitude) / 3.4, 0, 1)
  return isSkill ? 6 + 4 * brightness : 3.4 + 1.4 * brightness
}

interface Star {
  /** "group:skill" for skill stars (matches the HTML list), else null. */
  key: string | null
  label: string | null
  starName: string
  group: number
  groupName: string
  figure: string
  position: THREE.Vector3
  size: number
  appear: number
}

interface Line {
  from: number
  to: number
  group: number
  start: number
  duration: number
}

/**
 * The Skills section's constellations: one real constellation per skill
 * group, its skills on the brightest stars.
 *
 *   stars  — crisp white discs with a small halo
 *   lines  — 1 px, drawn in one after another when the section arrives
 *   figure — a faint star-atlas engraving behind each constellation
 *   titles — the group's name under its constellation
 *
 * No names are shown on the stars: a skill's name appears when you point at
 * its star, focus or point at it in the list below, or tap it.
 *
 * All of it is drawn after tone mapping and bloom (a second pass, straight to
 * the screen), so the colours and opacities on screen are exactly the ones
 * written here and the lines stay crisp.
 */
export function Constellations() {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const portrait = size.width < size.height

  const field = useMemo(() => layoutConstellations(content.skills, portrait), [portrait])
  const { stars, lines } = useMemo(() => planDrawing(field), [field])
  const overlay = useMemo(() => new THREE.Scene(), [])

  const starGeometry = useMemo(() => createStarGeometry(stars), [stars])
  const lineGeometry = useMemo(() => createLineGeometry(stars, lines), [stars, lines])
  const materials = useMemo(() => createMaterials(), [])
  const atlases = useMemo(
    () =>
      field.constellations.map((constellation) => {
        if (!constellation.atlas) return null
        const { url, left, right, top, bottom } = constellation.atlas
        const texture = new THREE.TextureLoader().load(url)
        texture.colorSpace = THREE.NoColorSpace // one channel of "ink", not a colour
        const material = new THREE.ShaderMaterial({
          vertexShader: atlasVertex,
          fragmentShader: atlasFragment,
          uniforms: {
            uMap: { value: texture },
            uColor: { value: srgb(ATLAS.color) },
            uOpacity: { value: 0 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        })
        return {
          material,
          texture,
          width: right - left,
          height: top - bottom,
          center: [(left + right) / 2, (top + bottom) / 2, -0.4] as [number, number, number],
        }
      }),
    [field],
  )

  useEffect(() => () => starGeometry.dispose(), [starGeometry])
  useEffect(() => () => lineGeometry.dispose(), [lineGeometry])
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])
  useEffect(
    () => () =>
      atlases.forEach((atlas) => {
        atlas?.material.dispose()
        atlas?.texture.dispose()
      }),
    [atlases],
  )

  // Where each skill star is on screen this frame (for hovering and tapping).
  const skillStars = useMemo(() => stars.map((star, i) => ({ star, i })).filter(({ star }) => star.key), [stars])
  const screen = useMemo(() => skillStars.map((): ScreenPoint => ({ x: 0, y: 0, visible: false })), [skillStars])
  const live = useRef({ visible: 0, draw: 0, tapped: -1, lit: -1, hover: 0 })
  const titlePoint = useMemo((): ScreenPoint => ({ x: 0, y: 0, visible: false }), [])

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

    // The draw-in plays when the section arrives, and resets once it has gone.
    // Reduced motion: everything is simply there.
    if (visible < 0.01) state.draw = 0
    else if (store.calm) state.draw = 1
    else if (visible > 0.5) state.draw = Math.min(1, state.draw + Math.min(delta, 0.1) / DRAW_SECONDS)

    const { star, line } = materials
    star.uniforms.uVisible.value = visible
    star.uniforms.uDraw.value = state.draw
    line.uniforms.uVisible.value = visible
    line.uniforms.uDraw.value = state.draw
    const figure = visible * THREE.MathUtils.smoothstep(state.draw, 0.45, 1)
    atlases.forEach((atlas) => {
      if (atlas) atlas.material.uniforms.uOpacity.value = ATLAS.opacity * figure
    })
    // The titles (HTML, see ui/ConstellationTitles.tsx) follow their constellations.
    const titleOpacity = visible * THREE.MathUtils.smoothstep(state.draw, 0.25, 0.7)
    field.constellations.forEach((constellation, i) => {
      if (titleOpacity > 0.001) toScreen(constellation.titleAnchor, camera, size, titlePoint, true)
      placeTitle(i, titlePoint.x, titlePoint.y, titleOpacity)
    })

    // Nothing to point at: make sure nothing stays lit.
    if (visible < 0.01) {
      state.tapped = -1
      if (state.lit !== -1) light(-1)
      return
    }

    skillStars.forEach(({ star: s }, k) => toScreen(s.position, camera, size, screen[k], true))

    // What is lit: the star under the cursor, else the skill pointed at or
    // focused in the list, else the last star tapped.
    const hovered =
      pointer.active && pointer.type !== 'touch' && visible > 0.5
        ? nearest(screen, ((pointer.x + 1) / 2) * size.width, ((1 - pointer.y) / 2) * size.height, HOVER_RADIUS)
        : -1
    const listed = store.listSkill === null ? -1 : skillStars.findIndex(({ star: s }) => s.key === store.listSkill)
    const lit = hovered >= 0 ? hovered : listed >= 0 ? listed : state.tapped
    if (lit !== state.lit) light(lit)

    // Animate the light-up in, and keep the label beside its star.
    state.hover = THREE.MathUtils.damp(state.hover, lit >= 0 ? 1 : 0, 10, delta)
    star.uniforms.uHover.value = state.hover
    line.uniforms.uHover.value = state.hover
    if (lit >= 0) moveTooltip(screen[lit].x, screen[lit].y, 22)
  })

  // Draw the constellations on top of the finished picture: after the effects
  // (priority 1) have drawn the scene to the screen.
  useFrame((state) => {
    if (live.current.visible < 0.01) return
    const { star, line } = materials
    star.uniforms.uPixelRatio.value = state.viewport.dpr
    line.uniforms.uPixelRatio.value = state.viewport.dpr
    line.uniforms.uViewport.value.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr)
    const autoClear = gl.autoClear
    gl.autoClear = false
    gl.setRenderTarget(null)
    gl.render(overlay, camera)
    gl.autoClear = autoClear
  }, 2)

  /** Lights up skill star `index` (into skillStars; -1 = none) and tells the rest of the page. */
  function light(index: number) {
    const store = useStore.getState()
    const entry = skillStars[index]
    live.current.lit = index
    live.current.hover = 0
    materials.star.uniforms.uHighlight.value = entry ? entry.i : -1
    materials.star.uniforms.uHighlightGroup.value = entry ? entry.star.group : -1
    materials.line.uniforms.uHighlightGroup.value = entry ? entry.star.group : -1
    store.setLitSkill(entry ? entry.star.key : null)
    store.setTooltip(
      entry ? { eyebrow: `${entry.star.groupName} · ${entry.star.starName}`, title: entry.star.label ?? '', tone: LINE.color } : null,
    )
  }

  return (
    <>
      {createPortal(
        <>
          {atlases.map(
            (atlas, i) =>
              atlas && (
                <mesh key={i} position={atlas.center} material={atlas.material} frustumCulled={false} renderOrder={0}>
                  <planeGeometry args={[atlas.width, atlas.height]} />
                </mesh>
              ),
          )}
          <mesh geometry={lineGeometry} material={materials.line} frustumCulled={false} renderOrder={1} />
          <points geometry={starGeometry} material={materials.star} frustumCulled={false} renderOrder={2} />
        </>,
        overlay,
      )}
    </>
  )
}

/** A CSS colour as raw sRGB numbers, for shaders drawn straight to the screen (no conversion). */
function srgb(hex: string) {
  const channel = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return new THREE.Vector3(channel(0), channel(1), channel(2))
}

/**
 * The order things appear in: each constellation's lines are drawn one after
 * another, walking out from its brightest star, and each star lights up as
 * the line reaching it arrives. Constellations start one after another.
 */
function planDrawing(field: ConstellationField): { stars: Star[]; lines: Line[] } {
  const count = field.constellations.length
  const span = Math.max(0.3, 1 - STAGGER * (count - 1))
  const stars: Star[] = []
  const lines: Line[] = []

  field.constellations.forEach((constellation, group) => {
    const offset = stars.length
    const base = group * STAGGER
    constellation.stars.forEach((star) =>
      stars.push({
        key: star.skill >= 0 ? `${group}:${star.skill}` : null,
        label: star.label,
        starName: star.name,
        group,
        groupName: constellation.name,
        figure: constellation.figure,
        position: new THREE.Vector3(...star.position),
        size: discSize(star.magnitude, star.skill >= 0),
        appear: base + span * 0.6,
      }),
    )

    // Walk the figure outward from its brightest star (breadth first).
    const brightest = constellation.stars.reduce(
      (best, star, i) => (star.magnitude < constellation.stars[best].magnitude ? i : best),
      0,
    )
    const reached = new Set([brightest])
    const order: [number, number][] = []
    const pending = constellation.edges.slice()
    while (pending.length > 0) {
      const next = pending.findIndex(([a, b]) => reached.has(a) || reached.has(b))
      // A piece of the figure not joined to the rest: start it from its first star.
      const [a, b] = pending.splice(next >= 0 ? next : 0, 1)[0]
      const [from, to] = reached.has(a) || next < 0 ? [a, b] : [b, a]
      order.push([from, to])
      reached.add(from).add(to)
    }

    stars[offset + brightest].appear = base
    const step = (span * 0.78) / Math.max(1, order.length)
    order.forEach(([from, to], k) => {
      const start = base + k * step
      const duration = Math.min(step * 1.7, base + span - start)
      lines.push({ from: offset + from, to: offset + to, group, start, duration })
      const star = stars[offset + to]
      star.appear = Math.min(star.appear, start + duration * 0.92)
      stars[offset + from].appear = Math.min(stars[offset + from].appear, start)
    })
  })
  return { stars, lines }
}

function createStarGeometry(stars: Star[]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(stars.flatMap((s) => s.position.toArray()), 3))
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(stars.map((s) => s.size), 1))
  geometry.setAttribute('aBright', new THREE.Float32BufferAttribute(stars.map((s) => (s.key ? 1 : 0.6)), 1))
  geometry.setAttribute('aIndex', new THREE.Float32BufferAttribute(stars.map((_, i) => i), 1))
  geometry.setAttribute('aGroup', new THREE.Float32BufferAttribute(stars.map((s) => s.group), 1))
  geometry.setAttribute('aAppear', new THREE.Float32BufferAttribute(stars.map((s) => s.appear), 1))
  return geometry
}

/** Four corners per line: (start or end) × (one side or the other). */
function createLineGeometry(stars: Star[], lines: Line[]) {
  const start: number[] = []
  const end: number[] = []
  const corner: number[] = []
  const timing: number[] = []
  const gap: number[] = []
  const group: number[] = []
  const index: number[] = []
  lines.forEach((line, k) => {
    const a = stars[line.from]
    const b = stars[line.to]
    for (const [along, side] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
      start.push(...a.position.toArray())
      end.push(...b.position.toArray())
      corner.push(along, side)
      timing.push(line.start, line.duration)
      gap.push(a.size / 2 + LINE_GAP, b.size / 2 + LINE_GAP)
      group.push(line.group)
    }
    const o = k * 4
    index.push(o, o + 2, o + 1, o + 1, o + 2, o + 3)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(start, 3))
  geometry.setAttribute('aStart', new THREE.Float32BufferAttribute(start, 3))
  geometry.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 3))
  geometry.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2))
  geometry.setAttribute('aTiming', new THREE.Float32BufferAttribute(timing, 2))
  geometry.setAttribute('aGap', new THREE.Float32BufferAttribute(gap, 2))
  geometry.setAttribute('aGroup', new THREE.Float32BufferAttribute(group, 1))
  geometry.setIndex(index)
  return geometry
}

function createMaterials() {
  // Drawn straight to the screen, over the finished picture: plain alpha
  // blending, no depth, in screen (sRGB) colours.
  const common = { transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide } as const
  const pointerUniforms = {
    uAspect: frameUniforms.uAspect,
    uPointer: frameUniforms.uPointer,
    uPointerStrength: frameUniforms.uPointerStrength,
    uPointerRadius: frameUniforms.uPointerRadius,
  }
  const highlight = () => ({
    uVisible: { value: 0 },
    uDraw: { value: 0 },
    uHighlightGroup: { value: -1 },
    uHover: { value: 0 },
    uPixelRatio: { value: 1 },
  })
  return {
    star: new THREE.ShaderMaterial({
      vertexShader: `${pointerGlsl}\n${starVertex}`,
      fragmentShader: starFragment,
      uniforms: { ...pointerUniforms, ...highlight(), uHighlight: { value: -1 }, uColor: { value: srgb(STAR_COLOUR) } },
      ...common,
    }),
    line: new THREE.ShaderMaterial({
      vertexShader: `${pointerGlsl}\n${lineVertex}`,
      fragmentShader: lineFragment,
      uniforms: {
        ...pointerUniforms,
        ...highlight(),
        uViewport: { value: new THREE.Vector2(1, 1) },
        uWidth: { value: LINE.width },
        uColor: { value: srgb(LINE.color) },
        uOpacity: { value: LINE.opacity },
      },
      ...common,
    }),
  }
}
