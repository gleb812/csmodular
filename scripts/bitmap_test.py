import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

def parse_color_data(data_string):
    """Разбирает строку с данными цветов"""
    colors = data_string.strip().split(':')
    return colors

def create_image_from_data(colors, width, height):
    """Создает изображение из массива цветов с заданными размерами"""
    # Преобразуем цвета в RGB значения
    img_data = []
    unique_colors = {}
    
    for color_str in colors:
        if color_str not in unique_colors:
            # Преобразуем строку типа "191191191" в RGB кортеж
            if len(color_str) == 9:
                r = int(color_str[0:3])
                g = int(color_str[3:6])
                b = int(color_str[6:9])
                unique_colors[color_str] = (r, g, b)
            else:
                # Если цвет в другом формате, используем серый
                unique_colors[color_str] = (128, 128, 128)
        
        img_data.append(unique_colors[color_str])
    
    # Проверяем, что количество пикселей совпадает
    if len(img_data) != width * height:
        raise ValueError(f"Ошибка: {len(img_data)} пикселей != {width}×{height} = {width*height}")
    
    # Создаем массив numpy и reshape в нужные размеры
    img_array = np.array(img_data, dtype=np.uint8).reshape(height, width, 3)
    
    return img_array, unique_colors

def display_image_and_info(colors, selected_width, selected_height, unique_colors):
    """Отображает изображение и информацию о нем"""
    img_array, _ = create_image_from_data(colors, selected_width, selected_height)
    
    # Создаем фигуру с несколькими субплогами
    fig = plt.figure(figsize=(15, 8))
    
    # 1. Изображение
    ax1 = plt.subplot(1, 2, 1)
    ax1.imshow(img_array)
    ax1.set_title(f'Изображение {selected_width}×{selected_height} пикселей')
    ax1.set_xlabel(f'Ширина: {selected_width}')
    ax1.set_ylabel(f'Высота: {selected_height}')
    ax1.grid(True, alpha=0.3, linestyle='--')
    
    # 2. Текстовая визуализация
    ax2 = plt.subplot(1, 2, 2)
    ax2.axis('off')
    
    # Преобразуем в текстовый вид для отображения
    text_visual = []
    color_map = {}
    
    # Создаем текстовое представление
    for i in range(selected_height):
        row_colors = colors[i*selected_width:(i+1)*selected_width]
        row_text = []
        for color in row_colors:
            if color not in color_map:
                # Используем разные символы для разных цветов
                symbols = ['█', '▓', '▒', '░', '⣿', '⣀', '⣤', '⣶']
                color_map[color] = symbols[len(color_map) % len(symbols)]
            row_text.append(color_map[color])
        text_visual.append(''.join(row_text))
    
    # Отображаем текстовое представление
    info_text = [
        f"Размер: {selected_width}×{selected_height}",
        f"Всего пикселей: {len(colors)}",
        f"Уникальных цветов: {len(unique_colors)}",
        "\nТекстовое представление:",
        "\n" + "\n".join(text_visual[:min(30, len(text_visual))]),  # Показываем первые 30 строк
        "\nЛегенда цветов:"
    ]
    
    for color_str, (r, g, b) in unique_colors.items():
        symbol = color_map.get(color_str, '█')
        info_text.append(f"  {symbol} → RGB({r}, {g}, {b})")
    
    ax2.text(0, 1, '\n'.join(info_text), 
             fontfamily='monospace', 
             verticalalignment='top',
             fontsize=9)
    
    plt.tight_layout()
    plt.show()
    
    # Также создаем изображение с помощью PIL для сохранения
    pil_img = Image.fromarray(img_array)
    return pil_img

