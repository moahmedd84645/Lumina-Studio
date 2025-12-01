import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' allows loading all env vars regardless of prefix (e.g. API_KEY).
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Safely inject the API key into the browser build
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    }
  };
});