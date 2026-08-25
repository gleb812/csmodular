// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
    // Перенаправляем /editor на editor.html
    middleware: [
      (req, res, next) => {
        if (req.url === '/editor') {
          req.url = '/editor/editor.html'
        }
        next()
      }
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@editor': resolve(__dirname, 'editor')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor/editor.html')
      }
    }
  },
  publicDir: 'public'
})