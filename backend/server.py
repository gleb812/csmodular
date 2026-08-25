from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import os
import tempfile
import json
import shutil
import sys

print(f"DEBUG: Python executable: {sys.executable}")
print(f"DEBUG: CWD: {os.getcwd()}")


app = Flask(__name__)
CORS(app)  # Разрешаем запросы от Vite

# Настройки
venv_bin = os.path.dirname(sys.executable)  # /path/to/venv/bin
PCH2CSD_PATH = os.path.join(venv_bin, "pch2csd")

print(f"DEBUG: Looking for pch2csd at: {PCH2CSD_PATH}")
if not os.path.exists(PCH2CSD_PATH):
    print(f"DEBUG: pch2csd not found at {PCH2CSD_PATH}, using fallback")
    PCH2CSD_PATH = "pch2csd"  # fallback

# ⭐ Путь к пользовательским модулям
USER_MODULES_DIR = os.path.join(os.path.dirname(__file__), '..', 'user_modules', 'js')
USER_MODULES_DSP_DIR = os.path.join(os.path.dirname(__file__), '..', 'user_modules', 'dsp')

# Создаём папки если их нет
os.makedirs(USER_MODULES_DIR, exist_ok=True)
os.makedirs(USER_MODULES_DSP_DIR, exist_ok=True)

print(f"User modules JS: {USER_MODULES_DIR}")
print(f"User modules DSP: {USER_MODULES_DSP_DIR}")


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "pch2csd-converter"})

@app.route('/api/convert-patch', methods=['POST'])
def convert_patch():
    """Конвертирует .pch2 в JSON"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    
    if not file.filename.lower().endswith('.pch2'):
        return jsonify({"error": "Only .pch2 files supported"}), 400
    
    try:
        # Создаем временную директорию
        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, file.filename)
        file.save(input_path)
        
        # Запускаем pch2csd
        cmd = [sys.executable, '-m', 'pch2csd', '-j', input_path]
        print(f"DEBUG: Command: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=temp_dir
        )
        
        if result.returncode != 0:
            return jsonify({
                "error": "Conversion failed",
                "details": result.stderr[:500]
            }), 500
        
        # Ищем JSON результат
        json_files = [f for f in os.listdir(temp_dir) if f.endswith('.json')]
        
        if json_files:
            json_path = os.path.join(temp_dir, json_files[0])
            with open(json_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            
            shutil.rmtree(temp_dir, ignore_errors=True)
            return jsonify({"success": True, "data": json_data})
        
        # Если JSON в stdout
        if result.stdout.strip().startswith('{'):
            try:
                json_data = json.loads(result.stdout)
                return jsonify({"success": True, "data": json_data})
            except:
                pass
        
        return jsonify({"error": "No JSON output found"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# НОВЫЙ ЭНДПОИНТ - сохраняет пользовательский модуль
@app.route('/api/save-module', methods=['POST'])
def save_module():
    """Сохраняет пользовательский модуль в папку user_modules/js/"""
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        # Проверяем имя на допустимые символы
        import re
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
            return jsonify({'error': 'Invalid module name. Use letters, numbers, underscore only.'}), 400
        
        # Сохраняем файл
        filename = f"{name}.js"
        filepath = os.path.join(USER_MODULES_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"Module saved: {filepath}")
        return jsonify({
            'success': True, 
            'path': filepath,
            'message': f'Module "{name}" saved successfully'
        })
        
    except Exception as e:
        print(f"Error saving module: {e}")
        return jsonify({'error': str(e)}), 500


# НОВЫЙ ЭНДПОИНТ - список пользовательских модулей
@app.route('/api/list-user-modules', methods=['GET'])
def list_user_modules():
    """Возвращает список пользовательских модулей"""
    try:
        if not os.path.exists(USER_MODULES_DIR):
            return jsonify({'modules': []})
        
        modules = []
        for file in os.listdir(USER_MODULES_DIR):
            if file.endswith('.js'):
                module_name = file.replace('.js', '')
                modules.append(module_name)
        
        modules.sort()
        return jsonify({'modules': modules})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# НОВЫЙ ЭНДПОИНТ - удаляет пользовательский модуль
@app.route('/api/delete-module', methods=['POST'])
def delete_module():
    """Удаляет пользовательский модуль"""
    try:
        data = request.get_json()
        name = data.get('name')
        
        if not name:
            return jsonify({'error': 'Missing module name'}), 400
        
        # Удаляем JS файл
        js_path = os.path.join(USER_MODULES_DIR, f"{name}.js")
        if os.path.exists(js_path):
            os.remove(js_path)
            print(f"Deleted JS: {js_path}")
        
        # Удаляем DSP файл если есть
        dsp_path = os.path.join(USER_MODULES_DSP_DIR, f"{name}.csd")
        if os.path.exists(dsp_path):
            os.remove(dsp_path)
            print(f"Deleted DSP: {dsp_path}")
        
        return jsonify({'success': True, 'message': f'Module "{name}" deleted'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# НОВЫЙ ЭНДПОИНТ - сохраняет DSP код для модуля
@app.route('/api/save-module-dsp', methods=['POST'])
def save_module_dsp():
    """Сохраняет DSP код для пользовательского модуля в user_modules/dsp/"""
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        filename = f"{name}.csd"
        filepath = os.path.join(USER_MODULES_DSP_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"DSP saved: {filepath}")
        return jsonify({
            'success': True, 
            'path': filepath,
            'message': f'DSP for "{name}" saved successfully'
        })
        
    except Exception as e:
        print(f"Error saving DSP: {e}")
        return jsonify({'error': str(e)}), 500


# НОВЫЙ ЭНДПОИНТ - загружает модуль для редактирования
@app.route('/api/load-module/<name>', methods=['GET'])
def load_module(name):
    """Загружает пользовательский модуль для редактирования"""
    try:
        js_path = os.path.join(USER_MODULES_DIR, f"{name}.js")
        
        if not os.path.exists(js_path):
            return jsonify({'error': 'Module not found'}), 404
        
        with open(js_path, 'r', encoding='utf-8') as f:
            code = f.read()
        
        return jsonify({
            'success': True,
            'name': name,
            'code': code
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=== Flask PCH2 Converter & Module Manager ===")
    print("URL: http://localhost:5050")
    print("API:")
    print("  POST /api/convert-patch     - Convert .pch2 to JSON")
    print("  POST /api/save-module       - Save user module")
    print("  GET  /api/list-user-modules - List user modules")
    print("  POST /api/delete-module     - Delete user module")
    print("  POST /api/save-module-dsp   - Save DSP code")
    print("  GET  /api/load-module/<name> - Load module for editing")
    print("===========================================")
    app.run(host='0.0.0.0', debug=True, port=5050)