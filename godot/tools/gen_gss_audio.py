#!/usr/bin/env python3
"""Generate short placeholder SFX tuned for the pump mini-game (mono 44.1kHz)."""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

RATE = 44_100
OUT = Path(__file__).resolve().parent.parent / "assets" / "audio"


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32_000)) for s in samples
        )
        w.writeframes(frames)


def envelope(t: float, attack: float, release: float, duration: float) -> float:
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def gen_pump_loop() -> list[float]:
    duration = 2.0
    n = int(duration * RATE)
    out: list[float] = []
    lp = 0.0
    for i in range(n):
        t = i / RATE
        white = random.uniform(-1, 1)
        lp = lp * 0.995 + white * 0.005
        rumble = math.sin(2 * math.pi * 38 * t) * 0.35 + lp * 0.55
        meter = (math.sin(2 * math.pi * 6.5 * t) * 0.5 + 0.5) ** 2
        click = math.sin(2 * math.pi * 880 * t) * 0.08 * meter
        s = (rumble + click) * 0.42
        out.append(s * envelope(t, 0.05, 0.08, duration))
    return out


def gen_stop() -> list[float]:
    duration = 0.22
    n = int(duration * RATE)
    out: list[float] = []
    for i in range(n):
        t = i / RATE
        s = math.sin(2 * math.pi * (320 - 180 * t) * t) * 0.55
        s += math.sin(2 * math.pi * 120 * t) * 0.25
        out.append(s * envelope(t, 0.002, 0.06, duration))
    return out


def gen_success() -> list[float]:
    freqs = [523.25, 659.25, 783.99]
    duration = 0.45
    n = int(duration * RATE)
    out: list[float] = []
    for i in range(n):
        t = i / RATE
        s = 0.0
        for j, f in enumerate(freqs):
            start = j * 0.07
            if t >= start:
                local = t - start
                s += math.sin(2 * math.pi * f * local) * math.exp(-local * 8) * 0.35
        out.append(s * envelope(t, 0.01, 0.12, duration))
    return out


def gen_fail() -> list[float]:
    duration = 0.35
    n = int(duration * RATE)
    out: list[float] = []
    for i in range(n):
        t = i / RATE
        f = 220 - 90 * t
        buzz = math.sin(2 * math.pi * f * t) * 0.45
        noise = random.uniform(-0.25, 0.25)
        out.append((buzz + noise) * envelope(t, 0.005, 0.14, duration))
    return out


def gen_tick() -> list[float]:
    duration = 0.06
    n = int(duration * RATE)
    out: list[float] = []
    for i in range(n):
        t = i / RATE
        s = math.sin(2 * math.pi * 1400 * t) * math.exp(-t * 60) * 0.4
        out.append(s * envelope(t, 0.001, 0.02, duration))
    return out


def gen_boom() -> list[float]:
    duration = 2.2
    n = int(duration * RATE)
    out: list[float] = []
    brown = 0.0
    lp = 0.0
    for i in range(n):
        t = i / RATE
        brown = max(-1.0, min(1.0, brown + random.uniform(-0.08, 0.08)))
        white = random.uniform(-1, 1)
        lp = lp * 0.9 + white * 0.1
        thump = math.sin(2 * math.pi * (70 * math.exp(-t * 3) + 28) * t) * math.exp(-t * 4.5)
        body = brown * math.exp(-t * 2.2)
        crack = lp * math.exp(-t * 18) * 1.4
        crackle = (random.random() < 0.004 * math.exp(-t * 1.5)) * random.uniform(-0.6, 0.6)
        out.append((thump * 0.85 + body * 0.9 + crack + crackle) * envelope(t, 0.002, 0.4, duration))
    return out


def main() -> None:
    write_wav(OUT / "pump_loop.wav", gen_pump_loop())
    write_wav(OUT / "stop.wav", gen_stop())
    write_wav(OUT / "success.wav", gen_success())
    write_wav(OUT / "fail.wav", gen_fail())
    write_wav(OUT / "tick.wav", gen_tick())
    write_wav(OUT / "boom.wav", gen_boom())
    print(f"Wrote SFX to {OUT}")


if __name__ == "__main__":
    main()