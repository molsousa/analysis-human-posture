import cv2
import argparse
import json
import mediapipe as mp
import threading
import time
from flask import Flask, Response
from flask_cors import CORS

from src.posture_analysis import PostureAnalyzer
from src.pose_detector import MediaPipePoseDetector
from src.kalman_smoother import KalmanPointSmoother
from src.report import Log
from config import COLOR_CONFIG

# Criar servidor Flask para streaming
video_app = Flask(__name__)
CORS(video_app)

# Variáveis globais para streaming
current_frame = None
analysis_data = {
    "counter": 0,
    "posture_feedback": "Aguardando...",
    "posture_feedback_type": "INFO",
    "posture_score": 100,
    "rep_feedback": "",
    "rep_feedback_type": "INFO",
    "movement_phase": "INICIANDO",
    "exercise_name": "Nenhum",
}
frame_lock = threading.Lock()


def draw_smoothed_landmarks(image, landmarks, detector, landmarks_to_hide=None):
    """Desenha os landmarks suavizados (uma lista de tuplas) na imagem."""
    if landmarks_to_hide is None:
        landmarks_to_hide = []

    hide_index = {detector.get_landmark_index(name) for name in landmarks_to_hide}

    connections = mp.solutions.pose.POSE_CONNECTIONS
    h, w, _ = image.shape
    pixel_landmarks = []

    for i, lm in enumerate(landmarks):
        if i in hide_index or lm[3] < 0.1:
            pixel_landmarks.append(None)
        else:
            pixel_landmarks.append((int(lm[0] * w), int(lm[1] * h)))

    if connections:
        for connection in connections:
            start_idx, end_idx = connection
            if start_idx in hide_index or end_idx in hide_index:
                continue
            if start_idx < len(pixel_landmarks) and end_idx < len(pixel_landmarks):
                start_point, end_point = (
                    pixel_landmarks[start_idx],
                    pixel_landmarks[end_idx],
                )
                if start_point and end_point:
                    cv2.line(image, start_point, end_point, (255, 255, 0), 2)

    for i, point in enumerate(pixel_landmarks):
        if point:
            cv2.circle(image, point, 5, (0, 0, 255), -1)


@video_app.route("/video_feed")
def video_feed():
    """Streaming de vídeo MJPEG"""

    def generate():
        global current_frame
        while True:
            with frame_lock:
                if current_frame is not None:
                    # Converter frame para JPEG
                    ret, jpeg = cv2.imencode(".jpg", current_frame)
                    if ret:
                        frame = jpeg.tobytes()
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n\r\n"
                        )
            time.sleep(0.033)  # ~30 FPS

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@video_app.route("/api/status")
def get_status():
    """Retorna status da análise"""
    global analysis_data
    return analysis_data


def run_flask():
    """Executa servidor Flask em thread separada"""
    video_app.run(host="0.0.0.0", port=5001, debug=False, threaded=True)


