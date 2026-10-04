import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueRouter from 'vue-router/vite'
import vueLayouts from 'vite-plugin-vue-layouts'
import ui from '@nuxt/ui/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Only API_PORT is read here; server secrets in .env are never exposed to the client bundle.
  const { API_PORT = '3001' } = loadEnv(mode, process.cwd(), '')
  const api = `http://localhost:${API_PORT}`

  return {
    plugins: [
      vueRouter({
        dts: 'src/route-map.d.ts'
      }),
      vueLayouts(),
      vue(),
      ui({
        ui: {
          colors: {
            primary: 'green',
            neutral: 'zinc'
          }
        }
      })
    ],
    server: {
      proxy: {
        '/api': api,
        '/oauth': api,
        '/.well-known': api
      }
    }
  }
})
