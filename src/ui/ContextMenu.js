// src/ui/ContextMenu.js
import { GRID_UNITS } from '../constants.js'; 

export class ContextMenu {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.menuElement = null;
        this.searchInput = null;
        this.moduleGroups = null;
        this.lastOpenMouseY = null;
        
        // 1. Сначала инициализируем группы модулей
        this.initModuleGroups();
        
        // 2. Затем создаем элемент меню (который использует moduleGroups)
        this.createMenuElement();
        
        // 3. Настройка событий
        this.setupEventListeners();
        
        // 4. Стили
        this.injectStyles();
    }

    initModuleGroups() {
        // Просто инициализируем группы, НЕ вызываем createModuleGroups()
        this.moduleGroups = {
            'In/Out': ['In2', 'Out2', 'In4', 'Out4', 'Device', 'FxIn', 'Keyboard', 'MonoKey', 'Name', 'NoteDet', 'Status'],
            'Logic': ['8Counter', 'ADConv', 'BinCounter', 'ClkDiv', 'DAConv', 'Delay', 'FlipFlop', 'Gate', 'Invert', 'Pulse'],
            'Osc': ['DXRouter', 'Driver', 'DrumSynth', 'MetNoise', 'Noise', 'Operator', 'OscA', 'OscB', 'OscC', 'OscD', 'OscDual', 'OscMaster', 'OscNoise', 'OscPM', 'OscPerc', 'OscShpA', 'OscShpB', 'OscString', 'Resonator'],
            'FX': ['Compressor', 'Digitizer', 'Flanger', 'FreqShift', 'PShift', 'Phaser', 'Reverb', 'Scratch', 'StChorus'],
            'Switch': ['Mux18', 'Mux81', 'Mux81X', 'SH', 'Sw12', 'Sw12M', 'Sw14', 'Sw18', 'Sw21', 'Sw21M', 'Sw41', 'Sw81', 'SwOnOffM', 'SwOnOffT', 'T&amp;H', 'ValSw1-2', 'ValSw2-1', 'WindSw'],
            'Mixer': ['Fade12', 'Fade21', 'Mix11A', 'Mix11S', 'Mix21A', 'Mix21B', 'Mix41A', 'Mix41B', 'Mix41C', 'Mix41S', 'Mix81A', 'Mix81B', 'MixFader', 'MixStereo', 'Pan', 'X-Fade'],
            'Env': ['EnvADDSR', 'EnvADR', 'EnvADSR', 'EnvAHD', 'EnvD', 'EnvH', 'EnvMulti', 'ModADSR', 'ModAHD'],
            'Note': ['Glide', 'KeyQuant', 'LevScaler', 'NoteQuant', 'NoteScaler', 'PartQuant', 'PitchTrack', 'ZeroCnt'],
            'LFO': ['ClkGen', 'LfoA', 'LfoB', 'LfoC', 'LfoShpA'],
            'Shaper': ['Clip', 'Overdrive', 'Rect', 'Saturate', 'ShpExp', 'ShpStatic', 'WaveWrap'],
            'Filter': ['Eq2Band', 'Eq3Band', 'EqPeak', 'FltClassic', 'FltComb', 'FltHP', 'FltLP', 'FltMulti', 'FltNord', 'FltPhase', 'FltStatic', 'FltVoice', 'Vocoder', 'WahWah'],
            'Level': ['CompLev', 'CompSig', 'ConstSwM', 'ConstSwT', 'Constant', 'EnvFollow', 'LevAdd', 'LevAmp', 'LevConv', 'LevMod', 'LevMult', 'MinMax', 'ModAmt', 'NoiseGate'],
            'MIDI': ['Automate', 'CtrlRcv', 'CtrlSend', 'NoteRcv', 'NoteSend', 'NoteZone', 'PCSend'],
            'Seq': ['SeqCtr', 'SeqEvent', 'SeqLev', 'SeqNote', 'SeqVal'],
            'Delay': ['DelayA', 'DelayB', 'DelayDual', 'DelayQuad', 'DlyClock', 'DlyEight', 'DlyShiftReg', 'DlySingleA', 'DlySingleB', 'DlyStereo'],
            'Rnd': ['RandomA', 'RandomB', 'RndClkA', 'RndClkB', 'RndPattern', 'RndTrig'],
            'Test': ['Blue2Red', 'Red2Blue']
        };
        
        // createModuleGroups() будет вызван из createMenuElement()
    }

    // ContextMenu.js - полная переработка стилей
    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            width: 500px;
            height: 400px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 20000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ccc;
            overflow: hidden;
            
            /* Скрываем, но оставляем видимым для браузера */
            opacity: 0;
            transform: scale(0.95);
            visibility: hidden;
            transition: opacity 0.1s ease-out, transform 0.1s ease-out;
        `;
        
        // Контейнер с двумя колонками
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            height: 100%;
        `;
        
        // ЛЕВАЯ КОЛОНКА - Группы (ширина 30%)
        const leftPanel = document.createElement('div');
        leftPanel.id = 'left-panel';
        leftPanel.style.cssText = `
            width: 30%;
            background: #222;
            border-right: 1px solid #333;
            overflow-y: auto;
            padding: 0;
        `;
        
        // ПРАВАЯ КОЛОНКА - Поиск + Модули (ширина 70%)
        const rightPanel = document.createElement('div');
        rightPanel.id = 'right-panel';
        rightPanel.style.cssText = `
            width: 70%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // СТРОКА ПОИСКА (в правой панели)
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            padding: 8px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Type to search modules...';
        this.searchInput.style.cssText = `
            width: 100%;
            padding: 6px 10px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: white;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
        `;
        
        searchContainer.appendChild(this.searchInput);
        
        // КОНТЕЙНЕР ДЛЯ МОДУЛЕЙ (в правой панели)
        const modulesContainer = document.createElement('div');
        modulesContainer.id = 'modules-container';
        modulesContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px 0;
        `;
        
        // Патч меню (компактное)
        const patchSection = this.createCompactPatchSection();
        
        // Собираем правую панель
        rightPanel.appendChild(searchContainer);
        rightPanel.appendChild(patchSection);
        rightPanel.appendChild(modulesContainer);
        
        // Собираем контейнер
        container.appendChild(leftPanel);
        container.appendChild(rightPanel);
        this.menuElement.appendChild(container);
        
        document.body.appendChild(this.menuElement);
        this.updateMenuPosition();
        // Создаем группы в левой панели
        this.createGroupList(leftPanel);
    }

    updateMenuPosition(mouseX = null, mouseY = null) {
        if (!this.menuElement) return;
        
        const { innerWidth, innerHeight } = window;
        const menuWidth = 500;
        const menuHeight = 400;
        
        let left, top;
        
        if (mouseX !== null && mouseY !== null) {
            // Позиционируем рядом с курсором, но с проверкой границ
            left = mouseX + 10;
            top = mouseY + 10;
            
            // Проверяем, чтобы не вылезало за экран справа
            if (left + menuWidth > innerWidth) {
                left = mouseX - menuWidth - 10;
            }
            
            // Проверяем, чтобы не вылезало за экран снизу
            if (top + menuHeight > innerHeight) {
                top = mouseY - menuHeight - 10;
            }
            
            // Проверяем границы слева и сверху
            if (left < 10) left = 10;
            if (top < 10) top = 10;
        } else {
            // Центрируем если нет координат мыши
            left = (innerWidth - menuWidth) / 2;
            top = (innerHeight - menuHeight) / 2;
        }
        
        this.menuElement.style.left = `${left}px`;
        this.menuElement.style.top = `${top}px`;
    }
   
    createPatchSection() {
        const section = document.createElement('div');
        section.style.cssText = `
            border-bottom: 1px solid #333;
            padding: 8px 0;
        `;
        
        const patchItems = [
            { text: '📂 Load patch', action: 'load-patch' },
            { text: '💾 Save patch', action: 'save-patch' },
            { text: '📄 Save patch as...', action: 'save-patch-as' },
            { text: '🆕 New patch', action: 'new-patch' }
        ];
        
        patchItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.text;
            button.style.cssText = `
                width: 100%;
                padding: 10px 16px;
                background: transparent;
                border: none;
                color: #ddd;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            button.onmouseenter = () => {
                button.style.background = '#2a2a2a';
            };
            button.onmouseleave = () => {
                button.style.background = 'transparent';
            };
            
            button.onclick = () => this.handlePatchAction(item.action);
            
            section.appendChild(button);
        });
        
        return section;
    }

    createCompactPatchSection() {
        const section = document.createElement('div');
        section.style.cssText = `
            background: #252525;
            border-bottom: 1px solid #333;
            padding: 0;
        `;
        
        const patchItems = [
            { text: 'Load', action: 'load-patch' },
            { text: 'Save', action: 'save-patch' },
            { text: 'Save As', action: 'save-patch-as' },
            { text: 'New', action: 'new-patch' },
            { text: 'To CSD', action: 'export-csd' } 
        ];
        
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            font-size: 11px;
            color: #888;
            padding: 4px 12px;
        `;
        
        patchItems.forEach((item, index) => {
            const button = document.createElement('button');
            button.textContent = item.text;
            button.title = item.action.replace('-', ' ') + ' patch';
            button.style.cssText = `
                background: transparent;
                border: none;
                color: #aaa;
                cursor: pointer;
                font-size: 11px;
                padding: 2px 8px;
                margin-right: 12px;
                border-radius: 2px;
            `;
            
            button.onmouseenter = () => {
                button.style.background = '#333';
                button.style.color = '#fff';
            };
            button.onmouseleave = () => {
                button.style.background = 'transparent';
                button.style.color = '#aaa';
            };
            
            button.onclick = (e) => {
                e.stopPropagation();
                this.handlePatchAction(item.action);
            };
            
            container.appendChild(button);
        });
        
        section.appendChild(container);
        return section;
    }
    
    createModuleGroups() {
        console.log('Creating module groups...');
        console.log('this.moduleGroups:', this.moduleGroups);
        console.log('Menu element exists:', !!this.menuElement);
        
        if (!this.menuElement) {
            console.error('Menu element not created yet!');
            return;
        }
        
        const container = this.menuElement.querySelector('#groups-container');
        console.log('Container found:', !!container);
        
        if (!container) {
            console.error('Groups container not found!');
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(this.moduleGroups).forEach(([groupName, modules]) => {
            const groupElement = this.createGroupElement(groupName, modules);
            container.appendChild(groupElement);
        });
    }
    
    createGroupElement(groupName, modules) {
        const group = document.createElement('div');
        group.className = 'module-group';
        group.style.cssText = `
            margin: 8px 0;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #333;
        `;
        
        // Заголовок группы
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #2a2a2a;
            color: #0af;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <span>${groupName}</span>
            <span class="group-arrow">▼</span>
        `;
        
        // Контейнер для модулей (изначально скрыт)
        const modulesContainer = document.createElement('div');
        modulesContainer.className = 'modules-container';
        modulesContainer.style.cssText = `
            display: none;
            background: #252525;
        `;
        
        // Добавляем модули в группу
        modules.forEach(moduleName => {
            const moduleButton = this.createModuleButton(moduleName, groupName);
            modulesContainer.appendChild(moduleButton);
        });
        
        // Переключение видимости при клике на заголовок
        header.onclick = () => {
            const isVisible = modulesContainer.style.display !== 'none';
            modulesContainer.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.group-arrow').textContent = isVisible ? '▼' : '▲';
        };
        
        // Открываем при поиске
        this.searchInput.addEventListener('input', () => {
            const searchTerm = this.searchInput.value.toLowerCase();
            if (searchTerm && modules.some(m => m.toLowerCase().includes(searchTerm))) {
                modulesContainer.style.display = 'block';
                header.querySelector('.group-arrow').textContent = '▲';
            }
        });
        
        group.appendChild(header);
        group.appendChild(modulesContainer);
        
        return group;
    }

    createGroupList(container) {
        container.innerHTML = '';
        
        if (!this.moduleGroups) return;
        
        Object.keys(this.moduleGroups).forEach((groupName, index) => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.dataset.group = groupName;
            groupItem.style.cssText = `
                padding: 6px 12px;
                font-size: 11px;
                color: #aaa;
                cursor: pointer;
                user-select: none;
                border-left: 2px solid transparent;
            `;
            
            groupItem.textContent = groupName;
            
            // При наведении - показываем модули этой группы
            groupItem.onmouseenter = () => {
                // Подсветка активной группы
                document.querySelectorAll('.group-item').forEach(item => {
                    item.style.background = 'transparent';
                    item.style.borderLeftColor = 'transparent';
                    item.style.color = '#aaa';
                });
                
                groupItem.style.background = '#2a2a2a';
                groupItem.style.borderLeftColor = '#0af';
                groupItem.style.color = '#fff';
                
                // Показываем модули этой группы в правой панели
                this.showModulesForGroup(groupName);
            };
            
            // При клике - выбираем группу
            groupItem.onclick = () => {
                this.showModulesForGroup(groupName);
            };
            
            container.appendChild(groupItem);
        });
        
        // Выбираем первую группу по умолчанию
        const firstGroup = Object.keys(this.moduleGroups)[0];
        if (firstGroup) {
            setTimeout(() => {
                const firstItem = container.querySelector('.group-item');
                if (firstItem) {
                    firstItem.style.background = '#2a2a2a';
                    firstItem.style.borderLeftColor = '#0af';
                    firstItem.style.color = '#fff';
                    this.showModulesForGroup(firstGroup);
                }
            }, 10);
        }
    }

    showModulesForGroup(groupName) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer || !this.moduleGroups[groupName]) return;
        
        const modules = this.moduleGroups[groupName];
        
        // Фильтруем по поиску если есть
        let searchTerm = '';
        if (this.searchInput && this.searchInput.value) {
            searchTerm = this.searchInput.value.toLowerCase();
        }
        const filteredModules = searchTerm ? 
            modules.filter(m => m.toLowerCase().includes(searchTerm)) : 
            modules;
        
        modulesContainer.innerHTML = '';
        
        if (filteredModules.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = 'No modules found';
            emptyMsg.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 11px;
                font-style: italic;
            `;
            modulesContainer.appendChild(emptyMsg);
            return;
        }
        
        // Компактный список модулей
        filteredModules.forEach(moduleName => {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'module-item';
            moduleItem.style.cssText = `
                padding: 4px 12px;
                font-size: 11px;
                color: #ccc;
                cursor: pointer;
                user-select: none;
                display: flex;
                align-items: center;
                min-height: 24px;
            `;
            
            moduleItem.textContent = moduleName;
            
            moduleItem.onmouseenter = () => {
                moduleItem.style.background = '#2a2a2a';
            };
            
            moduleItem.onmouseleave = () => {
                moduleItem.style.background = 'transparent';
            };
            
            moduleItem.onclick = () => {
                this.handleModuleSelect(moduleName);
            };
            
            modulesContainer.appendChild(moduleItem);
        });
    }

    createModuleButton(moduleName, groupName) {
        const button = document.createElement('button');
        button.textContent = moduleName;
        button.style.cssText = `
            width: 100%;
            padding: 8px 16px;
            background: transparent;
            border: none;
            color: #ddd;
            text-align: left;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #333;
        `;
        
        // Иконка для модуля (можно заменить на более подходящие)
        const iconMap = {
            'In/Out': '🔌',
            'Note': '🎹',
            'Osc': '🎵',
            'LFO': '📈',
            'Env': '📊',
            'Shaper': '🔧',
            'Filter': '🎛️',
            'Mixer': '🎚️',
            'Switch': '🔀',
            'Level': '📶',
            'Logic': '🧠',
            'Seq': '🎲',
            'FX': '🎛️',
            'Delay': '⏱️'
        };
        
        button.innerHTML = `${iconMap[groupName] || '📦'} ${moduleName}`;
        
        button.onmouseenter = () => {
            button.style.background = '#2a2a2a';
        };
        button.onmouseleave = () => {
            button.style.background = 'transparent';
        };
        
        button.onclick = () => {
            this.handleModuleSelect(moduleName);
            this.hide();
        };
        
        return button;
    }
    
    setupEventListeners() {
        // Запоминаем позицию мыши для открытия меню рядом с курсором
        let lastMouseX = window.innerWidth / 2;
        let lastMouseY = window.innerHeight / 2;
        
        // Обновляем позицию мыши при движении
        document.addEventListener('mousemove', (e) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
        
        // Клавиша Space для открытия меню
        document.addEventListener('keydown', (e) => {
            // Пропускаем если в поле ввода
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 🚫 НЕ открываем, если мышь над CSoundWindow
            const csoundWindow = document.getElementById('csound-window');
            if (csoundWindow && csoundWindow.style.display === 'block') {
                const rect = csoundWindow.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    console.log('🚫 Mouse over CSoundWindow - context menu blocked');
                    return;
                }
            }
            
            if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                
                // Вместо прямого вызова show() - используем интеллектуальное открытие
                if (this.system && this.system.openContextMenuAtMousePosition) {
                    this.system.openContextMenuAtMousePosition();
                } else {
                    // Fallback
                    this.show();
                }
            }
            
            // Escape для закрытия
            if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                this.hide();
            }
            
            // Tab для навигации по группам (опционально)
            if (e.key === 'Tab' && this.isVisible) {
                e.preventDefault();
                this.navigateGroups(e.shiftKey ? -1 : 1);
            }
        });
        
        // Клик вне меню для закрытия
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.menuElement.contains(e.target)) {
                this.hide();
            }
        });
        
        // Обновляем позицию меню при изменении размера окна
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.updateMenuPosition();
            }
        });
        
        // Проверяем что searchInput существует
        if (this.searchInput) {
            // Поиск при вводе (новая логика)
            this.searchInput.addEventListener('input', () => {
                // Получаем активную группу
                const activeGroup = this.menuElement.querySelector('.group-item[style*="border-left-color"]');
                if (activeGroup) {
                    const groupName = activeGroup.dataset.group;
                    this.showModulesForGroup(groupName);
                } else {
                    // Если нет активной группы, показываем первую
                    const firstGroup = Object.keys(this.moduleGroups)[0];
                    if (firstGroup) {
                        this.showModulesForGroup(firstGroup);
                    }
                }
            });
            
            // Enter для выбора первого модуля в списке
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectFirstModule();
                }
                
                // Стрелки для навигации по модулям
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateModules(e.key === 'ArrowDown' ? 1 : -1);
                }
            });
        }
        
        // Навигация по меню с клавиатуры
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            
            // Стрелки влево/вправо для переключения групп
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateGroups(e.key === 'ArrowRight' ? 1 : -1);
            }
        });
    }

    // Добавляем вспомогательные методы для навигации

    canvasToScreen(canvasX, canvasY) {
        const rect = this.system.canvas.getBoundingClientRect();
        return {
            x: rect.left + canvasX,
            y: rect.top + canvasY
        };
    }


    navigateGroups(direction) {
        const leftPanel = this.menuElement.querySelector('#left-panel');
        if (!leftPanel) return;
        
        const groups = Array.from(leftPanel.querySelectorAll('.group-item'));
        if (groups.length === 0) return;
        
        // Находим текущую активную группу
        let currentIndex = groups.findIndex(group => 
            group.style.borderLeftColor === 'rgb(0, 170, 255)' || 
            group.style.borderLeftColor === '#0af'
        );
        
        if (currentIndex === -1) currentIndex = 0;
        
        // Вычисляем новую позицию
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = groups.length - 1;
        if (newIndex >= groups.length) newIndex = 0;
        
        // Активируем новую группу
        const newGroup = groups[newIndex];
        const groupName = newGroup.dataset.group;
        
        // Снимаем выделение со всех групп
        groups.forEach(group => {
            group.style.background = 'transparent';
            group.style.borderLeftColor = 'transparent';
            group.style.color = '#aaa';
        });
        
        // Выделяем новую группу
        newGroup.style.background = '#2a2a2a';
        newGroup.style.borderLeftColor = '#0af';
        newGroup.style.color = '#fff';
        
        // Показываем модули этой группы
        this.showModulesForGroup(groupName);
        
        // Фокус на поле поиска
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    navigateModules(direction) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        
        const modules = Array.from(modulesContainer.querySelectorAll('.module-item'));
        if (modules.length === 0) return;
        
        // Находим текущий активный модуль
        let currentIndex = modules.findIndex(module => 
            module.style.background === 'rgb(42, 42, 42)' ||
            module.style.background === '#2a2a2a'
        );
        
        if (currentIndex === -1) currentIndex = 0;
        
        // Вычисляем новую позицию
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = modules.length - 1;
        if (newIndex >= modules.length) newIndex = 0;
        
        // Убираем выделение со всех модулей
        modules.forEach(module => {
            module.style.background = 'transparent';
        });
        
        // Выделяем новый модуль
        const newModule = modules[newIndex];
        newModule.style.background = '#2a2a2a';
        
        // Скроллим к модулю если нужно
        newModule.scrollIntoView({ block: 'nearest' });
    }

    selectFirstModule() {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        
        const firstModule = modulesContainer.querySelector('.module-item');
        if (firstModule) {
            const moduleName = firstModule.textContent;
            this.handleModuleSelect(moduleName);
            this.hide();
        }
    }
    
    show(mouseX = null, mouseY = null) {
        if (this.isVisible) return;

        // Закрываем меню джека если открыто
        if (this.system.jackContextMenu && this.system.jackContextMenu.menuElement.style.display === 'block') {
            this.system.jackContextMenu.hide();
        }
        //this.lastOpenMouseY = mouseY !== null ? mouseY : window.innerHeight / 2;
        // 💾 СОХРАНЯЕМ КООРДИНАТЫ МЫШИ!
        this.lastOpenMouseX = mouseX;
        this.lastOpenMouseY = mouseY;


        // Обновляем позицию (с координатами мыши или по центру)
        this.updateMenuPosition(mouseX, mouseY);
        
        // Показываем с анимацией
        this.menuElement.style.opacity = '1';
        this.menuElement.style.transform = 'scale(1)';
        this.menuElement.style.visibility = 'visible';
        
        this.isVisible = true;
        
        // Сбрасываем поиск и выбираем первую группу
        if (this.searchInput) {
            this.searchInput.value = '';
            
            // Не фокусируем сразу - дадим анимации завершиться
            setTimeout(() => {
                this.searchInput.focus();
            }, 50);
            
            // Выбираем первую группу
            const firstGroup = Object.keys(this.moduleGroups)[0];
            if (firstGroup) {
                const leftPanel = this.menuElement.querySelector('#left-panel');
                if (leftPanel) {
                    // Снимаем выделение со всех групп
                    leftPanel.querySelectorAll('.group-item').forEach(item => {
                        item.style.background = 'transparent';
                        item.style.borderLeftColor = 'transparent';
                        item.style.color = '#aaa';
                    });
                    
                    // Выделяем первую
                    const firstItem = leftPanel.querySelector('.group-item');
                    if (firstItem) {
                        firstItem.style.background = '#2a2a2a';
                        firstItem.style.borderLeftColor = '#0af';
                        firstItem.style.color = '#fff';
                        this.showModulesForGroup(firstGroup);
                    }
                }
            }
        }
    }

    hide() {
        if (!this.isVisible) return;
        
        // Плавно скрываем
        this.menuElement.style.opacity = '0';
        this.menuElement.style.transform = 'scale(0.95)';
        
        // После анимации скрываем полностью
        setTimeout(() => {
            this.menuElement.style.visibility = 'hidden';
            this.isVisible = false;
            
            // Сбрасываем поиск
            if (this.searchInput) {
                this.searchInput.value = '';
            }
        }, 100); // Должно совпадать с duration анимации
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    handleModuleSelect(moduleName) {
        console.log(`Selected module: ${moduleName}`);
        
        // Получаем координаты мыши из show() или используем центр canvas
        let targetLayer = 'voice';
        let targetGridX = 0;
        let targetGridY = 0;
        
        if (this.lastOpenMouseX !== null && this.lastOpenMouseY !== null) {
            // 🎯 Конвертируем экранные координаты в координаты canvas
            const canvas = this.system.canvas;
            const rect = canvas.getBoundingClientRect();
            
            // Проверяем, была ли мышь над canvas
            if (this.lastOpenMouseX >= rect.left && this.lastOpenMouseX <= rect.right &&
                this.lastOpenMouseY >= rect.top && this.lastOpenMouseY <= rect.bottom) {
                
                // Конвертируем в координаты canvas
                const canvasX = (this.lastOpenMouseX - rect.left) * (canvas.width / rect.width);
                const canvasY = (this.lastOpenMouseY - rect.top) * (canvas.height / rect.height);
                
                // Определяем слой
                targetLayer = this.system.layerManager.getLayerAtPoint(canvasX, canvasY);
                
                // Конвертируем в grid координаты
                const layer = this.system.layerManager.getLayer(targetLayer);
                if (layer) {
                    const gridX = Math.floor((canvasX - layer.x) / GRID_UNITS.X);
                    const gridY = Math.floor((canvasY - layer.y) / GRID_UNITS.Y);
                    
                    targetGridX = Math.max(0, gridX);
                    targetGridY = Math.max(0, gridY);
                }
            }
        }
        
        // 🔍 Получаем размеры модуля из фабрики
        let moduleWidth = 1;
        let moduleHeight = 2; // по умолчанию
        
        const definition = this.system.moduleFactory.moduleRegistry[moduleName];
        if (definition) {
            moduleHeight = definition.gridHeight || 2;
        }
        
        // 🔍 Ищем свободное место
        let position;
        if (this.system.isGridCellFree(targetLayer, targetGridX, targetGridY, moduleWidth, moduleHeight)) {
            position = { gridX: targetGridX, gridY: targetGridY };
        } else {
            console.log(`❌ Position (${targetGridX}, ${targetGridY}) is occupied, searching nearby...`);
            
            // Ищем ближайшее свободное место
            position = this.system.findFreeSpace(targetLayer, moduleWidth, moduleHeight, targetGridX, targetGridY);
            
            if (position) {
                console.log(`✅ Found free space at (${position.gridX}, ${position.gridY})`);
            } else {
                console.log(`❌ No free space in layer ${targetLayer}, trying default position`);
                // Пробуем найти любое свободное место
                position = this.system.findFreeSpace(targetLayer, moduleWidth, moduleHeight, 0, 0);
            }
        }
        
        if (position) {
            // Добавляем модуль в найденную позицию
            if (this.system && this.system.addNewModuleAtPosition) {
                this.system.addNewModuleAtPosition(moduleName, targetLayer, position.gridX, position.gridY);
            } else {
                // Fallback - используем старый метод, но с переданными координатами
                this.system.addNewModule(moduleName, targetLayer, position.gridX, position.gridY);
            }
        } else {
            console.error(`❌ No free space in layer ${targetLayer} at all!`);
            this.system.showNotification(`❌ No free space in ${targetLayer === 'voice' ? 'VA' : 'FX'} layer`);
        }
        
        this.hide();
    }

    
    handlePatchAction(action) {
        
        switch(action) {
            case 'load-patch':
                if (this.system && this.system.loadJsonPatch) {
                    // Добавляем задержку для отслеживания
                    setTimeout(async () => {
                        try {
                            const result = await this.system.loadJsonPatch();
                        } catch (error) {
                            console.error('💥 loadJsonPatch error:', error);
                        }
                    }, 100);
                } else {
                    console.error('❌ system.loadJsonPatch not available!');
                }
                break;
                
            case 'save-patch':
                if (this.system && this.system.exportPatch) {
                    this.system.exportPatch();
                }
                break;
                
            case 'save-patch-as':
                if (this.system && this.system.savePatchAs) {
                    this.system.savePatchAs();
                }
                break;
                
            case 'new-patch':
                if (this.system && this.system.resetEverything) {
                    this.system.resetEverything();
                }
                break;

            case 'export-csd':  // ← НОВЫЙ КЕЙС
                if (this.system && this.system.csoundGen) {
                    this.system.exportCsd();
                } else {
                    console.error('❌ csoundGen not available!');
                }
                break;
        }
        
        this.hide();
    }

    injectStyles() {
        if (document.getElementById('context-menu-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'context-menu-styles';
        style.textContent = `
            /* Убираем старую анимацию */
            
            /* Скроллбар */
            #left-panel::-webkit-scrollbar,
            #modules-container::-webkit-scrollbar {
                width: 6px;
            }
            
            #left-panel::-webkit-scrollbar-track,
            #modules-container::-webkit-scrollbar-track {
                background: #222;
            }
            
            #left-panel::-webkit-scrollbar-thumb,
            #modules-container::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 3px;
            }
            
            #left-panel::-webkit-scrollbar-thumb:hover,
            #modules-container::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            /* Эффекты при наведении */
            .group-item:hover {
                background: #2a2a2a !important;
                color: #fff !important;
            }
            
            .module-item:hover {
                background: #2a2a2a !important;
            }
            
            /* Активный элемент */
            .module-item:active {
                background: #0af !important;
                color: white !important;
            }
            
            /* Фокус на поле поиска */
            #context-menu input:focus {
                border-color: #0af !important;
                box-shadow: 0 0 0 1px rgba(0, 170, 255, 0.2);
            }
            
            /* Предотвращаем выделение текста */
            .group-item, .module-item {
                user-select: none;
            }
        `;
        
        document.head.appendChild(style);
    }
}