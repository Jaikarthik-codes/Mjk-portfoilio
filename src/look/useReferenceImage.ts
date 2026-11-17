import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { readPixels, type ImagePixels } from './sampleImage'

export interface ReferenceImage {
  /** The image as a GPU texture, for the gas layer. */
  texture: THREE.Texture
  /** The same image, shrunk to 512 px and read back, for placing particles. */
  pixels: ImagePixels
}

/**
 * Loads a reference image once and prepares it two ways: as a texture (the
 * gas) and as pixels (where the particles go). Returns null while loading.
 */
export function useReferenceImage(url: string): ReferenceImage | null {
  const [result, setResult] = useState<ReferenceImage | null>(null)

  useEffect(() => {
    let cancelled = false
    let texture: THREE.Texture | null = null
    const image = new Image()
    image.src = url
    image
      .decode()
      .then(() => {
        if (cancelled) return
        texture = new THREE.Texture(image)
        // The file is sRGB; the GPU converts it to linear light as it reads it.
        texture.colorSpace = THREE.SRGBColorSpace
        // Mipmaps: pre-shrunk copies of the image, which is what lets the gas
        // shader ask for a softer version of it.
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 4
        texture.needsUpdate = true
        setResult({ texture, pixels: readPixels(image, 512) })
      })
      .catch((error) => console.error(`Could not load ${url}`, error))

    return () => {
      cancelled = true
      texture?.dispose()
      setResult(null)
    }
  }, [url])

  return result
}
