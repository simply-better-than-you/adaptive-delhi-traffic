# Computer Vision Module

## Purpose

This module is the future perception layer for Adaptive Delhi Traffic. Its
planned pipeline is vehicle detection, tracking, approach assignment, and
traffic measurements for a downstream traffic controller. Milestone 0 creates
only the package layout and environment check; it does not load a YOLO model or
process video.

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
