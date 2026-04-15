import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative asset paths so the same build works in two hosts:
  //   - Vercel (HTTP root): './assets/…' resolves to '/assets/…' — fine
  //   - Electron (file://):  './assets/…' resolves next to index.html — required
  // Default ('/') emits absolute paths that break under Electron's file://
  // because '/assets/…' resolves to the disk root, not the app bundle.
  base: './',
  plugins: [
    react(),
    // Cornerstone's codec bundles (libjpeg-turbo, openjpeg, charls, openjph)
    // are CommonJS with no default export. This plugin gives them proper
    // ESM interop so the dicom-image-loader can `import decode from …`.
    viteCommonjs(),
  ],
  resolve: {
    alias: [
      // Stub out cornerstone's optional polyseg segmentation dep — we don't
      // use segmentation and its WASM binary breaks Vite's build pipeline.
      { find: '@icr/polyseg-wasm', replacement: resolve(__dirname, 'empty-module.js') },
    ],
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
  },
});
