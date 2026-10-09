```markdown

# TODO — CsModular

## Current tasks

- [ ] проблема с реинициализацией модуля, содержащего контроллеры, при его добавлении
- [ ] Mix1-1A exp/lin selector change leads to error
- [ ] some DSP code still contain 'd' parameter in @map line - should be eliminated
- [ ] Csound code window in Editor mode behaves badly
- [ ] at zoom 50% and lower the working area also resizes

### P2 — UX

- [ ] Make 2-3 demo patches

### Фаза 2 — `overlayCanvas` (приоритет)

- [ ] Добавить `<canvas id="overlayCanvas">` в `index.html`
- [ ] Вынести `LED`, `VU`, `hover`, `selection`, `dragging ghost`, `dragging cable`, `grid-cell highlight` в `overlayCanvas`
- [ ] Убрать `_renderLeds` и `_redrawCablesInRect` — они становятся не нужны
- [ ] Проверить, что артефакт с кабелем над LED исчез
- [ ] Check FPS at 20+ units

### Фаза 3 — `bgCanvas` (фон, сетка, divider)

- [ ] Вынести фон слоёв, сетку и divider в `bgCanvas`
- [ ] Убрать `backgroundCache`/`gridCache` из основного canvas
- [ ] Профилировать: при движении модуля фон не перерисовывается

### Фаза 4 — `cablesCanvas`

- [ ] Вынести кабели в отдельный canvas
- [ ] Перерисовывать только при `_cablesDirty`
- [ ] Оптимизировать: при перемещении модуля — перерисовывать только кабели, связанные с модулем (или все, если проще)

### Фаза 5 — Общий менеджер слоёв

- [ ] Создать `RenderManager` — управляет всеми canvas-слоями
- [ ] Каждый слой — со своим `dirty`-флагом
- [ ] Каждый слой — со своим уровнем «дешёвый/дорогой»

## 🖥 Tauri / Desktop

- [x] Tauri shell (окна, fs)
- [x] `moduleStore` для Tauri (fs) — user-модули в `Documents/CsModular/`
- [x] Редактор модулей в отдельном окне (`WebviewWindow`)
- [x] Capabilities для окон `main` и `editor`
- [ ] **Design Settings panel** — панель настройки внешнего вида модулей
- [ ] Web `moduleStore` (IndexedDB) — чтобы user-модули сохранялись и в браузере
- [ ] Синхронизация между web и Tauri (импорт/экспорт `.zip`?)
- [ ] Своя иконка приложения (сейчас дефолтная Tauri)
- [ ] Убрать fallback-скачивание из `ModulePropertiesWindow.saveModule()`
- [ ] Tauri events: `module-saved` → главное окно обновляет список
- [ ] CI: автосборка для Windows / Linux / macOS
- [ ] Android / iOS таргеты (позже)

## 🧩 Компоненты (расширение)

### Графические элементы реального времени

- [ ] `VUMeter` — индикатор уровня (RMS, peak)
- [ ] `Oscilloscope` — осциллограф (интеграция в редактор)
- [ ] `Spectrum` — спектроанализатор (FFT)

### Интерактивные компоненты

- [ ] Дочистить `ButtonRadio`, `ButtonIncDec`, `TextField`, `TextEdit`
- [ ] Реализовать полный `ComponentPropertiesWindow` для всех типов
- [ ] Проверка «порог срабатывания» LED в UI (уже есть поле — проверить сохранение/загрузку)

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

- [ ] Запись вывода Csound в WAV
- [ ] MIDI-вход (Web MIDI API + индикатор)
- [ ] Пользовательские UDO для `debug`-сигналов

## 🧪 Качество

### Тесты

- [ ] `Vitest` + `jsdom`
- [ ] Тесты на `ModuleFactory.createModule`
- [ ] Тесты на `PatchManager.addCable`
- [ ] Тесты на `LayerManager.isGridCellFree`
- [ ] Тесты на `CsoundGenerator.formatModuleLine`
- [ ] Тесты на `CsoundGenerator.addModule` / `removeModule`

### Документация

- [ ] `docs/ARCHITECTURE.md` — общая архитектура
- [ ] `docs/MODULE_FORMAT.md` — формат модуля (params, inputs, outputs, components)
- [ ] `docs/DATA_FLOW.md` — путь данных: pch2 → JSON → JS → ORC → Csound
- [ ] `docs/CONTRIBUTING.md` — как добавлять модули

### Рефакторинг

- [ ] Вынести `CsoundEngine` в отдельный пакет
- [ ] Убрать `window.csound` — все обращения через `CsoundEngine`
- [ ] `Knob.setValue`/`Slider.setValue` — убрать `window.csound.setControlChannel` (через колбэк)
- [ ] Разделить `main.js` (сейчас 1700+ строк) на модули
- [ ] Убрать дубликаты в `CsoundGenerator` (двойной `_findCablesForOutput`)
- [ ] Убрать `Panel` из `src/components/` и логически разделить на `Model`/`View`

## 🎨 UX

- [ ] Undo/Redo (Command pattern)
- [ ] Копирование/вставка модулей (Ctrl+C/V)
- [ ] Выделение области (rubber-band selection)
- [ ] Сохранение камеры в патч (offsetX/Y, scale)
- [ ] Поиск/фильтр модулей при добавлении
- [ ] Контекстное меню для джека с отображением активных каналов

## 🛠 Пользовательские модули

- [ ] Автоматическая генерация `typeID` для user-модулей (вместо хардкода)
- [ ] Улучшить парсинг модулей в `ModuleFactory._parseModuleDefinition` (regex → AST?)
- [ ] Экспорт модуля в один `.zip` (JS + DSP + иконка)

## 🐛 Известные проблемы

- [ ] Артефакт: кабель поверх LED стирается при перерисовке LED (решено через overlayCanvas)
- [ ] `CsoundEngine._ledValues` не обнуляется при `stop()` — может показывать старые значения 1-2 кадра
- [ ] При быстрой смене состояния LED мигает неравномерно из-за `setInterval(50ms)`
- [ ] `ComponentPropertiesWindow` не открывается по клику (только через кнопку) — UX issue
- [ ] При `Load Module` в редакторе — не сбрасывается `_nextComponentId`
- [ ] `PATCH_LOAD`: при ошибке загрузки — может остаться частично загруженный патч

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

## NB

FilterHP has only one type, but FilterLP has two types.
```