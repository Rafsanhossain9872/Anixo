import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy vendor libraries into separate cached chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-hls': ['hls.js'],
          'vendor-socket': ['socket.io-client'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-axios': ['axios'],
        }
      }
    }
  },
  server: {
    watch: {
      ignored: ['**/api/**']
    },
    proxy: {
      '/api': { target: 'http://localhost:7860', changeOrigin: true, secure: false }
    }
  }
})

