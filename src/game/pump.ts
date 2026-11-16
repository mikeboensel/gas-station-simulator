import Phaser from 'phaser';
import { C, FONT, HEX, money, txt } from './theme';
import { FUEL_DOOR } from './world';
import type { PumpModel } from './model';

export type TriggerState = 'idle' | 'pumping' | 'stopping' | 'locked';

const X = 440;
const W = 240;
const CX = X + W / 2;
const GAUGE_X = 470;
const GAUGE_W = 180;
const FINE_SPAN = 1;
const FLOW_DOTS = 7;

export class PumpView {
  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly lcdFlash: Phaser.GameObjects.Rectangle;
  private readonly sale: Phaser.GameObjects.Text;
  private readonly gallons: Phaser.GameObjects.Text;
  private readonly target: Phaser.GameObjects.Text;
  private readonly gauges: Phaser.GameObjects.Graphics;
  private readonly trigger: Phaser.GameObjects.Graphics;
  private readonly triggerGlow: Phaser.GameObjects.Image;
  private readonly triggerLabel: Phaser.GameObjects.Text;
  private readonly hose: Phaser.Curves.CubicBezier;
  private readonly dots: Phaser.GameObjects.Image[] = [];
  private flowPhase = 0;
  private readonly scene: Phaser.Scene;
  private readonly hoseGfx: Phaser.GameObjects.Graphics;
  /** 0 = nozzle in its holster, 1 = plugged into the car. Tweened. */
  plugged = 0;
  private drawnPlug = -1;
  private hover = false;
  private state: TriggerState = 'idle';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    layer.add(this.root);
    this.hose = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(X + W + 4, 330),
      new Phaser.Math.Vector2(X + W + 70, 360),
      new Phaser.Math.Vector2(),
      new Phaser.Math.Vector2(),
    );
    this.hoseGfx = scene.add.graphics();
    this.root.add(this.hoseGfx);
    this.drawHose();
    this.body = scene.add.container(0, 0);
    this.root.add(this.body);
    this.drawCabinet();
    this.lcdFlash = scene.add.rectangle(CX, 262, 208, 150, 0xffffff, 0);
    this.sale = txt(scene, X + W - 26, 202, '$0.00', {
      fontFamily: FONT.lcd, fontSize: '58px', color: HEX.led,
    }).setOrigin(1, 0).setShadow(0, 0, HEX.led, 14, false, true);
    this.gallons = txt(scene, X + W - 26, 270, '0.000', { fontFamily: FONT.lcd, fontSize: '24px', color: HEX.led })
      .setOrigin(1, 0);
    this.target = txt(scene, X + W - 26, 302, '$0.00', { fontFamily: FONT.lcd, fontSize: '24px', color: HEX.amber })
      .setOrigin(1, 0).setShadow(0, 0, HEX.amber, 10, false, true);
    this.gauges = scene.add.graphics();
    this.triggerGlow = scene.add.image(CX, 500, 'glow').setDisplaySize(220, 220)
      .setTint(C.green).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.trigger = scene.add.graphics();
    this.triggerLabel = txt(scene, CX, 500, 'HOLD', {
      fontFamily: FONT.display, fontSize: '30px', color: HEX.ink,
    }).setOrigin(0.5);
    this.body.add([
      this.lcdFlash, this.sale, this.gallons, this.target, this.gauges,
      this.triggerGlow, this.trigger, this.triggerLabel,
    ]);
    for (let i = 0; i < FLOW_DOTS; i++) {
      const dot = scene.add.image(0, 0, 'dot').setTint(0xffc65a).setScale(0.45)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.dots.push(dot);
      this.root.add(dot);
    }
    const hit = scene.add.zone(CX, 500, 120, 120).setInteractive({ useHandCursor: true }).setData('pump', true);
    hit.on('pointerover', () => this.setHover(true));
    hit.on('pointerout', () => this.setHover(false));
    this.body.add(hit);
    this.setTrigger('idle');
  }

  /** Swings the nozzle between holster and car. */
  plug(on: boolean, duration = 500): void {
    this.scene.tweens.add({ targets: this, plugged: on ? 1 : 0, duration, ease: on ? 'Back.easeOut' : 'Quad.easeIn' });
  }

  private setHover(on: boolean): void {
    this.hover = on;
    const scale = on && this.state === 'idle' ? 1.08 : 1;
    this.scene.tweens.add({ targets: [this.trigger, this.triggerLabel], scale, duration: 120, ease: 'Back.easeOut' });
  }

  render(model: PumpModel): void {
    this.sale.setText(money(model.shownDollars()));
    this.gallons.setText(model.gallons.toFixed(3));
    this.target.setText(money(model.target));
    const over = model.isOver();
    this.sale.setColor(over ? HEX.red : HEX.led);
    this.sale.setShadow(0, 0, over ? HEX.red : HEX.led, 14, false, true);
    this.drawGauges(model);
  }

  setTrigger(state: TriggerState): void {
    this.state = state;
    if (state !== 'idle' && this.hover) this.setHover(true);
    const fill = { idle: C.green, pumping: C.amber, stopping: 0x8a8a96, locked: 0x55555f }[state];
    const label = { idle: 'HOLD', pumping: 'RELEASE', stopping: '…', locked: 'DONE' }[state];
    this.trigger.clear();
    this.trigger.fillStyle(0x000000, 0.35);
    this.trigger.fillCircle(CX, 506, 52);
    this.trigger.fillStyle(0x2a2a33, 1);
    this.trigger.fillCircle(CX, 500, 54);
    this.trigger.fillStyle(fill, 1);
    this.trigger.fillCircle(CX, state === 'pumping' ? 502 : 498, 44);
    this.trigger.fillStyle(0xffffff, 0.25);
    this.trigger.fillEllipse(CX, 482, 52, 18);
    this.triggerLabel.setText(label).setY(state === 'pumping' ? 502 : 498);
    this.triggerGlow.setTint(fill).setAlpha(state === 'idle' ? 0.35 : state === 'pumping' ? 0.6 : 0);
  }

  flashLcd(color: number, strength = 0.35): void {
    this.lcdFlash.setFillStyle(color, strength);
    this.scene.tweens.add({ targets: this.lcdFlash, fillAlpha: 0, duration: 260, ease: 'Quad.easeOut' });
  }

  punchSale(): void {
    this.scene.tweens.add({ targets: this.sale, scale: { from: 1.12, to: 1 }, duration: 180, ease: 'Back.easeOut' });
  }

  update(time: number, dt: number, flowing: boolean, tension: number, idlePulse: boolean): void {
    const amp = flowing ? 0.5 + tension * 1.6 : 0;
    this.body.setPosition((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    if (idlePulse) this.triggerGlow.setAlpha((this.hover ? 0.5 : 0.25) + 0.2 * Math.sin(time / 260));
    if (this.plugged !== this.drawnPlug) this.drawHose();
    this.flowPhase = (this.flowPhase + dt * (flowing ? 1.4 : 0)) % 1;
    this.dots.forEach((dot, i) => {
      dot.setVisible(flowing);
      if (!flowing) return;
      const p = this.hose.getPoint((this.flowPhase + i / FLOW_DOTS) % 1);
      dot.setPosition(p.x, p.y);
    });
  }

  private drawGauges(model: PumpModel): void {
    const g = this.gauges;
    g.clear();
    const coarseMax = model.target * 1.1;
    this.gauge(g, 356, Math.min(1, model.dollars / coarseMax), model.target / coarseMax, 0, model.isOver());
    const fineStart = model.target - FINE_SPAN;
    const fineMax = FINE_SPAN * 1.1;
    const fine = Phaser.Math.Clamp((model.dollars - fineStart) / fineMax, 0, 1);
    const zoneWidth = 0.05 / fineMax;
    this.gauge(g, 392, fine, FINE_SPAN / fineMax, zoneWidth, model.isOver(), model.inPerfectZone());
  }

  private gauge(
    g: Phaser.GameObjects.Graphics,
    y: number,
    fill: number,
    mark: number,
    zone: number,
    over: boolean,
    hot = false,
  ): void {
    g.fillStyle(0x0b0b10, 1);
    g.fillRoundedRect(GAUGE_X, y, GAUGE_W, 18, 5);
    if (zone > 0) {
      g.fillStyle(C.green, hot ? 0.9 : 0.35);
      g.fillRect(GAUGE_X + (mark - zone) * GAUGE_W, y + 2, zone * GAUGE_W, 14);
    }
    const color = over ? C.red : fill > mark - 0.12 ? C.amber : C.green;
    if (fill > 0) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(GAUGE_X + 2, y + 3, Math.max(4, fill * GAUGE_W - 4), 12, 4);
    }
    g.fillStyle(0xffffff, 1);
    g.fillRect(GAUGE_X + mark * GAUGE_W - 1, y - 3, 3, 24);
  }

  private drawHose(): void {
    const p = this.plugged;
    this.drawnPlug = p;
    const lerp = Phaser.Math.Linear;
    const lift = Math.sin(Math.PI * Phaser.Math.Clamp(p, 0, 1)) * 70;
    const nx = lerp(X + W + 22, FUEL_DOOR.x - 8, p);
    const ny = lerp(392, FUEL_DOOR.y, p) - lift;
    this.hose.p2.set(lerp(X + W + 40, FUEL_DOOR.x - 60, p), lerp(560, 640, p));
    this.hose.p3.set(nx, ny);
    const g = this.hoseGfx.clear();
    const pts = this.hose.getPoints(40);
    g.lineStyle(14, 0x0d0d12, 1);
    g.strokePoints(pts);
    g.lineStyle(4, 0x3a3a48, 1);
    g.strokePoints(pts.map((pt) => new Phaser.Math.Vector2(pt.x - 2, pt.y - 2)));
    g.fillStyle(0x24242c, 1);
    g.fillRoundedRect(nx - 32, ny - 12, 36, 22, 6);
    g.fillStyle(C.green, 1);
    g.fillRect(nx - 32, ny - 12, 8, 22);
  }

  private drawCabinet(): void {
    const g = this.scene.add.graphics();
    this.body.add(g);
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(X + 10, 132, W, 470, 18);
    g.fillStyle(C.pumpBody, 1);
    g.fillRoundedRect(X, 120, W, 470, 18);
    g.fillStyle(C.pumpShade, 1);
    g.fillRect(X + W - 22, 170, 22, 400);
    g.fillStyle(C.neonPink, 1);
    g.fillRoundedRect(X, 120, W, 48, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.fillStyle(0x24212c, 1);
    g.fillRoundedRect(X + 12, 178, W - 24, 166, 12);
    g.fillStyle(C.lcd, 1);
    g.fillRoundedRect(X + 18, 186, W - 36, 150, 8);
    g.fillStyle(0x24212c, 1);
    g.fillRoundedRect(X + 12, 350, W - 24, 70, 10);
    g.fillStyle(0x1b1820, 1);
    g.fillRect(X, 556, W, 34);
    g.fillStyle(0x3a3642, 1);
    g.fillRoundedRect(X + W - 8, 300, 24, 70, 6);
    const labels: [string, number, number, string][] = [
      ['SALE', 192, 11, HEX.led], ['GALLONS', 276, 11, HEX.led], ['TARGET', 308, 11, HEX.amber],
    ];
    for (const [label, y, size, color] of labels) {
      this.body.add(txt(this.scene, X + 26, y, label, { fontSize: `${size}px`, fontStyle: '700', color })
        .setAlpha(0.8));
    }
    this.body.add(txt(this.scene, CX, 144, 'SUNDAI  FUEL', {
      fontFamily: FONT.display, fontSize: '30px', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 2, '#7a1550', 0, false, true));
    this.body.add(txt(this.scene, CX, 572, 'REGULAR 87  ·  $3.00/GAL', {
      fontSize: '11px', fontStyle: '700', color: HEX.muted,
    }).setOrigin(0.5));
  }
}
