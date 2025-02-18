import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'static',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'static/main.js'),
      output: {
        entryFileNames: 'ttsbundle.js',
        format: 'iife',
        dir: 'static'
      }
    }
  },
  define: {
    global: 'globalThis',
    'Buffer': 'globalThis.Buffer',
    'process.env.NODE_DEBUG': 'false'
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
      stream: 'stream-browserify',
      util: 'util/'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  }
})
