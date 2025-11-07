import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your-api-key-here') {
      console.warn('⚠️  WARNING: GEMINI_API_KEY is not set or still has placeholder value in .env.local');
      console.warn('   Please set your actual Gemini API key in .env.local and restart the dev server.');
    }
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
