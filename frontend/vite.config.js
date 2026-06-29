import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from ../backend directory
  const env = loadEnv(mode, path.resolve(__dirname, '../backend'), '');
  const backendPort = env.PORT || '3001';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/explain': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        }
      }
    }
  }
})