def main(exercise_config, video_path=0):
    """
    Função principal para executar a análise de postura em tempo real.
    """
    # --- 1. Inicialização dos Componentes ---
    detector = MediaPipePoseDetector(model_complexity=1, min_detection_confidence=0.4)
    analyzer = PostureAnalyzer(
        exercise_config_path=exercise_config, pose_detector=detector
    )

    with open(exercise_config, "r", encoding="utf-8") as f:
        config_data = json.load(f)

    filter_params = config_data.get("kalman_filter_params", {"R": 5, "Q": 0.1})
    smoother = KalmanPointSmoother(
        R=filter_params["R"], Q=filter_params["Q"], visibility_threshold=0.65
    )

    reporter = Log(exercise_config=config_data)
    landmarks_to_hide = config_data.get("landmarks_to_hide", [])

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Erro: Não foi possível abrir o vídeo em {video_path}")
        return

    print(">>> Análise iniciada. Pressione 'q' para sair.")
    print(f">>> Streaming disponível em: http://localhost:5001/video_feed")
    print(f">>> Status disponível em: http://localhost:5001/api/status")

    # --- 2. Loop Principal de Processamento de Vídeo ---
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Fim do vídeo ou erro na captura.")
            break

        raw_keypoints, pose_landmarks_results = detector.detect_pose(frame)

        smoothed_keypoints = []
        calculated_angles = {}
        if raw_keypoints:
            smoothed_keypoints = smoother.smooth(raw_keypoints)
            calculated_angles = analyzer.analyze(
                smoothed_keypoints, frame.shape[:2], reporter
            )
        else:
            analyzer.analyze([], None, reporter)

        # --- 3. Atualizar dados globais para streaming ---
        global current_frame, analysis_data
        display_frame = frame.copy()

        if smoothed_keypoints:
            draw_smoothed_landmarks(
                display_frame, smoothed_keypoints, detector, landmarks_to_hide
            )

        # --- LÓGICA DO MODO DE DEPURACAO ---
        if calculated_angles and smoothed_keypoints:
            h, w, _ = display_frame.shape
            for angle_def in analyzer.angle_definitions:
                angle_name = angle_def["name"]
                angle_value = calculated_angles.get(angle_name)

                if angle_value is not None:
                    vertex_index = angle_def["index"][1]
                    vertex_point = smoothed_keypoints[vertex_index]
                    text_pos = (int(vertex_point[0] * w) + 10, int(vertex_point[1] * h))

                    label = (
                        angle_name.replace("_", " ")
                        .replace("flexion", "")
                        .replace("angle", "")
                    )
                    cv2.putText(
                        display_frame,
                        f"{label.strip()}: {int(angle_value)}",
                        text_pos,
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 0),
                        1,
                        cv2.LINE_AA,
                    )

        # Cores para feedback
        posture_color = COLOR_CONFIG["feedback_color"].get(
            analyzer.posture_feedback_type, (255, 255, 255)
        )
        rep_color = COLOR_CONFIG["feedback_color"].get(
            analyzer.rep_feedback_type, (255, 255, 255)
        )

        # Informações na tela (separadas)
        cv2.putText(
            display_frame,
            f"Exercicio: {analyzer.exercise_name}",
            (10, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            display_frame,
            f"Reps: {analyzer.counter}",
            (10, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            display_frame,
            f"Fase: {analyzer.movement_phase}",
            (10, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )

        # Feedback de POSTURA (sempre visível)
        cv2.putText(
            display_frame,
            "Postura:",
            (10, 160),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            posture_color,
            2,
            cv2.LINE_AA,
        )
        '''
        cv2.putText(
            display_frame,
            f"Score: {analyzer.posture_score}/100",
            (10, 190),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            posture_color,
            1,
            cv2.LINE_AA,
        )
        '''

        y0 = 220
        dy = 25
        for i, line in enumerate(analyzer.posture_feedback.split("\n")):
            y = y0 + i * dy
            cv2.putText(
                display_frame,
                line,
                (10, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                posture_color,
                1,
                cv2.LINE_AA,
            )

        # Feedback de REPETIÇÃO (apenas quando houver)
        if analyzer.rep_feedback:
            y_start = y0 + (len(analyzer.posture_feedback.split("\n")) * dy) + 20
            cv2.putText(
                display_frame,
                "Repeticao:",
                (10, y_start),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                rep_color,
                2,
                cv2.LINE_AA,
            )

            y_start += 30
            for i, line in enumerate(analyzer.rep_feedback.split("\n")):
                y = y_start + i * dy
                cv2.putText(
                    display_frame,
                    line,
                    (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    rep_color,
                    1,
                    cv2.LINE_AA,
                )

        # Atualizar frame global para streaming
        with frame_lock:
            current_frame = display_frame

        # Atualizar dados de análise para API
        analysis_data = {
            "counter": analyzer.counter,
            "posture_feedback": analyzer.posture_feedback,
            "posture_feedback_type": analyzer.posture_feedback_type,
            "posture_score": analyzer.posture_score,
            "rep_feedback": analyzer.rep_feedback,
            "rep_feedback_type": analyzer.rep_feedback_type,
            "movement_phase": analyzer.movement_phase,
            "exercise_name": analyzer.exercise_name,
        }

        # Mostrar na janela local
        cv2.imshow("Analise de Postura", display_frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # --- 4. Finalização ---
    print("Salvando resumo da sessão...")
    reporter.save()

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Análise de Postura em Exercícios de Calistenia."
    )
    parser.add_argument(
        "--exercise",
        type=str,
        required=True,
        help="Caminho para o arquivo de configuração do exercício (JSON).",
    )
    parser.add_argument(
        "--video",
        type=str,
        default="0",
        help='Caminho para o arquivo de vídeo ou "0" para usar a webcam.',
    )

    args = parser.parse_args()

    video_input = 0 if args.video == "0" else args.video
    if isinstance(video_input, str) and video_input.isdigit():
        video_input = int(video_input)

    # Iniciar servidor Flask em thread separada
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Aguardar um pouco para o servidor iniciar
    time.sleep(2)

    # Executar análise principal
    main(args.exercise, video_input)
