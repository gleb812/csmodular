from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Flask!"})

if __name__ == '__main__':
    print("Starting Flask on http://localhost:5050")
    app.run(host='0.0.0.0', port=5050, debug=True)