import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// https://vite.dev/guide/build#library-mode
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // public/ holds test-only fixtures served at the site root during tests.
  // Never copy it into the published bundle.
  publicDir: command === 'build' ? false : 'public',
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // Peer dependencies must stay external so consumers dedupe their own
      // copies of React and OpenSeadragon.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'openseadragon'],
    },
  },
  test: {
    globals: true,
    watch: false,
    setupFiles: ['./vitest.setup.ts'],
    // Browser mode runs the OSD viewer against a real canvas, matching how the
    // library behaves in consumer apps. Fixtures under public/ are served at the
    // site root (see public/fixtures).
    browser: {
      provider: playwright({
        launchOptions: {
          args: ['--disable-dev-shm-usage'],
        },
      }),
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
      viewport: { height: 1000, width: 1000 },
    },
    reporters: [
      'default',
      ['junit', { outputFile: 'test-results/report.xml', includeConsoleOutput: false }],
    ],
  },
}));
