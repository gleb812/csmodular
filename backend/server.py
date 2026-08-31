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

# ⭐ ПУТИ
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))  # backend/
ROOT_DIR = os.path.dirname(PROJECT_ROOT)  # корень проекта

# ⭐ JS модули (все в modules/, пользовательские в modules/user/)
MODULES_DIR = os.path.join(ROOT_DIR, 'modules')
MODULES_USER_DIR = os.path.join(ROOT_DIR, 'modules', 'user')

# ⭐ DSP модули (все в csound/modules/, пользовательские в csound/modules/user/)
CSOUND_MODULES_DIR = os.path.join(ROOT_DIR, 'csound', 'modules')
CSOUND_USER_DIR = os.path.join(ROOT_DIR, 'csound', 'modules', 'user')

# Создаём папки
os.makedirs(MODULES_DIR, exist_ok=True)
os.makedirs(MODULES_USER_DIR, exist_ok=True)
os.makedirs(CSOUND_MODULES_DIR, exist_ok=True)
os.makedirs(CSOUND_USER_DIR, exist_ok=True)

print(f"📁 Modules dir: {MODULES_DIR}")
print(f"📁 Modules user dir: {MODULES_USER_DIR}")
print(f"📁 Csound modules dir: {CSOUND_MODULES_DIR}")
print(f"📁 Csound user dir: {CSOUND_USER_DIR}")

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
    """Сохраняет пользовательский модуль:
       - JS → modules/user/
       - DSP → csound/modules/user/
    """
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        dsp_code = data.get('dsp_code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
            return jsonify({'error': 'Invalid module name'}), 400
        
        # 1. ⭐ Сохраняем JS в modules/user/
        js_filename = f"{name}.js"
        js_path = os.path.join(MODULES_USER_DIR, js_filename)
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"✅ JS saved: {js_path}")
        
        # 2. ⭐ Сохраняем DSP в csound/modules/user/
        if dsp_code:
            dsp_filename = f"{name}.txt"
            dsp_path = os.path.join(CSOUND_USER_DIR, dsp_filename)
            with open(dsp_path, 'w', encoding='utf-8') as f:
                f.write(dsp_code)
            print(f"✅ DSP saved: {dsp_path}")
        else:
            print(f"⚠️ No DSP code provided for {name}")
        
        return jsonify({
            'success': True,
            'message': f'Module "{name}" saved successfully',
            'js_path': js_path,
            'dsp_path': dsp_path if dsp_code else None
        })
        
    except Exception as e:
        print(f"❌ Error saving module: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/list-user-modules', methods=['GET'])
def list_user_modules():
    """Возвращает список пользовательских модулей из modules/user/"""
    try:
        if not os.path.exists(MODULES_USER_DIR):
            return jsonify({'modules': []})
        
        modules = []
        for file in os.listdir(MODULES_USER_DIR):
            if file.endswith('.js'):
                modules.append(file.replace('.js', ''))
        
        modules.sort()
        return jsonify({'modules': modules})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete-module', methods=['POST'])
def delete_module():
    """Удаляет пользовательский модуль"""
    try:
        data = request.get_json()
        name = data.get('name')
        
        if not name:
            return jsonify({'error': 'Missing module name'}), 400
        
        deleted = []
        
        # Удаляем JS из modules/user/
        js_path = os.path.join(MODULES_USER_DIR, f"{name}.js")
        if os.path.exists(js_path):
            os.remove(js_path)
            deleted.append(f"modules/user/{name}.js")
            print(f"🗑️ Deleted: {js_path}")
        
        # Удаляем DSP из csound/modules/user/
        dsp_path = os.path.join(CSOUND_USER_DIR, f"{name}.txt")
        if os.path.exists(dsp_path):
            os.remove(dsp_path)
            deleted.append(f"csound/modules/user/{name}.txt")
            print(f"🗑️ Deleted: {dsp_path}")
        
        if not deleted:
            return jsonify({'error': f'Module "{name}" not found'}), 404
        
        return jsonify({
            'success': True,
            'message': f'Module "{name}" deleted',
            'deleted': deleted
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/load-module/<name>', methods=['GET'])
def load_module(name):
    """Загружает пользовательский модуль для редактирования"""
    try:
        # Ищем JS в modules/user/
        js_path = os.path.join(MODULES_USER_DIR, f"{name}.js")
        
        if not os.path.exists(js_path):
            return jsonify({'error': 'Module not found'}), 404
        
        with open(js_path, 'r', encoding='utf-8') as f:
            code = f.read()
        
        # Ищем DSP в csound/modules/user/
        dsp_path = os.path.join(CSOUND_USER_DIR, f"{name}.txt")
        dsp_code = None
        if os.path.exists(dsp_path):
            with open(dsp_path, 'r', encoding='utf-8') as f:
                dsp_code = f.read()
        
        return jsonify({
            'success': True,
            'name': name,
            'code': code,
            'dsp_code': dsp_code
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/save-module-dsp', methods=['POST'])
def save_module_dsp():
    """Сохраняет DSP код отдельно (для обратной совместимости)"""
    try:
        data = request.get_json()
        name = data.get('name')
        code = data.get('code')
        
        if not name or not code:
            return jsonify({'error': 'Missing name or code'}), 400
        
        dsp_path = os.path.join(CSOUND_USER_DIR, f"{name}.txt")
        with open(dsp_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        print(f"✅ DSP saved: {dsp_path}")
        return jsonify({
            'success': True,
            'message': f'DSP for "{name}" saved successfully'
        })
        
    except Exception as e:
        print(f"❌ Error saving DSP: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=== Flask Module Manager ===")
    print(f"📁 Root dir: {ROOT_DIR}")
    print(f"📁 Modules user: {MODULES_USER_DIR}")
    print(f"📁 Csound user: {CSOUND_USER_DIR}")
    print("URL: http://localhost:5050")
    print("API:")
    print("  POST /api/save-module       - Save user module")
    print("  GET  /api/list-user-modules - List user modules")
    print("  POST /api/delete-module     - Delete user module")
    print("  GET  /api/load-module/<name> - Load module for editing")
    print("  POST /api/save-module-dsp   - Save DSP only")
    print("===========================================")
    app.run(host='0.0.0.0', debug=True, port=5050)