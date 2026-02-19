""" Main configuration file for the posture analysis project """
# Colors and sizes for skeletion visualization and feedback
COLOR_CONFIG = {
    # Nested dictionary for feedback colors, mapping the feedback type to a BGR color
    "feedback_color": {
        "INFO": (255, 255, 255),
        "CORRECT": (0, 255, 0),
        "WARNING": (0, 255, 255),
        "CRITICAL": (0, 0, 255),
    },
    # Drawing settings for pose landmarks and connections
    "conection_color": (255, 255, 255),  # Connection colors
    "landmark_radius": 5,  # Ratio
    "connection_thickness": 2,  # Connection thickness
}

# Settings for the session report
LOG_CONFIG = {"dir_logs": "logs"}
