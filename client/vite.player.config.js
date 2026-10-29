// بناء المشغّل المستقل (ملف JS + CSS واحد) الذي يُضمَّن داخل صفحات التصدير
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'dist-player',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: { entry: 'src/player-entry.jsx', formats: ['iife'], name: 'LamaaPlayer', fileName: () => 'player.js' },
    rollupOptions: { output: { assetFileNames: 'player.[ext]' } },
  },
});
