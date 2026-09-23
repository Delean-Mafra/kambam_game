import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/kambam_game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  }
});
