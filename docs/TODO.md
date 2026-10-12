
# TODO — CsModular

## Current tasks

- [ ] проблема с реинициализацией модуля, содержащего контроллеры, при его добавлении
- [ ] Mix1-1A exp/lin selector change leads to error
- [ ] some DSP code still contain 'd' parameter in @map line - should be eliminated
- [ ] Csound code window in Editor mode behaves badly
- [ ] at zoom 50% and lower the working area also resizes

### P2 — UX

- [ ] Make 2-3 demo patches
- [ ] Demo screenshots / preview в README

---

## 🎨 Тема / Design Settings (новое)

- [x] Система темы: `classic` / `lcd` пресеты
- [x] `Theme.js` — семантические методы (`getAccentColor`, `getCableWidth`, ...)
- [x] `themeStore` (localStorage)
- [x] `currentTheme` + `window.__theme__` для отладки
- [x] Design Settings panel (открывается `D` или 🎨)
- [x] Все компоненты используют `getCurrentTheme()`
- [x] LCD-стиль: свечение, прозрачные панели, монохром
- [x] Solid backgrounds + image presets
- [x] `_isColorValue()` — различает hex / rgb / url
- [ ] **Custom background upload** (file input → dataURL → localStorage)
- [ ] **Custom LCD palette** — сохранение пользовательских цветов в localStorage
- [ ] **Theme presets** — возможность сохранять несколько наборов настроек
- [ ] **Preview canvas** в панели — мини-модуль для превью изменений
- [ ] **Тёмно-серые и чёрные** пресеты LCD — добавить (`#4a4a4a`, `#1a1a1a`)
- [ ] **Parallax toggle** — включать/выключать параллакс в панели
- [ ] **Line weight** для отдельных типов линий (граница панели, кабель, джек)

---

## 🌍 Бесконечный мир / Layers (новое)

- [x] Canvas = окно, мир бесконечный
- [x] Pan: `Space + drag` / middle mouse
- [x] Zoom: `Ctrl + wheel` (вокруг курсора)
- [x] Scroll: `wheel` / `Shift + wheel`
- [x] `LayerManager` без физических границ
- [x] `getLayerAtPoint` → всегда `'voice'`
- [x] **Layer attribute** у модуля: `'voice'` / `'fx'`
- [x] **Auto-layout FX**: `_getFxFloorY()` — новые FX ниже voice
- [x] **Shift FX on load**: `_fxStartY` в `PatchLoader`
- [x] **setLayer** через `ModuleContextMenu` (с подтверждением и удалением кабелей)
- [x] **`removeModuleFromLayer`** — поиск во всех слоях
- [x] Полоска слева для FX-модулей
- [ ] **Убрать мёртвый код** из `LayerManager` (`updateLayerSizes`, `drawLayerGrid`, `updateGridCache`, `divider`)
- [ ] **Убрать мёртвый `updateCanvasSize`** из `main.js` (ссылается на `this.divider`)
- [ ] **Убрать `fetch('/api/list-user-modules')`** из `loadAvailableModules` в `main.js`
- [ ] **Проверить**: переключение layer у модуля **с кабелями** — все кабели корректно удаляются
- [ ] **Проверить**: загрузка большого патча (20+ модулей) — auto-layout FX работает
- [ ] **Опционально**: физический divider для новых FX (для UX) — решить, нужен ли

---

## 🖥 Tauri / Desktop

- [x] Tauri shell (окна, fs)
- [x] `moduleStore` для Tauri (fs) — user-модули в `Documents/CsModular/`
- [x] Редактор модулей в отдельном окне (`WebviewWindow`)
- [x] Capabilities для окон `main` и `editor`
- [x] Design Settings panel работает в Tauri
- [x] Тема сохраняется в localStorage (работает и в Tauri)
- [ ] **Web `moduleStore`** (IndexedDB) — чтобы user-модули сохранялись и в браузере
- [ ] **Синхронизация** между web и Tauri (импорт/экспорт `.zip`?)
- [ ] **Своя иконка** приложения (сейчас дефолтная Tauri)
- [ ] **Убрать fallback-скачивание** из `ModulePropertiesWindow.saveModule()`
- [ ] **Tauri events**: `module-saved` → главное окно обновляет список
- [ ] **CI**: автосборка для Windows / Linux / macOS
- [ ] **Android / iOS** таргеты (позже)
- [ ] **Собрать свежий exe** после дизайн-обновлений

