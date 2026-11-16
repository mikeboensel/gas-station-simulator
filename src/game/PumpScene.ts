import Phaser from 'phaser';
import { Ambient } from './ambient';
import { Car } from './car';
import { greeting, waitingLine } from './customers';
import { Fx } from './fx';
import { Hud } from './hud';
import { Juice } from './juice';
import { PumpModel } from './model';
import { PumpView } from './pump';
import { ResultsCard } from './results';
import { Sfx } from './sfx';
import { makeTextures } from './textures';
import { HEX, money } from './theme';
import { FUEL_DOOR, type World, buildWorld } from './world';

const ZOOM_FOCUS = { x: 560, y: 300 };
const MAX_ZOOM = 0.07;
const IMPATIENT_SEC = 7;
type Assist = 'perfect' | 'near' | 'over' | null;

export class PumpScene extends Phaser.Scene {
  private readonly model = new PumpModel();
  private readonly sfx = new Sfx();
  private worldLayer!: Phaser.GameObjects.Container;
  private world!: World;
  private pump!: PumpView;
  private car!: Car;
  private fx!: Fx;
  private hud!: Hud;
  private results!: ResultsCard;
  private juice!: Juice;
  private ambient!: Ambient;
  private round = 1;
  private zoom = 0;
  private kick = 0;
  private holding = false;
  /** False while a car is driving in or out; the pump is locked. */
  private carReady = false;
  private idleSec = 0;
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
    this.car = new Car(this, this.world.carSlot, () => this.honk());
    this.pump = new PumpView(this, this.worldLayer);
    const ui = this.add.container(0, 0);
    this.fx = new Fx(this, this.worldLayer, ui, this.world.decals);
    this.hud = new Hud(this, ui);
    this.results = new ResultsCard(this, ui, this.sfx, () => this.retry(), () => this.nextRound());
    this.ambient = new Ambient(this, this.world, this.sfx);
    this.juice = new Juice({
      scene: this, model: this.model, pump: this.pump, car: this.car, fx: this.fx, hud: this.hud, sfx: this.sfx,
      punchZoom: (amount) => { this.kick = Math.max(this.kick, amount); },
    });
    this.hud.setMuted(this.sfx.muted);
    this.bindInput();
    this.model.newTarget();
    this.bringInCar();
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    const m = this.model;
    const outcome = m.tick(dt);
    if (this.assistGoal >= 0 && m.flowing() && m.shownCents() >= this.assistGoal) {
      m.forceStopAt(this.assistGoal);
      this.release();
    }
    this.juice.onFlow();
    if (outcome === 'finished') this.finishRound();
    if (outcome === 'false_start') this.falseStart();
    this.nagIfIdle(dt);

