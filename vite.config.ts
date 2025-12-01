import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Stringify the API key to embed it into the client bundle during build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});