"""Unit tests for YOLO result conversion and vehicle-class filtering."""

from types import SimpleNamespace
import unittest

from cv.detector import VehicleDetection, VehicleDetector


class _TensorLike:
    """Small test double for the tensor API returned by Ultralytics boxes."""

    def __init__(self, values: list[float] | list[list[float]]) -> None:
        self.values = values

    def cpu(self) -> "_TensorLike":
        return self

    def tolist(self) -> list[float] | list[list[float]]:
        return self.values


class VehicleDetectorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.detector = VehicleDetector()

    def test_detections_from_result_returns_expected_format(self) -> None:
        result = SimpleNamespace(
            boxes=SimpleNamespace(
                xyxy=_TensorLike([[10.2, 20.8, 30.4, 40.6]]),
                conf=_TensorLike([0.91]),
                cls=_TensorLike([2.0]),
            )
        )

        detections = VehicleDetector.detections_from_result(result, {2: "car"})

        self.assertEqual(
            detections,
            [VehicleDetection("car", 0.91, (10, 20, 30, 40))],
        )

    def test_filter_vehicle_detections_keeps_required_classes(self) -> None:
        detections = [
            VehicleDetection("car", 0.90, (0, 0, 10, 10)),
            VehicleDetection("motorcycle", 0.80, (0, 0, 10, 10)),
            VehicleDetection("bus", 0.70, (0, 0, 10, 10)),
            VehicleDetection("truck", 0.60, (0, 0, 10, 10)),
            VehicleDetection("person", 0.99, (0, 0, 10, 10)),
        ]

        filtered = self.detector.filter_vehicle_detections(detections)

        self.assertEqual(
            [detection.class_name for detection in filtered],
            ["car", "motorcycle", "bus", "truck"],
        )

    def test_rejects_invalid_confidence_threshold(self) -> None:
        with self.assertRaises(ValueError):
            VehicleDetector(confidence_threshold=1.1)


if __name__ == "__main__":
    unittest.main()
