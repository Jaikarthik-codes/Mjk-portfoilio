# Stardust Origin

An interactive 3D portfolio. One GPU particle system morphs between shapes — a
name, a nebula, a spiral galaxy — entirely in shaders.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Deploys to Vercel as-is: import the repo and accept the detected Vite preset
(build `npm run build`, output `dist`).

## Edit your content

All text, skills, projects and links live in **`src/data/content.ts`**. Change
`name` there and the particles spell the new name.

## Where things are

```
src/
  data/content.ts            all site content
  store/useStore.ts          global state (Zustand)
  lib/                       device detection, seeded random, font loading
  ui/DebugPanel.tsx          the morph slider
  scene/
    config.ts                look-and-feel constants: palette, sizes, motion
    Scene.tsx                the WebGL canvas
    ParticleSystem.tsx       builds the geometry + material, updates uniforms
    DebugCamera.tsx          Phase 1 orbit camera
    shapeGenerators/         one file per shape: text, nebula, galaxy
    shaders/
      particles.vert.glsl    the morph engine (start reading here)
      particles.frag.glsl    draws each particle as a soft glowing dot
      noise.glsl             smooth-noise helpers
```

## How the morph works

Every particle stores its position and colour in every shape as vertex
attributes. JavaScript sends a single number, `uProgress` (0 = name,
1 = nebula, 2 = galaxy), and the vertex shader blends between the stored
shapes. Each particle travels in its own time window with its own delay, and
is twisted and blown off course by noise mid-flight, so morphs look organic and
play identically forwards and backwards.

To tune the feel, change `MOTION` and `SHAPE_LOOK` in `src/scene/config.ts`.

## Build phases

- [x] **1. Setup + particle morph engine** — name → nebula → galaxy on a debug slider
- [ ] 2. Scroll-driven camera path and all section morphs
- [ ] 3. Constellations, project star systems, click-to-warp, project panels
- [ ] 4. Explore mode
- [ ] 5. Postprocessing, sound, loader, mobile fallback, final polish
