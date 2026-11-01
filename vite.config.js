// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'
import { readFileSync } from 'fs'   // ⭐ NEW

// ⭐ NEW — читаем версию из package.json для splash
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

/**
 * В build-режиме:
 *   1. Копирует public/libraries/* → dist/libraries/*
 *   2. Из каждой библиотеки оставляет только модули со status stable|passable
 *   3. Переписывает <lib>/_index.json с отфильтрованным списком modules[]
 *   4. Переписывает dist/libraries/_index.json со списком непустых библиотек
 *   5. Пишет dist/libraries/manifest.json = { modules: [names] }  (legacy для ContextMenu)
 * В dev-режиме не активен.
 */
function stableModulesOnly() {
  return {
    name: 'stable-modules-only',
    apply: 'build',
    closeBundle() {


      const SRC = resolve(__dirname, 'public/libraries')
      const DST = resolve(__dirname, 'dist/libraries')

      if (!fs.existsSync(SRC)) {
        console.warn('[stable-modules] public/libraries/ not found')
        return
      }

      // Пересоздаём dist/libraries с нуля, чтобы не тащить старьё
      if (fs.existsSync(DST)) fs.rmSync(DST, { recursive: true, force: true })
      fs.mkdirSync(DST, { recursive: true })

      const SHIP_STATUSES = ['stable', 'passable']
      const shippedLibs = []
      const shippedModules = []   // legacy-плоский список
      let keptTotal = 0, removedTotal = 0

      // Читаем корневой _index.json (список библиотек)
      const rootIndexPath = path.join(SRC, '_index.json')
      if (!fs.existsSync(rootIndexPath)) {
        console.warn('[stable-modules] public/libraries/_index.json not found')
        fs.writeFileSync(path.join(DST, 'manifest.json'), JSON.stringify({ modules: [] }, null, 2))
        return
      }
      const rootIndex = JSON.parse(fs.readFileSync(rootIndexPath, 'utf-8'))
      const libNames = Array.isArray(rootIndex?.libraries) ? rootIndex.libraries : []

      for (const libName of libNames) {
        const libSrc = path.join(SRC, libName)
        if (!fs.existsSync(libSrc) || !fs.statSync(libSrc).isDirectory()) {
          console.warn(`[stable-modules] library "${libName}" not found — skip`)
          continue
        }

        const modulesSrc = path.join(libSrc, 'modules')
        if (!fs.existsSync(modulesSrc)) {
          console.warn(`[stable-modules] "${libName}/modules" not found — skip`)
          continue
        }

        const kept = []
        let removed = 0

        for (const file of fs.readdirSync(modulesSrc)) {
          if (!file.endsWith('.js')) continue
          const code = fs.readFileSync(path.join(modulesSrc, file), 'utf-8')
          const m = code.match(/\bstatus\s*:\s*['"](\w+)['"]/)
          const status = m ? m[1] : 'dev'
          if (SHIP_STATUSES.includes(status)) {
            kept.push(file.replace(/\.js$/, ''))
          } else {
            removed++
          }
        }

        if (kept.length === 0) {
          console.log(`[stable-modules] "${libName}": 0/${kept.length + removed} — skip library`)
          removedTotal += removed
          continue
        }

        // Копируем: modules/ (только прошедшие), csound/ (всё), meta.json (если есть)
        fs.mkdirSync(path.join(DST, libName, 'modules'), { recursive: true })
        for (const name of kept) {
          fs.copyFileSync(
            path.join(modulesSrc, `${name}.js`),
            path.join(DST, libName, 'modules', `${name}.js`)
          )
          shippedModules.push(name)
        }

        // ⭐ UDO лежат рядом с .js в modules/ — копируем вместе
        for (const name of kept) {
          const txtSrc = path.join(modulesSrc, `${name}.txt`)
          if (fs.existsSync(txtSrc)) {
            fs.copyFileSync(
              txtSrc,
              path.join(DST, libName, 'modules', `${name}.txt`)
            )
          }
        }

        const metaSrc = path.join(libSrc, 'meta.json')
        if (fs.existsSync(metaSrc)) {
          fs.copyFileSync(metaSrc, path.join(DST, libName, 'meta.json'))
        }

        // Переписываем <lib>/_index.json с отфильтрованным списком
        fs.writeFileSync(
          path.join(DST, libName, '_index.json'),
          JSON.stringify({ modules: kept }, null, 2)
        )

        shippedLibs.push(libName)
        keptTotal += kept.length
        removedTotal += removed
        console.log(`[stable-modules] "${libName}": kept ${kept.length}, removed ${removed}`)
      }

      // Корневой _index.json — только непустые библиотеки
      fs.writeFileSync(
        path.join(DST, '_index.json'),
        JSON.stringify({ libraries: shippedLibs }, null, 2)
      )

      console.log(
        `[stable-modules] shipped libraries: ${shippedLibs.join(', ') || '(none)'}`
      )
      console.log(
        `[stable-modules] modules kept=${keptTotal}, removed=${removedTotal}`
      )

    },
  }
}

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_IS_DEV__:  JSON.stringify(mode === 'development'),
    __APP_BUILD__:   JSON.stringify(new Date().toISOString()),
  },

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
        //editor: resolve(__dirname, 'editor/editor.html')
      }
    }
  },

  publicDir: 'public'
}))