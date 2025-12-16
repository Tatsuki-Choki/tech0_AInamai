import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Chart library (recharts is large)
          'vendor-charts': ['recharts'],
          // Lucide icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit (optional)
    chunkSizeWarningLimit: 300,
  },
})
