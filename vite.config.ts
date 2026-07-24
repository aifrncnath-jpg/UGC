import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Cross-origin isolation enables SharedArrayBuffer, which lets ONNX Runtime
  // Web use multi-threaded WASM — a big speedup for CPU transcription.
  // 'credentialless' keeps cross-origin resources (Google Fonts, HF model CDN)
  // working without requiring CORP headers from them.
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
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
