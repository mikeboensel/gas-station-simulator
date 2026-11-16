import Phaser from 'phaser';
import { Fx } from './fx';
import { Hud } from './hud';
import { PumpModel } from './model';
import { PumpView } from './pump';
import { ResultsCard } from './results';
import { Sfx } from './sfx';
import { makeTextures } from './textures';
import { HEX, money } from './theme';
import { FUEL_DOOR, type World, buildWorld } from './world';

const ZOOM_FOCUS = { x: 560, y: 300 };
const MAX_ZOOM = 0.07;
type Assist = 'perfect' | 'near' | 'over' | null;

export class PumpScene extends Phaser.Scene {
  private readonly model = new PumpModel();
  private readonly sfx = new Sfx();
  private worldLayer!: Phaser.GameObjects.Container;
  private world!: World;
  private pump!: PumpView;
  private fx!: Fx;
  private hud!: Hud;
  private results!: ResultsCard;
  private round = 1;
  private zoom = 0;
  private lastCents = 0;
  private wasInZone = false;
  private holding = false;
  private assist: Assist = null;
  private assistGoal = -1;

  constructor() {
    super('PumpScene');
  }

  create(): void {
    makeTextures(this);
    const param = new URLSearchParams(location.search).get('assist');
    this.assist = param === 'perfect' || param === 'near' || param === 'over' ? param : null;
    this.worldLayer = this.add.container(0, 0);
    this.world = buildWorld(this, this.worldLayer);
    this.pump = new PumpView(this, this.worldLayer);
    const ui = this.add.container(0, 0);
    this.fx = new Fx(this, this.worldLayer, ui, this.world.decals);
    this.hud = new Hud(this, ui);
    this.results = new ResultsCard(this, ui, this.sfx, () => this.retry(), () => this.nextRound());
    this.hud.setMuted(this.sfx.muted);
    this.bindInput();
    this.model.newTarget();
    this.render();
    this.time.delayedCall(250, () => this.hud.showBanner(`Fill it to ${money(this.model.target)}`, HEX.text));
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.flickerSign() });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    const outcome = this.model.tick(dt);
    if (this.assistGoal >= 0 && this.model.flowing() && this.model.shownCents() >= this.assistGoal) {
      this.model.forceStopAt(this.assistGoal);
      this.release();
    }
    this.reactToFlow();
    if (outcome === 'finished') this.finishRound();
    if (outcome === 'false_start') this.falseStart();

    const m = this.model;
    const tension = m.phase === 'result' ? 0 : m.tension();
    this.sfx.setHumTension(tension);
    this.fx.setTension(m.flowing() ? tension : tension * 0.4, m.flowing() && m.inPerfectZone(), time);
    this.fx.setSpilling(m.flowing() && m.isOver(), FUEL_DOOR.x - 20, FUEL_DOOR.y + 8);
    this.pump.update(time, dt, m.flowing(), tension, m.phase === 'ready');
    const wantZoom = m.flowing() ? tension * MAX_ZOOM : 0;
    this.zoom += (wantZoom - this.zoom) * Math.min(1, dt * 4);
    const s = 1 + this.zoom;
    this.worldLayer.setScale(s).setPosition(ZOOM_FOCUS.x * (1 - s), ZOOM_FOCUS.y * (1 - s));
    this.render();
  }

  private bindInput(): void {
    const kb = this.input.keyboard!;
    kb.addCapture('SPACE');
    kb.on('keydown-SPACE', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (this.results.visible) this.nextRound();
      else this.press();
    });
    kb.on('keyup-SPACE', () => this.release());
    kb.on('keydown-R', () => this.results.visible && this.nextRound());
    kb.on('keydown-ENTER', () => this.results.visible && this.nextRound());
    kb.on('keydown-M', () => {
      this.sfx.unlock();
      this.hud.setMuted(this.sfx.toggleMute());
    });
    this.input.on('pointerdown', () => !this.results.visible && this.press());
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.release());
  }

  private press(): void {
    this.sfx.unlock();
    if (this.holding || !this.model.start()) return;
    this.holding = true;
    this.lastCents = this.model.shownCents();
    this.assistGoal = this.pickAssistGoal();
    this.sfx.startHum();
    this.pump.setTrigger('pumping');
    this.tweens.add({ targets: this.world.car, y: 3, duration: 90, yoyo: true });
  }

  private release(): void {
    if (!this.holding) return;
    this.holding = false;
    this.model.stop();
    this.sfx.stopHum();
    this.sfx.clunk();
    if (this.model.phase === 'pumping') this.pump.setTrigger('stopping');
  }

  private pickAssistGoal(): number {
    const target = Math.round(this.model.target * 100);
    if (this.assist === 'perfect') return target;
    if (this.assist === 'near') return target - Phaser.Math.Between(1, 4);
    if (this.assist === 'over') return target + Phaser.Math.Between(2, 60);
    return -1;
  }

  /** Per-frame juice keyed off the cents shown on the pump. */
  private reactToFlow(): void {
    const m = this.model;
    const now = m.shownCents();
    if (now === this.lastCents) return;
    const before = this.lastCents;
    this.lastCents = now;
    const target = Math.round(m.target * 100);
    const t = m.tension();
    if (Math.floor(now / 100) > Math.floor(before / 100)) {
      this.sfx.dollar(t);
      this.pump.flashLcd(0x52ff9d, 0.18);
      this.pump.punchSale();
      const dollarsLeft = Math.ceil((target - now) / 100);
      if (dollarsLeft > 0 && dollarsLeft <= 3) {
        this.fx.callout(dollarsLeft === 1 ? 'LAST DOLLAR' : `$${dollarsLeft} LEFT`, HEX.amber, 34);
      }
    } else if (target - now <= 100 && Math.floor(now / 10) > Math.floor(before / 10)) {
      this.sfx.tick(t);
    }
    const inZone = m.inPerfectZone();
    if (inZone && !this.wasInZone) {
      this.pump.flashLcd(0x16c58f, 0.4);
      this.fx.callout('STOP!', HEX.green, 48);
    }
    this.wasInZone = inZone;
    if (before <= target && now > target) {
      this.pump.flashLcd(0xff4d3d, 0.6);
      this.cameras.main.shake(160, 0.006);
      this.fx.callout('OVER!', HEX.red, 52);
    }
  }

  private finishRound(): void {
    const m = this.model;
    const stoppedAt = m.shownDollars();
    const grade = m.grade();
    this.assistGoal = -1;
    this.wasInZone = false;
    this.pump.setTrigger('locked');
    this.fx.setSpilling(false, 0, 0);
    this.hud.setScore(m.totalScore);
    let delay = 500;
    if (grade.over) {
      delay = 1500;
      const power = Phaser.Math.Clamp(1 + grade.centsOff / 150, 1, 2.2);
      this.fx.explode(FUEL_DOOR.x - 60, FUEL_DOOR.y - 20, power);
      this.fx.setSmoldering(true, FUEL_DOOR.x - 30, FUEL_DOOR.y);
      this.sfx.boom(power);
      this.sfx.boom(0.6, 0.25);
      this.sfx.boom(0.5, 0.5);
      this.tweens.add({ targets: this.world.car, y: -26, angle: -2, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this.pump.root, angle: 1.5, duration: 90, yoyo: true, repeat: 2 });
    } else if (grade.perfect) {
      delay = 900;
      this.sfx.perfect();
      this.fx.confetti(220);
      this.fx.callout('PERFECT!', HEX.green, 64);
      this.cameras.main.flash(220, 22, 197, 143);
      this.pump.flashLcd(0x16c58f, 0.6);
    } else if (grade.score > 0) {
      this.sfx.good();
      this.fx.callout(`+${grade.score}`, grade.centsOff <= 5 ? HEX.green : HEX.amber, 48);
      if (grade.centsOff <= 5) this.fx.confetti(60);
    } else {
      this.sfx.falseStart();
    }
    this.time.delayedCall(delay, () => {
      if (m.phase === 'result') this.results.show({ grade, stoppedAt, target: m.target });
    });
  }

  private falseStart(): void {
    this.assistGoal = -1;
    this.sfx.falseStart();
    this.pump.setTrigger('idle');
    this.hud.showBanner(`Too early — pump at least ${money(1)}`, HEX.amber);
  }

  private nextRound(): void {
    this.model.newTarget();
    this.round += 1;
    this.startRound(`Round ${this.round} · Fill it to ${money(this.model.target)}`);
  }

  private retry(): void {
    this.model.reset();
    this.startRound(`Again: ${money(this.model.target)}`);
  }

  private startRound(banner: string): void {
    this.results.hide();
    this.fx.setSmoldering(false);
    this.lastCents = 0;
    this.pump.setTrigger('idle');
    this.world.car.setPosition(0, 0).setAngle(0);
    this.pump.root.setAngle(0);
    this.hud.showBanner(banner, HEX.text);
  }

  private render(): void {
    this.pump.render(this.model);
    this.hud.render(this.model, this.round);
  }

  private flickerSign(): void {
    if (Math.random() > 0.5) return;
    const { storeSign, signGlow } = this.world;
    this.tweens.add({
      targets: [storeSign, signGlow], alpha: 0.25, duration: 50, yoyo: true, repeat: Phaser.Math.Between(1, 3),
      onComplete: () => { storeSign.setAlpha(1); signGlow.setAlpha(0.45); },
    });
  }
}
