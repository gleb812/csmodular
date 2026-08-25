#!/usr/bin/env python3
"""
Конвертер модулей из оригинального формата в JSON-описания для веб-синтезатора
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

def debug_show_first_file(input_dir):
    files = list(Path(input_dir).glob("*.txt"))
    if files:
        first_file = files[0]
        print(f"\n🔍 ДИАГНОСТИКА: просмотр первого файла {first_file.name}")
        print("="*60)
        
        with open(first_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Покажем первые 500 символов
        print("ПЕРВЫЕ 500 СИМВОЛОВ:")
        print("-"*40)
        print(content[:500])
        print("-"*40)
        
        # Поищем разные варианты блока Module
        print("\nПОИСК РАЗНЫХ ВАРИАНТОВ:")
        
        patterns = [
            (r'<#Module', 'Простой <#Module'),
            (r'<#\s*Module', '<# с пробелами'),
            (r'<\s*#\s*Module', 'с пробелами везде'),
            (r'Module\s*{', 'Module с фигурными скобками'),
            (r'"Module"', 'Module в кавычках'),
        ]
        
        for pattern, desc in patterns:
            if re.search(pattern, content):
                print(f"  ✅ {desc}: найден по паттерну '{pattern}'")
                # Покажем контекст
                match = re.search(pattern, content)
                start = max(0, match.start() - 20)
                end = min(len(content), match.end() + 100)
                print(f"     Контекст: ...{content[start:end]}...")
            else:
                print(f"  ❌ {desc}: не найден")
        
        return content
    else:
        print("❌ Нет .txt файлов для диагностики")
        return None

# Маппинг оригинальных типов компонентов на наши JS-классы
COMPONENT_MAPPING = {
    "Bitmap": "SVG",
    "TextField": "TextField",
    "MiniVU": "MiniVU",
    "ButtonRadio": "ButtonRadio",  
    "Text": "TextLabel",
    "TextEdit": "TextEdit",
    "ButtonText": "ButtonText",    
    "ButtonFlat": "ButtonFlat",
    "ButtonIncDec": "ButtonIncDec",
    "Knob": "Knob",
    "Output": "Output",        
    "Input": "Input",          
    "Graph": "Graph",
    "LED": "LED",
    "Led": "LED",
    "Line": "Line",
    "LevelShift": "LevelShift",
    "PartSelector": "PartSelector",
    # Symbol обрабатывается отдельно
}

# Стандартные параметры для каждого типа компонентов
DEFAULT_COMPONENT_PARAMS = {
    "MiniVU": {
        "width": 6,
        "height": 15
    },
    "TextLabel": {
        "fontSize": 9,
        "color": "#ffffff"
    },
    "ButtonFlat": {
        "width": 30,
        "height": 12
    },
    "Knob": {
        "size": "medium",
        "min": 0,
        "max": 10,
        "defaultValue": 5,
        "snapping": False
    }
}

class ModuleParser:
    def __init__(self, components_dir: str = "../src/components", typeid_file: str = "ModID2Name.txt"):
        self.components_dir = components_dir
        self.typeid_file = typeid_file
        self.typeid_mapping = self._load_typeid_mapping()  # НОВАЯ СТРУКТУРА!
        self.available_components = self._scan_components()
        self.temp_components = []  # Временный список для хранения распарсенных данных
        self.knob_code_refs = {}   # Словарь для хранения CodeRef -> ID для Knob

    def _load_typeid_mapping(self) -> Dict[str, Dict[str, Any]]:
        """Загружает таблицу typeID из файла с поддержкой альтернативных имён"""
        mapping = {}
        loaded_count = 0
        try:
            if os.path.exists(self.typeid_file):
                with open(self.typeid_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            # Делим по любому whitespace
                            parts = re.split(r'\s+', line)
                            if len(parts) >= 2 and parts[1].strip():
                                try:
                                    typeid = int(parts[0].strip())
                                    original_name = parts[1].strip()
                                    js_name = None
                                    
                                    # Проверяем наличие третьего поля (JS-имя)
                                    if len(parts) >= 3 and parts[2].strip():
                                        js_name = parts[2].strip()
                                    
                                    mapping[original_name] = {
                                        "typeID": typeid,
                                        "jsName": js_name  # Может быть None
                                    }
                                    loaded_count += 1
                                except ValueError:
                                    continue
                print(f"Загружено записей TypeID: {loaded_count}")
            else:
                print(f"Note: TypeID mapping file '{self.typeid_file}' not found")
        except Exception as e:
            print(f"Error loading TypeID mapping: {e}")
        return mapping

    def _get_js_module_name(self, module_type):
        """Получает JS-имя модуля из таблицы соответствий"""
        # Сначала проверяем mapping файл
        if module_type in self.typeid_mapping:
            entry = self.typeid_mapping[module_type]
            if entry.get("jsName"):
                return entry["jsName"]
        
        # Если нет специального JS-имени, используем оригинальное имя
        return module_type
        
    def _scan_components(self) -> List[str]:
        """Сканируем папку components и возвращаем список доступных JS-компонентов"""
        components = []
        for file in Path(self.components_dir).glob("*.js"):
            # Извлекаем имя компонента из имени файла
            comp_name = file.stem
            # Пропускаем BaseComponent
            if comp_name != "BaseComponent":
                components.append(comp_name)
        print(f"Найдено компонентов: {components}")
        return components
    
    def parse_module_file(self, filepath: str) -> Dict[str, Any]:
        """Парсит один файл модуля"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Удаляем комментарии (если есть)
        content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        
        # Извлекаем основные параметры модуля
        module_info = self._extract_module_info(content)
        
        # ПЕРВЫЙ ПРОХОД: собираем информацию о всех компонентах, особенно Knob
        self._first_pass_extract(content)
        
        # ВТОРОЙ ПРОХОД: конвертируем компоненты с учетом собранной информации
        components = self._second_pass_extract(content)
        
        # 🔥 НОВОЕ: извлекаем ID входов и выходов
        port_ids = self._extract_port_ids(content)
        
        return {
            "module": module_info,
            "components": components,
            "ports": port_ids  # ← добавляем порты
        }
    
    def _first_pass_extract(self, content: str):
        """Первый проход: собираем информацию о всех Knob для быстрого поиска"""
        self.temp_components = []
        self.knob_code_refs = {}
        
        # Разбиваем по закрывающим тегам #>
        parts = content.split('#>')
        
        for part in parts:
            # Ищем начало тега
            start_idx = part.rfind('<#')
            if start_idx != -1:
                tag_content = part[start_idx + 2:].strip()
                
                # Извлекаем тип компонента (первое слово)
                if tag_content:
                    lines = tag_content.split('\n')
                    first_line = lines[0].strip()
                    comp_type = first_line.split()[0] if first_line else ""
                    
                    if comp_type and comp_type != "Module":
                        comp_text = '\n'.join(lines[1:]) if len(lines) > 1 else ""
                        attrs = self._parse_attributes(comp_text)
                        
                        # Сохраняем временные данные
                        comp_data = {
                            "type": comp_type,
                            "attrs": attrs,
                            "raw_text": comp_text
                        }
                        self.temp_components.append(comp_data)
                        
                        # Если это Knob, сохраняем связь CodeRef -> ID
                        if comp_type == "Knob":
                            code_ref = attrs.get("CodeRef")
                            knob_id = attrs.get("ID")
                            if code_ref and knob_id:
                                self.knob_code_refs[int(code_ref)] = int(knob_id)
    
    def _second_pass_extract(self, content: str) -> List[Dict[str, Any]]:
        """Второй проход: конвертируем компоненты с учетом информации из первого прохода"""
        components = []
        
        # Теперь обрабатываем все компоненты в правильном порядке
        for comp_data in self.temp_components:
            orig_type = comp_data["type"]
            attrs = comp_data["attrs"]
            
            # Обрабатываем специальный случай для Symbol
            if orig_type == "Symbol":
                component = self._convert_symbol_to_text(attrs)
                if component:
                    components.append(component)
                continue
                
            # Конвертируем обычный компонент
            # ОСОБЫЙ СЛУЧАЙ: Knob с Type:"Slider" должен стать Slider
            if orig_type == "Knob" and attrs.get("Type") == "Slider":
                print(f"  🎚️  Обнаружен Knob с Type:Slider - конвертируем в Slider")
                our_type = "Slider"
            else:
                our_type = COMPONENT_MAPPING.get(orig_type)
            
            # Если нет маппинга или компонент не реализован
            if not our_type or our_type not in self.available_components:
                print(f"  ⚠️  Компонент {orig_type} -> {our_type} не найден, заменяем заглушкой")
                component = self._create_stub_component(orig_type, attrs)
                if component:
                    components.append(component)
                continue
            
            # Базовый объект компонента
            component = {
                "componentType": our_type,
                "id": attrs.get("ID", "unknown"),
                "x": int(attrs.get("XPos", 0)),
                "y": int(attrs.get("YPos", 0))
            }
            
            # Добавляем специфичные параметры для каждого типа
            self._add_type_specific_params(component, orig_type, attrs)
            
            components.append(component)
        
        return components

    def _extract_module_info(self, content: str) -> Dict[str, Any]:
        """Извлекает информацию о модуле из заголовка <#Module ... #>"""
        module_match = re.search(r'<#Module\s+(.*?)#>', content, re.DOTALL)
        if not module_match:
            raise ValueError("Не найден блок Module")
        
        module_text = module_match.group(1)
        
        # Парсим атрибуты модуля
        attrs = self._parse_attributes(module_text)
        
        # Конвертируем Height в пикселы (1 юнит = 15px)
        height = int(attrs.get("Height", 2))
        
        original_name = attrs.get("Name", "Unknown Module")
        file_name = attrs.get("FileName", "Unknown")
        js_type = self._get_js_module_name(original_name)

        return {
            "type": js_type,
            "typeID": 0,  # Будет установлено позже при обработке файла
            "displayName": original_name,
            "height": height,
            "originalName": attrs.get("Name", ""),
            "fileName": file_name,
            "tooltip": attrs.get("Tooltip", ""),
            "version": attrs.get("Version", 0)
        }
    
    def _extract_components(self, content: str) -> List[Dict[str, Any]]:
        """Извлекает все компоненты из файла модуля"""
        components = []
        
        # Разбиваем по закрывающим тегам #>
        parts = content.split('#>')
        
        for part in parts:
            # Ищем начало тега
            start_idx = part.rfind('<#')
            if start_idx != -1:
                tag_content = part[start_idx + 2:].strip()
                
                # Извлекаем тип компонента (первое слово)
                if tag_content:
                    # Берем первое слово как тип компонента
                    lines = tag_content.split('\n')
                    first_line = lines[0].strip()
                    
                    # Тип компонента - первое слово в первой строке
                    comp_type = first_line.split()[0] if first_line else ""
                    
                    if comp_type and comp_type != "Module":
                        # Объединяем все строки кроме первой как содержимое
                        comp_text = '\n'.join(lines[1:]) if len(lines) > 1 else ""
                        
                        attrs = self._parse_attributes(comp_text)
                        converted = self._convert_component(comp_type, attrs)
                        if converted:
                            components.append(converted)
        
        return components

    def _extract_port_ids(self, content: str) -> Dict[str, List[int]]:
        """Извлекает ID всех входов и выходов из содержимого модуля"""
        inputs = []
        outputs = []
        
        # Ищем все блоки Input
        input_pattern = r'<#Input\s+(.*?)#>'
        for match in re.finditer(input_pattern, content, re.DOTALL):
            attrs = self._parse_attributes(match.group(1))
            if 'ID' in attrs:
                inputs.append(int(attrs['ID']))
        
        # Ищем все блоки Output
        output_pattern = r'<#Output\s+(.*?)#>'
        for match in re.finditer(output_pattern, content, re.DOTALL):
            attrs = self._parse_attributes(match.group(1))
            if 'ID' in attrs:
                outputs.append(int(attrs['ID']))
        
        # Сортируем для предсказуемого порядка
        inputs.sort()
        outputs.sort()
        
        return {
            'inputs': inputs,
            'outputs': outputs
        }
    
    def _parse_attributes(self, text: str) -> Dict[str, str]:
        """Парсит атрибуты вида Key:Value из текста"""
        attrs = {}
        
        # Регулярное выражение для поиска пар Key:"Value"
        pattern = r'(\w+):"([^"]*)"'
        for match in re.finditer(pattern, text):
            key = match.group(1)
            value = match.group(2)
            attrs[key] = value
        
        # Также ищем Key:Value без кавычек (для чисел)
        pattern_num = r'(\w+):([-\d]+)'
        for match in re.finditer(pattern_num, text):
            key = match.group(1)
            value = match.group(2)
            if key not in attrs:  # Не перезаписываем строковые значения
                attrs[key] = value
        
        return attrs
    
    def _convert_component(self, orig_type: str, attrs: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Конвертирует оригинальный компонент в наш формат"""
        # Получаем наш тип компонента
        if orig_type == "Symbol":
            return self._convert_symbol_to_text(attrs)

        # ОСОБЫЙ СЛУЧАЙ: Knob с Type:"Slider" должен стать Slider
        if orig_type == "Knob" and attrs.get("Type") == "Slider":
            print(f"  🎚️  Обнаружен Knob с Type:Slider - конвертируем в Slider")
            our_type = "Slider"
        else:
            our_type = COMPONENT_MAPPING.get(orig_type)
        
        # Если нет маппинга или компонент не реализован
        if not our_type or our_type not in self.available_components:
            print(f"  ⚠️  Компонент {orig_type} -> {our_type} не найден, заменяем заглушкой")
            return self._create_stub_component(orig_type, attrs)
        
        # Базовый объект компонента
        component = {
            "componentType": our_type,
            "id": attrs.get("ID", "unknown"),
            "x": int(attrs.get("XPos", 0)),
            "y": int(attrs.get("YPos", 0))
        }
        
        # Добавляем специфичные параметры для каждого типа
        self._add_type_specific_params(component, orig_type, attrs)
        
        return component

    def _convert_symbol_to_text(self, attrs: Dict[str, str]) -> Dict[str, Any]:
        """Конвертирует Symbol в TextLabel с соответствующим символом"""
        symbol_type = attrs.get("Type", "")
        
        # Маппинг типов символов на Unicode символы
        # Выбираем наиболее подходящие символы для музыкального/аудио контекста
        symbol_mapping = {
            "Trig 1": "↑",      # Стрелка вверх (trigger up)
            "Trig 2": "⤒",      # Стрелка вниз (trigger down)
            "Trig 3": "→",      # Стрелка вправо
            "Trig 4": "←",      # Стрелка влево
            "Trig Up": "↑",     # Альтернативное название
            "Trig Down": "↓",   # Альтернативное название
            "Trig Left": "←",   # Альтернативное название
            "Trig Right": "→",  # Альтернативное название
            "Switch 1": "↕",    # Вверх-вниз
            "Switch 2": "↔",    # Влево-вправо
            "Power": "⏻",       # Символ питания
            "Play": "▶",        # Воспроизведение
            "Stop": "■",        # Стоп
            "Pause": "⏸",       # Пауза
            "Record": "●",      # Запись (красный кружок)
            "Note": "♪",        # Нотка
            "Wave": "~",        # Волна (синус)
            "Sine": "~",        # Синус
            "Square": "⎍",      # Прямоугольная волна
            "Triangle": "△",    # Треугольная волна
            "Saw": "∠",         # Пилообразная волна
            "Plus": "+",        # Плюс
            "Minus": "−",       # Минус
            "Multiply": "×",    # Умножение
            "Divide": "÷",      # Деление
            "Equal": "=",       # Равно
            "Dot": "•",         # Точка (для LED индикаторов)
            "Circle": "○",      # Круг
            "Check": "✓",       # Галочка
            "Cross": "✗",       # Крестик
            "Audio": "♪",       # Аудио сигнал
            "MIDI": "♬",        # MIDI
            "CV": "~",          # CV сигнал
            "Gate": "⎍",        # Гейт сигнал
            "Clock": "◷",       # Часы
        }
        
        # Получаем символ или используем стрелку вверх по умолчанию
        symbol_char = symbol_mapping.get(symbol_type, "↑")
        
        # Определяем размер шрифта на основе высоты символа
        symbol_height = int(attrs.get("Height", 10))
        # Преобразуем высоту в пикселях в размер шрифта
        # Эмпирическая формула: высота символа примерно равна font-size
        font_size = max(8, min(24, symbol_height))
        
        # Создаем текстовый компонент
        component = {
            "componentType": "TextLabel",
            "id": attrs.get("ID", "unknown"),
            "x": int(attrs.get("XPos", 0)),
            "y": int(attrs.get("YPos", 0)),
            "text": symbol_char,
            "fontSize": font_size,
            "color": "#ffffff",
            "align": "center",  # Центрируем символ
            "valign": "middle", # Вертикальное центрирование
            "originalType": "Symbol",  # Сохраняем информацию о оригинальном типе
            "symbolType": symbol_type  # Сохраняем тип символа
        }
        
        # Если ширина указана, используем её для выравнивания
        width = int(attrs.get("Width", 3))
        if width > 0:
            component["width"] = width * 3  # Умножаем для лучшего отображения
        
        return component
    
    def _add_type_specific_params(self, component: Dict, orig_type: str, attrs: Dict):
        """Добавляет специфичные параметры для разных типов компонентов"""
        if orig_type == "MiniVU":
            component["width"] = 6
            component["height"] = 15
            if attrs.get("Orientation") == "Vertical":
                component["orientation"] = "vertical"
            else:
                component["orientation"] = "horizontal"
                
        elif orig_type == "Text":
            component["text"] = attrs.get("Text", "")
            component["fontSize"] = int(attrs.get("FontSize", 9))
            component["color"] = "#ffffff"

        elif orig_type == "Bitmap":
            component["width"] = int(attrs.get("Width", 30))
            component["height"] = int(attrs.get("Height", 30))
            component["color"] = "#ffffff"

        elif orig_type == "Graph":
            component["width"] = int(attrs.get("Width", 18))
            component["height"] = int(attrs.get("Height", 18))

        elif orig_type == "Symbol":
            # Параметры уже установлены в _convert_symbol
            pass
            
        elif orig_type == "ButtonFlat":
            component["width"] = int(attrs.get("Width", 30))
            component["height"] = 12
            text = attrs.get("Text", "")
            # Разделяем варианты кнопки
            if text and "," in text:
                component["labels"] = [t.strip() for t in text.split(",") if t.strip()]
            
        elif orig_type == "ButtonRadio":
            component["buttonWidth"] = int(attrs.get("ButtonWidth", 18))
            component["buttonCount"] = int(attrs.get("ButtonCount", 4))
            if attrs.get("Orientation") == "Vertical":
                component["orientation"] = "vertical"
            else:
                component["orientation"] = "horizontal"
            text = attrs.get("Text", "")
            if text and "," in text:
                component["labels"] = [t.strip() for t in text.split(",") if t.strip()]

        elif orig_type == "ButtonIncDec":
            # WARNING No names inside modules.(  you need to fix it in ModuleFactory manually
            component["infoFunc"] = int(attrs.get("InfoFunc", 78))

        elif orig_type == "ButtonText":
            component["width"] = int(attrs.get("Width", 13))
            text = attrs.get("Text", "")
            component["text"] = text

        elif orig_type == "TextEdit":
            component["width"] = int(attrs.get("Width", 13))
            text = attrs.get("Text", "")
            component["text"] = text

        elif orig_type == "TextField":
            component["width"] = int(attrs.get("Width", 20))
            master_ref = int(attrs.get("MasterRef", 0))
            
            # Используем словарь knob_code_refs для поиска
            reference_id = self.knob_code_refs.get(master_ref)
            if reference_id is not None:
                component["referenceElementId"] = reference_id
            else:
                # Если не нашли, оставляем MasterRef как есть или устанавливаем 0
                component["referenceElementId"] = master_ref
                if master_ref != 0:
                    print(f"  ⚠️  TextField {component['id']}: не найден Knob с CodeRef={master_ref}")

        elif orig_type == "Line":
            component["length"] = int(attrs.get("Length", 10))
            orientation = attrs.get("Orientation", "")
            component["orientation"] = orientation

        elif orig_type == "Knob":    
                component["infoFunc"] = int(attrs.get("InfoFunc", 0))     
                # Если это слайдер, обрабатываем по-другому
                if attrs.get("Type") == "Slider":
                    # Слайдеры
                    component["width"] = 10  #  ширина слайдера
                    component["height"] = 60  #  высота
                else:
                    component["size"] = "medium"

        elif orig_type == "PartSelector":
            component["width"] = int(attrs.get("Width", 18))
            component["height"] = int(attrs.get("Height", 18))
            component["imageCount"] = int(attrs.get("ImageCount", 4))
            component["menuOffset"] = int(attrs.get("MenuOffset", 0))
            
        elif orig_type in ["Output", "Input"]:
            component["jackType"] = attrs.get("Type", "Audio").lower()
            component["bandwidth"] = attrs.get("Bandwidth", "Dynamic").lower()
            
        # Для остальных типов добавляем дефолтные параметры
        elif component["componentType"] in DEFAULT_COMPONENT_PARAMS:
            component.update(DEFAULT_COMPONENT_PARAMS[component["componentType"]])
    
    def _create_stub_component(self, orig_type: str, attrs: Dict) -> Dict[str, Any]:
        """Создает заглушку для неподдерживаемых компонентов"""
        return {
            "componentType": "Stub",  # Создадим специальный компонент-заглушку
            "id": attrs.get("ID", "unknown"),
            "x": int(attrs.get("XPos", 0)),
            "y": int(attrs.get("YPos", 0)),
            "width": 20,
            "height": 20,
            "originalType": orig_type,
            "color": "#ff0000"  # Красный цвет для видимости
        }
    
    def generate_js_module(self, parsed_data: Dict[str, Any]) -> str:
        """Генерирует JS-файл модуля из распарсенных данных"""
        module_info = parsed_data["module"]
        components = parsed_data["components"]
        ports = parsed_data.get("ports", {"inputs": [], "outputs": []})  # ← берем порты
        
        # Получаем JS-имя для модуля
        original_name = module_info['originalName']
        js_module_name = None
        
        # Пробуем найти JS-имя в таблице TypeID
        if original_name in self.typeid_mapping:
            entry = self.typeid_mapping[original_name]
            js_module_name = entry.get("jsName")
        
        # Если не нашли, генерируем из оригинального имени
        if not js_module_name:
            js_module_name = re.sub(r'[^a-zA-Z0-9_]', '', original_name)
            if js_module_name and not js_module_name[0].isalpha():
                js_module_name = "M" + js_module_name
        
        typeid_str = f"        typeID: {module_info['typeID']}"
        
        # 🔥 ФОРМИРУЕМ СТРОКИ ДЛЯ ПОРТОВ
        inputs_str = f"    inputs: {json.dumps(ports['inputs'])}," if ports['inputs'] else "    inputs: [],"
        outputs_str = f"    outputs: {json.dumps(ports['outputs'])}," if ports['outputs'] else "    outputs: [],"
        
        js_content = f"""// Автоматически сгенерированный модуль: {js_module_name}
    // Исходный файл: {js_module_name}.js
    // Версия: {module_info['version']}

    export const {js_module_name}Module = {{
        type: '{module_info['type']}',
    {typeid_str},
        displayName: '{module_info['displayName']}',
        gridHeight: {module_info['height']},
        originalName: '{module_info['originalName']}',
        tooltip: '{module_info['tooltip']}',
    {inputs_str}
    {outputs_str}
        components: {json.dumps(components, indent=8, ensure_ascii=False)}
    }};
    """
        return js_content

def convert_directory(input_dir: str, output_dir: str, typeid_file: str = "ModID2Name.txt"):
    """Конвертирует все модули в директории"""
    parser = ModuleParser(typeid_file=typeid_file)
    
    # Создаем выходную директорию если не существует
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Ищем все файлы .txt в input_dir
    input_files = list(Path(input_dir).glob("*.txt"))
    
    print(f"Найдено файлов для конвертации: {len(input_files)}")
    
    # Статистика
    files_without_typeid = []
    total_converted = 0
    
    # НЕ загружаем таблицу отдельно - используем загруженную в parser.typeid_mapping
    # parser.typeid_mapping уже содержит структуру: {original_name: {"typeID": X, "jsName": Y}}
    
    # Отладочный вывод для проверки
    print(f"\nПроверка загрузки таблицы через parser.typeid_mapping:")
    print(f"  Найдено 'X-Fade' в typeid_mapping: {'X-Fade' in parser.typeid_mapping}")
    print(f"  Найдено 'Mix4-1B' в typeid_mapping: {'Mix4-1B' in parser.typeid_mapping}")
    
    for input_file in input_files:
        try:
            print(f"\nОбработка: {input_file.name}")
            
            # Парсим модуль
            parsed = parser.parse_module_file(str(input_file))
            
            # Ищем typeID и JS-имя по имени файла
            file_stem = input_file.stem  # Имя файла без расширения
            
            # Получаем запись из таблицы
            entry = parser.typeid_mapping.get(file_stem)
            typeid = 0
            js_name = None
            
            if entry:
                typeid = entry.get("typeID", 0)
                js_name = entry.get("jsName")  # JS-имя из третьего поля
                
                # Если JS-имя не найдено, пробуем поискать по полю FileName из модуля
                if not js_name:
                    file_name_field = parsed["module"].get("fileName", "")
                    alt_entry = parser.typeid_mapping.get(file_name_field)
                    if alt_entry:
                        typeid = alt_entry.get("typeID", 0)  # Может перезаписать typeid
                        js_name = alt_entry.get("jsName")
            
            # Если специальное JS-имя не найдено, используем имя файла
            if not js_name:
                js_name = file_stem
            
            # Обновляем typeID в распарсенных данных
            parsed["module"]["typeID"] = typeid
            
            # Сохраняем информацию для статистики
            if typeid == 0:
                files_without_typeid.append({
                    "filename": input_file.name,
                    "file_stem": file_stem,
                    "fileName_field": parsed["module"].get("fileName", ""),
                    "js_name": js_name
                })
                print(f"  ⚠️  TypeID не найден для '{file_stem}' (будет использовано значение 0)")
            else:
                print(f"  ✓ Найден TypeID: {typeid} для файла '{file_stem}'")
            
            # Генерируем JS - метод generate_js_module сам возьмет правильное JS-имя
            js_content = parser.generate_js_module(parsed)
            
            # Извлекаем js_name из сгенерированного JS-кода (из export const ...Module)
            # Это нужно для правильного имени файла
            js_module_name = None
            for line in js_content.split('\n'):
                if line.strip().startswith('export const'):
                    parts = line.strip().split()
                    if len(parts) > 2 and 'Module' in parts[2]:
                        js_module_name = parts[2].replace('Module', '')
                        break
            
            # Если не нашли в коде, используем js_name
            if not js_module_name:
                js_module_name = js_name
            
            # Сохраняем с правильным именем
            output_filename = js_module_name + ".js"
            output_file = Path(output_dir) / output_filename
            output_file.write_text(js_content, encoding='utf-8')
            
            print(f"  ✓ Создан: {output_file}")
            print(f"  Имя модуля (JS): {js_module_name}")
            print(f"  Имя файла (ориг): {file_stem}")
            print(f"  TypeID: {typeid}")
            print(f"  Компонентов: {len(parsed['components'])}")
            
            total_converted += 1
            
        except Exception as e:
            print(f"  ✗ Ошибка при обработке {input_file.name}: {e}")
            import traceback
            traceback.print_exc()
    
    # Выводим итоговую статистику
    print(f"\n{'='*60}")
    print("ИТОГОВАЯ СТАТИСТИКА:")
    print(f"{'='*60}")
    print(f"Всего обработано файлов: {total_converted}")
    print(f"Успешно сконвертировано: {total_converted}")
    print(f"Файлов без TypeID (typeID=0): {len(files_without_typeid)}")
    
    if files_without_typeid:
        print(f"\nСписок файлов без TypeID:")
        print("-" * 60)
        for i, file_info in enumerate(files_without_typeid, 1):
            print(f"{i:2}. Файл: {file_info['filename']}")
            print(f"    Имя файла (stem): '{file_info['file_stem']}'")
            print(f"    Поле FileName: '{file_info['fileName_field']}'")
            print(f"    JS-имя: '{file_info['js_name']}'")
    
    return {
        "total": total_converted,
        "without_typeid": len(files_without_typeid),
        "files_without_typeid": files_without_typeid
    }

def create_stub_component():
    """Создает компонент-заглушку для неподдерживаемых элементов"""
    stub_js = """// Stub.js - Компонент-заглушка для неподдерживаемых элементов
import { BaseComponent } from './BaseComponent.js';

export class Stub extends BaseComponent {
    constructor(x, y, width = 20, height = 20, originalType = 'Unknown', color = '#ff0000') {
        super(x, y, width, height);
        this.originalType = originalType;
        this.color = color;
    }
    
    draw(ctx) {
        // Красный квадрат
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Черная рамка
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Текст с типом компонента
        ctx.fillStyle = '#fff';
        ctx.font = '8px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Обрезаем текст если слишком длинный
        let text = this.originalType;
        if (text.length > 6) {
            text = text.substring(0, 6) + '...';
        }
        
        ctx.fillText(
            text,
            this.x + this.width/2,
            this.y + this.height/2
        );
    }
}
"""
    
    stub_file = Path("../src/components") / "Stub.js"
    stub_file.write_text(stub_js, encoding='utf-8')
    print(f"Создан компонент-заглушка: {stub_file}")

if __name__ == "__main__":
    INPUT_DIR = "../original_modules"
    OUTPUT_DIR = "../modules"
    TYPEID_FILE = "ModID2Name.txt"
    
    # ДИАГНОСТИКА
    print("🔧 ЗАПУСК ДИАГНОСТИКИ ФАЙЛОВ")
    sample_content = debug_show_first_file(INPUT_DIR)
    
    if sample_content:
        print("\n" + "="*60)
        print("🚀 ЗАПУСК КОНВЕРТАЦИИ")
        print("="*60)
        
        # Проверяем наличие файла таблицы
        if not Path(TYPEID_FILE).exists():
            print(f"⚠️  Файл таблицы TypeID '{TYPEID_FILE}' не найден!")
        
        # Выполняем конвертацию
        stats = convert_directory(INPUT_DIR, OUTPUT_DIR, TYPEID_FILE)
    else:
        print("❌ Диагностика не удалась, конвертация отменена")


if __name__ == "__main__":
    # Настройки путей
    INPUT_DIR = "../original_modules"  # Папка с оригинальными модулями
    OUTPUT_DIR = "../modules"          # Папка для сконвертированных модулей
    TYPEID_FILE = "ModID2Name.txt"     # Файл с таблицей TypeID

    print("🔍 ДИАГНОСТИКА:")
    print(f"   Текущая директория: {os.getcwd()}")
    print(f"   INPUT_DIR: {INPUT_DIR} -> {Path(INPUT_DIR).absolute()}")
    print(f"   OUTPUT_DIR: {OUTPUT_DIR} -> {Path(OUTPUT_DIR).absolute()}")
    print(f"   TYPEID_FILE: {TYPEID_FILE} -> {Path(TYPEID_FILE).absolute()}")
    print()

    # Создаем заглушку если нужно
    create_stub_component()

    # Проверяем существование входной папки
    if Path(INPUT_DIR).exists():
        print(f"✅ Папка {INPUT_DIR} существует")
        
        # Смотрим, какие файлы там есть
        txt_files = list(Path(INPUT_DIR).glob("*.txt"))
        print(f"   Найдено .txt файлов: {len(txt_files)}")
        
        if txt_files:
            print("   Файлы:")
            for f in txt_files:
                print(f"     - {f.name} ({f.stat().st_size} bytes)")
        else:
            print("   ⚠️  Нет .txt файлов в папке!")
    else:
        print(f"❌ Папка {INPUT_DIR} НЕ существует!")
        print(f"   Создаю папку: {INPUT_DIR}")
        Path(INPUT_DIR).mkdir(parents=True, exist_ok=True)
        
        # Создаем тестовый модуль
        test_module = '''<#Module
  Name:"Test Module"
  FileName:"Test"
  Tooltip:"Test module for conversion"
  Height:2
  Version:210
  <#Text
    ID:0
    XPos:10
    YPos:10
    ZPos:0
    FontSize:9
    Text:"Test Text"
  #>
  <#MiniVU
    ID:1
    XPos:100
    YPos:10
    Orientation:"Vertical"
  #>
#>
'''
        test_file = Path(INPUT_DIR) / "Test.txt"
        test_file.write_text(test_module, encoding='utf-8')
        print(f"✅ Создан тестовый файл: {test_file}")

    print("\n" + "="*60)
    print("🚀 ЗАПУСК КОНВЕРТАЦИИ")
    print("="*60 + "\n")

    # Проверяем наличие файла таблицы
    if not Path(TYPEID_FILE).exists():
        print(f"⚠️  Файл таблицы TypeID '{TYPEID_FILE}' не найден!")
        print(f"   Все модули получат typeID: 0")
        print(f"   Создайте файл '{TYPEID_FILE}' с таблицей соответствий")
        print(f"   Формат: <ID>\t<имя_файла_без_расширения>")
        print(f"   Пример: 17\tValSw1\n")

    # Выполняем конвертацию
    stats = convert_directory(INPUT_DIR, OUTPUT_DIR, TYPEID_FILE)

    # Проверяем, что создалось в выходной папке
    print("\n" + "="*60)
    print("📦 РЕЗУЛЬТАТ:")
    print("="*60)
    
    if Path(OUTPUT_DIR).exists():
        js_files = list(Path(OUTPUT_DIR).glob("*.js"))
        print(f"✅ Папка {OUTPUT_DIR} создана")
        print(f"   Создано .js файлов: {len(js_files)}")
        
        if js_files:
            print("   Файлы:")
            for f in js_files:
                print(f"     - {f.name} ({f.stat().st_size} bytes)")
        else:
            print("   ⚠️  Нет .js файлов в папке!")
    else:
        print(f"❌ Папка {OUTPUT_DIR} НЕ создана!")

    # Сохраняем статистику в файл
    stats_file = Path(OUTPUT_DIR) / "conversion_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"\n📊 Статистика сохранена в: {stats_file}")
