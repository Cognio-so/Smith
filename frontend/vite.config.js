import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // Split large dependencies into separate chunks
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          utils: ['axios', 'date-fns', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: true
  }
})
