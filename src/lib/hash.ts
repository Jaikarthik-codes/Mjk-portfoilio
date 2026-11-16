/** Small string hash (FNV-1a). Same text in, same number out, every time. */
export function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** A stable "random" number 0..1 for a piece of text, e.g. a planet's colour from its tech name. */
export function hash01(text: string): number {
  return hashString(text) / 4294967296
}
