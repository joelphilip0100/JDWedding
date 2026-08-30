import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const single = process.env.SINGLE_FILE === '1'

export default defineConfig({
  // relative base => works on GitHub Pages project sites without
  // hard-coding the repository name
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: {
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: single ? 100000000 : 4096,
  },
})
