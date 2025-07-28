import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      '8b4b1dac400f.ngrok-free.app'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
