"""
Servidor web principal para interface do sistema de análise de postura.
"""

from flask import Flask, render_template, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)


@app.route("/")
def index():
    """Página principal"""
    return render_template("index.html")


@app.route("/static/<path:path>")
def serve_static(path):
    """Serve arquivos estáticos"""
    return send_from_directory("static", path)


if __name__ == "__main__":
    # Criar diretórios necessários
    os.makedirs("static", exist_ok=True)
    os.makedirs("templates", exist_ok=True)

    print("=" * 50)
    print("Interface Web - Análise de Postura")
    print("=" * 50)
    print("URLs disponíveis:")
    print(f"  - Interface: http://localhost:5000")
    print("=" * 50)
    print("Instruções:")
    print("1. Execute o main.py normalmente para análise")
    print("2. Acesse esta interface para ver o streaming")
    print("=" * 50)

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
