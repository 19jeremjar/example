/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The lazily loaded Scene chunk carries all of three.js (about 230 kB gzipped).
    // It downloads behind the title card, so it doesn't block first paint.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
