import numpy as np
from filterpy.kalman import KalmanFilter
import mediapipe as mp

PoseLandmark = mp.solutions.pose.PoseLandmark

HAND_LANDMARKS = {
    PoseLandmark.LEFT_WRIST,
    PoseLandmark.RIGHT_WRIST,
    PoseLandmark.LEFT_PINKY,
    PoseLandmark.RIGHT_PINKY,
    PoseLandmark.LEFT_INDEX,
    PoseLandmark.RIGHT_INDEX,
    PoseLandmark.LEFT_THUMB,
    PoseLandmark.RIGHT_THUMB,
}


class KalmanPointFilter:
    """
    Gerencia um Filtro de Kalman para um único ponto 3D usando um modelo de aceleração constante.
    """

    def __init__(self, landmark_index, R, Q, velocity_decay=0.98):
        # --- Constant Accelaration Model ---
        # State 9 dimensions: [x, y, z, vx, vy, vz, ax, ay, az]
        self.kf = KalmanFilter(dim_x=9, dim_z=3)
        self.landmark_index = landmark_index

        self.default_decay = velocity_decay
        self.hand_decay = 0.85

        dt = 1.0  # Time delta

        # State Transition Matriz
        # Updates position based on velocity and acceleration
        # Updates velocity based on accelation
        self.kf.F = np.eye(9)
        self.kf.F[0, 3] = self.kf.F[1, 4] = self.kf.F[2, 5] = dt
        self.kf.F[3, 6] = self.kf.F[4, 7] = self.kf.F[5, 8] = dt
        self.kf.F[0, 6] = self.kf.F[1, 7] = self.kf.F[2, 8] = 0.5 * (dt**2)

        # Measurement Matrix 3x9, still measuring only the position
        self.kf.H = np.array(
            [
                [1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 1, 0, 0, 0, 0, 0, 0],
            ]
        )

        # Measurement Noise Covariance
        self.kf.R *= R

        # Process Noise Covariance, 9x9
        # Represents the uncertainty of constant acceleration
        self.kf.Q = np.eye(9) * Q

        self.kf.x = np.zeros((9, 1))

    def update(self, point):
        self.kf.update(np.array(point[:3]).reshape(3, 1))

    def predict(self):
        self.kf.predict()

        # Cushions speed and acceleration to prevent instability
        decay = (
            self.hand_decay
            if self.landmark_index in HAND_LANDMARKS
            else self.default_decay
        )
        self.kf.x[3:6] *= decay  # Cushions velocity
        self.kf.x[6:] *= decay  # Cushions acceleration

        return self.kf.x[:3].flatten()


class KalmanPointSmoother:
    """ Apllies the Kalman Filter wit customizable parameters per exercise. """
    def __init__(self, R, Q, visibility_threshold=0.65):
        self.filters = {}
        self.visibility_threshold = visibility_threshold
        self.R = R
        self.Q = Q

        self.symmetric_pairs = {
            PoseLandmark.LEFT_SHOULDER: PoseLandmark.RIGHT_SHOULDER,
            PoseLandmark.LEFT_ELBOW: PoseLandmark.RIGHT_ELBOW,
            PoseLandmark.LEFT_WRIST: PoseLandmark.RIGHT_WRIST,
            PoseLandmark.LEFT_HIP: PoseLandmark.RIGHT_HIP,
            PoseLandmark.LEFT_KNEE: PoseLandmark.RIGHT_KNEE,
            PoseLandmark.LEFT_ANKLE: PoseLandmark.RIGHT_ANKLE,
            PoseLandmark.LEFT_HEEL: PoseLandmark.RIGHT_HEEL,
            PoseLandmark.LEFT_FOOT_INDEX: PoseLandmark.RIGHT_FOOT_INDEX,
        }
        self.symmetric_pairs.update({v: k for k, v in self.symmetric_pairs.items()})

    def smooth(self, points):
        if not points:
            return []
        smoothed_points = []
        visibilities = [p[3] for p in points]

        for i, point in enumerate(points):
            px, py, pz, visibility = point

            if i not in self.filters:
                self.filters[i] = KalmanPointFilter(
                    landmark_index=i, R=self.R, Q=self.Q
                )
                self.filters[i].kf.x[:3] = np.array([[px], [py], [pz]])

            if visibility < self.visibility_threshold:
                symmetric_partner_idx = self.symmetric_pairs.get(i)
                if (
                    symmetric_partner_idx is not None
                    and symmetric_partner_idx in self.filters
                    and visibilities[symmetric_partner_idx] > self.visibility_threshold
                ):
                    partner_filter = self.filters[symmetric_partner_idx]
                    current_filter = self.filters[i]
                    # Copies the complete movement status
                    current_filter.kf.x[3:] = partner_filter.kf.x[3:]

            predicted_pos = self.filters[i].predict()

            if visibility > self.visibility_threshold:
                self.filters[i].update(point)
                final_pos = self.filters[i].kf.x[:3].flatten()

            else:
                final_pos = predicted_pos

            smoothed_points.append((*final_pos, visibility))
        return smoothed_points
