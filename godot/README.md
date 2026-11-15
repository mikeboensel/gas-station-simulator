# Gas Station Simulator — Godot 4 (3D)

3D version of the pump challenge: orbit the forecourt, hold the nozzle (or **Space**), release to stop. Same scoring as the Phaser POC and [gasstationsimulator.com](https://gasstationsimulator.com).

## Open the project

1. Install [Godot 4.3+](https://godotengine.org/download) (Standard build, **Forward+**).
2. **Import** → select `gas-station-simulator/godot/project.godot`.
3. Press **F5** to run.

### Controls

| Input | Action |
|--------|--------|
| **LMB** on nozzle / hold **Space** | Pump |
| **Release** | Stop (with latency) |
| **R** / **Enter** | New target after a round |
| **M** | Toggle mute |
| **RMB drag** | Orbit camera |
| **Scroll** | Zoom |

Regenerate placeholder SFX: `python3 tools/gen_gss_audio.py` (writes `assets/audio/*.wav`).

Camera iteration (no editor): `python3 tools/iterate_camera.py` → writes `res://.capture/iter/*.png` via `--capture-frame`. Default rig is **driver POV**; press **Tab** for free orbit (RMB + scroll).

FX capture mid-round: `Godot --path . -- --capture-frame res://.capture/x.png --with-ui --target 12 --pump-to 12.7` (add `--release` to capture the result card).

## Project layout

```
godot/
  scenes/main.tscn          # Entry: lighting, forecourt, pump, HUD
  scenes/world/forecourt.tscn
  scenes/pump/fuel_pump.tscn   # Placeholder mesh + SubViewport LCD
  scenes/ui/game_hud.tscn
  scripts/autoload/game_state.gd  # Flow, targets, scoring
  assets/                   # Drop GLB/HDRI here (see assets/README.md)
```

## Replace placeholders with high-quality assets

Current meshes are **greybox boxes**. Swap without changing game logic:

| Piece | Drop in | Hookup |
|--------|---------|--------|
| Pump | `assets/models/pump.glb` | Reparent under `Forecourt/PumpAnchor`; keep `fuel_pump.gd` on root |
| Canopy / store | `assets/models/station_*.glb` | Instance in `forecourt.tscn` |
| Car | `assets/models/vehicle.glb` | Place at `CarAnchor` |
| Ground | `assets/textures/asphalt_*` | Albedo + ORM on `Ground` mesh |
| Sky | `assets/hdri/forecourt.hdr` | WorldEnvironment → PanoramaSky |

See **`assets/README.md`** for sourcing (Poly Haven, ambientCG, Sketchfab, Fab) and import settings.

## Recommended quality bar

- **Renderer:** Forward+ (desktop); Mobile branch later if needed.
- **Scale:** 1 Godot unit ≈ 1 meter; pump ~0.9 m wide.
- **LCD:** Keep `SubViewport` on the pump mesh (works with custom GLB once you align a `Marker3D` for screen size).
- **Audio:** Add `AudioStreamPlayer3D` on pump for loop + stop click (not wired yet).
- **Juice:** Tween nozzle wobble, hose shader, confetti `GPUParticles3D` on perfect stop.

## Phaser POC

The web prototype lives in `../` (Vite + Phaser). Logic parity is in `game_state.gd` vs `src/game/pumpModel.ts`.

## Next implementation steps

1. Import hero pump GLB + auto `MeshInstance3D` collider from mesh.
2. HDRI + baked or real-time canopy lights.
3. First-person or fixed “driver window” camera preset for mobile.
4. Export presets: macOS / Windows / Web (GDExtension optional).