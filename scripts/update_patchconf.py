#!/usr/bin/env python3
import sys
import json
import re
from collections import OrderedDict

class CompactJSONEncoder(json.JSONEncoder):
    """Кастомный JSON encoder для компактного форматирования"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_indent = 0
        self.compact_fields = {'value'}  # поля, которые нужно писать компактно
        
    def encode(self, o):
        if isinstance(o, dict) and any(k in self.compact_fields for k in o.keys()):
            # Для словарей с компактными полями
            items = []
            for k, v in o.items():
                if k in self.compact_fields and isinstance(v, list):
                    # Компактный формат для списков
                    items.append(f'"{k}": {json.dumps(v, ensure_ascii=False)}')
                else:
                    # Обычный формат для остальных
                    items.append(f'"{k}": {super().encode(v)}')
            return '{' + ', '.join(items) + '}'
        elif isinstance(o, list):
            # Для списков вне компактных полей
            if len(o) > 0 and all(isinstance(x, (int, float)) for x in o):
                # Числовые списки в одну строку
                return '[' + ', '.join(str(x) for x in o) + ']'
            else:
                return super().encode(o)
        else:
            return super().encode(o)

def parse_vectors_file(filename):
    """Парсит файл с векторами и возвращает словарь {имя: [первый_вектор, второй_вектор]}"""
    vectors = {}
    
    try:
        with open(filename, 'r') as file:
            for line in file:
                line = line.strip()
                if not line:
                    continue
                
                # Разбиваем строку
                parts = line.split()
                if len(parts) < 2:
                    continue
                
                # Имя - первый элемент
                name = parts[0]
                
                # Находим все блоки в квадратных скобках
                brackets = re.findall(r'\[[^\]]*\]', line)
                
                if len(brackets) >= 1:
                    # Парсим первый вектор
                    first_vector = json.loads(brackets[0].replace("'", '"'))
                    
                    # Парсим второй вектор (если есть)
                    second_vector = None
                    if len(brackets) >= 2 and brackets[1] != '[]':
                        second_vector = json.loads(brackets[1].replace("'", '"'))
                    
                    vectors[name] = [first_vector, second_vector]
    
    except Exception as e:
        print(f"Ошибка при чтении файла с векторами: {e}")
        sys.exit(1)
    
    return vectors

def update_config(config_file, vectors):
    """Обновляет конфигурационный файл новыми векторами"""
    
    try:
        # Читаем существующий конфиг
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f, object_pairs_hook=OrderedDict)
    except FileNotFoundError:
        print(f"Файл {config_file} не найден, создаю новый")
        config = OrderedDict()
    except Exception as e:
        print(f"Ошибка при чтении конфига: {e}")
        sys.exit(1)
    
    # Обрабатываем каждый вектор
    for name, (first_vector, second_vector) in vectors.items():
        # Создаем новый элемент
        new_items = []
        
        # Добавляем defaultParams
        new_items.append(OrderedDict([
            ("field", "defaultParams"),
            ("action", "addField"),
            ("value", first_vector)
        ]))
        
        # Добавляем mode, если второй вектор не пустой
        if second_vector is not None:
            new_items.append(OrderedDict([
                ("field", "mode"),
                ("action", "addField"),
                ("value", second_vector)
            ]))
        
        # Если имя уже существует в конфиге
        if name in config:
            # Проверяем, есть ли уже defaultParams
            has_default_params = False
            has_mode = False
            
            for item in config[name]:
                if isinstance(item, dict):
                    if item.get("field") == "defaultParams":
                        has_default_params = True
                        # Обновляем значение
                        item["value"] = first_vector
                    elif item.get("field") == "mode" and second_vector is not None:
                        has_mode = True
                        item["value"] = second_vector
            
            # Добавляем отсутствующие элементы
            if not has_default_params:
                config[name].append(new_items[0])
            if second_vector is not None and not has_mode:
                config[name].append(new_items[1])
        else:
            # Создаем новую запись
            config[name] = new_items
    
    # Сохраняем обновленный конфиг с компактным форматированием
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            # Сначала превращаем в строку с кастомным форматированием
            json_str = json.dumps(config, ensure_ascii=False, indent=2, cls=CompactJSONEncoder)
            
            # Дополнительная обработка: находим все поля "value" и делаем их компактными
            lines = json_str.split('\n')
            i = 0
            while i < len(lines):
                line = lines[i]
                if '"value":' in line and '[' in line and ']' not in line:
                    # Начало многострочного списка
                    start_line = line
                    list_lines = [line.strip()]
                    i += 1
                    # Собираем все строки до закрывающей скобки
                    while i < len(lines) and ']' not in lines[i]:
                        list_lines.append(lines[i].strip())
                        i += 1
                    if i < len(lines):
                        list_lines.append(lines[i].strip())
                    
                    # Объединяем в одну строку
                    combined = ' '.join(list_lines)
                    # Убираем лишние пробелы после запятых
                    combined = re.sub(r',\s+', ', ', combined)
                    f.write(combined + '\n')
                else:
                    f.write(line + '\n')
                i += 1
                
        print(f"Конфиг успешно обновлен: {config_file}")
    except Exception as e:
        print(f"Ошибка при сохранении конфига: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) != 3:
        print("Использование: python script.py <файл_с_векторами> <patchConfig.json>")
        print("Пример: python script.py vectors.txt patchConfig.json")
        sys.exit(1)
    
    vectors_file = sys.argv[1]
    config_file = sys.argv[2]
    
    # Парсим файл с векторами
    print(f"Читаем векторы из {vectors_file}...")
    vectors = parse_vectors_file(vectors_file)
    
    print(f"Найдено записей: {len(vectors)}")
    for name, (v1, v2) in vectors.items():
        print(f"  {name}: {v1} {v2 if v2 is not None else ''}")
    
    # Обновляем конфиг
    print(f"\nОбновляем {config_file}...")
    update_config(config_file, vectors)
    
    print("Готово!")

if __name__ == "__main__":
    main()