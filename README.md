# Stardust Origin

An interactive 3D portfolio. One GPU particle system morphs between shapes as
you scroll — a name, a nebula, constellations, a spiral galaxy, a supernova —
entirely in shaders.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Add `?debug` to the address (e.g. `http://localhost:5173/?debug`) for a
developer panel: frame rate, live journey values, a slider that scrubs the
whole page, and a particle-count toggle.

Deploys to Vercel as-is: import the repo and accept the detected Vite preset
(build `npm run build`, output `dist`).

## Edit your content

All text, skills, projects, links and section headings live in
**`src/data/content.ts`**. Change `name` there and the particles spell the new
name; change the skills and the constellations redraw themselves.

## Where things are

```
src/
  data/content.ts              all site content
  store/useStore.ts            global state (Zustand): current section, quality
  journey/
    sections.ts                section order, lengths and timing
    rig.ts                     the live values scroll drives (morph, camera, colour)
    useJourney.ts              the GSAP ScrollTrigger timeline + the opening Big Bang
  lib/                         device detection, seeded random, font loading
  ui/
    Overlay.tsx                the five HTML scroll sections
    sections/                  one component per section
    SectionNav.tsx             floating nav with dots
    DebugHud.tsx               the ?debug panel
  scene/
    config.ts                  look-and-feel constants: palette, sizes, motion
    Scene.tsx                  the WebGL canvas
    ParticleSystem.tsx         builds the geometry + material, updates uniforms
    CameraRig.tsx              scroll-driven camera
    cameraPoses.ts             one camera pose per section
    Backdrop.tsx               the sky gradient (violet → teal → gold)
    pointer.ts                 shared cursor position
    shapeGenerators/           one file per shape: text, nebula, constellation, galaxy, burst
    shaders/
      particles.vert.glsl      the morph engine (start reading here)
      particles.frag.glsl      draws each particle as a soft glowing dot
      backdrop.*.glsl          the sky gradient
      noise.glsl               smooth-noise helpers
```

## How it works

**The morph.** Every particle stores its position and colour in every shape as
vertex attributes. JavaScript sends a single number, `uProgress` (0 name,
1 nebula, 2 constellations, 3 galaxy, 4 burst), and the vertex shader blends
between the stored shapes. Each particle travels in its own time window with
its own delay, and is twisted and blown off course by noise mid-flight, so
morphs look organic and play identically forwards and backwards. The last
morph is special: the galaxy collapses to a point before bursting outward.

**The scroll.** `useJourney` builds one GSAP timeline for the whole page and
ScrollTrigger scrubs it with the scrollbar. The timeline only writes plain
numbers into `rig`; the shader, camera and backdrop read them every frame.
Each section is two screens tall, and its text is pinned in place while you
scroll through it.

To tune the feel, change `MOTION`, `SHAPE_LOOK` and `BACKDROP_GRADES` in
`src/scene/config.ts`, `TIMING` in `src/journey/sections.ts`, and the poses in
`src/scene/cameraPoses.ts`.

## Build phases

- [x] **1. Setup + particle morph engine** — name → nebula → galaxy
- [x] **2. Scroll-driven camera path and all section morphs** — Big Bang intro, constellations, supernova, background grade, nav
- [ ] 3. Constellation hover tooltips, project star systems, click-to-warp, project panels
- [ ] 4. Explore mode
- [ ] 5. Postprocessing, sound, loader, mobile fallback, final polish
