# Gas Station Simulator

**Godot 4 (3D)** — `godot/` — forecourt, pump LCD, HUD ([setup](godot/README.md)).

**Phaser (2D POC)** — this folder root — quick browser prototype below.

---

# Phaser prototype

Stop the pump on a random **even dollar** target without going over.

## Run

```bash
cd gas-station-simulator
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Controls

- **Hold** space, mouse, or touch on the green trigger — fuel flows.
- **Release** to stop (short latency simulates hose inertia).
- **R** or **Enter** after a round — next random target.

## Scoring

- Going **over** the target = 0 for the round.
- Under target: points decrease with how many cents you left on the table.
- Nail it (within half a cent) for a perfect message and max round score.

## Tuning

Edit `src/game/pumpModel.ts` — `DEFAULT_PUMP_CONFIG` (`pricePerGallon`, `flowGallonsPerSec`, `stopLatencySec`).