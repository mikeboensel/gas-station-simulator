import Phaser from 'phaser';
import type { Car } from './car';
import { reaction } from './customers';
import type { Fx } from './fx';
import type { Hud } from './hud';
import type { Grade, PumpModel } from './model';
import type { PumpView } from './pump';
import type { Sfx } from './sfx';
import { HEX } from './theme';
import { FUEL_DOOR } from './world';

export interface Rig {
  scene: Phaser.Scene;
  model: PumpModel;
  pump: PumpView;
  car: Car;
  fx: Fx;
  hud: Hud;
  sfx: Sfx;
  /** Adds a decaying zoom kick toward the pump. */
  punchZoom: (amount: number) => void;
}

/** Feedback layer: reacts to cents ticking by and to how each round ends. */
export class Juice {
  private lastCents = 0;
  private wasInZone = false;
  private readonly rig: Rig;

  constructor(rig: Rig) {
    this.rig = rig;
  }

  reset(): void {
    this.lastCents = 0;
    this.wasInZone = false;
  }

  /** Call every frame; fires per-dollar, per-dime, zone, and overfill feedback. */
  onFlow(): void {
    const { model: m, pump, fx, sfx, scene } = this.rig;
    const now = m.shownCents();
    if (now === this.lastCents || m.phase === 'result') return;
    const before = this.lastCents;
    this.lastCents = now;
    const target = Math.round(m.target * 100);
    const t = m.tension();
    if (Math.floor(now / 100) > Math.floor(before / 100)) {
      sfx.dollar(t);
      pump.flashLcd(0x52ff9d, 0.18);
      pump.punchSale();
      const dollarsLeft = Math.ceil((target - now) / 100);
      if (dollarsLeft > 0 && dollarsLeft <= 3) {
        fx.callout(dollarsLeft === 1 ? 'LAST DOLLAR' : `$${dollarsLeft} LEFT`, HEX.amber, 34);
      }
    } else if (target - now <= 100 && Math.floor(now / 10) > Math.floor(before / 10)) {
      sfx.tick(t);
      this.rig.punchZoom(0.006);
    }
    const inZone = m.inPerfectZone();
    if (inZone && !this.wasInZone) {
      pump.flashLcd(0x16c58f, 0.4);
      fx.callout('STOP!', HEX.green, 48);
      this.rig.punchZoom(0.03);
    }
    this.wasInZone = inZone;
    if (before <= target && now > target) {
      pump.flashLcd(0xff4d3d, 0.6);
      scene.cameras.main.shake(160, 0.006);
      fx.callout('OVER!', HEX.red, 52);
    }
  }

  /** Plays the ending for a graded round; returns ms to wait before the results card. */
  celebrate(grade: Grade): number {
    const { scene, pump, car, fx, hud, sfx, model } = this.rig;
    car.say(reaction(grade), 2600);
    if (grade.over) {
      const power = Phaser.Math.Clamp(1 + grade.centsOff / 150, 1, 2.2);
      fx.explode(FUEL_DOOR.x - 60, FUEL_DOOR.y - 20, power);
      fx.setSmoldering(true, FUEL_DOOR.x - 30, FUEL_DOOR.y);
      sfx.boom(power);
      sfx.boom(0.6, 0.25);
      sfx.boom(0.5, 0.5);
      car.jolt();
      scene.tweens.add({ targets: pump.root, angle: 1.5, duration: 90, yoyo: true, repeat: 2 });
      return 1600;
    }
    if (grade.score > 0) this.tip(grade);
    else hud.setScore(model.totalScore);
    if (grade.perfect) {
      sfx.perfect();
      fx.confetti(grade.streak >= 2 ? 320 : 220);
      fx.callout(grade.multiplier > 1 ? `PERFECT ×${grade.multiplier}` : 'PERFECT!', HEX.green, 64);
      scene.cameras.main.flash(220, 22, 197, 143);
      pump.flashLcd(0x16c58f, 0.6);
      this.rig.punchZoom(0.12);
      if (grade.streak >= 2) sfx.combo(grade.streak);
      return 1300;
    }
    if (grade.score > 0) {
      sfx.good();
      fx.callout(`+${grade.score}`, grade.centsOff <= 5 ? HEX.green : HEX.amber, 48);
      if (grade.centsOff <= 5) {
        fx.confetti(60);
        if (grade.streak >= 2) sfx.combo(grade.streak);
      }
      return 1100;
    }
    sfx.falseStart();
    return 700;
  }

  /** Coins fly from the driver's window into the score; the counter rolls as they land. */
  private tip(grade: Grade): void {
    const { fx, hud, sfx, car, model } = this.rig;
    const count = Phaser.Math.Clamp(Math.round(grade.score / 120), 2, 16);
    fx.coins(car.windowPoint(), hud.scoreAnchor(), count, (i) => {
      sfx.coin(i);
      hud.bumpScore();
      if (i === 0) hud.setScore(model.totalScore);
    });
  }
}
