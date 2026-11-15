# 3D asset pipeline

## Folder convention

```
assets/
  models/          # .glb / .gltf (pump, canopy, car, props)
  textures/        # albedo, normal, ORM (ambientCG naming)
  hdri/            # .hdr / .exr skies
  audio/           # pump loop, handle click, UI
  fonts/           # Inter for UI parity with the site
```

Godot import defaults: **GLB** → root type `Node3D`, snap to floor, generate colliders only on static environment (not nozzle).

## Sourcing (commercial-friendly)

| Need | Where to look | Notes |
|------|----------------|-------|
| Fuel pump | [Sketchfab](https://sketchfab.com) (CC), [Fab](https://fab.com) | Search “gas pump dispenser PBR” |
| Forecourt / canopy | Kitbash kits, “gas station” packs on Fab | Modular pieces preferred |
| Asphalt / concrete | [ambientCG](https://ambientcg.com) | Free PBR, 2K–4K |
| Sky / sunset | [Poly Haven](https://polyhaven.com/hdris) | e.g. `sunset`, `parking` |
| Car (static) | Kenney / Sketchfab low-poly sedan | Scale to ~4.5 m length |

Always keep license metadata in `assets/CREDITS.md` when you add files.

## Import checklist (Godot)

1. **Pump GLB:** `materials/extract` if you need to tweak LED emissive in place.
2. **Screen:** If the model has a mesh named `Screen` / `Display`, assign ViewportTexture in `fuel_pump.gd` instead of placeholder `ScreenQuad`.
3. **Nozzle interact:** Move `NozzleArea` `CollisionShape3D` to match handle mesh (or use `Area3D` child on imported bone).
4. **Textures:** Enable **Mipmaps** + **Compress** (VRAM compression for desktop).
5. **HDRI:** Environment → Sky → Panorama → set Sun DirectionalLight3D to match HDRI sun.

## Target look

Match the **gasstationsimulator.com** palette: red `#d92d20`, green `#087f5b`, yellow `#f6c343`, cream UI. Pump body neutral beige; LED `#52ff9d` on LCD SubViewport or emissive material.

## Blender handoff (optional)

Single `.blend` per station with collections: `Pump`, `Canopy`, `Collision`, `Nav`. Export GLB with **+Y up**, apply transforms, no animation unless hose rig is needed later.