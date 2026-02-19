# Implementation

This folder contains all the files necessary for the implementation logic of the algorithm. These are files that execute the logic for key point detection, smoothing filter, and posture analysis report.

## Source files

- [***angle_utils.py***](https://github.com/molsousa/analise-postura-humana/blob/main/src/angle_utils.py)

    **Function:** Mathematical Utility. 
    
    - A simple module containing the calculate_angle_3d function.

    - Calculates the angle in degrees between three 3D points in space.

    - Advantage: Isolates vector mathematics from the rest of the analysis logic, keeping the code cleaner and more organized.

- [***kalman_smoother.py***](https://github.com/molsousa/analise-postura-humana/blob/main/src/kalman_smoother.py)
    
    **Function:** Advanced Keypoint Filter.
    
    - This is one of the most important components for detection quality. It receives the raw keypoints from PoseDetector and refines them.

    - Smooths out the natural jitter of detections.

    - Estimates the position of keypoints that are occluded.

    - Implements a symmetry heuristic so that occluded limbs move realistically along with their visible counterparts.

    - Applies velocity damping to prevent occluded points from “getting lost” and drifting across the screen.

- [***pose_detector.py***](https://github.com/molsousa/analise-postura-humana/blob/main/src/pose_detector.py)

    **Function:** MediaPipe Pose encapsulation.

    This class acts as a wrapper for the MediaPipe Pose library. Its function is to isolate all pose detection logic in one place.

    - Receives an image and returns the list of detected 3D keypoints.

    - Advantage: If in the future we want to replace MediaPipe with another pose estimation model, only this file will need to be modified, keeping the rest of the project intact.

- [***posture_analysis.py***](https://github.com/molsousa/analise-postura-humana/blob/main/src/posture_analysis.py)

    **Function:** This is the class that contains the main business logic of the project.

    - Loads and interprets the exercise rules from a .json file.

    - Implements the state machine (up/down) to count repetitions, focusing only on the most visible side of the body.

    - Analyzes body angles in real time and compares them with the rules to generate posture feedback (e.g., “Keep your body straight!”).

    - Detects the general orientation of the body (horizontal/bending vs. vertical/standing).

    - Collects the errors from a repetition and communicates them to the Report at the end of each cycle.

- [***report.py***](https://github.com/molsousa/analise-postura-humana/blob/main/src/report.py)
    
    **Function:** Session Summary Generator
    
    - This class is responsible for creating the final report that is readable by the user.

    - It receives consolidated data from each repetition (whether it was correct, what errors occurred) from PostureAnalyzer.

    - At the end of the session, it aggregates all this information to generate a .txt file with:

    - General statistics (total reps, % accuracy).

    - A list of the most common posture errors.

    - Tips on which parts of the body to focus on to correct these errors.