from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import os
import tempfile
import json
import shutil
import sys
import re

print(f"DEBUG: Python executable: {sys.executable}")
print(f"DEBUG: CWD: {os.getcwd()}")

app = Flask(__name__)
CORS(app)

# ⭐ ПУТИ ДЛЯ ТВОЕЙ СТРУКТУРЫ
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))  # backend/
ROOT_DIR = os.path.dirname(PROJECT_ROOT)  # корень проекта

# Путь к модулям в корне проекта
MODULES_DIR = os.path.join(ROOT_DIR, 'modules')

# Путь к пользовательским модулям
USER_MODULES_DIR = os.path.join(ROOT_DIR, 'user_modules', 'js')
USER_MODULES_DSP_DIR = os.path.join(ROOT_DIR, 'user_modules', 'dsp')

# Создаём папки если их нет
os.makedirs(USER_MODULES_DIR, exist_ok=True)
os.makedirs(USER_MODULES_DSP_DIR, exist_ok=True)
os.makedirs(MODULES_DIR, exist_ok=True)

print(f"📁 Root dir: {ROOT_DIR}")
print(f"📁 Modules dir: {MODULES_DIR}")
print(f"📁 User modules JS: {USER_MODULES_DIR}")
print(f"📁 User modules DSP: {USER_MODULES_DSP_DIR}")

# Настройки pch2csd
venv_bin = os.path.dirname(sys.executable)
PCH2CSD_PATH = os.path.join(venv_bin, "pch2csd")
if not os.path.exists(PCH2CSD_PATH):
    PCH2CSD_PATH = "pch2csd"

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "pch2csd-converter"})

@app.route('/api/convert-patch', methods=['POST'])
def convert_patch():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if not file.filename.lower().endswith('.pch2'):
        return jsonify({"error": "Only .pch2 files supported"}), 400
    
    try:
        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, file.filename)
        file.save(input_path)
        
        cmd = [sys.executable, '-m', 'pch2csd', '-j', input_path]
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
        
        json_files = [f for f in os.listdir(temp_dir) if f.endswith('.json')]
        
        if json_files:
            json_path = os.path.join(temp_dir, json_files[0])
            with open(json_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            shutil.rmtree(temp_dir, ignore_errors=True)
            return jsonify({"success": True, "data": json_data})
        
        if result.stdout.strip().startswith('{'):
            try:
                json_data = json.loads(result.stdout)
                return jsonify({"success": True, "data": json_data})
            except:
                pass
        
        return jsonify({"error": "No JSON output found"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-module', methods=['POST'])
def save_module():
    """Сохраняет пользовательский модуль и копирует в modules/ для доступа"""
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
            return jsonify({'error': 'Invalid module name'}), 400
        
        filename = f"{name}.js"
        
        # Сохраняем в user_modules/js/
        user_path = os.path.join(USER_MODULES_DIR, filename)
        os.makedirs(USER_MODULES_DIR, exist_ok=True)
        with open(user_path, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"✅ Saved to user_modules: {user_path}")
        
        # КОПИРУЕМ В modules/ (для доступа из браузера)
        os.makedirs(MODULES_DIR, exist_ok=True)
        modules_path = os.path.join(MODULES_DIR, filename)
        with open(modules_path, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"✅ Copied to modules: {modules_path}")
        
        return jsonify({
            'success': True,
            'message': f'Module "{name}" saved successfully'
        })
        
    except Exception as e:
        print(f"❌ Error saving module: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/list-user-modules', methods=['GET'])
def list_user_modules():
    try:
        if not os.path.exists(USER_MODULES_DIR):
            return jsonify({'modules': []})
        
        modules = []
        for file in os.listdir(USER_MODULES_DIR):
            if file.endswith('.js'):
                modules.append(file.replace('.js', ''))
        
        modules.sort()
        return jsonify({'modules': modules})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-module', methods=['POST'])
def delete_module():
    try:
        data = request.get_json()
        name = data.get('name')
        
        if not name:
            return jsonify({'error': 'Missing module name'}), 400
        
        # Удаляем из user_modules/js/
        user_path = os.path.join(USER_MODULES_DIR, f"{name}.js")
        if os.path.exists(user_path):
            os.remove(user_path)
            print(f"🗑️ Deleted from user_modules: {user_path}")
        
        # Удаляем из modules/
        modules_path = os.path.join(MODULES_DIR, f"{name}.js")
        if os.path.exists(modules_path):
            os.remove(modules_path)
            print(f"🗑️ Deleted from modules: {modules_path}")
        
        return jsonify({'success': True, 'message': f'Module "{name}" deleted'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-module/<name>', methods=['GET'])
def load_module(name):
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

@app.route('/api/save-module-dsp', methods=['POST'])
def save_module_dsp():
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        filename = f"{name}.csd"
        filepath = os.path.join(USER_MODULES_DSP_DIR, filename)
        os.makedirs(USER_MODULES_DSP_DIR, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"✅ DSP saved: {filepath}")
        return jsonify({
            'success': True,
            'message': f'DSP for "{name}" saved successfully'
        })
        
    except Exception as e:
        print(f"❌ Error saving DSP: {e}")
        return jsonify({'error': str(e)}), 500

def sync_user_modules_to_modules():
    """Копирует все пользовательские модули в modules/ при старте"""
    try:
        if not os.path.exists(USER_MODULES_DIR):
            print("📭 No user_modules/js/ folder found")
            return
        
        os.makedirs(MODULES_DIR, exist_ok=True)
        
        copied = 0
        for file in os.listdir(USER_MODULES_DIR):
            if file.endswith('.js'):
                src = os.path.join(USER_MODULES_DIR, file)
                dst = os.path.join(MODULES_DIR, file)
                
                if not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst):
                    import shutil
                    shutil.copy2(src, dst)
                    copied += 1
        
        if copied > 0:
            print(f"✅ Synced {copied} user modules to modules/")
        else:
            print("✅ All user modules already synced")
    except Exception as e:
        print(f"⚠️ Error syncing modules: {e}")

# Синхронизируем при старте
sync_user_modules_to_modules()

if __name__ == '__main__':
    print("=== Flask PCH2 Converter & Module Manager ===")
    print(f"📁 Root dir: {ROOT_DIR}")
    print(f"📁 Modules dir: {MODULES_DIR}")
    print(f"📁 User modules dir: {USER_MODULES_DIR}")
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