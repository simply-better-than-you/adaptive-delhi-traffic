# Computer Vision Module

## Purpose

This module is the future perception layer for Adaptive Delhi Traffic. Its
planned pipeline is vehicle detection, tracking, approach assignment, and
traffic measurements for a downstream traffic controller. Milestone 1
implements only video-to-YOLO vehicle detection. Tracking, road-region logic,
and traffic-state calculation remain out of scope.

## Setup

Run these commands from the repository root.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

On macOS or Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

## Verify the environment

```powershell
python cv/verify_environment.py
```

Expected successful output:

```text
Environment verification passed. All required packages imported successfully.
```

## Run vehicle detection

Place a prerecorded traffic video in `cv/videos/` (videos are intentionally not
committed), then run this command from the repository root:

```powershell
python -m cv.main --video cv/videos/traffic.mp4
```

The first run downloads the configured pretrained Ultralytics model if it is
not already cached. The default is `yolo11n.pt`, a small YOLO model. Press `q`
in the video window to stop early.

Useful options:

```powershell
# Change the confidence threshold (default: 0.25)
python -m cv.main --video cv/videos/traffic.mp4 --confidence 0.40

# Process without opening a video window (useful on a server)
python -m cv.main --video cv/videos/traffic.mp4 --no-display
```

Each displayed vehicle has a green bounding box and a label such as `car 0.87`.
The top-left summary reports the relevant vehicle count for that frame and the
average processing FPS. Only `car`, `motorcycle`, `bus`, and `truck` are kept;
other COCO classes detected by YOLO are ignored.

## Common setup issues

- **`python` is not recognized:** Install Python 3.10 or newer and ensure it is
  available on your `PATH`.
- **PowerShell blocks activation:** Run `Set-ExecutionPolicy -Scope Process
  Bypass` for the current shell, then activate `.venv` again.
- **One or more packages are unimportable:** Ensure the virtual environment is
  active, then rerun `python -m pip install -r requirements.txt`.
- **Ultralytics installation fails:** Upgrade `pip` first. On constrained or
  offline systems, use a network-enabled environment to install its required
  runtime dependencies.
- **No video window appears:** Run without `--no-display` on a desktop session
  with OpenCV GUI support. Use `--no-display` on headless systems.
