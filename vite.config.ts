/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// `base: './'` keeps every asset path relative, so the built app works from any
// sub-path (GitHub Pages, a file server, `vite preview`).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // Raw access to declaration files in node_modules (bundled for the in-browser type checker).
    alias: { '~nm': resolve(__dirname, 'node_modules') },
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sandbox: resolve(__dirname, 'sandbox.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
