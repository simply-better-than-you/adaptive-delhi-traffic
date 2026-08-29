"""Shared paths and configuration placeholders for the CV module."""

from pathlib import Path


CV_DIRECTORY = Path(__file__).resolve().parent
VIDEOS_DIRECTORY = CV_DIRECTORY / "videos"
OUTPUTS_DIRECTORY = CV_DIRECTORY / "outputs"
