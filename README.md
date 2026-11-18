# Stardust Origin

An interactive 3D portfolio. As you scroll, the sky changes from one deep-space
picture to the next — stardust around a name, two nebulae, a calm star field,
a spiral galaxy, a supernova. Each picture has two layers: its glowing gas (the
reference image itself) and tens of thousands of particles sampled from it,
which fly from one picture to the next entirely in shaders. Each skill group
is a real constellation (Orion, Ursa Major, Cassiopeia, …) with its skills on
the brightest stars; each project is a star system in the galaxy that you can
warp to. The galaxy ends in a supernova, with the contact links at its heart.

Two more pages: **`/simple/`** is the whole portfolio as plain HTML (no 3D),
linked from the navigation with the resume download; **`/lab/`** is the look
test bench (below).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Add `?debug` to the address (e.g. `http://localhost:5173/?debug`) for a
developer panel: frame rate, live journey values, a slider that scrubs the
whole page, and a quality toggle (150k / 50k / 10k particles). It also exposes `stardust` in the
browser console — `stardust.gsap.globalTimeline.timeScale(0.2)` plays every
animation, warps included, at a fifth of the speed.

Add `?quality=ultra` (or `high`, `low`) to choose the quality tier yourself;
otherwise it is detected (see **Quality** below).

Deploys to Vercel as-is: import the repo and accept the detected Vite preset
(build `npm run build`, output `dist`).

### The look lab

**`/lab`** (e.g. `http://localhost:5173/lab/`) shows each scene of the
look — stardust, both nebulae, the galaxy, the supernova — live, next to the
reference image it is built from. Switch layers (gas, particles, bloom),
motion, and the phone tier (10k particles, one gas plane) from the buttons.
For tuning: `?ge=1.2` / `?pe=0.8` scale gas / particle exposure, `?gas=0`,
`?particles=0`, `?bloom=0` start with a layer off, `?freeze` stops all motion.

Reference images live in `public/textures/` as WebP (≤ 2048 px); the
full-size originals are in `refs/originals/` and are not deployed. Sources
and licences: [`CREDITS.md`](CREDITS.md). The constellation figures are
plates from Sidney Hall's *Urania's Mirror* (1824, public domain) in
`public/atlas/`; how they were made and lined up with the stars is in
`scripts/atlas/`.

## Edit your content

All text, skills, projects, links and section headings live in
**`src/data/content.ts`**. Change `name` there and the particles spell the new
name; change the skills and the constellations redraw themselves (each group
gets the next real constellation with enough stars, up to six groups); add a
project and a new star system appears on the galaxy's arms, with one planet per
technology. Each project can have a live link, source, API docs and two "what I
built" lines. Replace **`public/resume.pdf`** (a placeholder) with your resume.

## Where things are

The look of each picture lives in `src/look/`: `scenes.ts` (per-image
tuning, shared by the site and the lab), `sampleImage.ts` (image →
particles), `GasLayer.tsx` (the gas material), `palette.ts`, and the lab's
own `StarParticles.tsx` and `LookEffects.tsx`. The lab page itself is
`src/lab/`.

```
src/
  data/content.ts              all site content
  store/useStore.ts            global state (Zustand): current section, hover, open project, quality
  journey/
    sections.ts                section order, lengths and timing
    rig.ts                     the live values scroll and warps drive (morph, camera, warp)
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
    config.ts                  look-and-feel constants: quality tiers, shapes and their pictures, motion
    Scene.tsx                  the WebGL canvas (and a note on colour)
    frame.ts                   shared clock, canvas size and cursor uniforms
    GasStack.tsx, gasState.ts  the gas pictures, and how they fade into each other as you scroll
    ParticleSystem.tsx         builds the geometry + material, updates uniforms
    CameraRig.tsx              scroll camera, warp flight, and where the warp is heading
    cameraPoses.ts             one camera pose per section, and the star-system close-up
    Effects.tsx                bloom, ACES tone mapping, space black, the warp's colour fringing
    galaxyFrame.ts             the galaxy's spin and orientation, mirrored from the shader
    picking.ts                 hover and tap tests, done on screen
    instanced.ts, materials.ts thin lines and glowing sprites, many per draw call
    skills/
      catalogue.ts             real constellations: star positions, magnitudes, stick figures
      atlas.ts                 where each star-atlas figure sits behind its stars
      Constellations.tsx       stars, lines (drawn in), atlas figures, labels; drawn after tone mapping
    nova/SupernovaFlash.tsx    the supernova's flash and shock ring
    GasStack.tsx, gasState.ts  (see above)
    projects/
      systemLayout.ts          where each project's star system and planets go
      StarSystems.tsx          stars, orbits and planets; hover and click to warp
    warp/                      hyperspace streaks and the colour-fringing effect
    shapeGenerators/           every shape: sampled from the pictures (index.ts), the name (text.ts), the star field (field.ts)
    shaders/
      particles.vert.glsl      the morph engine (start reading here)
      particles.frag.glsl      draws each particle: Gaussian core, and spikes for hero stars
      pointer.glsl             cursor gravity, shared by several shaders
      lines.*, sprite.vert, star.frag   orbits and star-system stars
      planet.*                 lit planets with cloud bands and atmosphere
      streak.*, warp.frag      hyperspace streaks and the warp's chromatic aberration
      noise.glsl               smooth-noise helpers
```

