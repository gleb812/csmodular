# python patch_jack_name_id.py ../modules --inputs inputs_connectors_simple.json --outputs output_connectors_simple.json

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

class ModulePatcher:
    def __init__(self, inputs_file: str = "connectors_inputs.json", 
                 outputs_file: str = "connectors_outputs.json"):
        """
        Инициализация патчера с загрузкой словарей входов и выходов.
        
        Args:
            inputs_file: JSON файл с описанием входов
            outputs_file: JSON файл с описанием выходов
        """
        self.inputs_data = self._load_connectors_file(inputs_file)
        self.outputs_data = self._load_connectors_file(outputs_file)
        
        print(f"Загружено входов: {len(self.inputs_data)} модулей")
        print(f"Загружено выходов: {len(self.outputs_data)} модулей")
    
    def _load_connectors_file(self, file_path: str) -> Dict[int, List[Dict[str, Any]]]:
        """Загружает JSON файл с коннекторами"""
        if not Path(file_path).exists():
            print(f"⚠️  Файл {file_path} не найден")
            return {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Конвертируем ключи строк в int
            converted = {}
            for key_str, connectors in data.items():
                try:
                    key = int(key_str)
                    converted[key] = connectors
                except ValueError:
                    print(f"⚠️  Некорректный key в файле {file_path}: {key_str}")
            
            return converted
        except Exception as e:
            print(f"❌ Ошибка загрузки файла {file_path}: {e}")
            return {}
    
    def patch_module_file(self, file_path: str, backup: bool = True) -> bool:
        """
        Патчит один файл модуля, добавляя ConnectorName и ConnectorIndex.
        
        Args:
            file_path: путь к файлу модуля
            backup: создавать ли резервную копию
            
        Returns:
            True если успешно, False если ошибка
        """
        try:
            print(f"\nОбработка: {Path(file_path).name}")
            
            # Читаем содержимое файла
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Создаем резервную копию
            if backup:
                backup_path = f"{file_path}.bak"
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"  Создана резервная копия: {backup_path}")
            
            # Извлекаем typeID из файла
            typeid_match = re.search(r'typeID:\s*(\d+)', content)
            if not typeid_match:
                print(f"  ⚠️  Не найден typeID в файле")
                return False
            
            typeid = int(typeid_match.group(1))
            print(f"  Найден typeID: {typeid}")
            
            # Ищем данные о коннекторах для этого модуля
            inputs = self.inputs_data.get(typeid, [])
            outputs = self.outputs_data.get(typeid, [])
            
            total_connectors = len(inputs) + len(outputs)
            print(f"  Найдено входов: {len(inputs)}, выходов: {len(outputs)}")
            
            if total_connectors == 0:
                print(f"  ℹ️  Нет данных о коннекторах для этого модуля")
                return True  # Файл не требует изменений, но это не ошибка
            
            # Преобразуем данные в удобный словарь: ID -> {ConnectorName, ConnectorIndex}
            connectors_map = {}
            for conn in inputs + outputs:
                conn_id = conn.get('ID')
                if conn_id is not None:
                    connectors_map[conn_id] = {
                        'ConnectorName': conn.get('ConnectorName', ''),
                        'ConnectorIndex': conn.get('ConnectorIndex', 0)
                    }
            
            # Патчим компоненты
            patched_content = self._patch_components(content, connectors_map)
            
            # Записываем изменения
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(patched_content)
            
            print(f"  ✓ Успешно обновлен")
            return True
            
        except Exception as e:
            print(f"  ❌ Ошибка при обработке файла: {e}")
            return False
    
    def _patch_components(self, content: str, connectors_map: Dict[int, Dict]) -> str:
        """
        Добавляет поля ConnectorName и ConnectorIndex к компонентам.
        
        Args:
            content: содержимое файла модуля
            connectors_map: словарь ID -> данные коннектора
            
        Returns:
            Обновленное содержимое файла
        """
        if not connectors_map:
            return content
        
        # Находим все компоненты в массиве components
        # Ищем блок между components: [ и соответствующим ]
        
        lines = content.split('\n')
        patched_lines = []
        in_components = False
        component_depth = 0
        component_buffer = []
        component_start_line = -1
        
        for i, line in enumerate(lines):
            if not in_components:
                # Ищем начало массива components
                if 'components: [' in line:
                    in_components = True
                    component_depth = 0
                    component_start_line = i
                    patched_lines.append(line)
                else:
                    patched_lines.append(line)
                continue
            
            # Находимся внутри массива components
            if '{' in line:
                component_depth += line.count('{')
            
            if '}' in line:
                component_depth -= line.count('}')
            
            # Добавляем строку в буфер
            component_buffer.append(line)
            
            # Если компонент завершен (закрывающая скобка и component_depth вернулся к 0)
            if '}' in line and component_depth == 0:
                # Обрабатываем компонент
                patched_component = self._patch_single_component(
                    '\n'.join(component_buffer),
                    connectors_map
                )
                
                # Добавляем обработанный компонент
                patched_lines.append(patched_component)
                
                # Сбрасываем буфер
                component_buffer = []
                component_start_line = -1
            
            # Если мы вышли из массива components
            elif ']' in line and not component_buffer:
                in_components = False
                patched_lines.append(line)
        
        # Если остались необработанные строки в буфере (на всякий случай)
        if component_buffer:
            patched_lines.extend(component_buffer)
        
        return '\n'.join(patched_lines)
    
    def _patch_single_component(self, component_text: str, connectors_map: Dict[int, Dict]) -> str:
        """
        Патчит один компонент.
        
        Args:
            component_text: текст компонента (без внешних скобок)
            connectors_map: словарь ID -> данные коннектора
            
        Returns:
            Обновленный текст компонента
        """
        # Ищем ID компонента
        id_match = re.search(r'"id":\s*"(\d+)"', component_text)
        if not id_match:
            # Попробуем без кавычек
            id_match = re.search(r'"id":\s*(\d+)', component_text)
        
        if not id_match:
            return component_text
        
        component_id = int(id_match.group(1))
        
        # Проверяем, есть ли данные для этого ID
        if component_id not in connectors_map:
            return component_text
        
        conn_data = connectors_map[component_id]
        
        # Проверяем, не добавлены ли уже эти поля
        if '"ConnectorName"' in component_text or '"ConnectorIndex"' in component_text:
            return component_text
        
        # Разбиваем на строки
        lines = component_text.split('\n')
        
        if not lines:
            return component_text
        
        # Находим индекс последнего поля перед закрывающей скобкой
        last_field_idx = -1
        for i in range(len(lines) - 1, -1, -1):
            stripped = lines[i].strip()
            if stripped and ':' in stripped and not (stripped.startswith('}') or stripped == '},'):
                last_field_idx = i
                break
        
        if last_field_idx == -1:
            # Не нашли полей, возможно компонент пустой
            return component_text
        
        # Убедимся, что у последнего поля есть запятая
        last_field = lines[last_field_idx].rstrip()
        if not last_field.endswith(','):
            lines[last_field_idx] = last_field + ','
        
        # Определяем отступ для новых полей по последнему полю
        field_indent = len(lines[last_field_idx]) - len(lines[last_field_idx].lstrip())
        
        # Создаем строки с полями Connector
        connector_fields = [
            ' ' * field_indent + f'"ConnectorName": "{conn_data["ConnectorName"]}",',
            ' ' * field_indent + f'"ConnectorIndex": {conn_data["ConnectorIndex"]}'
        ]
        
        # Вставляем новые поля после последнего поля
        result_lines = []
        for i, line in enumerate(lines):
            result_lines.append(line)
            if i == last_field_idx:
                # Добавляем поля Connector после последнего поля
                result_lines.extend(connector_fields)
        
        return '\n'.join(result_lines)

    
    def patch_directory(self, modules_dir: str, backup: bool = True, file_pattern: str = "*.js"):
        """
        Патчит все модули в директории.
        
        Args:
            modules_dir: путь к директории с модулями
            backup: создавать ли резервные копии
            file_pattern: шаблон для поиска файлов модулей
        """
        modules_path = Path(modules_dir)
        
        if not modules_path.exists():
            print(f"❌ Директория {modules_dir} не найдена")
            return
        
        # Ищем файлы модулей
        module_files = list(modules_path.glob(file_pattern))
        
        if not module_files:
            print(f"⚠️  В директории {modules_dir} не найдено файлов по шаблону {file_pattern}")
            return
        
        print(f"\nНайдено файлов модулей: {len(module_files)}")
        
        # Статистика
        successful = 0
        skipped = 0
        failed = 0
        
        for module_file in module_files:
            # Пропускаем резервные копии
            if module_file.name.endswith('.bak'):
                continue
            
            if self.patch_module_file(str(module_file), backup):
                successful += 1
            else:
                failed += 1
        
        print(f"\n{'='*60}")
        print("ИТОГОВАЯ СТАТИСТИКА:")
        print(f"{'='*60}")
        print(f"Всего обработано файлов: {len(module_files)}")
        print(f"Успешно обновлено: {successful}")
        print(f"Пропущено: {skipped}")
        print(f"Ошибок: {failed}")
        
        # Создаем отчет
        report = {
            "total_files": len(module_files),
            "successful": successful,
            "failed": failed,
            "inputs_loaded": len(self.inputs_data),
            "outputs_loaded": len(self.outputs_data)
        }
        
        report_file = modules_path / "patch_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nОтчет сохранен в: {report_file}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Патчер модулей - добавление ConnectorName и ConnectorIndex')
    parser.add_argument('modules_dir', help='Директория с модулями для обновления')
    parser.add_argument('--inputs', default='connectors_inputs.json', 
                       help='JSON файл с входами (по умолчанию: connectors_inputs.json)')
    parser.add_argument('--outputs', default='connectors_outputs.json',
                       help='JSON файл с выходами (по умолчанию: connectors_outputs.json)')
    parser.add_argument('--no-backup', action='store_true',
                       help='Не создавать резервные копии файлов')
    parser.add_argument('--pattern', default='*.js',
                       help='Шаблон для поиска файлов модулей (по умолчанию: *.js)')
    
    args = parser.parse_args()
    
    # Создаем патчер
    patcher = ModulePatcher(args.inputs, args.outputs)
    
    # Запускаем патчинг
    patcher.patch_directory(
        args.modules_dir,
        backup=not args.no_backup,
        file_pattern=args.pattern
    )

def quick_run():
    """Быстрый запуск без аргументов командной строки"""
    # Настройки
    MODULES_DIR = "./modules"  # Директория с модулями
    INPUTS_FILE = "connectors_inputs.json"  # Файл с входами
    OUTPUTS_FILE = "connectors_outputs.json"  # Файл с выходами
    CREATE_BACKUP = True  # Создавать резервные копии
    
    # Создаем патчер
    patcher = ModulePatcher(INPUTS_FILE, OUTPUTS_FILE)
    
    # Запускаем патчинг
    patcher.patch_directory(MODULES_DIR, CREATE_BACKUP)

if __name__ == "__main__":
    # Выберите нужный способ запуска:
    
    # 1. Для быстрого запуска с настройками в коде:
    # quick_run()
    
    # 2. Для запуска с аргументами командной строки:
    main()