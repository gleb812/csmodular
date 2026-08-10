// src/ui/CSoundWindow.js
export class CSoundWindow {
    constructor(system) {
        this.system = system;
        this.windowElement = null;
        this.tabsContainer = null;
        this.contentContainer = null;
        this.openModules = new Map(); // moduleId -> {module, element, code}
        this.activeModuleId = null;
        
        this.createWindowElement();
        this.setupEventListeners();
        this.injectStyles();
        //this.setBackgroundImage('/photo_2026-02-11_11-58-05.jpg');
    }
    
    createWindowElement() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'csound-window';
        this.windowElement.style.cssText = `
            position: fixed;
            width: 600px;
            height: 400px;
            background: transparent;
            border: none;
            z-index: 10000;
            display: none;
            overflow: hidden;
            resize: both;
            min-width: 300px;
            min-height: 200px;
        `;
        
        // Внутренний контейнер - ПОЛНОСТЬЮ ПРОЗРАЧНЫЙ
        const glassContainer = document.createElement('div');
        glassContainer.id = 'csound-glass';
        glassContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;  /* ← ПОЛНАЯ ПРОЗРАЧНОСТЬ */
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            box-shadow: none;
            display: flex;
            flex-direction: column;
        `;
        
        // Header - МИНИМАЛИСТИЧНЫЙ
        const header = document.createElement('div');
        header.id = 'csound-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 8px;
            background: rgba(20, 20, 25, 0.3);  /* Едва заметный */
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            user-select: none;
            cursor: move;
            flex-shrink: 0;
            border-radius: 8px 8px 0 0;
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
        `;
        
        // Левая часть: вкладки
        const tabsWrapper = document.createElement('div');
        tabsWrapper.style.cssText = `
            display: flex;
            gap: 2px;
            overflow-x: auto;
            flex: 1;
        `;
        
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.style.cssText = `
            display: flex;
            gap: 2px;
        `;
        tabsWrapper.appendChild(this.tabsContainer);
        
