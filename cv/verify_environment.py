"""Verify the Python dependencies required by the CV module are importable."""

from __future__ import annotations

import importlib
import sys


REQUIRED_PACKAGES = {
    "opencv-python": "cv2",
    "ultralytics": "ultralytics",
    "numpy": "numpy",
    "pandas": "pandas",
}


def main() -> int:
    """Import every required package and return a process status."""
    missing_packages: list[str] = []

    for package_name, import_name in REQUIRED_PACKAGES.items():
        try:
            importlib.import_module(import_name)
        except ImportError:
            missing_packages.append(package_name)

    if missing_packages:
        print("Environment verification failed.")
        print("Missing or unimportable packages: " + ", ".join(missing_packages))
        print("Install dependencies with: python -m pip install -r requirements.txt")
        return 1

    print("Environment verification passed. All required packages imported successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
