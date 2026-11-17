# Stardust Origin

An interactive 3D portfolio. One GPU particle system morphs between shapes as
you scroll — a name, a nebula, constellations, a spiral galaxy, a supernova —
entirely in shaders. Each skill is a star you can point at; each project is a
star system in the galaxy that you can warp to.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Add `?debug` to the address (e.g. `http://localhost:5173/?debug`) for a
developer panel: frame rate, live journey values, a slider that scrubs the
whole page, and a particle-count toggle. It also exposes `stardust` in the
browser console — `stardust.gsap.globalTimeline.timeScale(0.2)` plays every
animation, warps included, at a fifth of the speed.

Deploys to Vercel as-is: import the repo and accept the detected Vite preset
(build `npm run build`, output `dist`).

### The look lab

**`/lab`** (e.g. `http://localhost:5173/lab/`) shows each scene of the new
look — stardust, both nebulae, the galaxy, the supernova — live, next to the
reference image it is built from. Switch layers (gas, particles, bloom),
motion, and the phone tier (10k particles, one gas plane) from the buttons.
For tuning: `?ge=1.2` / `?pe=0.8` scale gas / particle exposure, `?gas=0`,
`?particles=0`, `?bloom=0` start with a layer off, `?freeze` stops all motion.

Reference images live in `public/textures/` as WebP (≤ 2048 px); the
full-size originals are in `refs/originals/` and are not deployed. Sources
and licences: [`CREDITS.md`](CREDITS.md).

## Edit your content

All text, skills, projects, links and section headings live in
**`src/data/content.ts`**. Change `name` there and the particles spell the new
name; change the skills and the constellations redraw themselves; add a project
and a new star system appears in the galaxy, with one planet per technology.

## Where things are

The new two-layer look (being rolled out — see the lab above) lives in
`src/look/`: `scenes.ts` (per-scene tuning), `sampleImage.ts` (image →
particles), `GasLayer.tsx`, `StarParticles.tsx`, `LookEffects.tsx` (bloom,
ACES tone mapping, space black), and their shaders in `src/look/shaders/`.
The lab page itself is `src/lab/`.

```
src/
  data/content.ts              all site content
  store/useStore.ts            global state (Zustand): current section, hover, open project, quality
  journey/
    sections.ts                section order, lengths and timing
    rig.ts                     the live values scroll and warps drive (morph, camera, colour, warp)
    useJourney.ts              the GSAP ScrollTrigger timeline + the opening Big Bang
    warp.ts                    flying to a star system, between systems, and back
  lib/                         device detection, seeded random, hashing, font loading
  ui/
    Overlay.tsx                the five HTML scroll sections
    sections/                  one component per section
    SectionNav.tsx             floating nav with dots
    ProjectPanel.tsx           the glass panel a warp opens (a native modal <dialog>)
    Tooltip.tsx                the label beside stars and planets
    DebugHud.tsx               the ?debug panel
  scene/
    config.ts                  look-and-feel constants: palette, sizes, motion
    Scene.tsx                  the WebGL canvas (and a note on colour)
    frame.ts                   shared clock, canvas size and cursor uniforms
    ParticleSystem.tsx         builds the geometry + material, updates uniforms
    CameraRig.tsx              scroll camera, warp flight, and where the warp is heading
    cameraPoses.ts             one camera pose per section, and the star-system close-up
    Backdrop.tsx               the sky gradient (violet → teal → gold)
    Effects.tsx                post-processing (the warp's colour fringing)
    galaxyFrame.ts             the galaxy's spin and tilt, mirrored from the shader
    picking.ts                 hover and tap tests, done on screen
    instanced.ts, materials.ts thin lines and glowing sprites, many per draw call
    skills/SkillStars.tsx      skill stars + constellation lines, with hover labels
    projects/
      systemLayout.ts          where each project's star system and planets go
      StarSystems.tsx          stars, orbits and planets; hover and click to warp
    warp/                      hyperspace streaks and the colour-fringing effect
    shapeGenerators/           one file per shape: text, nebula, constellation, galaxy, burst
    shaders/
      particles.vert.glsl      the morph engine (start reading here)
      particles.frag.glsl      draws each particle as a soft glowing dot
      pointer.glsl             cursor gravity, shared by several shaders
      lines.*, sprite.vert, star.frag   constellation lines, orbits and stars
      planet.*                 lit planets with cloud bands and atmosphere
      streak.*, warp.frag      hyperspace streaks and the warp's chromatic aberration
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

**The warp.** Click a star system (or a project in the list) and `warp.ts`
animates `rig.warp` from 0 to 1. The camera blends from its scroll pose to a
close-up of the system — distance on a logarithmic scale, so the approach feels
like constant acceleration — while `rig.warpFx` drives the hyperspace streaks,
a wider lens and a radial chromatic aberration. The galaxy's dust clears around
the system, and the project panel opens as the camera brakes. Escape, the close
button or a click on empty space flies you back to the exact scroll position.

**Pointing at things.** Rather than casting rays into the scene, every frame
the site works out where each star, system and planet lands on screen and
compares that with the cursor (`picking.ts`). It is cheap, and it matches what
you see, including the cursor push.

**Colour.** Every shader works in linear light and converts to sRGB itself, so
the picture is identical with or without post-processing (see `Scene.tsx`).

To tune the feel, change `MOTION`, `SHAPE_LOOK` and `BACKDROP_GRADES` in
`src/scene/config.ts`, `SYSTEM_LOOK` in `src/scene/projects/systemLayout.ts`,
`TIMING` in `src/journey/sections.ts`, the poses in `src/scene/cameraPoses.ts`,
and the flight times at the top of `src/journey/warp.ts`.

## Accessibility

- Everything is real HTML text first: the skills list, the project list and the
  project panel carry all the content; the 3D scene is decoration
  (`aria-hidden`).
- Projects open from keyboard-focusable buttons. The panel is a native modal
  dialog: focus moves into it, Tab stays inside, Escape closes it, and focus
  returns to where it was. ← and → step between systems.
- With *reduced motion* switched on, the Big Bang is skipped and warps cut
  straight to the system with no streaks or colour fringing.

## Build phases

- [x] **1. Setup + particle morph engine** — name → nebula → galaxy
- [x] **2. Scroll-driven camera path and all section morphs** — Big Bang intro, constellations, supernova, background grade, nav
- [x] **3. Constellations, project star systems, warp, project panels** — hover labels, planets per tech, hyperspace streaks + chromatic aberration, glass panel
- [ ] 4. Explore mode
- [ ] 5. Postprocessing, sound, loader, mobile fallback, final polish
