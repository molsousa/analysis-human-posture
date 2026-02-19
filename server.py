""" Main web server for the posture analysis system interface. """
from flask import Flask, render_template, jsonify, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)


@app.route("/")
def index():
    """ Home page. """
    return render_template("index.html")


@app.route("/static/<path:path>")
def serve_static(path):
    """ Static files. """
    return send_from_directory("static", path)


@app.route("/api/health")
def health_check():
    """ Server health check endpoint. """
    return jsonify(
        {"status": "healthy", "service": "posture-analysis-web", "version": "1.0.0"}
    )


if __name__ == "__main__":
    # Make necessary directories
    os.makedirs("static", exist_ok=True)
    os.makedirs("templates", exist_ok=True)

    print("=" * 60)
    print("Web Interface - Posture Analysis")
    print("=" * 60)
    print("Available URLs:")
    print(f"  - Main interface: http://localhost:5000")
    print(f"  - Health check: http://localhost:5000/api/health")
    print("=" * 60)
    print("Instructions:")
    print(
        "1. Run the analysis: python main.py --exercise exercise_templates/pushup.json --video 0"
    )
    print("2. Access this interface to view the stream")
    print("3. Use another device on the network for remote access")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
