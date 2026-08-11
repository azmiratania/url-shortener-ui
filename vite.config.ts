import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/v1': 'http://localhost:3000',
      '/preview': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
