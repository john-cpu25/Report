import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/Report/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, './src/UI'),
    },
  },
  server: {
    fs: {
      allow: [
        // Allow serving files from UI/ folder
        path.resolve(__dirname, './src/UI'),
        // Default: project root
        '.',
      ],
    },
  },
})
