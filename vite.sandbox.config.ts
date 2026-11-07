import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * The exercise sandbox runs React Testing Library, which needs `act()`. React only ships `act` in its
 * development build, so the sandbox iframe is built separately with NODE_ENV=development
 * (exactly what Vitest/Jest use when you test React locally). The main app stays a production build.
 */
export default defineConfig({
  base: './',
  mode: 'development',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('development') },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: { sandbox: resolve(__dirname, 'sandbox.html') },
      output: { entryFileNames: 'sandbox/[name]-[hash].js', chunkFileNames: 'sandbox/[name]-[hash].js', assetFileNames: 'sandbox/[name]-[hash][extname]' },
    },
  },
});
