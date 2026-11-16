import { content } from './data/content'
import { useFontReady } from './lib/fonts'
import { TEXT_SHAPE } from './scene/config'
import { Scene } from './scene/Scene'
import { DebugPanel } from './ui/DebugPanel'

const NAME_FONT = `${TEXT_SHAPE.fontWeight} 100px ${TEXT_SHAPE.fontFamily}`

export default function App() {
  // The particle name is drawn with this font, so the scene waits for it.
  const fontReady = useFontReady(NAME_FONT, content.name.toUpperCase())

  return (
    <>
      {/* Real text for screen readers and search engines. The canvas is decoration. */}
      <main>
        <h1 className="sr-only">{content.name}</h1>
        <p className="sr-only">{content.title}</p>
      </main>

      <div className="fixed inset-0" aria-hidden="true">
        {fontReady && <Scene />}
      </div>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between p-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/50 sm:p-7">
        <span className="text-white/80">Stardust Origin</span>
        <span className="hidden text-right sm:block">Drag to orbit · scroll to zoom</span>
      </header>

      <DebugPanel />
    </>
  )
}
