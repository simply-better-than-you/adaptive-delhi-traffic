"""YOLO vehicle detection and detection-frame annotation utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

try:
    from .config import DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL_NAME, VEHICLE_CLASSES
except ImportError:  # Allows ``python cv/detector.py`` style local imports.
    from config import DEFAULT_CONFIDENCE_THRESHOLD, DEFAULT_MODEL_NAME, VEHICLE_CLASSES


@dataclass(frozen=True)
class VehicleDetection:
    """One detected road vehicle in pixel coordinates."""

    class_name: str
    confidence: float
    bounding_box: tuple[int, int, int, int]


class VehicleDetector:
    """Run a pretrained Ultralytics YOLO detector and retain vehicle classes."""

    def __init__(
        self,
        model_name: str = DEFAULT_MODEL_NAME,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        vehicle_classes: frozenset[str] = VEHICLE_CLASSES,
    ) -> None:
        if not 0.0 <= confidence_threshold <= 1.0:
            raise ValueError("confidence_threshold must be between 0 and 1.")

        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.vehicle_classes = vehicle_classes
        self._model: Any | None = None

    def load_model(self) -> None:
        """Load the configured pretrained YOLO model on first use."""
        if self._model is not None:
            return

        try:
            from ultralytics import YOLO
        except ImportError as error:
            raise RuntimeError(
                "Ultralytics is not installed. Run: python -m pip install -r requirements.txt"
            ) from error

        self._model = YOLO(self.model_name)

    @staticmethod
    def detections_from_result(result: Any, class_names: dict[int, str]) -> list[VehicleDetection]:
        """Convert one Ultralytics result into a simple, testable list format."""
        boxes = result.boxes
        if boxes is None:
            return []

        coordinates = boxes.xyxy.cpu().tolist()
        confidences = boxes.conf.cpu().tolist()
        class_ids = boxes.cls.cpu().tolist()
        detections: list[VehicleDetection] = []

        for box, confidence, class_id in zip(coordinates, confidences, class_ids):
            class_name = class_names[int(class_id)]
            detections.append(
                VehicleDetection(
                    class_name=class_name,
                    confidence=float(confidence),
                    bounding_box=tuple(int(value) for value in box),
                )
            )
        return detections

    def filter_vehicle_detections(
        self, detections: Iterable[VehicleDetection]
    ) -> list[VehicleDetection]:
        """Keep only the configured vehicle classes."""
        return [
            detection
            for detection in detections
            if detection.class_name in self.vehicle_classes
        ]

    def detect(self, frame: Any) -> list[VehicleDetection]:
        """Detect configured vehicle types in one OpenCV video frame."""
        self.load_model()
        assert self._model is not None
        result = self._model(frame, conf=self.confidence_threshold, verbose=False)[0]
        class_names = {int(key): value for key, value in result.names.items()}
        return self.filter_vehicle_detections(
            self.detections_from_result(result, class_names)
        )


def annotate_frame(frame: Any, detections: Iterable[VehicleDetection], fps: float) -> Any:
    """Draw vehicle boxes, labels, count, and processing FPS onto a frame."""
    try:
        import cv2
    except ImportError as error:
        raise RuntimeError(
            "OpenCV is not installed. Run: python -m pip install -r requirements.txt"
        ) from error

    annotated_frame = frame.copy()
    detections = list(detections)
    for detection in detections:
        left, top, right, bottom = detection.bounding_box
        cv2.rectangle(annotated_frame, (left, top), (right, bottom), (0, 255, 0), 2)
        label = f"{detection.class_name} {detection.confidence:.2f}"
        cv2.putText(
            annotated_frame,
            label,
            (left, max(20, top - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 0),
            2,
        )

    cv2.putText(
        annotated_frame,
        f"Vehicles: {len(detections)} | FPS: {fps:.1f}",
        (15, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 255),
        2,
    )
    return annotated_frame
