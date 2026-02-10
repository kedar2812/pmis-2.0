import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit for large apps
  },
  // Base path (use '/' for root deployment)
  base: '/',
  // Development server configuration
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to Django backend in development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
