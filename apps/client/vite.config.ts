import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { getServerPaths, loadSecureEnv } from '@repo/shared/node';
const { PROJECT_ROOT } = getServerPaths(__dirname);

loadSecureEnv(PROJECT_ROOT);

export default defineConfig(() => {
  const API_PORT = process.env.PORT || 3000;
  const isDev = process.env.NODE_ENV !== 'production';
  // 开发模式：直连后端端口；生产模式：空字符串使 Socket.IO 走 Nginx 同源代理
  const API_BASE_URL = isDev ? `http://localhost:${API_PORT}` : '';
  return {
    define: {
      API_BASE_URL: JSON.stringify(API_BASE_URL)
    },
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
        },
        '/socket.io': {
          target: `http://localhost:${API_PORT}`,
          changeOrigin: true,
          ws: true,
        }
      }
    }
  }
})