    const tension = m.phase === 'result' ? 0 : m.tension();
    this.sfx.setHumTension(tension);
    this.fx.setTension(m.flowing() ? tension : tension * 0.4, m.flowing() && m.inPerfectZone(), time);
    this.fx.setSpilling(m.flowing() && m.isOver(), FUEL_DOOR.x - 20, FUEL_DOOR.y + 8);
    this.pump.update(time, dt, m.flowing(), tension, m.phase === 'ready' && this.carReady);
    this.car.update(time, this.carReady && m.phase !== 'result');
    this.ambient.update(time);
    const wantZoom = m.flowing() ? tension * MAX_ZOOM : 0;
    this.zoom += (wantZoom - this.zoom) * Math.min(1, dt * 4);
    this.kick *= Math.exp(-dt * 7);
    const s = 1 + this.zoom + this.kick;
    this.worldLayer.setScale(s).setPosition(ZOOM_FOCUS.x * (1 - s), ZOOM_FOCUS.y * (1 - s));
    this.pump.render(m);
    this.hud.render(m, this.round);
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
    kb.on('keydown-H', () => this.honk());
    kb.on('keydown-M', () => {
      this.sfx.unlock();
      this.hud.setMuted(this.sfx.toggleMute());
    });
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      // Props (car, signs) handle their own clicks; only the trigger or open space pumps.
      if (this.results.visible || over.some((o) => !o.getData('pump'))) return;
      this.press();
    });
    this.input.on('pointerup', () => this.release());
    this.input.on('pointerupoutside', () => this.release());
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.release());
  }

  private press(): void {
    this.sfx.unlock();
    if (!this.carReady || this.holding || !this.model.start()) return;
    this.holding = true;
    this.idleSec = 0;
    this.assistGoal = this.pickAssistGoal();
    this.car.hideBubble();
    this.sfx.startHum();
    this.pump.setTrigger('pumping');
  }

  private release(): void {
    if (!this.holding) return;
    this.holding = false;
    this.model.stop();
    this.sfx.stopHum();
    this.sfx.clunk();
    if (this.model.phase === 'pumping') this.pump.setTrigger('stopping');
  }

  private honk(): void {
    this.sfx.unlock();
    this.sfx.honk();
    this.car.honk();
    if (this.carReady && this.model.phase === 'ready') this.car.say(Phaser.Math.RND.pick(['Hey!', 'Beep beep!', 'Rude.', '?!']), 900);
  }

  private pickAssistGoal(): number {
    const target = Math.round(this.model.target * 100);
    if (this.assist === 'perfect') return target;
    if (this.assist === 'near') return target - Phaser.Math.Between(1, 4);
    if (this.assist === 'over') return target + Phaser.Math.Between(2, 60);
    return -1;
  }

  private nagIfIdle(dt: number): void {
    if (!this.carReady || this.model.phase !== 'ready' || this.results.visible) return;
    this.idleSec += dt;
    if (this.idleSec < IMPATIENT_SEC) return;
    this.idleSec = 0;
    this.car.say(waitingLine(), 1800);
    this.sfx.honk();
    this.car.honk();
  }

  private finishRound(): void {
    const m = this.model;
    const stoppedAt = m.shownDollars();
    const grade = m.grade();
    this.assistGoal = -1;
    this.pump.setTrigger('locked');
    this.fx.setSpilling(false, 0, 0);
    const delay = this.juice.celebrate(grade);
    this.time.delayedCall(delay, () => {
      if (m.phase === 'result') this.results.show({ grade, stoppedAt, target: m.target });
    });
  }

  private falseStart(): void {
    this.assistGoal = -1;
    this.juice.reset();
    this.sfx.falseStart();
    this.pump.setTrigger('idle');
    this.hud.showBanner(`Too early — pump at least ${money(1)}`, HEX.amber);
    this.car.say('Was that it?', 1400);
  }

  /** Current car leaves with the nozzle unplugged; the next customer drives in. */
  private nextRound(): void {
    if (!this.carReady) return;
    this.results.hide();
    this.carReady = false;
    this.pump.setTrigger('locked');
    this.pump.plug(false, 350);
    this.sfx.swish();
    this.time.delayedCall(250, () => {
      this.sfx.engine();
      this.car.driveOff(() => {
        this.fx.setSmoldering(false);
        this.model.newTarget();
        this.round += 1;
        this.bringInCar();
      });
    });
  }

  private bringInCar(): void {
    this.car.restyle();
    this.juice.reset();
    this.sfx.engine(0.7);
    this.car.driveIn(() => {
      this.pump.plug(true);
      this.time.delayedCall(420, () => {
        this.sfx.clunk();
        this.carReady = true;
        this.idleSec = 0;
        this.pump.setTrigger('idle');
        this.car.say(greeting(this.model.target));
        this.hud.showBanner(`Round ${this.round} · ${money(this.model.target)}`, HEX.text);
      });
    });
  }

  private retry(): void {
    this.results.hide();
    this.model.reset();
    this.juice.reset();
    this.fx.setSmoldering(false);
    this.pump.setTrigger('idle');
    this.pump.root.setAngle(0);
    this.car.say(`Let's try that again. ${money(this.model.target)}!`);
  }
}
