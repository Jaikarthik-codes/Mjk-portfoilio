import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { content } from '../../data/content'
import { rig } from '../../journey/rig'
import { openProject } from '../../journey/warp'
import { useStore } from '../../store/useStore'
import { moveTooltip } from '../../ui/tooltipAnchor'
import { clock } from '../frame'
import { getGalaxyMatrix } from '../galaxyFrame'
import { circleSegments, createLineGeometry, createSpriteGeometry } from '../instanced'
import { createLineMaterial, createStarMaterial } from '../materials'
import { isPageControl, nearest, pixelsAcross, toScreen, type ScreenPoint } from '../picking'
import { pointer } from '../pointer'
import planetFragment from '../shaders/planet.frag.glsl?raw'
import planetVertex from '../shaders/planet.vert.glsl?raw'
import {
  galaxyVisibility,
  layoutSystems,
  planetOffset,
  planetWorldPosition,
  SYSTEM_LOOK,
  systemWorldPosition,
} from './systemLayout'

/** Smallest hover target around a star system, in CSS pixels. */
const MIN_REACH = 26

/**
 * The Projects section's star systems: one per project, sitting in the spiral
 * galaxy and turning with it. Each has a glowing star, faint orbits, and one
 * small planet per technology the project uses.
 *
 * Point at a system to see the project's name; click (or tap) it to warp in.
 * While visiting, point at a planet to see which technology it is.
 */
