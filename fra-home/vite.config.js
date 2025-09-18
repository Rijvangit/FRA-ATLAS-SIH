import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'lucide-react',
      'leaflet',
      'react-leaflet',
      'react-leaflet-custom-control',
      'leaflet-control-geocoder'
    ]
  },
  resolve: {
    alias: {
      react: require.resolve('react')
    }
  },
  server: {
    port: 5173,
    open: true,
    strictPort: true
  },
  build: {
    sourcemap: true
  }
});
