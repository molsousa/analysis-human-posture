"""
Servidor Flask para servir o front-end e integrar com o sistema de análise de postura.
Este arquivo é NOVO e deve ser colocado na pasta raiz do projeto.
"""
from flask import Flask, render_template, jsonify, request, Response, send_from_directory
from flask_cors import CORS
import cv2
import json
import threading
import time
import os
import subprocess
import signal
import sys
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Estado global da aplicação
class AppState:
    def __init__(self):
        self.process = None
        self.is_running = False
        self.current_exercise = None
        self.stats = {
            'total_reps': 0,
            'current_reps': 0,
            'feedback': 'Aguardando início...',
            'status': 'stopped'
        }

state = AppState()

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

@app.route('/api/exercises')
def get_exercises():
    """Lista os exercícios disponíveis"""
    exercises_dir = 'exercise_templates'
    exercises = []
    
    if os.path.exists(exercises_dir):
        for file in os.listdir(exercises_dir):
            if file.endswith('.json'):
                with open(os.path.join(exercises_dir, file), 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    exercises.append({
                        'id': file.replace('.json', ''),
                        'name': config.get('name', file),
                        'description': config.get('description', ''),
                        'file': file
                    })
    
    return jsonify(exercises)

@app.route('/api/videos')
def get_videos():
    """Lista os vídeos disponíveis (se houver pasta videos)"""
    videos_dir = 'videos'
    videos = []
    
    if os.path.exists(videos_dir):
        for file in os.listdir(videos_dir):
            if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
                videos.append({
                    'name': file,
                    'path': os.path.join(videos_dir, file)
                })
    
    return jsonify(videos)

@app.route('/api/start', methods=['POST'])
def start_analysis():
    """Inicia a análise de postura executando main.py"""
    global state
    
    if state.is_running:
        return jsonify({'success': False, 'message': 'Análise já em andamento'})
    
    data = request.json
    exercise = data.get('exercise')
    use_webcam = data.get('use_webcam', True)
    video_file = data.get('video_file')
    
    if not exercise:
        return jsonify({'success': False, 'message': 'Nenhum exercício selecionado'})
    
    try:
        # Construir o comando para executar main.py
        cmd = [sys.executable, 'main.py', '--exercise', f'exercise_templates/{exercise}']
        
        if use_webcam:
            cmd.extend(['--video', '0'])
        elif video_file:
            cmd.extend(['--video', f'videos/{video_file}'])
        else:
            cmd.extend(['--video', '0'])
        
        # Iniciar o processo
        state.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            bufsize=1
        )
        
        state.is_running = True
        state.current_exercise = exercise
        state.stats['status'] = 'running'
        
        # Iniciar thread para ler a saída do processo
        threading.Thread(target=read_process_output, args=(state.process,), daemon=True).start()
        
        # Carregar informações do exercício
        exercise_path = f'exercise_templates/{exercise}'
        with open(exercise_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        return jsonify({
            'success': True,
            'message': 'Análise iniciada',
            'exercise': config.get('name', exercise)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro: {str(e)}'})

@app.route('/api/stop', methods=['POST'])
def stop_analysis():
    """Para a análise de postura"""
    global state
    
    if not state.is_running or not state.process:
        return jsonify({'success': False, 'message': 'Nenhuma análise em andamento'})
    
    try:
        # Enviar sinal para terminar o processo
        state.process.terminate()
        
        # Aguardar um pouco
        time.sleep(1)
        
        # Se ainda estiver rodando, forçar término
        if state.process.poll() is None:
            state.process.kill()
        
        state.is_running = False
        state.process = None
        state.stats['status'] = 'stopped'
        
        return jsonify({'success': True, 'message': 'Análise parada'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro: {str(e)}'})

@app.route('/api/status')
def get_status():
    """Retorna o status atual"""
    return jsonify({
        'is_running': state.is_running,
        'current_exercise': state.current_exercise,
        'stats': state.stats
    })

@app.route('/api/logs')
def get_logs():
    """Lista os logs disponíveis"""
    logs_dir = 'logs'
    logs = []
    
    if os.path.exists(logs_dir):
        for file in os.listdir(logs_dir):
            if file.endswith('.txt'):
                file_path = os.path.join(logs_dir, file)
                logs.append({
                    'name': file,
                    'path': file_path,
                    'size': os.path.getsize(file_path),
                    'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
                })
    
    return jsonify(sorted(logs, key=lambda x: x['modified'], reverse=True))

def read_process_output(process):
    """Lê a saída do processo e atualiza estatísticas"""
    global state
    
    while process.poll() is None:
        line = process.stdout.readline()
        if line:
            print(f"[MAIN.PY] {line.strip()}")
            
            # Extrair informações da saída (exemplo simplificado)
            if "Reps:" in line:
                try:
                    parts = line.split("Reps:")
                    if len(parts) > 1:
                        reps = parts[1].strip().split()[0]
                        state.stats['current_reps'] = int(reps)
                except:
                    pass
                    
            # Se o processo terminou
        time.sleep(0.1)
    
    state.is_running = False
    state.process = None
    state.stats['status'] = 'stopped'
    print("Processo main.py finalizado")

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve arquivos estáticos"""
    return send_from_directory('static', path)

if __name__ == '__main__':
    # Criar diretórios necessários
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    print("="*50)
    print("Servidor de Análise de Postura")
    print("="*50)
    print("URLs disponíveis:")
    print(f"  - Interface: http://localhost:5000")
    print(f"  - API: http://localhost:5000/api/status")
    print("="*50)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)