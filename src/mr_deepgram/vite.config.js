import { defineConfig } from 'vite'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills()
  ],
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
    'process.env.NODE_DEBUG': 'false'
  }
})
