// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

/**
 * В build-режиме:
 *   1. Копирует modules/*.js в dist/modules/
 *   2. Удаляет те, у кого status !== 'stable'
 * В dev-режиме не активен.
 */
function stableModulesOnly() {
  return {
    name: 'stable-modules-only',
    apply: 'build',
    closeBundle() {
      const SRC = resolve(__dirname, 'modules')
      const DST = resolve(__dirname, 'dist/modules')

      if (!fs.existsSync(SRC)) {
        console.warn('[stable-modules] modules/ not found')
        return
      }
      if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true })

      let kept = 0, removed = 0
      const available = []

      for (const file of fs.readdirSync(SRC)) {
        if (!file.endsWith('.js')) continue
        const src = fs.readFileSync(path.join(SRC, file), 'utf-8')
        const m = src.match(/\bstatus\s*:\s*['"](\w+)['"]/)
        const status = m ? m[1] : 'beta'

        const SHIP_STATUSES = ['stable', 'passable'];   // ⭐ что попадает в build

        if (SHIP_STATUSES.includes(status)) {
            fs.copyFileSync(path.join(SRC, file), path.join(DST, file));
            available.push(file.replace(/\.js$/, ''));
            kept++;
        } else {
            removed++;
        }
      }

      fs.writeFileSync(
        path.join(DST, 'manifest.json'),
        JSON.stringify({ modules: available }, null, 2)
      )

      console.log(`[stable-modules] kept ${kept}, removed ${removed}`)
      console.log(`[stable-modules] manifest: ${available.join(', ') || '(empty)'}`)
    },
  }
}

export default defineConfig({
  plugins: [
    stableModulesOnly(),
  ],

  server: {
    port: 3000,
    middleware: [
      (req, res, next) => {
        if (req.url === '/editor' || req.url === '/editor/') {
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