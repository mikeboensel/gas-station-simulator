import Phaser from 'phaser';
import { GSS } from './theme';

export function drawForecourt(scene: Phaser.Scene, width: number, height: number): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillGradientStyle(GSS.skyTop, GSS.skyTop, GSS.skyLow, GSS.skyMid, 1);
  g.fillRect(0, 0, width, height * 0.58);
  g.fillStyle(GSS.asphalt, 1);
  g.fillRect(0, height * 0.58, width, height * 0.14);
  g.fillStyle(GSS.asphaltDark, 1);
  g.fillRect(0, height * 0.72, width, height * 0.28);

  drawCloud(scene, width * 0.12, height * 0.1, 140, 0.55);
  drawCloud(scene, width * 0.55, height * 0.16, 200, 0.4);
  drawCloud(scene, width * 0.78, height * 0.08, 110, 0.45);

  const canopyY = height * 0.26;
  scene.add
    .rectangle(width / 2, canopyY, width * 0.92, 40, GSS.primary)
    .setDepth(1);
  scene.add
    .rectangle(width / 2, canopyY - 16, width * 0.92, 10, GSS.accent)
    .setDepth(2);
  scene.add.rectangle(width / 2 - width * 0.32, canopyY + 70, 10, 130, GSS.beige).setDepth(1);
  scene.add.rectangle(width / 2 + width * 0.32, canopyY + 70, 10, 130, GSS.beige).setDepth(1);

  scene.add
    .rectangle(width / 2, height * 0.46, 176, 56, GSS.cream, 0.45)
    .setDepth(1);

  drawCar(scene, width, width * 0.15, height * 0.9, GSS.secondary);
  drawCar(scene, width, width * 0.78, height * 0.84, GSS.primary, 0.85);

  scene.add.rectangle(width / 2, height * 0.76, width, 8, 0xffffff, 0.65).setDepth(1);
  for (let i = 0; i < 5; i++) {
    scene.add
      .ellipse(width * (0.12 + i * 0.19), height * 0.93, 64, 8, GSS.accent)
      .setDepth(1);
  }
}

function drawCloud(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  alpha: number,
): void {
  const c = scene.add.container(x, y).setDepth(1).setAlpha(alpha);
  c.add(scene.add.ellipse(0, 0, w, 48, 0xffffff));
  c.add(scene.add.ellipse(-w * 0.22, -12, w * 0.45, 56, 0xffffff));
  c.add(scene.add.ellipse(w * 0.24, -8, w * 0.38, 44, 0xffffff));
}

function drawCar(
  scene: Phaser.Scene,
  worldWidth: number,
  x: number,
  y: number,
  color: number,
  scale = 1,
): void {
  const car = scene.add.container(x, y).setDepth(2).setScale(scale);
  car.add(scene.add.rectangle(0, 0, 96, 32, color));
  car.add(scene.add.rectangle(-8, -18, 48, 20, GSS.cream));
  car.add(scene.add.circle(-28, 14, 8, GSS.ink));
  car.add(scene.add.circle(28, 14, 8, GSS.ink));
  scene.tweens.add({
    targets: car,
    x: worldWidth * 1.05,
    duration: 12000,
    repeat: -1,
    onRepeat: () => {
      car.x = -worldWidth * 0.1;
    },
  });
}