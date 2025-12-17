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


@app.route("/api/health")
def health_check():
    """Endpoint de verificação de saúde do servidor"""
    return jsonify(
        {"status": "healthy", "service": "posture-analysis-web", "version": "1.0.0"}
    )


if __name__ == "__main__":
    # Criar diretórios necessários
    os.makedirs("static", exist_ok=True)
    os.makedirs("templates", exist_ok=True)

    print("=" * 60)
    print("Interface Web - Análise de Postura")
    print("=" * 60)
    print("URLs disponíveis:")
    print(f"  - Interface principal: http://localhost:5000")
    print(f"  - Health check: http://localhost:5000/api/health")
    print("=" * 60)
    print("Instruções:")
    print(
        "1. Execute a análise: python main.py --exercise exercise_templates/pushup.json --video 0"
    )
    print("2. Acesse esta interface para ver o streaming")
    print("3. Use outro dispositivo na rede para acesso remoto")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
