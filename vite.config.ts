import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  tailwindcss(),
  ],
  server: {
    allowedHosts: true,
  },
  esbuild: {
    drop: ['console', 'debugger'], // This drops all console and debugger statements
  },
  build: {
    // Optimize chunk size for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react']
        }
      }
    }
  }
})
