import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {copyFileSync, mkdirSync, rmSync} from 'node:fs';

export default defineConfig({
  base: './',
  build: {assetsInlineLimit: 0},
  plugins: [react(), {
    name: 'development-csp',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Vite's development refresh preamble requires inline JavaScript.
        // The production HTML keeps the strict policy from index.html.
        return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '');
      },
    },
  }, {
    name: 'optimized-static-assets',
    closeBundle() {
      // Vite keeps public/ available in dev. Remove only full font copies from the
      // generated site, which imports its WOFF2 subsets through src/main.tsx.
      rmSync('dist/fonts/PretendardVariable.woff2', {force: true});
      rmSync('dist/fonts/NanumPenScript-Regular.ttf', {force: true});
      mkdirSync('dist/images', {recursive: true});
      copyFileSync('images/optimized/share.jpg', 'dist/images/share.jpg');
    },
  }],
});
