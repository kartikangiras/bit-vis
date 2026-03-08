import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/web/app',
  plugins: [react()],
  build: {
    outDir: '../../../dist/web/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/fixtures': 'http://127.0.0.1:3000',
    },
  },
  esbuild: {
    target: 'es2020',
  },
});
