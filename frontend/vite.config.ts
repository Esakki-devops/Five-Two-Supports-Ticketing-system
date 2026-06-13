import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Split heavy, rarely-changing vendors into separately-cacheable chunks so
    // the eager app bundle stays lean and browser caching survives app updates.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@tanstack')) return 'tanstack';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod'))
            return 'forms';
          if (id.includes('socket.io') || id.includes('engine.io')) return 'socket';
          if (id.includes('react-router') || id.includes('/@remix-run/')) return 'router';
          if (/[\\/]react(-dom)?[\\/]/.test(id) || id.includes('/scheduler/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    // Same-origin proxy to the backend so cookies (refresh token) work in dev.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
