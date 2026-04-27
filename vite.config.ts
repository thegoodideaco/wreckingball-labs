import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

import wasm from 'vite-plugin-wasm'
// import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // topLevelAwait({
    //   // The export name of top-level await promise for each chunk module
    //   promiseExportName: '__tla',
    //   // The function to generate import names of top-level await promise in each chunk module
    //   promiseImportName: (i) => `__tla_${i}`,
    // }),
    wasm(),
    tailwindcss(),
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