## How it works

**Two layers.** Each picture is a reference image (`public/textures/`) shown
twice. The gas is the image itself on a plane — softened, drifting very slowly,
feathered to black at the edges, and on capable devices on two planes at
different depths so they shift against each other. The particles are sampled
from the same image: more where it is brighter, each with its pixel's colour,
with depth from brightness. 2% are hero stars (some with diffraction spikes),
13% medium stars and 85% faint dust; a particle keeps its class in every shape.

**The morph.** Every particle stores its position and colour in every shape as
vertex attributes. JavaScript sends a single number, `uProgress` (0 name,
1 nebula A, 2 nebula B, 3 star field, 4 galaxy, 5 supernova), and the vertex
shader blends between the stored shapes. Each particle travels in its own time
window with its own delay, and is twisted and blown off course by noise
mid-flight, so morphs look organic and play identically forwards and
backwards. Meanwhile the old picture's gas fades out and the new one's fades in
(`gasState.ts`). The last morph is special: the galaxy collapses to a point, a
short flash, then the supernova bursts out of it.

**The scroll.** `useJourney` builds one GSAP timeline for the whole page and
ScrollTrigger scrubs it with the scrollbar. The timeline only writes plain
numbers into `rig`; the shaders and the camera read them every frame.
Each section is two screens tall, and its text is pinned in place while you
scroll through it. About holds two pictures: nebula A turns into nebula B
while its text is on screen.

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

**Colour.** Every shader works in linear light, and light may add up past 1.
The scene is drawn into a high-range image, then `Effects.tsx` blooms the
brightest light, tone maps it (ACES filmic, so bright gas compresses instead of
clipping to white), and lays space black (#04050A) underneath.

**Quality.** Three tiers (`QUALITY` in `src/scene/config.ts`):
*ultra* — detected from a dedicated graphics card (NVIDIA, AMD Radeon RX/Pro,
Intel Arc, Apple Pro/Max/Ultra chips) — gets 150,000 particles (the extra ones
all fine dust), pictures read at 1024 px, a pixel ratio up to 2 and full bloom;
*high* gets 50,000 particles, two gas planes and bloom at a pixel ratio up to
1.5; phones and low-power devices get *low*: 10,000 particles, one gas plane and
no bloom. The shapes are built in the background (one at a time) and the Big
Bang starts when they are ready. On a laptop with two graphics chips, let the
browser use the dedicated one (Windows: Settings → Display → Graphics).

**The constellations** are drawn in a second pass, straight to the screen
after tone mapping and bloom, so their colours are exact: crisp white discs,
1 px lines in #7FA6D9 at 50%, atlas figures at 12%. Lines draw in one after
another when the section arrives; a skill's name appears when you point at its
star, focus or hover it in the list, or tap it.

To tune the feel, change `STAGES`, `MOTION` and `SHAPE_LOOK` in
`src/scene/config.ts`, the per-image looks in `src/look/scenes.ts` (try them in
the lab), `SYSTEM_LOOK` in `src/scene/projects/systemLayout.ts`, `TIMING` and
`MORPHS` in `src/journey/sections.ts`, the poses in `src/scene/cameraPoses.ts`,
and the flight times at the top of `src/journey/warp.ts`.

## Accessibility

- Everything is real HTML text first: the skills list, the project list and the
  project panel carry all the content; the 3D scene is decoration
  (`aria-hidden`).
- Projects open from keyboard-focusable buttons. The panel is a native modal
  dialog: focus moves into it, Tab stays inside, Escape closes it, and focus
  returns to where it was. ← and → step between systems.
- Each skill in the Skills list is a button: focusing it with the keyboard
  lights its star and shows its name in the sky.
- `/simple/` carries everything as plain HTML, linked from the navigation on
  every screen.
- With *reduced motion* switched on, the pictures are still: no drift, spin or
  twinkle, no cursor push, the Big Bang and the supernova flash are skipped,
  each picture dissolves into the next instead of flying, the constellations
  appear fully drawn, the camera cuts rather than glides, and warps cut
  straight to the system with no streaks or colour fringing.

## Build phases

- [x] **1. Setup + particle morph engine** — name → nebula → galaxy
- [x] **2. Scroll-driven camera path and all section morphs** — Big Bang intro, constellations, supernova, background grade, nav
- [x] **3. Constellations, project star systems, warp, project panels** — hover labels, planets per tech, hyperspace streaks + chromatic aberration, glass panel (paused for the visual rework; finished in the new look afterwards)
- Visual rework:
  - [x] **A. Look lab** — each picture's two-layer look next to its reference (`/lab`)
  - [x] **B. Looks wired into the scroll** — sampled particle shapes, gas crossfades, HDR + ACES + bloom, space black, tiers, reduced motion
  - [x] **C. Constellations and the supernova contact section** — real constellations with atlas figures, draw-in, labels on hover/focus/tap; collapse, flash and shock ring; simple view, resume, credits; ultra tier
- [ ] Finish 3 in the new look (star systems, panels)
- [ ] 4. Explore mode (optional — hook in `src/features/explore.ts`)
- [ ] 5. Loader, sound (optional — hook in `src/features/audio.ts`), final polish