export function StarSystems() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  const quality = useStore((state) => state.quality)

  const systems = useMemo(() => layoutSystems(content.projects), [])
  const planets = useMemo(
    () =>
      systems.flatMap((system) =>
        system.planets.map((planet, planetIndex) => ({ system, planet, planetIndex })),
      ),
    [systems],
  )

  // ── Geometry and materials (made once) ──────────────────────────────────────
  const starGeometry = useMemo(
    () =>
      createSpriteGeometry(
        systems.map((system) => ({
          center: system.center.toArray(),
          color: new THREE.Color(system.color),
          size: SYSTEM_LOOK.starSize,
          tag: [system.index, 0],
          seed: (system.index * 0.618) % 1,
        })),
      ),
    [systems],
  )

  const orbitGeometry = useMemo(() => {
    const white = new THREE.Color('#ffffff')
    return createLineGeometry(
      systems.flatMap((system) =>
        system.planets.flatMap((planet, planetIndex) =>
          circleSegments(system.center, planet.orbit, 96, {
            color: new THREE.Color(planet.color).lerp(white, 0.35),
            alpha: 0.18,
            tag: [system.index, planetIndex],
          }),
        ),
      ),
    )
  }, [systems])

  // One sphere, drawn once per planet, plus per-planet colour, star and tag.
  const planetGeometry = useMemo(() => {
    const detail = quality === 'low' ? [18, 12] : [32, 20]
    const geometry = new THREE.SphereGeometry(1, detail[0], detail[1])
    const color = new Float32Array(planets.length * 3)
    const star = new Float32Array(planets.length * 3)
    const tag = new Float32Array(planets.length * 2)
    const seed = new Float32Array(planets.length)
    planets.forEach(({ system, planet, planetIndex }, i) => {
      const c = new THREE.Color(planet.color)
      color.set([c.r, c.g, c.b], i * 3)
      star.set(system.center.toArray(), i * 3)
      tag.set([system.index, planetIndex], i * 2)
      seed[i] = (i * 0.754877) % 1
    })
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
    geometry.setAttribute('aStar', new THREE.InstancedBufferAttribute(star, 3))
    geometry.setAttribute('aTag', new THREE.InstancedBufferAttribute(tag, 2))
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
    return geometry
  }, [planets, quality])

  const starMaterial = useMemo(
    () => createStarMaterial({ pointerPush: false, minPixels: 34, beacon: true, spikes: 0.8 }),
    [],
  )
  const orbitMaterial = useMemo(() => createLineMaterial({ width: 1.3, pointerPush: false }), [])
  const planetMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uVisible: { value: 0 },
          uHighlight: { value: -1 },
          uHighlightSub: { value: -1 },
          uHover: { value: 0 },
        },
        // Solid worlds: they hide what is behind them (unlike the glowing stars).
        transparent: true,
      }),
    [],
  )

  useEffect(() => () => starGeometry.dispose(), [starGeometry])
  useEffect(() => () => orbitGeometry.dispose(), [orbitGeometry])
  useEffect(() => () => planetGeometry.dispose(), [planetGeometry])
  useEffect(
    () => () => {
      starMaterial.dispose()
      orbitMaterial.dispose()
      planetMaterial.dispose()
    },
    [starMaterial, orbitMaterial, planetMaterial],
  )

  // ── Per-frame state ──────────────────────────────────────────────────────────
  const group = useRef<THREE.Group>(null)
  const planetMesh = useRef<THREE.InstancedMesh>(null)
  const scratch = useMemo(
    () => ({ position: new THREE.Vector3(), matrix: new THREE.Matrix4() }),
    [],
  )
  const systemScreen = useMemo(() => systems.map((): ScreenPoint => ({ x: 0, y: 0, visible: false })), [systems])
  const systemReach = useMemo(() => systems.map(() => MIN_REACH), [systems])
  const planetScreen = useMemo(() => planets.map((): ScreenPoint => ({ x: 0, y: 0, visible: false })), [planets])
  const planetReach = useMemo(() => planets.map(() => 12), [planets])
  const live = useRef({ visible: 0, browsing: false, litSystem: -1, litPlanet: -1, hover: 0, pointing: false })

  // Click or tap a star system to warp to it.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const state = live.current
      if (!state.browsing || isPageControl(event.target)) return
      // Fingers are less precise than a cursor, so taps get a bigger target.
      const reach = systemReach.map((r) => r * (pointer.type === 'touch' ? 1.3 : 1))
      const index = nearest(systemScreen, event.clientX, event.clientY, reach)
      if (index >= 0) openProject(index)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [systemScreen, systemReach])

  useFrame((_, delta) => {
    const state = live.current
    const store = useStore.getState()
    const time = clock.time
    const active = store.activeProject

    // While visiting, the systems are always there; otherwise only while the galaxy has formed.
    const visible = active !== null ? 1 : galaxyVisibility(rig.morph)
    state.visible = visible
    // "Browsing" = looking at the whole galaxy, free to pick a system.
    state.browsing = active === null && visible > 0.6

    const root = group.current
    if (!root) return
    root.visible = visible > 0.001
    if (!root.visible) {
      if (state.litSystem !== -1 || state.litPlanet !== -1) light(-1, -1)
      setPointing(false)
      return
    }

    // Ride along with the galaxy's spin and tilt.
    getGalaxyMatrix(time, root.matrix)
    root.matrixWorldNeedsUpdate = true

    // Planets: move each one along its orbit. Growing them in with `visible`
    // makes the systems "condense" as the galaxy forms. Seen from across the
    // galaxy they are drawn larger than life, or they would be specks.
    const mesh = planetMesh.current
    if (mesh) {
      const grow = (0.3 + 0.7 * visible) * THREE.MathUtils.lerp(1.7, 1, rig.warp)
      planets.forEach(({ system, planet }, i) => {
        planetOffset(planet, time, scratch.position).add(system.center)
        const radius = planet.size * grow
        scratch.matrix.makeScale(radius, radius, radius).setPosition(scratch.position)
        mesh.setMatrixAt(i, scratch.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    starMaterial.uniforms.uVisible.value = visible
    orbitMaterial.uniforms.uVisible.value = visible
    planetMaterial.uniforms.uVisible.value = Math.min(1, visible * 1.5)

    // The system being visited glows a little brighter as we arrive.
    const visiting = active ?? -1
    starMaterial.uniforms.uActive.value = visiting
    starMaterial.uniforms.uFocus.value = rig.warp
    orbitMaterial.uniforms.uActive.value = visiting
    orbitMaterial.uniforms.uFocus.value = rig.warp

    // ── What is the visitor pointing at? ──────────────────────────────────────
    const canHover = pointer.active && pointer.type !== 'touch'
    const cursorX = ((pointer.x + 1) / 2) * size.width
    const cursorY = ((1 - pointer.y) / 2) * size.height
    let litSystem = -1
    let litPlanet = -1
    let hoveringSystem = false

    if (active === null) {
      // Browsing the galaxy: point at whole systems.
      systems.forEach((system, i) => {
        systemWorldPosition(system, time, scratch.position)
        toScreen(scratch.position, camera, size, systemScreen[i])
        systemReach[i] = Math.max(MIN_REACH, pixelsAcross(system.radius * 2, scratch.position, camera, size.height) * 0.45)
      })
      const hovered = state.browsing && canHover ? nearest(systemScreen, cursorX, cursorY, systemReach) : -1
      hoveringSystem = hovered >= 0
      litSystem = hovered >= 0 ? hovered : visible > 0.3 ? (store.listProject ?? -1) : -1
    } else if (store.panelVisible && rig.warp > 0.95) {
      // Visiting a system: point at its planets.
      planets.forEach(({ system, planet }, i) => {
        if (system.index !== active) {
          planetScreen[i].visible = false
          return
        }
        planetWorldPosition(system, planet, time, scratch.position)
        toScreen(scratch.position, camera, size, planetScreen[i])
        planetReach[i] = Math.max(14, pixelsAcross(planet.size * 2, scratch.position, camera, size.height) * 0.9)
      })
      const hovered = canHover ? nearest(planetScreen, cursorX, cursorY, planetReach) : -1
      const listed = store.listPlanet ?? -1
      litPlanet = hovered >= 0 ? planets[hovered].planetIndex : listed
      if (litPlanet >= 0) litSystem = active
    }

    if (litSystem !== state.litSystem || litPlanet !== state.litPlanet) light(litSystem, litPlanet)
    setPointing(hoveringSystem)

    state.hover = THREE.MathUtils.damp(state.hover, litSystem >= 0 ? 1 : 0, 10, delta)
    starMaterial.uniforms.uHover.value = state.hover
    orbitMaterial.uniforms.uHover.value = state.hover
    planetMaterial.uniforms.uHover.value = state.hover

    // Keep the label beside whatever is lit.
    if (litPlanet >= 0) {
      const i = planets.findIndex((p) => p.system.index === litSystem && p.planetIndex === litPlanet)
      if (i >= 0) moveTooltip(planetScreen[i].x, planetScreen[i].y, planetReach[i] * 0.7 + 8)
    } else if (litSystem >= 0) {
      moveTooltip(systemScreen[litSystem].x, systemScreen[litSystem].y, systemReach[litSystem] * 0.55 + 10)
    }
  })

  /** Lights up a system (galaxy view) or one of its planets (while visiting); -1 = nothing. */
  function light(systemIndex: number, planetIndex: number) {
    const store = useStore.getState()
    const state = live.current
    state.litSystem = systemIndex
    state.litPlanet = planetIndex
    state.hover = 0

    const system = systems[systemIndex]
    const planet = system?.planets[planetIndex]
    if (planet) {
      // A planet in the system being visited.
      starMaterial.uniforms.uHighlight.value = -1
      orbitMaterial.uniforms.uHighlight.value = systemIndex
      orbitMaterial.uniforms.uHighlightSub.value = planetIndex
      planetMaterial.uniforms.uHighlight.value = systemIndex
      planetMaterial.uniforms.uHighlightSub.value = planetIndex
      store.setLitPlanet(planetIndex)
      store.setTooltip({ eyebrow: 'Planet', title: planet.tech, tone: planet.color })
    } else {
      // A whole system, or nothing.
      starMaterial.uniforms.uHighlight.value = systemIndex
      orbitMaterial.uniforms.uHighlight.value = systemIndex
      orbitMaterial.uniforms.uHighlightSub.value = -1
      planetMaterial.uniforms.uHighlight.value = -1
      store.setLitPlanet(null)
      store.setTooltip(
        system
          ? {
              eyebrow: `Star system ${String(systemIndex + 1).padStart(2, '0')}`,
              title: system.project.title,
              hint: pointer.type === 'touch' ? 'Tap to warp in' : 'Click to warp in',
              tone: system.color,
            }
          : null,
      )
    }
    store.setLitProject(planet ? null : system ? systemIndex : null)
  }

  /** Shows the hand cursor while over a clickable system. */
  function setPointing(pointing: boolean) {
    if (live.current.pointing === pointing) return
    live.current.pointing = pointing
    document.documentElement.style.cursor = pointing ? 'pointer' : ''
  }

  return (
    // The group's matrix is the galaxy's spin and tilt, set by hand each frame.
    <group ref={group} matrixAutoUpdate={false} visible={false}>
      <instancedMesh
        ref={planetMesh}
        args={[planetGeometry, planetMaterial, planets.length]}
        frustumCulled={false}
        renderOrder={1}
      />
      <mesh geometry={orbitGeometry} material={orbitMaterial} frustumCulled={false} renderOrder={2} />
      <mesh geometry={starGeometry} material={starMaterial} frustumCulled={false} renderOrder={3} />
    </group>
  )
}
