# Image credits

The reference images in `public/textures/` (shipped as WebP, at most 2048 px)
are the gas layers and particle sources of the site's scenes. Full-size
originals are kept in `refs/originals/` and are not deployed.

The sources below were identified from the images themselves. Please confirm
each one (and its exact credit line) before launch — the galaxy in particular.

| File | Used for | Identified as | Credit | Licence |
| --- | --- | --- | --- | --- |
| `stardust.webp` | Intro, star field | Artist's impression of the galaxy A2744_YD4 (ESO) | ESO/M. Kornmesser | CC BY 4.0 |
| `nebula-a.webp` | About, first half | Crab Nebula, Hubble mosaic | NASA, ESA, J. Hester and A. Loll (Arizona State University) | Public domain (NASA) |
| `nebula-b.webp` | About, second half | Helix Nebula in infrared, VISTA | ESO/VISTA/J. Emerson. Acknowledgment: Cambridge Astronomical Survey Unit | CC BY 4.0 |
| `galaxy.webp` | Projects | Face-on spiral galaxy, Hubble — **name to confirm** | ESA/Hubble & NASA (to confirm) | CC BY 4.0 (ESA/Hubble) |
| `supernova.webp` | Contact | Crab Nebula, JWST | NASA, ESA, CSA, STScI, T. Temim (Princeton University) | Public domain (NASA) / CC BY 4.0 (ESA) |

`refs/constellation-style.png` is a style guide only. It is not deployed and
must not be copied into the site.

## Star-atlas figures

The faint figures behind the constellations in the Skills section
(`public/atlas/*.webp`) are plates from Sidney Hall's *Urania's Mirror; or, a
view of the heavens* (London, 1824). **Public domain.** The scans are from the
Library of Congress, via Wikimedia Commons; they were turned into light
engraving on black and lined up with the real stars (see `scripts/atlas/`).

| File | Plate (Wikimedia Commons file) |
| --- | --- |
| `orion.webp` | Sidney Hall - Urania's Mirror - Orion (best currently available version - 2014).jpg |
| `ursa-major.webp` | Sidney Hall - Urania's Mirror - Ursa Major.jpg |
| `cassiopeia.webp` | Sidney Hall - Urania's Mirror - Cassiopeia (image right side up).png |
| `cygnus.webp` | Sidney Hall - Urania's Mirror - Lacerta, Cygnus, Lyra, Vulpecula and Anser.jpg |
| `leo.webp` | Sidney Hall - Urania's Mirror - Leo Major and Leo Minor.png |
| `scorpius.webp` | Sidney Hall - Urania's Mirror - Scorpio.jpg |

Star positions and magnitudes (`src/scene/skills/catalogue.ts`) are standard
J2000 catalogue values for these bright, named stars.

## On the site

A one-line version of these credits is in the footer of the Contact section,
and the full list is on the Simple view page (`/simple/#credits`, from
`src/data/credits.ts`). Keep the three in step.
