import Phaser from 'phaser';
import { GSS } from './theme';

/** Frosted scene-panel shell matching gasstationsimulator.com */
export function scenePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  depth = 12,
): Phaser.GameObjects.Graphics {
  const shadow = scene.add.graphics().setDepth(depth - 1);
  shadow.fillStyle(GSS.ink, 0.12);
  shadow.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 8);

  const panel = scene.add.graphics().setDepth(depth);
  panel.fillStyle(GSS.cream, 0.92);
  panel.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  panel.lineStyle(1, GSS.ink, 0.1);
  panel.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  return panel;
}

export function dashedInset(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  w: number,
  h: number,
): void {
  const inset = scene.add.rectangle(0, y, w, h, 0xfffdf4);
  inset.setStrokeStyle(1, 0xa3a3a3, 0.65);
  parent.add(inset);
}

export function pumpCabinetBody(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  w: number,
  h: number,
): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(GSS.pumpCabinetLight, GSS.pumpCabinetLight, GSS.pumpCabinetDark, GSS.pumpCabinetDark, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.lineStyle(1, GSS.ink, 0.2);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  parent.add(g);
}

export function meterScreenBg(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  w: number,
  h: number,
): void {
  const g = scene.add.graphics();
  g.fillStyle(0x050505, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.lineStyle(1, 0xffffff, 0.08);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  parent.add(g);
}