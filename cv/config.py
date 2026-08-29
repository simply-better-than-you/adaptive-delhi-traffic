"""Shared paths and default settings for the CV module."""

from pathlib import Path


CV_DIRECTORY = Path(__file__).resolve().parent
VIDEOS_DIRECTORY = CV_DIRECTORY / "videos"
OUTPUTS_DIRECTORY = CV_DIRECTORY / "outputs"

# This small pretrained model is a practical default for a hackathon prototype.
DEFAULT_MODEL_NAME = "yolo11n.pt"
DEFAULT_CONFIDENCE_THRESHOLD = 0.25
VEHICLE_CLASSES = frozenset({"car", "motorcycle", "bus", "truck"})
