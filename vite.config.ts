// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  /* Needed so packaged Electron loads files via file:// */
  base: './',

  plugins: [
    react(),
    tsconfigPaths(),

    // ─── Build & watch Electron main / preload ────────────────────────
    electron({
      /* main process -------------------------------------------------- */
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            minify: false,
            rollupOptions: {
              // keep Node-only deps external
              external: ['@electron/remote', 'electron-updater']
            }
          }
        }
      },

      /* preload script ------------------------------------------------ */
      preload: {
        input: { preload: 'electron/preload.ts' },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            minify: false
          }
        }
      },

      /* renderer:{} activates vite-plugin-electron-renderer automatically */
      renderer: {}
    })
  ],

  /* nice aliases like "@/utils/date" */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  /* production renderer build */
  build: {
    outDir: 'dist',
    target: 'chrome118' // Electron 28 ≈ Chrome 118
  },

  /* dev server */
  server: { port: 5173 }
});