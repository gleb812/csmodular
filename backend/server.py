from flask import Flask, request, jsonify
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

if __name__ == '__main__':
    print("=== Flask PCH2 Converter ===")
    print("URL: http://localhost:5050")
    print("API: POST /api/convert-patch")
    print("============================")
    app.run(host='0.0.0.0',debug=True, port=5050)
