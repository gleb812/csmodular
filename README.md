# Csound Modular Synthesizer

A web-based modular synthesizer built with Csound, Flask, and vanilla JavaScript + Canvas.

## Features

- 🎛️ Modular architecture with interchangeable audio modules
- 🎹 Real-time Csound synthesis engine
- 🌐 Web-based UI with Canvas rendering
- 🐍 Flask API backend for communication
- 🔌 Easy to extend with custom modules

## Requirements

- Python 3.8+
- Node.js 16+
- Csound (installed system-wide)
- macOS / Linux / Windows (with WSL)

## Installation

### 1. Clone the repository

```bash
git clone git@github.com:gleb812/csmodular.git
cd csmodular
```

### 2. Set up Python virtual environment

```bash
python -m venv venv
source venv/bin/activate      # macOS / Linux
# or venv\Scripts\activate    # Windows
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Install Node.js dependencies

```bash
npm install
```

## Running the project

Start both backend and frontend:

```bash
npm run dev:full
```

Open your browser and navigate to: `http://localhost:3000`

> **Note:** The Flask API runs on `http://localhost:5000` by default.

## Project Structure

```
.
├── backend/           # Flask API + Csound integration
├── src/              # Frontend JavaScript + Canvas UI
├── csound/           # Csound orchestras and samples
├── modules/          # Synthesizer modules
├── public/           # Static assets
├── scripts/          # Utility scripts
├── requirements.txt  # Python dependencies
├── package.json      # Node.js dependencies
└── README.md         # This file
```

## Adding custom modules

1. Create a new module in the `modules/` directory
2. Define its parameters and connections
3. The UI will automatically detect and display it

See `TODO.txt` for current development priorities and module format specifications.

## Development

### Running separately

**Backend only:**
```bash
python backend/app.py
```

**Frontend only:**
```bash
npm run dev
```

### Environment variables

Create a `.env` file in the root directory (optional):

```
FLASK_DEBUG=true
PORT=5000
```

## Troubleshooting

**Csound not found:**
- Install Csound from: https://csound.com/download.html
- On macOS: `brew install csound`
- On Linux: `sudo apt-get install csound`
- On Windows: Download installer from the official website

**Port already in use:**
- Change the port in `vite.config.js` or `backend/app.py`

## Contributing

Contributions are welcome! Feel free to:
- Submit issues
- Create pull requests
- Add new modules
- Improve the UI/UX

## Acknowledgments

- Built with [Csound](https://csound.com/)
- UI powered by Canvas API
- Backend with [Flask](https://flask.palletsprojects.com/)

## License

MIT License — see the [LICENSE](LICENSE) file for details.

## Author

**Gleb Rogozinski** — [GitHub](https://github.com/gleb812)

