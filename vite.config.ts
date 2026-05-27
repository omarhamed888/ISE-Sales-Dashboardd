import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      deny: ['.claude'],
    },
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        // Split heavy, rarely-changing vendor code out of the entry chunk so it
        // downloads in parallel and stays cached across app redeploys. firebase
        // (auth + firestore) is the bulk of first-paint JS; react and recharts
        // are the other large vendors. recharts/xlsx are already lazy-loaded, so
        // their chunks never reach the initial bundle.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          // Firestore is the single heaviest dependency; keep it as its own
          // chunk so it caches independently of auth and the rest of firebase.
          if (/[\\/]node_modules[\\/](@firebase[\\/]firestore|@firebase[\\/]webchannel-wrapper|firebase[\\/]firestore)[\\/]/.test(id)) {
            return 'firebase-firestore';
          }
          if (/[\\/]node_modules[\\/](@firebase[\\/]auth|firebase[\\/]auth)[\\/]/.test(id)) {
            return 'firebase-auth';
          }
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) {
            return 'firebase-core';
          }
          if (/[\\/]node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor|internmap)[\\/]/.test(id)) {
            return 'recharts-vendor';
          }
        },
      },
    },
  },
});
