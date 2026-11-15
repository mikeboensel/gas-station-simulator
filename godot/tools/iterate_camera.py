#!/usr/bin/env python3
"""Run Godot offscreen captures for camera preset candidates."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAMERA_GD = ROOT / "scripts/world/player_camera.gd"
CAPTURE_DIR = ROOT / ".capture/iter"
GODOT = Path("/Applications/Godot.app/Contents/MacOS/Godot")
MANIFEST = CAPTURE_DIR / "manifest.json"

# eye (x,y,z) and look (x,y,z) in world space — facing pump display (+Z), from car side (-Z)
PRESETS: list[dict[str, object]] = [
    {"name": "lane_pullback", "eye": [0.15, 1.72, -3.65], "look": [0.0, 1.45, 1.2]},
    {"name": "lane_wide", "eye": [0.2, 1.78, -4.35], "look": [0.0, 1.38, 1.1]},
    {"name": "lane_mid", "eye": [0.25, 1.66, -3.1], "look": [0.0, 1.5, 1.32]},
    {"name": "lane_left", "eye": [-1.0, 1.66, -3.2], "look": [0.08, 1.48, 1.25]},
    {"name": "lane_seated", "eye": [0.35, 1.48, -2.6], "look": [0.0, 1.52, 1.35]},
]


def patch_camera(eye: list[float], look: list[float]) -> str:
    text = CAMERA_GD.read_text()
    text = re.sub(
        r"@export var driver_eye := Vector3\([^)]+\)",
        f"@export var driver_eye := Vector3({eye[0]}, {eye[1]}, {eye[2]})",
        text,
        count=1,
    )
    text = re.sub(
        r"@export var driver_look := Vector3\([^)]+\)",
        f"@export var driver_look := Vector3({look[0]}, {look[1]}, {look[2]})",
        text,
        count=1,
    )
    return text


def capture(preset: dict[str, object]) -> Path:
    name = str(preset["name"])
    eye = preset["eye"]
    look = preset["look"]
    assert isinstance(eye, list) and isinstance(look, list)
    CAMERA_GD.write_text(patch_camera(eye, look))
    out = CAPTURE_DIR / f"{name}.png"
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(GODOT),
        "--path",
        str(ROOT),
        "--resolution",
        "1280x720",
        "res://scenes/main.tscn",
        "--",
        "--capture-frame",
        f"res://.capture/iter/{name}.png",
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    return out


def main() -> int:
    results: list[dict[str, object]] = []
    original = CAMERA_GD.read_text()
    try:
        for preset in PRESETS:
            png = capture(preset)
            results.append({"name": preset["name"], "png": str(png), "preset": preset})
            print(f"captured {preset['name']} -> {png}")
    finally:
        pass
    MANIFEST.write_text(json.dumps(results, indent=2))
    print(f"wrote {MANIFEST}")
    print("Review PNGs under", CAPTURE_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())