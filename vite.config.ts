import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import tailwindcss from '@tailwindcss/vite'; // Import the new plugin
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(), // Add this here
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'fs', 'path', 'os', 'crypto'],
            },
          },
        },
      },
      {
        entry: 'src/main/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'fs', 'path', 'os', 'crypto'],
              output: { format: 'cjs', entryFileNames: 'preload.js' },
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  // You no longer need the 'css' block for PostCSS if using the Vite plugin
  base: './',
});