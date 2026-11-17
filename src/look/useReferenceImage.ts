import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { readPixels, type ImagePixels } from './sampleImage'
import { LOOK_SCENES, type LookSceneId } from './scenes'

export interface ReferenceImage {
  /** The image as a GPU texture, for the gas layer. */
  texture: THREE.Texture
  /** The same image, shrunk to 512 px and read back, for placing particles. */
  pixels: ImagePixels
}

/** Loads an image and prepares it two ways: as a texture (the gas) and as pixels (where the particles go). */
export async function loadReferenceImage(url: string): Promise<ReferenceImage> {
  const image = new Image()
  image.src = url
  await image.decode()
  const texture = new THREE.Texture(image)
  // The file is sRGB; the GPU converts it to linear light as it reads it.
  texture.colorSpace = THREE.SRGBColorSpace
  // Mipmaps: pre-shrunk copies of the image, which is what lets the gas
  // shader ask for a softer version of it.
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 4
  texture.needsUpdate = true
  return { texture, pixels: readPixels(image, 512) }
}

/** One scene's reference image (the look lab). Returns null while loading. */
export function useReferenceImage(url: string): ReferenceImage | null {
  const [result, setResult] = useState<ReferenceImage | null>(null)

  useEffect(() => {
    let cancelled = false
    let loaded: ReferenceImage | null = null
    loadReferenceImage(url)
      .then((reference) => {
        loaded = reference
        if (cancelled) reference.texture.dispose()
        else setResult(reference)
      })
      .catch((error) => console.error(`Could not load ${url}`, error))

    return () => {
      cancelled = true
      loaded?.texture.dispose()
      setResult(null)
    }
  }, [url])

  return result
}

export type ReferenceImages = Record<LookSceneId, ReferenceImage>

/** Every scene's image, loaded once for the whole visit (the site needs them all up front). */
let allReferences: Promise<ReferenceImages> | null = null

function loadAll(): Promise<ReferenceImages> {
  allReferences ??= Promise.all(
    LOOK_SCENES.map(async (scene) => [scene.id, await loadReferenceImage(scene.texture)] as const),
  ).then((entries) => Object.fromEntries(entries) as ReferenceImages)
  return allReferences
}

/**
 * All five reference images, for the main site. Returns null while they load
 * (about 1.4 MB in all), or if one of them could not be loaded.
 */
export function useReferenceImages(): ReferenceImages | null {
  const [result, setResult] = useState<ReferenceImages | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAll()
      .then((references) => {
        if (!cancelled) setResult(references)
      })
      .catch((error) => console.error('Could not load the reference images', error))
    return () => {
      cancelled = true
    }
  }, [])

  return result
}
