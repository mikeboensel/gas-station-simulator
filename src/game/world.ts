import Phaser from 'phaser';
import { C, FONT, HEIGHT, HEX, WIDTH, txt } from './theme';

export const HORIZON = 410;
export const GROUND = 612;
/** Where the hose plugs into the car, in world coordinates. */
export const FUEL_DOOR = { x: 742, y: 512 };

export interface World {
  storeSign: Phaser.GameObjects.Text;
  signGlow: Phaser.GameObjects.Image;
  price: Phaser.GameObjects.Text;
  /** Empty layers other modules fill, in draw order. */
  traffic: Phaser.GameObjects.Container;
  decals: Phaser.GameObjects.Container;
  carSlot: Phaser.GameObjects.Container;
  air: Phaser.GameObjects.Container;
}

export function buildWorld(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): World {
  const slot = () => {
    const c = scene.add.container(0, 0);
    layer.add(c);
    return c;
  };
  layer.add(scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(WIDTH, HORIZON));
  addStars(scene, layer);
  addSkyline(scene, layer);
  const traffic = slot();
  const { storeSign, signGlow } = addStore(scene, layer);
  layer.add(scene.add.image(0, HORIZON, 'ground').setOrigin(0).setDisplaySize(WIDTH, HEIGHT - HORIZON));
  addGroundDetail(scene, layer);
  const decals = slot();
  const price = addPriceSign(scene, layer);
  addIsland(scene, layer);
  const carSlot = slot();
  addCanopy(scene, layer);
  const air = slot();
  return { storeSign, signGlow, price, traffic, decals, carSlot, air };
}

function addStars(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  for (let i = 0; i < 60; i++) {
    const star = scene.add.image(Math.random() * WIDTH, 80 + Math.random() * 200, 'dot')
      .setScale(0.05 + Math.random() * 0.1)
      .setAlpha(0.3 + Math.random() * 0.5);
    layer.add(star);
    scene.tweens.add({
      targets: star,
      alpha: 0.1,
      duration: 800 + Math.random() * 2400,
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 2000,
    });
  }
}

function addSkyline(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  const g = scene.add.graphics();
  layer.add(g);
  let x = -20;
  while (x < WIDTH) {
    const w = 40 + Math.random() * 70;
    const h = 40 + Math.random() * 110;
    g.fillStyle(0x1d1430, 1);
    g.fillRect(x, HORIZON - h, w, h);
    g.fillStyle(0xffc46b, 0.5);
    for (let wy = HORIZON - h + 10; wy < HORIZON - 12; wy += 14) {
      for (let wx = x + 8; wx < x + w - 8; wx += 12) {
        if (Math.random() < 0.18) g.fillRect(wx, wy, 4, 6);
      }
    }
    x += w + 4;
  }
}

function addStore(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
  const g = scene.add.graphics();
  layer.add(g);
  g.fillStyle(0x17141f, 1);
  g.fillRect(880, 240, 400, HORIZON - 240);
  g.fillStyle(0x2a2233, 1);
  g.fillRect(880, 240, 400, 48);
  for (let i = 0; i < 4; i++) {
    const wx = 900 + i * 92;
    g.fillStyle(0xffd99a, 0.9);
    g.fillRect(wx, 304, 80, 96);
    g.fillStyle(0xb88a4a, 0.55);
    g.fillRect(wx + 6, 340, 68, 6);
    g.fillRect(wx + 6, 368, 68, 6);
  }
  const glow = scene.add.image(1080, 264, 'glow').setDisplaySize(460, 120)
    .setTint(C.neonPink).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
  const sign = txt(scene, 1080, 264, 'SUNDAI MART 24/7', {
    fontFamily: FONT.display, fontSize: '40px', color: HEX.pink,
    stroke: '#ffffff', strokeThickness: 1,
  }).setOrigin(0.5).setShadow(0, 0, HEX.pink, 18, false, true);
  layer.add([glow, sign]);
  return { storeSign: sign, signGlow: glow };
}

function addGroundDetail(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  const g = scene.add.graphics();
  layer.add(g);
  g.lineStyle(3, 0xf5e8b0, 0.18);
  for (const x of [-400, 200, 1000, 1700]) g.lineBetween(640 + (x - 640) * 0.25, HORIZON, x, HEIGHT);
  const puddles: [number, number, number, number][] = [[300, 660, 260, 26], [1000, 690, 340, 30]];
  for (const [x, y, w, h] of puddles) {
    layer.add(scene.add.image(x, y, 'glow').setDisplaySize(w, h).setTint(C.neonPink)
      .setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD));
  }
}

function addPriceSign(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): Phaser.GameObjects.Text {
  const g = scene.add.graphics();
  layer.add(g);
  g.fillStyle(0x2a2733, 1);
  g.fillRect(186, 290, 18, HORIZON - 270);
  g.fillStyle(0x15131c, 1);
  g.fillRoundedRect(110, 150, 170, 150, 10);
  g.fillStyle(C.neonPink, 1);
  g.fillRoundedRect(110, 150, 170, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.lineStyle(2, 0xffffff, 0.12);
  g.strokeRoundedRect(110, 150, 170, 150, 10);
  layer.add(txt(scene, 195, 167, 'SUNDAI', { fontFamily: FONT.display, fontSize: '26px', color: HEX.ink })
    .setOrigin(0.5));
  layer.add(txt(scene, 124, 200, 'REGULAR', { fontSize: '13px', fontStyle: '700', color: HEX.muted }));
  const price = txt(scene, 124, 218, '3.00', { fontFamily: FONT.lcd, fontSize: '50px', color: HEX.led })
    .setShadow(0, 0, HEX.led, 12, false, true);
  layer.add(price);
  layer.add(txt(scene, 240, 224, '9', { fontFamily: FONT.lcd, fontSize: '22px', color: HEX.led }));
  return price;
}

function addIsland(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  const g = scene.add.graphics();
  layer.add(g);
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(560, 618, 420, 40);
  g.fillStyle(0x8b8794, 1);
  g.fillRoundedRect(380, 586, 360, 18, 6);
  g.fillStyle(0x5a5663, 1);
  g.fillRect(384, 600, 352, 22);
  for (const bx of [404, 716]) {
    g.fillStyle(0xffc43d, 1);
    g.fillRoundedRect(bx - 9, 520, 18, 72, 6);
    g.fillStyle(0x1a1a1a, 1);
    for (let y = 532; y < 590; y += 18) g.fillRect(bx - 9, y, 18, 8);
  }
}

function addCanopy(scene: Phaser.Scene, layer: Phaser.GameObjects.Container): void {
  for (const x of [280, 640, 1000]) {
    layer.add(scene.add.image(x, 80, 'beam').setOrigin(0.5, 0).setDisplaySize(520, 560)
      .setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD));
  }
  const g = scene.add.graphics();
  layer.add(g);
  g.fillStyle(C.canopy, 1);
  g.fillRect(0, 0, WIDTH, 64);
  g.fillStyle(0xf2efe8, 1);
  g.fillRect(0, 56, WIDTH, 18);
  g.fillStyle(C.neonGreen, 1);
  g.fillRect(0, 74, WIDTH, 4);
  for (const x of [280, 640, 1000]) {
    g.fillStyle(C.canopyLight, 1);
    g.fillRoundedRect(x - 60, 78, 120, 8, 3);
  }
  layer.add(scene.add.image(WIDTH / 2, 76, 'glow').setDisplaySize(WIDTH * 1.4, 40)
    .setTint(C.neonGreen).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
}
