import numpy as np


def calculate_angle_3d(keypoints, p1_idx, p2_idx, p3_idx):
    """
    Calculates the angle between three 3D keypoints.

    Args:
        keypoints: List of keypoints, where each one keypoint is a tuple.
        p1_idx: Index of the first point.
        p2_idx: Index of the vertex point.
        p3_idx: Index of the third point.

    Returns:
        float: Angle in degrees or zero if the points not be calculated.
    """
    if not keypoints or max(p1_idx, p2_idx, p3_idx) >= len(keypoints):
        return 0.0

    # Extract the 3D coordinates of the points
    p1 = np.array(keypoints[p1_idx][:3])
    p2 = np.array(keypoints[p2_idx][:3])
    p3 = np.array(keypoints[p3_idx][:3])

    # Creates vectors from points
    v1 = p1 - p2
    v2 = p3 - p2

    # Calculate the scalar product
    dot_product = np.dot(v1, v2)

    # Calculate the magnitude of the vectors
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)

    # Avoid division by zero
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0

    # Calculates the cosine of the angle and converts it to degrees
    cosine_angle = dot_product / (norm_v1 * norm_v2)
    # Limit the value betweeen -1 and 1 to avoid domain error in the arccosine
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

    return np.degrees(angle)


def calculate_segment_angle_horizontal(keypoints, p1_idx, p2_idx):
    """
    Calculates the angle of a body segment relative to a horizontal line.
    Uses only 2D coordinates.
    """
    if not keypoints or max(p1_idx, p2_idx) >= len(keypoints):
        return None

    # Extract the 2D coordinates
    p1 = np.array(keypoints[p1_idx][:2])
    p2 = np.array(keypoints[p2_idx][:2])

    # Creates the segment vector
    vector = p2 - p1

    # Use atan2 to calculate the angle in radians wit the horizontal and convert to degrees
    angle_rad = np.arctan2(vector[1], vector[0])
    angle_deg = np.degrees(angle_rad)

    # Normalizes the angle so that it is always positive
    if angle_deg < 0:
        angle_deg += 360

    return angle_deg