---

## 🎛 Csound / CsoundEngine

### Стабильность

- [ ] Проверить `CsoundEngine.recompile` на 20+ модулях
- [ ] Перехват ошибок компиляции ORC → показать в UI
- [ ] Логировать сообщения Csound в отдельную панель (не только консоль)

### Оптимизация

- [ ] Заменить `getChannel` на `channelPtr` (SharedArrayBuffer) — быстрее в 10x
- [ ] Требует COOP/COEP headers в Vite
- [ ] Проверить на предмет `AudioWorklet` перезапуска

### Функционал

- [ ] **Variant switching**: `k` ↔ `a` opcode по типу входных кабелей (NM2-style)
- [ ] **Jack recoloring** при переключении варианта
- [ ] Запись вывода Csound в WAV
- [ ] MIDI-вход (Web MIDI API + индикатор)
- [ ] Пользовательские UDO для `debug`-сигналов

---

## 🧩 Компоненты (расширение)

### Графические элементы реального времени

- [ ] `VUMeter` — индикатор уровня (RMS, peak)
- [ ] `Oscilloscope` — осциллограф (интеграция в редактор)
- [ ] `Spectrum` — спектроанализатор (FFT)

### Интерактивные компоненты

- [ ] Дочистить `ButtonRadio`, `ButtonIncDec`, `TextField`, `TextEdit`
- [ ] Реализовать полный `ComponentPropertiesWindow` для всех типов
- [ ] Проверка «порог срабатывания» LED в UI (уже есть поле — проверить сохранение/загрузку)
- [ ] **`TextField`** — не считается параметром (только display)
- [ ] **`ComponentPropertiesWindow`** — открытие по клику (сейчас только через кнопку)

---

## 🎨 UX

- [ ] **Undo/Redo** (Command pattern)
- [ ] **Копирование/вставка модулей** (Ctrl+C/V)
- [ ] **Выделение области** (rubber-band selection)
- [ ] **Сохранение камеры** в патч (offsetX/Y, scale) — чтобы патч открывался там же, где закрыли
- [ ] **Поиск/фильтр** модулей при добавлении
- [ ] **Контекстное меню для джека** с отображением активных каналов
- [ ] **Горячие клавиши** — сводка в UI (или в About)
- [ ] **Мини-карта** мира (для навигации по большим патчам)

---

## 🧪 Качество

### Тесты

- [ ] `Vitest` + `jsdom`
- [ ] Тесты на `ModuleFactory.createModule`
- [ ] Тесты на `PatchManager.addCable`
- [ ] Тесты на `LayerManager.isGridCellFree`
- [ ] Тесты на `LayerManager.findFreeSpace`
- [ ] Тесты на `CsoundGenerator.formatModuleLine`
- [ ] Тесты на `CsoundGenerator.addModule` / `removeModule`
- [ ] Тесты на `Theme` методы (`getCableWidth`, `_isColorValue`)
- [ ] Тесты на `removeModuleFromLayer` (мульти-слойный поиск)

### Документация

- [ ] `docs/ARCHITECTURE.md` — общая архитектура
- [ ] `docs/MODULE_FORMAT.md` — формат модуля (params, inputs, outputs, components)
- [ ] `docs/DATA_FLOW.md` — путь данных: pch2 → JSON → JS → ORC → Csound
- [ ] `docs/THEME.md` — как добавить новый компонент в тему
- [ ] `docs/CONTRIBUTING.md` — как добавлять модули

### Рефакторинг

