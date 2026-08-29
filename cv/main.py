"""Run YOLO vehicle detection over a prerecorded video."""

from __future__ import annotations

import argparse
import time
from pathlib import Path

try:
    from .config import DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL_NAME
    from .detector import VehicleDetector, annotate_frame
except ImportError:  # Allows ``python cv/main.py`` from the repository root.
    from config import DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL_NAME
    from detector import VehicleDetector, annotate_frame


def parse_arguments() -> argparse.Namespace:
    """Read command-line settings while keeping defaults in ``config.py``."""
    parser = argparse.ArgumentParser(description="Detect vehicles in a traffic video.")
    parser.add_argument("--video", type=Path, required=True, help="Path to the input video.")
    parser.add_argument("--model", default=DEFAULT_MODEL_NAME, help="Ultralytics model name or path.")
    parser.add_argument(
        "--confidence",
        type=float,
        default=DEFAULT_CONFIDENCE_THRESHOLD,
        help="Minimum YOLO confidence from 0 to 1.",
    )
    parser.add_argument(
        "--no-display",
        action="store_true",
        help="Process frames without opening an OpenCV window.",
    )
    return parser.parse_args()


def run_video(video_path: Path, detector: VehicleDetector, display: bool = True) -> None:
    """Read a video frame by frame and show its annotated detections."""
    try:
        import cv2
    except ImportError as error:
        raise RuntimeError(
            "OpenCV is not installed. Run: python -m pip install -r requirements.txt"
        ) from error

    if not video_path.is_file():
        raise FileNotFoundError(f"Input video was not found: {video_path}")

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"OpenCV could not open the video: {video_path}")

    detector.load_model()
    processed_frames = 0
    started_at = time.perf_counter()

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break

            detections = detector.detect(frame)
            processed_frames += 1
            elapsed_seconds = time.perf_counter() - started_at
            fps = processed_frames / elapsed_seconds if elapsed_seconds else 0.0
            annotated_frame = annotate_frame(frame, detections, fps)

            if display:
                cv2.imshow("YOLO Vehicle Detection", annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    finally:
        capture.release()
        if display:
            cv2.destroyAllWindows()


def main() -> None:
    """Configure and run the video detector from command-line arguments."""
    arguments = parse_arguments()
    detector = VehicleDetector(arguments.model, arguments.confidence)
    run_video(arguments.video, detector, display=not arguments.no_display)


if __name__ == "__main__":
    main()
