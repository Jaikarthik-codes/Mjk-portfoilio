/**
 * The site's colours, taken from the reference images in public/textures.
 * Hex values are sRGB, exactly as you would write them in CSS.
 */
export const SPACE_BLACK = '#04050A'

export const LOOK_PALETTE = {
  ember: '#E07A3A', // ember orange: nebula filaments, warm stars
  rose: '#D8566A', // rose: star-forming knots, nebula gas
  gold: '#F3C98B', // warm gold: galaxy core, supernova filaments
  ice: '#A9CCFF', // ice blue: hot young stars, supernova glow
  white: '#F4F7FF', // star white
  seaGreen: '#6FBF9F', // sea green: the supernova's outer edge
  dustBrown: '#5A3A28', // dust brown: dust lanes
} as const

export type LookColour = keyof typeof LOOK_PALETTE
