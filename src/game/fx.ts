import Phaser from 'phaser';
import { C, FONT, HEIGHT, WIDTH, txt } from './theme';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

const CONFETTI_TINTS = [C.green, C.amber, C.neonPink, 0x5d9bff, 0xffffff];

export class Fx {
  private readonly fire: Emitter;
  private readonly smoke: Emitter;
  private readonly sparks: Emitter;
  private readonly debris: Emitter;
  private readonly confettiEmitter: Emitter;
  private readonly spill: Emitter;
  private readonly smolder: Emitter;
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private readonly world: Phaser.GameObjects.Container;
  private readonly decals: Phaser.GameObjects.Container;
  private readonly ui: Phaser.GameObjects.Container;
  private calloutText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    world: Phaser.GameObjects.Container,
    ui: Phaser.GameObjects.Container,
    decals: Phaser.GameObjects.Container,
  ) {
    this.scene = scene;
    this.world = world;
    this.decals = decals;
    const add = (key: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = scene.add.particles(0, 0, key, { emitting: false, ...config });
      world.add(e);
      return e;
    };
    this.smoke = add('smoke', {
      lifespan: { min: 1400, max: 2600 }, speed: { min: 30, max: 140 }, angle: { min: 200, max: 340 },
      scale: { start: 1.2, end: 4.5 }, alpha: { start: 0.55, end: 0 }, tint: 0x2a2228, gravityY: -60,
    });
    this.fire = add('smoke', {
      lifespan: { min: 450, max: 1000 }, speed: { min: 60, max: 380 }, scale: { start: 1.6, end: 0.4 },
      alpha: { start: 0.95, end: 0 }, color: [0xffe9a8, 0xffa230, 0xff4a14, 0x5a1006], colorEase: 'Quad.easeOut',
      gravityY: -160,
    });
    this.sparks = add('dot', {
      lifespan: { min: 500, max: 1200 }, speed: { min: 300, max: 900 }, scale: { start: 0.35, end: 0 },
      tint: [0xffe08a, 0xffffff, 0xffa040], blendMode: Phaser.BlendModes.ADD, gravityY: 900,
    });
    this.debris = add('confetti', {
      lifespan: 1600, speed: { min: 200, max: 650 }, angle: { min: 200, max: 340 }, scale: { min: 0.8, max: 2 },
      rotate: { min: 0, max: 720 }, tint: [0x1c1c22, 0x3a3a44, 0x55505c], gravityY: 1300,
    });
    this.smolder = add('smoke', {
      lifespan: 2400, speed: { min: 20, max: 60 }, angle: { min: 250, max: 290 }, scale: { start: 0.8, end: 3 },
      alpha: { start: 0.45, end: 0 }, tint: 0x1e1a20, gravityY: -40, frequency: 120,
    });
    this.confettiEmitter = scene.add.particles(0, 0, 'confetti', {
      emitting: false, lifespan: 3200, speed: { min: 700, max: 1250 }, angle: { min: 225, max: 315 },
      scale: { min: 0.8, max: 1.5 }, rotate: { min: 0, max: 1080 }, tint: CONFETTI_TINTS, gravityY: 600,
    });
    ui.add(this.confettiEmitter);
    this.ui = ui;
    this.spill = add('dot', {
      lifespan: 700, speed: { min: 40, max: 160 }, angle: { min: 60, max: 120 }, scale: { start: 0.35, end: 0.15 },
      tint: [0xffc65a, 0xff9d2e], gravityY: 900, frequency: 30, quantity: 2,
    });
    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(WIDTH, HEIGHT).setAlpha(0);
    ui.add(this.vignette);
  }

  /** Red heartbeat vignette as the sale closes in; green while inside the perfect zone. */
  setTension(t: number, perfectZone: boolean, time: number): void {
    const beat = 0.5 + 0.5 * Math.sin(time / (perfectZone ? 90 : 160 - t * 60));
    this.vignette.setTint(perfectZone ? C.green : C.red);
    this.vignette.setAlpha(perfectZone ? 0.35 + beat * 0.2 : t * t * (0.25 + beat * 0.2));
  }

  setSpilling(on: boolean, x: number, y: number): void {
    this.spill.setPosition(x, y);
    if (on && !this.spill.emitting) this.spill.start();
    if (!on && this.spill.emitting) this.spill.stop();
  }

  explode(x: number, y: number, power: number): void {
    const s = this.scene;
    const blast = (bx: number, by: number, p: number) => {
      this.fire.explode(Math.round(40 * p), bx, by);
      this.sparks.explode(Math.round(50 * p), bx, by);
      this.smoke.explode(Math.round(14 * p), bx, by);
      const flash = s.add.image(bx, by, 'glow').setTint(0xff9a3c).setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(80, 80).setAlpha(0.8);
      this.world.add(flash);
      s.tweens.add({
        targets: flash, displayWidth: 520 * p, displayHeight: 520 * p, alpha: 0, duration: 520,
        ease: 'Expo.easeOut', onComplete: () => flash.destroy(),
      });
    };
    blast(x, y, power);
    this.debris.explode(Math.round(30 * power), x, y);
    this.shockwave(x, y, power);
    this.scorch(x, 612);
    for (let i = 1; i <= 2 + Math.round(power); i++) {
      s.time.delayedCall(180 * i + Math.random() * 120, () =>
        blast(x + Phaser.Math.Between(-160, 160), y + Phaser.Math.Between(-80, 60), 0.5 + Math.random() * 0.4));
    }
    s.cameras.main.shake(700, 0.018 * power);
    s.cameras.main.flash(260, 255, 210, 140);
  }

  /** Two cannons from the bottom corners; rains over everything, including the results card. */
  confetti(count = 140): void {
    this.ui.bringToTop(this.confettiEmitter);
    const e = this.confettiEmitter;
    e.setEmitterAngle({ min: 285, max: 315 }).explode(count / 2, 0, HEIGHT);
    e.setEmitterAngle({ min: 225, max: 255 }).explode(count / 2, WIDTH, HEIGHT);
  }

  setSmoldering(on: boolean, x = 0, y = 0): void {
    this.smolder.setPosition(x, y);
    if (on) this.smolder.start();
    else this.smolder.stop();
  }

  /** One reusable shout above the pump; a new one replaces the old. */
  callout(label: string, color: string, size = 40): void {
    this.calloutText?.destroy();
    const t = txt(this.scene, 560, 100, label, {
      fontFamily: FONT.display, fontSize: `${size}px`, color, stroke: '#0b0b14', strokeThickness: 7,
    }).setOrigin(0.5).setScale(0.3);
    this.calloutText = t;
    this.world.add(t);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 240, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t, y: 70, alpha: 0, delay: 650, duration: 450, ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  private shockwave(x: number, y: number, power: number): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(6, 0xffd9a0, 0.8);
    ring.strokeCircle(0, 0, 40);
    ring.setPosition(x, y).setBlendMode(Phaser.BlendModes.ADD);
    this.world.add(ring);
    this.scene.tweens.add({
      targets: ring, scale: 5 * power, alpha: 0, duration: 600, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private scorch(x: number, y: number): void {
    const mark = this.scene.add.image(x, y, 'smoke').setTint(0x000000).setDisplaySize(380, 50).setAlpha(0);
    this.decals.add(mark);
    this.scene.tweens.add({ targets: mark, alpha: 0.8, duration: 300 });
    this.scene.tweens.add({ targets: mark, alpha: 0, delay: 4000, duration: 1500, onComplete: () => mark.destroy() });
  }
}
