import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id)) return 'react';
          if (id.includes('i18next')) return 'i18n';
          if (id.includes('lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  },
});