- [ ] Вынести `CsoundEngine` в отдельный пакет
- [ ] Убрать `window.csound` — все обращения через `CsoundEngine`
- [ ] `Knob.setValue`/`Slider.setValue` — убрать `window.csound.setControlChannel` (через колбэк)
- [ ] **Разделить `main.js`** (сейчас 2000+ строк) на модули
- [ ] Убрать дубликаты в `CsoundGenerator` (двойной `_findCablesForOutput`)
- [ ] Убрать `Panel` из `src/components/` и логически разделить на `Model`/`View`
- [ ] **Убрать мёртвый код** `divider` из `LayerManager` и `main.js`
- [ ] **`Panel.draw`** — вынести FX-полоску в отдельный метод
- [ ] **`Theme.js`** — разделить на `ThemeClassic` и `ThemeLcd` (или стратегия)

---

## 🛠 Пользовательские модули

- [ ] Автоматическая генерация `typeID` для user-модулей (вместо хардкода `999`)
- [ ] Улучшить парсинг модулей в `ModuleFactory._parseModuleDefinition` (regex → AST?)
- [ ] Экспорт модуля в один `.zip` (JS + DSP + иконка)
- [ ] **`_nextComponentId`** — сбрасывать при `Load Module` в редакторе

---

## 🐛 Известные проблемы

- [ ] Артефакт: кабель поверх LED стирается при перерисовке LED (решено через overlayCanvas)
- [ ] `CsoundEngine._ledValues` не обнуляется при `stop()` — может показывать старые значения 1-2 кадра
- [ ] При быстрой смене состояния LED мигает неравномерно из-за `setInterval(50ms)`
- [ ] `ComponentPropertiesWindow` не открывается по клику (только через кнопку)
- [ ] `PATCH_LOAD`: при ошибке загрузки — может остаться частично загруженный патч
- [ ] **`setLayer`** при переключении слоя — модуль **теряет `customColor`** (проверить)
- [ ] **FX-полоска** может перекрывать контент у модулей с `customColor` (проверить)
- [ ] **`getLayerAtPoint`** возвращает `'voice'` всегда — старый код может зависеть от `y`-координаты
- [ ] **`updateLayerSizes`** в `LayerManager` вызывается из мёртвого `updateDividerDrag` — удалить
- [ ] **`loadAvailableModules`** всё ещё использует `fetch('/api/...')` — упадёт в Tauri

---

## 📝 Notes

- **Storage**: user-модули в Tauri → `Documents/CsModular/`. В web → заглушка (IndexedDB планируется).
- **Открытие редактора**: в браузере — `window.open`, в Tauri — `WebviewWindow` (см. `ContextMenu.openModuleEditor`)
- **Capabilities**: при добавлении нового окна — не забыть добавить его label в `src-tauri/capabilities/default.json`
- `ConnectorIndex` — не используется в ORC-генерации, оставлен для совместимости с NM2-импортом
- `typeID = 999` для всех user-модулей — временно, потом генерировать уникальные
- `params` в модуле — порядок аргументов opcode. Обязательно совпадает с `xin` в UDO
- `formatModuleLine` строит: `<params>` + `<mode>` + `<inputs>` + `<outputs>`. Порядок фиксирован.
- Все user-UDO — в `csound/modules/user/`. Встроенные — в `csound/modules/`.
- Инклюды подгружаются **лениво** через `CsoundGenerator.includes` (Set путей)
- **Не использовать top-level `await import(...)`** в `src/api/index.js` — блокирует всю инициализацию UI
- **`window.__theme__`** доступен в консоли для отладки темы (`get`, `set`, `init`)
- **`removeModuleFromLayer`** ищет во **всех** слоях — это защита от фантомов
- **`getLayerAtPoint`** всегда возвращает `'voice'` — новые модули по умолчанию Voice
- **FX auto-layout** использует `_getFxFloorY()` — новые FX-модули падают ниже voice
- **`_isColorValue()`** в `main.js` и `DesignSettingsPanel` — различает hex/rgb и URL картинки
