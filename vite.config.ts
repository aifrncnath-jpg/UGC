import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    port: 4173,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // onnxruntime-web / transformers.js ship WASM + workers that Vite's
    // dep pre-bundler shouldn't try to optimize.
    exclude: ['@huggingface/transformers'],
  },
})
