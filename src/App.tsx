import { content } from './data/content'
import { useFontReady } from './lib/fonts'
import { TEXT_SHAPE } from './scene/config'
import { Scene } from './scene/Scene'
import { DebugHud } from './ui/DebugHud'
import { Overlay } from './ui/Overlay'
import { SectionNav } from './ui/SectionNav'

const NAME_FONT = `${TEXT_SHAPE.fontWeight} 100px ${TEXT_SHAPE.fontFamily}`
/** Add ?debug to the address to show the developer panel. */
const DEBUG = new URLSearchParams(window.location.search).has('debug')

export default function App() {
  // The particle name is drawn with this font, so the scene waits for it.
  const fontReady = useFontReady(NAME_FONT, content.name.toUpperCase())

  return (
    <>
      {/* The 3D scene: fixed behind everything, and pure decoration as far as
          assistive technology is concerned. lvh keeps it from resizing when a
          phone's address bar slides away. */}
      <div className="fixed inset-x-0 top-0 h-lvh" aria-hidden="true">
        {fontReady && <Scene />}
      </div>

      <SectionNav />
      {/* The real content. Scrolling through it drives the scene. */}
      <Overlay />

      {DEBUG && <DebugHud />}
    </>
  )
}