def analyze_image_data(data_string):
    """Основная функция анализа и визуализации"""
    print("🔍 Анализ растровых данных...")
    print("-" * 50)
    
    # Парсим данные
    colors = parse_color_data(data_string)
    total_pixels = len(colors)
    
    print(f"Всего пикселей: {total_pixels}")
    
    # Находим уникальные цвета
    unique_colors_set = set(colors)
    print(f"Уникальные цвета: {len(unique_colors_set)}")
    
    for color in unique_colors_set:
        if len(color) == 9:
            r, g, b = color[0:3], color[3:6], color[6:9]
            print(f"  • {color} → RGB({r}, {g}, {b})")
    
    # Просим пользователя ввести размеры
    print("\n📐 Введите размеры изображения")
    print("-" * 30)
    print(f"Общее количество пикселей: {total_pixels}")
    
    while True:
        try:
            choice = input("Введите ШИРИНУ и ВЫСОТУ через пробел: ").strip()
            
            if not choice:
                print("⚠️  Пожалуйста, введите размеры")
                continue
                
            if ' ' in choice:
                width, height = map(int, choice.split())
                
                # Проверяем корректность размеров
                if width <= 0 or height <= 0:
                    print("⚠️  Размеры должны быть положительными числами")
                    continue
                    
                if width * height != total_pixels:
                    print(f"⚠️  Ошибка: {width}×{height} = {width*height}, а должно быть {total_pixels}")
                    print(f"    Возможные комбинации: {width}×{total_pixels//width} или {total_pixels//height}×{height}")
                    continue
                    
                # Размеры корректны
                selected_width, selected_height = width, height
                break
                
            else:
                print("⚠️  Введите два числа через пробел (например: '20 12')")
                
        except ValueError:
            print("⚠️  Ошибка: введите целые числа через пробел")
        except KeyboardInterrupt:
            print("\n❌ Прервано пользователем")
            return None
        except Exception as e:
            print(f"⚠️  Ошибка: {e}")
    
    print(f"\n✅ Выбран размер: {selected_width}×{selected_height}")
    
    try:
        # Создаем и отображаем изображение
        img_array, unique_colors = create_image_from_data(colors, selected_width, selected_height)
        pil_img = display_image_and_info(colors, selected_width, selected_height, unique_colors)
        
        # Предлагаем сохранить
        save_choice = input("\n💾 Сохранить изображение? (y/n): ").strip().lower()
        if save_choice == 'y':
            filename = f"raster_image_{selected_width}x{selected_height}.png"
            pil_img.save(filename)
            print(f"✅ Изображение сохранено как '{filename}'")
        
        return pil_img, (selected_width, selected_height)
        
    except ValueError as e:
        print(f"❌ Ошибка при создании изображения: {e}")
        return None
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return None

# Ваши данные
data_string = """192192192:192192192:192192192:192192192:192192192:128128128:128128128:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:192192192:128128128:128128128:192192192:192192192:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:191191191:192192192:192192192:128128128:128128128:191191191:192192192:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:191191191:128128128:192192192:192192192:192192192:191191191:192192192:128128128:128128128:192192192:191191191:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:192192192:192192192:191191191:192192192:192192192:192192192:192192192:128128128:128128128:192192192:192192192:192192192:192192192:192192192:192192192:128128128:128128128:128128128:128128128:128128128:128128128:192192192:191191191:192192192:192192192:192192192:191191191:192192192:191191191:192192192:128128128:127127127:128128128:128128128:128128128:128128128:192192192:192192192:192192192:192192192:192192192:128128128:191191191:192192192:192192192:192192192:192192192:192192192:192192192:128128128:128128128:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:192192192:192192192:192192192:192192192:191191191:128128128:128128128:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:191191191:128128128:192192192:192192192:191191191:128128128:128128128:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:192192192:128128128:128128128:192192192:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:192192192:128128128:128128128:192192192:191191191:192192192:192192192:191191191:192192192:192192192:192192192:191191191:192192192:192192192:192192192:192192192:192192192"""



# Запускаем анализ
if __name__ == "__main__":
    # Сначала покажем базовую информацию
    colors = parse_color_data(data_string)
    total_pixels = len(colors)
    
    print("=" * 60)
    print("РАСТРОВЫЙ АНАЛИЗАТОР ИЗОБРАЖЕНИЙ")
    print("=" * 60)
    print(f"Всего пикселей: {total_pixels}")
    
    # Запускаем интерактивный анализ
    result = analyze_image_data(data_string)
    
    if result:
        pil_img, size = result
        print("\n" + "=" * 60)
        print("Анализ завершен!")
        print(f"Итоговый размер: {size[0]}×{size[1]}")
        print("=" * 60)
    else:
        print("\n❌ Анализ не завершен")