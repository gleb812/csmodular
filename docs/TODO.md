# TODO — CsModular

## 🔥 Ближайшее (перед конференцией)

### P1 — Стабильность
- [ ] Провести ревизию `console.log` — оставить только важные
- [ ] Проверить работу `CsoundEngine.recompile()` при быстрых изменениях (10+ модулей подряд)
- [ ] Проверить загрузку/сохранение патчей (.json, .pch2)
- [ ] Проверить работу в Chrome / Firefox / Safari
- [ ] Прогнать demo-патч на конференции 2-3 раза без падений

### P2 — UX для демо
- [ ] Заготовить 2-3 demo-патча (заранее загружены в `patches/`)
- [ ] Проверить, что `index.html` не показывает ошибок в консоли при старте
- [ ] Подготовить скриншоты/видео для презентации
- [ ] Убедиться, что `parallax` работает в Safari

## 🎯 После конференции — Архитектура отрисовки

### Фаза 2 — `overlayCanvas` (приоритет)
- [ ] Добавить `<canvas id="overlayCanvas">` в `index.html`
- [ ] Вынести `LED`, `VU`, `hover`, `selection`, `dragging ghost`, `dragging cable`, `grid-cell highlight` в `overlayCanvas`
- [ ] Убрать `_renderLeds` и `_redrawCablesInRect` — они становятся не нужны
- [ ] Проверить, что артефакт с кабелем над LED исчез
- [ ] Проверить FPS при 20+ модулях

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

## 🧩 Компоненты (расширение)

### Графические элементы реального времени
- [ ] `VUMeter` — индикатор уровня (RMS, peak)
- [ ] `Oscilloscope` — осциллограф (интеграция в редактор)
- [ ] `Spectrum` — спектроанализатор (FFT)

### Интерактивные компоненты
- [ ] Дочистить `ButtonRadio`, `ButtonIncDec`, `TextField`, `TextEdit`
- [ ] Реализовать полный `ComponentPropertiesWindow` для всех типов
- [ ] Автоматическая связка `LED` ↔ `Output` по близости (fallback)
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
- [ ] Загрузка модулей из папки `modules/user/` без API (или через API, но с правильным путём)
- [ ] Экспорт модуля в один `.zip` (JS + DSP + иконка)

## 🐛 Известные проблемы

- [ ] Артефакт: кабель поверх LED стирается при перерисовке LED (решено через overlayCanvas)
- [ ] `CsoundEngine._ledValues` не обнуляется при `stop()` — может показывать старые значения 1-2 кадра
- [ ] При быстрой смене состояния LED мигает неравномерно из-за `setInterval(50ms)`
- [ ] `ComponentPropertiesWindow` не открывается по клику (только через кнопку) — UX issue
- [ ] При `Load Module` в редакторе — не сбрасывается `_nextComponentId`
- [ ] `PATCH_LOAD`: при ошибке загрузки — может остаться частично загруженный патч

## 📝 Notes

- `ConnectorIndex` — не используется в ORC-генерации, оставлен для совместимости с NM2-импортом
- `typeID = 999` для всех user-модулей — временно, потом генерировать уникальные
- `params` в модуле — порядок аргументов opcode. Обязательно совпадает с `xin` в UDO
- `formatModuleLine` строит: `<params>` + `<mode>` + `<inputs>` + `<outputs>`. Порядок фиксирован.
- Все user-UDO — в `csound/modules/user/`. Встроенные — в `csound/modules/`.
- Инклюды подгружаются **лениво** через `CsoundGenerator.includes` (Set путей)