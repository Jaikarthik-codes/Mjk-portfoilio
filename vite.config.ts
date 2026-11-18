import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Three pages: the site itself, /simple (plain HTML, no 3D) and /lab (the look test bench).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        simple: fileURLToPath(new URL('./simple/index.html', import.meta.url)),
        lab: fileURLToPath(new URL('./lab/index.html', import.meta.url)),
      },
    },
  },
})
