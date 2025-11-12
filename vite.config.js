import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      include: ['**/*.jsx', '**/*.tsx', '**/*.js', '**/*.ts'],
    }),
  ],
  optimizeDeps: {
    entries: ['index.html'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*', 'dist/**/*'],
    css: true,
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
})
