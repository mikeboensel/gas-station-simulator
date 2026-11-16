import Phaser from 'phaser';
import type { Sfx } from './sfx';
import { C, WIDTH } from './theme';
import { HORIZON, type World } from './world';

const LIGHTS = [280, 640, 1000];
const MOTHS_PER_LIGHT = 3;
const TRAFFIC_COLORS = [0x2a2438, 0x3a2f4a, 0x1f2a3a, 0x40283a];

interface Moth {
  img: Phaser.GameObjects.Image;
  cx: number;
  seed: number;
}

/** Background life: traffic, moths, a flickering neon sign, and clickable props. */
export class Ambient {
  private readonly moths: Moth[] = [];
  private readonly scene: Phaser.Scene;
  private readonly world: World;
  private readonly sfx: Sfx;
  private rolling = false;

  constructor(scene: Phaser.Scene, world: World, sfx: Sfx) {
    this.scene = scene;
    this.world = world;
    this.sfx = sfx;
    for (const cx of LIGHTS) {
      for (let i = 0; i < MOTHS_PER_LIGHT; i++) {
        const img = scene.add.image(cx, 100, 'dot').setScale(0.18).setTint(0xfff1c4).setAlpha(0.8);
        world.air.add(img);
        this.moths.push({ img, cx, seed: Math.random() * 1000 });
      }
    }
    this.scheduleTraffic();
    scene.time.addEvent({ delay: 2600, loop: true, callback: () => Math.random() < 0.5 && this.flicker(2) });
    this.clickZone(1080, 264, 380, 64, () => this.buzzSign());
    this.clickZone(195, 225, 170, 150, () => this.rollPrice());
  }

  update(time: number): void {
    for (const m of this.moths) {
      const t = time / 1000 + m.seed;
      m.img.setPosition(
        m.cx + Math.sin(t * 2.3) * 70 + Math.sin(t * 7.1) * 12,
        104 + Math.sin(t * 3.1) * 18 + Math.cos(t * 9.3) * 6,
      );
    }
  }

  private clickZone(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const zone = this.scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.sfx.unlock();
      onClick();
    });
    this.world.air.add(zone);
  }

  private buzzSign(): void {
    this.sfx.buzz();
    this.flicker(5);
    this.scene.tweens.add({ targets: this.world.storeSign, angle: { from: -3, to: 0 }, duration: 400, ease: 'Elastic.easeOut' });
  }

  private flicker(times: number): void {
    const { storeSign, signGlow } = this.world;
    this.scene.tweens.add({
      targets: [storeSign, signGlow], alpha: 0.2, duration: 45, yoyo: true, repeat: times,
      onComplete: () => {
        storeSign.setAlpha(1);
        signGlow.setAlpha(0.45);
      },
    });
  }

  /** Slot-machine roll of the price digits, always settling back on 3.00. */
  private rollPrice(): void {
    if (this.rolling) return;
    this.rolling = true;
    const price = this.world.price;
    let ticks = 0;
    this.scene.time.addEvent({
      delay: 50, repeat: 14,
      callback: () => {
        ticks += 1;
        const done = ticks === 15;
        price.setText(done ? '3.00' : `${Phaser.Math.Between(0, 9)}.${Phaser.Math.Between(10, 99)}`);
        this.sfx.tick(done ? 1 : ticks / 15);
        if (!done) return;
        this.rolling = false;
        this.scene.tweens.add({ targets: price, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.easeOut' });
      },
    });
  }

  private scheduleTraffic(): void {
    this.scene.time.delayedCall(Phaser.Math.Between(1200, 4200), () => {
      this.spawnTraffic();
      this.scheduleTraffic();
    });
  }

  private spawnTraffic(): void {
    const leftToRight = Math.random() < 0.5;
    const y = HORIZON - 6 - Math.random() * 4;
    const car = this.scene.add.container(leftToRight ? -80 : WIDTH + 80, y);
    const body = this.scene.add.graphics();
    body.fillStyle(Phaser.Utils.Array.GetRandom(TRAFFIC_COLORS), 1);
    body.fillRoundedRect(-28, -10, 56, 12, 4);
    body.fillRoundedRect(-16, -18, 30, 10, 4);
    const front = leftToRight ? 30 : -30;
    const head = this.scene.add.image(front, -4, 'glow').setDisplaySize(40, 14)
      .setTint(0xfff2c0).setBlendMode(Phaser.BlendModes.ADD);
    const tail = this.scene.add.image(-front, -4, 'glow').setDisplaySize(16, 10)
      .setTint(C.red).setBlendMode(Phaser.BlendModes.ADD);
    car.add([body, head, tail]);
    this.world.traffic.add(car);
    this.scene.tweens.add({
      targets: car, x: leftToRight ? WIDTH + 80 : -80, duration: Phaser.Math.Between(4500, 8000),
      onComplete: () => car.destroy(),
    });
  }
}
