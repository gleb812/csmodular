import re
import json
from pathlib import Path
from typing import Dict, List, Any

def parse_connectors_file(file_path: str) -> Dict[int, List[Dict[str, Any]]]:
    """
    Парсит файл с записями коннекторов и преобразует в словарь по ModuleID.
    
    Формат входных данных:
        (ModuleID:3;ConnectorIndex:0;ConnectorName:'In1';ID:1;XPos:162;YPos:13;CodeRef:0;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
    """
    
    connectors_by_module = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Удаляем переносы строк для удобства парсинга
    content = content.replace('\n', ' ').replace('\r', ' ')
    
    # Находим все записи в скобках
    # Паттерн для поиска записей в формате (ModuleID:X;...)
    pattern = r'\((.*?)\)'
    matches = re.findall(pattern, content)
    
    for match in matches:
        # Пропускаем пустые записи
        if not match.strip():
            continue
            
        # Парсим поля в формате Key:Value
        fields = {}
        
        # Ищем все пары Key:Value
        # Обрабатываем значения в кавычках и без
        kv_pattern = r'(\w+):([^;]+)'
        kv_matches = re.findall(kv_pattern, match)
        
        for key, value in kv_matches:
            value = value.strip()
            
            # Удаляем кавычки если есть
            if value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Преобразуем числа
            if value.isdigit():
                value = int(value)
            
            fields[key] = value
        
        # Извлекаем ModuleID
        module_id = fields.get('ModuleID')
        if module_id is None:
            continue
        
        # Создаем запись коннектора
        connector = {
            'ConnectorName': fields.get('ConnectorName', ''),
            'ID': fields.get('ID', 0),
            'ConnectorIndex': fields.get('ConnectorIndex', 0),
            'XPos': fields.get('XPos', 0),
            'YPos': fields.get('YPos', 0),
            'CodeRef': fields.get('CodeRef', 0),
            'InfoFunc': fields.get('InfoFunc', 0),
            'ConnectorType': fields.get('ConnectorType', ''),
            'BandWidth': fields.get('BandWidth', '')
        }
        
        # Добавляем в словарь по ModuleID
        if module_id not in connectors_by_module:
            connectors_by_module[module_id] = []
        
        connectors_by_module[module_id].append(connector)
    
    # Сортируем коннекторы по ConnectorIndex для каждого модуля
    for module_id in connectors_by_module:
        connectors_by_module[module_id].sort(key=lambda x: x['ConnectorIndex'])
    
    return connectors_by_module

def create_simple_json(connectors_data: Dict[int, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Создает упрощенный JSON только с нужными полями"""
    simplified = {}
    
    for module_id, connectors in connectors_data.items():
        simplified[str(module_id)] = []
        
        for conn in connectors:
            simple_conn = {
                'ConnectorName': conn['ConnectorName'],
                'ID': conn['ID'],
                'ConnectorIndex': conn['ConnectorIndex']
            }
            simplified[str(module_id)].append(simple_conn)
    
    return simplified

def save_json(data: Dict, output_file: str, pretty: bool = True):
    """Сохраняет данные в JSON файл"""
    with open(output_file, 'w', encoding='utf-8') as f:
        if pretty:
            json.dump(data, f, indent=2, ensure_ascii=False)
        else:
            json.dump(data, f, ensure_ascii=False)
    
    print(f"Сохранено в {output_file}")

def main():
    # Путь к файлу с коннекторами
    input_file = "inputs.data.pas"  # Замените на ваш файл
    
    if not Path(input_file).exists():
        print(f"Файл {input_file} не найден!")
        
        # Создаем пример файла для тестирования
        example_content = '''ModuleInputs : array[0..446] of TG2ConnectorDef = (
        (ModuleID:3;ConnectorIndex:0;ConnectorName:'In1';ID:1;XPos:162;YPos:13;CodeRef:0;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:3;ConnectorIndex:1;ConnectorName:'In2';ID:0;XPos:188;YPos:13;CodeRef:1;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:3;ConnectorIndex:2;ConnectorName:'In3';ID:3;XPos:214;YPos:13;CodeRef:2;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:3;ConnectorIndex:3;ConnectorName:'In4';ID:2;XPos:240;YPos:13;CodeRef:3;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:4;ConnectorIndex:0;ConnectorName:'InL';ID:2;XPos:214;YPos:13;CodeRef:0;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:4;ConnectorIndex:1;ConnectorName:'InR';ID:1;XPos:240;YPos:13;CodeRef:1;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btStatic),
        (ModuleID:5;ConnectorIndex:0;ConnectorName:'In1';ID:6;XPos:100;YPos:9;CodeRef:0;InfoFunc:0;ConnectorType:ctLogic;BandWidth:btDynamic),
        (ModuleID:5;ConnectorIndex:1;ConnectorName:'In2';ID:9;XPos:193;YPos:9;CodeRef:1;InfoFunc:0;ConnectorType:ctLogic;BandWidth:btDynamic),
        (ModuleID:7;ConnectorIndex:0;ConnectorName:'Pitch';ID:1;XPos:4;YPos:43;CodeRef:0;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btDynamic),
        (ModuleID:7;ConnectorIndex:1;ConnectorName:'PitchVar';ID:2;XPos:4;YPos:59;CodeRef:1;InfoFunc:0;ConnectorType:ctAudio;BandWidth:btDynamic)
);'''
        
        Path(input_file).write_text(example_content, encoding='utf-8')
        print(f"Создан пример файла {input_file}")
    
    try:
        # Парсим файл
        print(f"Чтение файла {input_file}...")
        connectors_data = parse_connectors_file(input_file)
        
        # Создаем полный JSON со всеми полями
        full_data = {}
        for module_id, connectors in connectors_data.items():
            full_data[str(module_id)] = connectors
        
        # Создаем упрощенный JSON
        simple_data = create_simple_json(connectors_data)
        
        # Сохраняем оба варианта
        save_json(full_data, "connectors_full.json")
        save_json(simple_data, "connectors_simple.json")
        
        # Выводим статистику
        print(f"\nСтатистика:")
        print(f"Найдено модулей: {len(connectors_data)}")
        total_connectors = sum(len(conns) for conns in connectors_data.values())
        print(f"Всего коннекторов: {total_connectors}")
        
        print(f"\nПример данных для модуля 3:")
        module_3_data = connectors_data.get(3, [])
        for conn in module_3_data:
            print(f"  {conn['ConnectorIndex']}: {conn['ConnectorName']} (ID: {conn['ID']})")
        
    except Exception as e:
        print(f"Ошибка при обработке файла: {e}")

if __name__ == "__main__":
    main()