        // Правая часть: кнопки
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 4px;
        `;
        
        // Кнопка закрытия - МИНИМАЛИСТИЧНАЯ
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Close window';
        closeBtn.style.cssText = `
            background: rgba(255, 80, 80, 0.2);
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            font-size: 12px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 3px;
        `;
        closeBtn.onclick = () => this.hide();
        closeBtn.onmouseenter = () => {
            closeBtn.style.background = 'rgba(255, 80, 80, 0.5)';
            closeBtn.style.color = '#fff';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = 'rgba(255, 80, 80, 0.2)';
            closeBtn.style.color = 'rgba(255, 255, 255, 0.5)';
        };
        
        controls.appendChild(closeBtn);
        
        header.appendChild(tabsWrapper);
        header.appendChild(controls);

        // Content area - ПРОЗРАЧНЫЙ, НО ТЕКСТ ЧИТАЕМЫЙ
        this.contentContainer = document.createElement('div');
        this.contentContainer.id = 'csound-content';
        this.contentContainer.style.cssText = `
            flex: 1;
            overflow: auto;
            padding: 16px;
            margin: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre;
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: blur(4px);
            border-radius: 4px;
            color: rgba(255, 255, 255, 0.9);  /* Яркий текст */
            tab-size: 4;
            min-height: 0;
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.03);
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8); /* Тень для читаемости */
        `;
        
        // Собираем стеклянный контейнер
        glassContainer.appendChild(header);
        glassContainer.appendChild(this.contentContainer);
        
        // Собираем окно
        this.windowElement.appendChild(glassContainer);
        document.body.appendChild(this.windowElement);
        
        this.makeDraggable(header);
    }
    
    show(module) {
        if (!module || !module.moduleId) {
            console.error('❌ CSoundWindow.show: module or moduleId is missing');
            return;
        }
        
        console.log(`\n🚀 === OPENING CSOUND WINDOW ===`);
        console.log(`📦 Module: ${module.title} (${module.moduleId})`);
        
        // Показываем окно если скрыто
        if (this.windowElement.style.display === 'none') {
            const { innerWidth, innerHeight } = window;
            this.windowElement.style.left = `${(innerWidth - 600) / 2}px`;
            this.windowElement.style.top = `${(innerHeight - 400) / 2}px`;
            this.windowElement.style.display = 'block';
            console.log(`📐 Window positioned at center`);
        }
        
        // Добавляем модуль если его нет
        if (!this.openModules.has(module.moduleId)) {
            console.log(`➕ Adding tab for new module`);
            this.addModuleTab(module);
        } else {
            console.log(`📋 Module already has tab, activating it`);
            this.setActiveTab(module.moduleId);
        }
        
        console.log(`✅ CSound window ready\n`);
    }
    
    hide() {
        this.windowElement.style.display = 'none';
    }
    
    // ОБНОВЛЕННЫЙ метод addModuleTab:
    addModuleTab(module) {
        const moduleId = module.moduleId;
        
        console.log(`➕ Добавляем вкладку для модуля: ${moduleId}`);
        
        // Создаем элемент вкладки
        const tab = document.createElement('div');
        tab.dataset.moduleId = moduleId;
        tab.style.cssText = `
            padding: 4px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        // Текст вкладки
        const tabText = document.createElement('span');
        tabText.textContent = module.title || module.moduleId;
        tab.appendChild(tabText);
        
        // Индикатор загрузки (изначально скрыт)
        const loadingIndicator = document.createElement('span');
        loadingIndicator.innerHTML = ' ⌛';
        loadingIndicator.style.cssText = `
            font-size: 10px;
            opacity: 0.7;
            display: none;
        `;
        tab.appendChild(loadingIndicator);
        
        tab.onclick = () => this.setActiveTab(moduleId);
        
        // Кнопка закрытия вкладки
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            margin-left: 4px;
            color: #888;
            cursor: pointer;
            font-size: 14px;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        `;
        
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeModuleTab(moduleId);
        };
        
        closeBtn.onmouseenter = () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.color = '#fff';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = '#888';
        };
        
        tab.appendChild(closeBtn);
        this.tabsContainer.appendChild(tab);
        
        // Сохраняем в Map (изначально без кода)
        this.openModules.set(moduleId, {
            module,
            tabElement: tab,
            loadingIndicator,
            csoundCode: null // будет загружено при активации
        });
        
        console.log(`✅ Вкладка добавлена для ${moduleId}`);
        
        // Если это первая вкладка - активируем ее
        if (this.openModules.size === 1) {
            this.setActiveTab(moduleId);
        }
    }
    
    // В setActiveTab():
    async setActiveTab(moduleId) {
        if (!this.openModules.has(moduleId)) return;
        
        console.log(`🔍 Активируем вкладку: ${moduleId}`);
        
        // Обновляем стили вкладок
        this.tabsContainer.querySelectorAll('div[data-module-id]').forEach(tab => {
            const isActive = tab.dataset.moduleId === moduleId;
            tab.style.background = isActive ? 
                'rgba(0, 170, 255, 0.2)' : 
                'rgba(255, 255, 255, 0.05)';
            tab.style.borderColor = isActive ? 
                'rgba(0, 170, 255, 0.3)' : 
                'rgba(255, 255, 255, 0.1)';
        });
        
        // Получаем данные модуля
        const moduleData = this.openModules.get(moduleId);
        
        // Показываем сообщение о загрузке
        this.contentContainer.textContent = 'Loading CSound code...';
        
        try {
            // Загружаем код (если еще не загружен)
            if (!moduleData.csoundCode) {
                console.log('📥 Загружаем CSound код...');
                moduleData.csoundCode = await this.getModuleCsoundCode(moduleData.module);
            }
            
            // ВАЖНО: Просто показываем текст, без подсветки
            this.contentContainer.textContent = moduleData.csoundCode;
            
            console.log(`✅ Код отображен (${moduleData.csoundCode.length} chars)`);
            
            // Прокручиваем в начало
            this.contentContainer.scrollTop = 0;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки CSound кода:', error);
            this.contentContainer.textContent = `Error loading CSound code: ${error.message}`;
        }
        
        this.activeModuleId = moduleId;
    }
    
    closeModuleTab(moduleId) {
        if (!this.openModules.has(moduleId)) return;
        
        // Удаляем вкладку
        const moduleData = this.openModules.get(moduleId);
        if (moduleData.tabElement) {
            moduleData.tabElement.remove();
        }
        
        // Удаляем из Map
        this.openModules.delete(moduleId);
        
        // Если закрыли активную вкладку - активируем другую
        if (this.activeModuleId === moduleId) {
            if (this.openModules.size > 0) {
                // Берем первую вкладку
                const firstId = this.openModules.keys().next().value;
                this.setActiveTab(firstId);
            } else {
                // Если вкладок не осталось - скрываем окно
                this.hide();
            }
        }
    }
    
    // В CSoundWindow.js - обновленный метод getModuleCsoundCode с отладкой:

    // В CSoundWindow.js, обновленный метод getModuleCsoundCode:
    async getModuleCsoundCode(module) {
        console.log(`🔍 Loading CSound code for: ${module.title}`);
        
        // Получаем typeID
        const moduleType = module.jsonName || module.type;
        const definition = this.system.moduleFactory.moduleRegistry[moduleType];
        
        if (!definition) {
            throw new Error(`Module definition not found: ${moduleType}`);
        }
        
        const typeId = definition.typeID;
        if (typeId === undefined) {
            throw new Error(`typeID not found in definition`);
        }
        
        // Загружаем файл
        const filePath = `/csound/modules/${typeId}.txt`;
        console.log(`📂 Loading: ${filePath}`);
        
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
        }
        
        const csoundCode = await response.text();
        console.log(`✅ Loaded ${csoundCode.length} characters`);
        
        // ВОЗВРАЩАЕМ ЧИСТЫЙ ТЕКСТ, НИЧЕГО НЕ МЕНЯЕМ
        return csoundCode;
    }

    getFallbackCode(module, typeId = 'unknown') {
        let info = `; === CSOUND CODE NOT FOUND ===\n`;
        info += `; Module: ${module.title}\n`;
        info += `; Module ID: ${module.moduleId}\n`;
        info += `; Module Type: ${module.jsonName || module.type}\n`;
        info += `; typeID: ${typeId}\n`;
        info += `;\n`;
        info += `; Expected file: /csound/modules/${typeId}.txt\n`;
        info += `;\n`;
        info += `; To add CSound code for this module:\n`;
        info += `; 1. Create file: /csound/modules/${typeId}.txt\n`;
        info += `; 2. Put your CSound code there\n`;
        info += `; 3. Reload the page\n`;
        info += `;\n`;
        info += `; Example instrument:\n`;
        info += `instr ${module.moduleId.replace(/[^a-zA-Z0-9]/g, '_')}\n`;
        info += `    ; Generated from: ${module.title}\n`;
        info += `    ; typeID: ${typeId}\n`;
        info += `    \n`;
        info += `    ; Get parameters from UI\n`;
        
        // Пробуем найти параметры модуля
        if (module.components) {
            module.components.forEach((comp, i) => {
                if (comp.parameterId !== undefined) {
                    info += `    kParam${comp.parameterId} chnget "module_${module.moduleId}_${comp.parameterId}"\n`;
                }
            });
        }
        
        info += `    \n`;
        info += `    ; Your code here\n`;
        info += `    aSig oscil 0.5, 440\n`;
        info += `    outs aSig, aSig\n`;
        info += `endin\n`;
        
        return info;
    }

    // Более безопасная версия подсветки:
    applySyntaxHighlighting() {
        const container = this.contentContainer;
        
        // Проверяем, не подсвечен ли уже
        if (container.children.length > 0 || container.innerHTML.includes('<span')) {
            console.log('Текст уже содержит HTML, пропускаем подсветку');
            return;
        }
        
        const originalText = container.textContent;
        if (!originalText || originalText.trim() === '') return;
        
        console.log('Применяем подсветку к', originalText.length, 'символов');
        
        // Создаем временный элемент для работы
        const tempDiv = document.createElement('div');
        tempDiv.textContent = originalText;
        
        // Функция для безопасной замены
        const safeReplace = (text, regex, replacement) => {
            return text.replace(regex, (match, ...groups) => {
                // Проверяем, не внутри ли уже тега span
                const lastGroup = groups[groups.length - 1];
                if (lastGroup && lastGroup.input) {
                    const position = lastGroup.index;
                    const before = lastGroup.input.substring(0, position);
                    const after = lastGroup.input.substring(position);
                    
                    // Если перед этим уже есть незакрытый span, пропускаем
                    if (before.includes('<span') && !before.includes('</span>')) {
                        return match;
                    }
                }
                return replacement;
            });
        };
        
        let highlighted = originalText;
        
        // Применяем замены в порядке приоритета
        highlighted = safeReplace(highlighted, /(^|\s);(.*?)$/gm, 
            '$1<span style="color: #6272a4">;$2</span>');
        
        highlighted = safeReplace(highlighted, 
            /(^|\s)(instr|endin|opcode|endop|kr|sr|ksmps|nchnls|0dbfs)(\s|$)/gmi, 
            '$1<span style="color: #ff79c6">$2</span>$3');
        
        highlighted = safeReplace(highlighted, 
            /(^|\s)(chnget|chnset|out|outs|oscili|oscil|rand|linen|linseg|zar|zkr|table|limit|fillarray|goto)(\s|$)/gmi, 
            '$1<span style="color: #50fa7b">$2</span>$3');
        
        highlighted = safeReplace(highlighted, 
            /(^|\s)(k|a|i|S|gk|ga)[A-Za-z0-9_]+(\s|$)/g, 
            '$1<span style="color: #8be9fd">$2</span>$3');
        
        highlighted = safeReplace(highlighted, 
            /(\b\d+\.?\d*\b)/g, 
            '<span style="color: #f1fa8c">$1</span>');
        
        // Вставляем обработанный текст
        container.innerHTML = highlighted;
    }
    
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.windowElement.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            this.windowElement.style.left = `${startLeft + dx}px`;
            this.windowElement.style.top = `${startTop + dy}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    setupEventListeners() {
        // Клик вне окна - не закрываем, чтобы можно было редактировать код
        document.addEventListener('click', (e) => {
            if (this.windowElement.style.display === 'block' && 
                !this.windowElement.contains(e.target)) {
                // Можно добавить автосохранение или подтверждение
            }
        });
        
        // Escape закрывает окно
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.windowElement.style.display === 'block') {
                this.hide();
            }
        });
    }

    setBackgroundImage(url) {
        const glass = this.windowElement.querySelector('#csound-glass');
        if (glass) {
            glass.style.backgroundImage = `url(${url})`;
            glass.style.backgroundSize = 'cover';
            glass.style.backgroundPosition = 'center';
            glass.style.backgroundBlendMode = 'overlay';
        }
    }


    injectStyles() {
        if (document.getElementById('csound-window-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'csound-window-styles';
        style.textContent = `
            /* ОСНОВНОЕ ОКНО */
            #csound-window {
                /* Прозрачное окно, все стили внутри */
            }
            
            /* СТЕКЛЯННЫЙ ЭФФЕКТ */
            #csound-glass {
                /* Эффект матового стекла Vista/Aero */
                background: linear-gradient(
                    135deg,
                    rgba(40, 40, 45, 0.85),
                    rgba(30, 30, 35, 0.9)
                );
                backdrop-filter: blur(25px) saturate(200%);
                -webkit-backdrop-filter: blur(25px) saturate(200%);
            }
            
            /* ЗАГОЛОВОК */
            #csound-header {
                /* Слегка темнее для контраста */
                background: linear-gradient(
                    to bottom,
                    rgba(50, 50, 55, 0.95),
                    rgba(40, 40, 45, 0.9)
                );
            }
            
            /* ОБЛАСТЬ С КОДОМ - ГЛАВНОЕ ДЛЯ ПРОКРУТКИ */
            #csound-content {
                /* Это обеспечивает прокрутку */
                overflow-y: auto;
                overflow-x: auto;
                /* Темный фон для читаемости текста */
                background: rgba(10, 10, 15, 0.8);
                /* Тень для объема */
                box-shadow: 
                    inset 0 1px 3px rgba(0, 0, 0, 0.5),
                    0 1px 0 rgba(255, 255, 255, 0.05);
            }
            
            /* СКРОЛЛБАР */
            #csound-content::-webkit-scrollbar {
                width: 14px;
                height: 14px;
            }
            
            #csound-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 7px;
                margin: 4px;
            }
            
            #csound-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 7px;
                border: 3px solid transparent;
                background-clip: content-box;
            }
            
            #csound-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.25);
                border: 3px solid transparent;
                background-clip: content-box;
            }
            
            #csound-content::-webkit-scrollbar-corner {
                background: transparent;
            }
            
            /* ВКЛАДКИ */
            .csound-tab {
                transition: all 0.2s;
            }
            
            .csound-tab:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* ТЕКСТ КОДА */
            #csound-content {
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
            }
            
            /* ВЫДЕЛЕНИЕ ТЕКСТА */
            #csound-content::selection {
                background: rgba(0, 170, 255, 0.3);
                color: white;
            }
            
            /* РЕСАЙЗ ХЕНДЛ */
            #csound-window::-webkit-resizer {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
            }
        `;
        document.head.appendChild(style);
    }
}