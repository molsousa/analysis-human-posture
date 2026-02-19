# Analysis of Human Posture in Calisthenics Exercises

This repository contains a project for analyzing human posture in calisthenics exercises using the Mediapipe Pose library. The goal of this project is to inform users whether they are performing the exercise correctly in order to avoid injury. Initially, the algorithm only detects push-ups and squats.

The implementation of the project is part of scientific research developed at the Computer Graphics Laboratory of the State University of Western Paraná (UNIOESTE). Before implementation, a related article was published at the Latin American Congress on Free Software and Open Technology (LATINOWARE), which can be accessed via this link: [Analysis and Guidance of Posture in Calisthenics Exercises using Human Pose Estimation](https://doi.org/10.5753/latinoware.2024.245728).

## Implementation

* The algorithm was implemented entirely in Python, using the Mediapipe Pose library and the Kalman Filter library to assist in point detection and smooth the overall performance of the algorithm. To access the Kalman filter implementation, visit the link: [Filterpy](https://github.com/rlabbe/filterpy)

* The [*posture_analysis*](https://github.com/molsousa/analise-postura-humana/blob/main/src/posture_analysis.py) file performs a general analysis of the exercises. All guidance given to the user is centralized in this file. For the exercise thresholds, templates were created in the "[*exercise_templates*] (https://github.com/molsousa/analise-postura-humana/tree/main/exercise_templates)", which details the angles to be followed by the user.

* The other files are auxiliary to the main one ([*posture_analysis*](https://github.com/molsousa/analise-postura-humana/blob/main/src/posture_analysis.py)). You can understand the main function of each file by accessing the README in each folder.

* The algorithm assists the user by informing them whether their position is correct or not. It counts the repetitions and, at the end, generates a report showing the correct push-ups, the push-ups with incorrect posture, and the joint(s) that resulted in the incorrect posture.

## Source files in the root folder

- [***main.py***](https://github.com/molsousa/analise-postura-humana/blob/main/main.py)

    **Function:** This is the script you run to start the application. Its main responsibilities are:

    - Interpreting command line arguments (which exercise and which video/camera to use).

    - Initializing all main objects: PoseDetector, PostureAnalyzer, KalmanSmoother, and Relatorio.

    - Opening the video source and running the main loop that processes frame by frame.

    - Coordinate the data flow in each frame: detect -> smooth -> analyze.

    - Manage the entire visualization part, drawing the skeleton and feedback texts on the screen using OpenCV.

    - Call the method to save the report at the end of the session.

- [***config.py***](https://github.com/molsousa/analise-postura-humana/blob/main/config.py)

    **Function:** This file centralizes constants and settings used in different parts of the project. It defines:

    - The colors (in BGR) for each type of feedback (CORRECT, WARNING, CRITICAL).

    - The name of the directory where session reports are saved (e.g., logs).

    - This allows you to easily change the appearance and behavior of the application without having to modify the main code.

- [***server.py***](https://github.com/molsousa/analise-postura-humana/blob/main/server.py)
 
## Examples of Use of the Main Modules

Pratical examples of how to use the main modules of the project for human posture detection and analysis.

### 1. Pose Detection with MediaPipe

```python
from src.pose_detector import MediaPipePoseDetector
import cv2

# Initialize the detector
detector = MediaPipePoseDetector()

# Upload an image for analysis
image = cv2.imread('example.jpg')

# Detect pose
keypoints, pose_landmarks = detector.detect_pose(image)

# Draw landmarks on the image
detector.draw_landmarks(image, pose_landmarks)
cv2.imwrite('landmarks_image.jpg', image)
```

### 2. Calculation of Body Angles

```python
from src.angle_utils import calculate_angle_3d

# Example of detected keypoints (x, y, z, visibility)
keypoints = [
    (0.1, 0.2, 0.0, 0.99), # point 0
    (0.2, 0.3, 0.0, 0.98), # point 1
    (0.3, 0.4, 0.0, 0.95), # point 2
    # ...
]

# Calculate angle between three points
angle = calculate_angle_3d(keypoints, 0, 1, 2)
print(f"Angle between points: {angle:.2f} degrees")
```

### 3. Smoothing Key Points with Kalman FIlter

```python
from src.kalman_smoother import KalmanPointFilter

# Initialize filter for a point (e.g., right knee)
filter = KalmanPointFilter(landmark_index=14, R=10, Q=1.0) # index according to MediaPipe

# Update filter with observation of the current frame
filter.update(keypoints[14])

# Predict next smooth position
smooth_point = filter.predict()
print("Smoothed point:", smooth_point)
```

### 4. Posture Analysis and Rep Counting

```python
from src.posture_analysis import PostureAnalyzer
from src.pose_detector import MediaPipePoseDetector

# Initialize detector and analyzer
detector = MediaPipePoseDetector()
analyzer = PostureAnalyzer('exercise_templates/squat.json', detector)

# Flow example: receiving keypoints from a video frame
keypoints, _ = detector.detect_pose(image)

# Analyze posture
# (In actual use, call PostureAnalyzer's own methods for exercise processing)
# The main method is to process keypoints frame by frame and update repetition and feedback states.
```

### 5. Session Report Generation

```python
from src.report import Log

# Initialize report
config = {
    'name': 'Squat'
}
log = Log(exercise_config=config)

# Save data from a repetition
rep_num = 1
rep_ok = True
rep_errors = set()
log.save_rep(rep_num, rep_ok, rep_errors)

# Generate summary file
log.save()
```

### 6. Using Exercise Templates

The `.json` files in `exercise_templates/` define rules and angles for each exercise.
Example of how to create a new template:

```json
{
  "name": "New Exercise",
  "main_angle": "any_angle",
  "angle_definitions": {
    "any_angle": ["POINT1", "POINT2", "POINT3"]
  },
  "rules": {
    // ... specific rules
  }
}
```

Start `PostureAnalyzer` with the path to the new template so that it uses the custom rules.

---

### Recommendations

- Always consult the README files inside the folders to understand the logic of each module.
- To adapt new exercises, create a new `.json` file with the desired rules and angles.
- The functions of each module have explanatory docstrings; consult them for details on parameters and returns.


## How to use

* You must install Python version 3.11 and ensure that it is accessible in the environment variables. If you are unsure of your Python version, run:

        python --version

* You must install the libraries listed in `requeriments.txt`

        pip install -r requeriments.txt

* It is recommended to save the videos in the “[**videos/**](https://github.com/molsousa/analise-postura-humana/tree/main/videos)” folder to avoid using a longer path during execution.

* To use the algorithm, enter the following command in the terminal:

        python main.py --exercise exercise_templates/<exercise> --video videos/<video>
 
* If you want to use a webcam instead of a pre-recorded video, simply delete the text after *--video*, for example:

        python main.py --exercise exercise_templates/<exercise>
