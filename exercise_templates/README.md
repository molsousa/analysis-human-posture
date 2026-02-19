# Implementation

Está pasta contém os arquivos .json que define como cada exercício irá funcionar durante a detecção. Com isso, não é necessário alterar o códigos dos demais arquivos Python quando se trata do ângulo correto dos exercícios e feedback personalizado ao usuário.

## Files

### [***pushup.json***](https://github.com/molsousa/analise-postura-humana/blob/main/exercise_templates/pushup.json): 

This file defines the rules for the Push-up exercise. It instructs the PostureAnalyzer—a class contained in [*pose_detector.py*](https://github.com/molsousa/analise-postura-humana/blob/main/src/pose_detector.py)—on what to measure and how to judge performance.

**Section Details:**

- "*name*"

    Function: Simply the name of the exercise that will be displayed on the screen and in reports.

- "*main_angle*"

    Function: Defines which angle is the main one for counting repetitions. In the case of push-ups, the movement of bending and stretching the elbow is what defines a repetition. The code is smart enough to use “left_elbow_angle” if the left side is more visible to the camera.

- "*angle_definitions*"

    Function: A dictionary that defines all the angles we want to monitor during this exercise. Each key is a name for the angle, and the value is a list of three MediaPipe landmarks. The middle point is always the vertex of the angle.

- "*right_elbow_angle*" e "left_elbow_angle": Measure elbow flexion.

- "*body_line_angle*": It measures body alignment, checking that the shoulder, hip, and ankle form a straight line. It is crucial for correct posture.

- "*rules*"

    Function: Contains the main logic of how the exercise is evaluated.

- "*state_change*": Sets the thresholds for the state machine that counts repetitions.

- "*down_angle*": For the system to consider that you have started the descent (state = ‘down’), the elbow angle must be less than the specified value in degrees.

- "*up_angle*": For the system to count the repetition and consider that you have returned to the starting position (state = ‘up’), the elbow angle must be greater than the specified degree value.

- "*feedback*": A list of rules for real-time posture feedback.

    The only rule here checks the “*body_line_angle*”.

- "*message*": “Keep your body straight!”: The message that will be displayed if your posture is incorrect.

- "*zones*": Defines what constitutes correct posture. If the angle falls outside the “green zone” (“min,” “max”), error feedback is triggered. An angle of 180 degrees can represent a perfectly straight body.

### [***squat.json***](https://github.com/molsousa/analise-postura-humana/blob/main/exercise_templates/squat.json):

This file defines the rules for the Squat exercise.

**Section Details:**

- "*name*"

    Function: The name of the exercise to be displayed.

- "*main_angle*"

    Function: For squats, the main angle that defines the repetition is the knee flexion angle.

- "*angle_definitions*"

    Function: Defines the angles to be monitored.

- "*right_knee_flexion*" e "*left_knee_flexion*": Measure the depth of the squat by the flexion of the knees.

- "*right_ankle_dorsiflexion*" e "*left_ankle_dorsiflexion*": Measure ankle flexion. A correct angle here usually indicates that the user is keeping their heels on the floor and has good mobility.

- "*rules*"

    Function: Contains the evaluation rules.

- "*state_change*": Sets the thresholds for counting.

- "*down_angle*": The knee angle must be less than the specified degree value (*down_angle* must be less than *up_angle*) to start the descent phase.

- "*up_angle*": The knee angle must be greater than the specified degree value (almost standing) to complete the repetition.

- "*feedback*": List of posture rules.

    First Rule (Depth):

    Checks the knee angle (“right_knee_flexion”).

- “*message*”: “Insufficient depth. Squat deeper.”: Displayed if the angle is not in the correct zone.

- “*zones*”: The “green zone” (“min,” “max”) defines a good squat depth. If, during the descent, the user's knee angle remains above 120 degrees, the error will be triggered.