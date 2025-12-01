import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // The API Key provided by the user to ensure immediate functionality
  const HARDCODED_KEY = "AIzaSyATlx3U2TSHJfsR9RyiSkUsvipqm35ysYA";

  return {
    plugins: [react()],
    define: {
      // Safely inject the API key into the browser build.
      // Priority: 1. Vercel Env Var, 2. Local .env file, 3. Hardcoded fallback
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || HARDCODED_KEY)
    }
  };
});