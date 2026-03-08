import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../vscode-extension/media/pixel-office',
    emptyOutDir: true,
  },
  base: './',
})
