import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // For GitHub Pages deployment
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'plotly': ['plotly.js-dist-min', 'react-plotly.js'],
          'vendor': ['react', 'react-dom'],
          'numerical': ['ml-levenberg-marquardt']
        }
      }
    }
  }
})
