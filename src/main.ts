import Phaser from 'phaser';
import { PumpScene } from './game/PumpScene';
import { FONT, HEIGHT, WIDTH } from './game/theme';
import './style.css';

async function boot(): Promise<void> {
  // Phaser rasterizes text once, so web fonts must be ready before the scene builds.
  await Promise.allSettled([
    document.fonts.load(`40px ${FONT.display}`),
    document.fonts.load(`40px ${FONT.lcd}`),
    document.fonts.load(`700 16px ${FONT.body}`),
    document.fonts.load(`800 16px ${FONT.body}`),
  ]);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#0b0b14',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PumpScene],
  });
  if (import.meta.env.DEV) Object.assign(window, { game });
}

void boot();
