#!/usr/bin/env python3
import sys
import re

def process_file(filename):
    try:
        with open(filename, 'r') as file:
            for line in file:
                # Пропускаем пустые строки
                if not line.strip():
                    continue
                
                # Разбиваем строку по пробелам
                parts = line.strip().split()
                
                if len(parts) >= 6:
                    # Первый элемент - название
                    name = parts[0]
                    
                    # Ищем первый блок в квадратных скобках
                    first_bracket = re.search(r'\[[^\]]*\]', line)
                    if first_bracket:
                        first_block = first_bracket.group()
                        
                        # Ищем второй блок в квадратных скобках (после первого)
                        remaining = line[first_bracket.end():]
                        second_bracket = re.search(r'\[[^\]]*\]', remaining)
                        second_block = second_bracket.group() if second_bracket else '[]'
                        
                        # Выводим результат
                        print(f"{name} {first_block} {second_block}")
    
    except FileNotFoundError:
        print(f"Ошибка: Файл '{filename}' не найден")
    except Exception as e:
        print(f"Ошибка при обработке файла: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python script.py <имя_файла>")
        sys.exit(1)
    
    process_file(sys.argv[1])