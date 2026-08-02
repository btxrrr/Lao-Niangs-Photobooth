import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @ffmpeg/ffmpeg spawns an internal Web Worker via
    // `new Worker(new URL(...), import.meta.url)`. Vite's dependency
    // pre-bundling breaks that URL resolution (the worker 404s from
    // node_modules/.vite/deps/), which makes ffmpeg.load() hang forever.
    // Excluding these two packages from pre-bundling is the fix
    // recommended by the ffmpeg.wasm project itself for Vite projects.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
