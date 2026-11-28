import {defineConfig} from 'vite';

// Source lives in src/, files copied as-is (MP3 encoder, sounds) in public/. base './' keeps every link relative,
// so the same build works at /Soundpost/test/, at /Soundpost/ and inside the phone app (Capacitor).
export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  build: {outDir: '../dist', emptyOutDir: true, assetsInlineLimit: 0},
});
