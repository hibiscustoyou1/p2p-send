import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { getServerPaths, loadSecureEnv } from '@repo/shared/node';
const { PROJECT_ROOT } = getServerPaths(__dirname);

loadSecureEnv(PROJECT_ROOT);

export default defineConfig(() => {
  const API_PORT = process.env.PORT || 3000;
  return {
    plugins: [
      vue(),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), 'src/assets/images/svgs')],
        symbolId: 'icon-[dir]-[name]'
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${API_PORT}`,
          changeOrigin: true,
        }
      }
    }
  }
})
