/**
 * Image credits, shown in the footer and on the Simple view page (and in
 * full in CREDITS.md). The sources were identified from the images; confirm
 * each before launch.
 */
export interface Credit {
  /** What the image is. */
  subject: string
  /** The credit line the image's owner asks for. */
  credit: string
  licence: string
  /** Where on the site it is used. */
  usedFor: string
}

export const IMAGE_CREDITS: Credit[] = [
  { subject: 'Artist’s impression of the galaxy A2744_YD4', credit: 'ESO/M. Kornmesser', licence: 'CC BY 4.0', usedFor: 'Intro, Skills' },
  { subject: 'Crab Nebula (Hubble)', credit: 'NASA, ESA, J. Hester and A. Loll (Arizona State University)', licence: 'Public domain', usedFor: 'About' },
  { subject: 'Helix Nebula (VISTA)', credit: 'ESO/VISTA/J. Emerson', licence: 'CC BY 4.0', usedFor: 'About' },
  { subject: 'Spiral galaxy (Hubble)', credit: 'ESA/Hubble & NASA', licence: 'CC BY 4.0', usedFor: 'Projects' },
  { subject: 'Crab Nebula (JWST)', credit: 'NASA, ESA, CSA, STScI, T. Temim (Princeton University)', licence: 'CC BY 4.0', usedFor: 'Contact' },
  {
    subject: 'Constellation figures from “Urania’s Mirror” (1824)',
    credit: 'Sidney Hall; scans: Library of Congress',
    licence: 'Public domain',
    usedFor: 'Skills',
  },
]
