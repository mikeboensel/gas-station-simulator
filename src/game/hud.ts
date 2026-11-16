import Phaser from 'phaser';
import { C, FONT, HEX, WIDTH, card, money, txt } from './theme';
import { comboMultiplier, type PumpModel } from './model';

const X = 32;
const Y = 438;
const W = 330;
const H = 250;

type Status = { label: string; color: number };

export class Hud {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Graphics;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly targetText: Phaser.GameObjects.Text;
  private readonly nowText: Phaser.GameObjects.Text;
  private readonly leftText: Phaser.GameObjects.Text;
  private readonly flowText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly streakText: Phaser.GameObjects.Text;
  private readonly muteText: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Text;
  private status = '';
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, ui: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.frame = scene.add.graphics();
    card(this.frame, X, Y, W, H, C.green);
    const pill = scene.add.graphics();
    pill.fillStyle(0xffffff, 0.08);
    pill.fillRoundedRect(X + 20, Y + 22, 86, 26, 13);
    this.badge = scene.add.graphics();
    this.badgeText = txt(scene, X + W - 72, Y + 35, '', { fontSize: '12px', fontStyle: '800', color: HEX.ink })
      .setOrigin(0.5);
    const caption = (y: number, label: string) =>
      txt(scene, X + 22, y, label, { fontSize: '11px', fontStyle: '700', color: HEX.muted });
    this.targetText = txt(scene, X + 18, Y + 70, '$0.00', { fontFamily: FONT.display, fontSize: '68px' });
    this.nowText = txt(scene, X + 22, Y + 158, '$0.00', { fontFamily: FONT.display, fontSize: '34px', color: HEX.led });
    this.leftText = txt(scene, X + W - 22, Y + 166, '', { fontSize: '13px', fontStyle: '700', color: HEX.muted })
      .setOrigin(1, 0);
    this.flowText = txt(scene, X + 22, Y + 212, '', { fontSize: '13px', color: HEX.muted });
    this.scoreText = txt(scene, X + W - 22, Y + 206, '0', { fontFamily: FONT.display, fontSize: '26px' })
      .setOrigin(1, 0);
    this.streakText = txt(scene, X + W - 22, Y + 64, '', {
      fontFamily: FONT.display, fontSize: '22px', color: HEX.amber,
    }).setOrigin(1, 0);
    const divider = scene.add.rectangle(X + 20, Y + 200, W - 40, 1, 0xffffff, 0.1).setOrigin(0);
    ui.add([
      this.frame, pill,
      txt(scene, X + 63, Y + 35, 'SOLO RUN', { fontSize: '11px', fontStyle: '800' }).setOrigin(0.5),
      this.badge, this.badgeText, caption(Y + 62, 'TARGET'), this.targetText, this.streakText,
      caption(Y + 146, 'NOW SHOWING'), this.nowText, this.leftText, divider, this.flowText, this.scoreText,
    ]);
    this.muteText = txt(scene, WIDTH - 24, 98, '', { fontSize: '12px', fontStyle: '700', color: HEX.muted })
      .setOrigin(1, 0);
    this.banner = txt(scene, WIDTH / 2, 130, '', {
      fontFamily: FONT.display, fontSize: '40px', stroke: '#0b0b14', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);
    ui.add([this.muteText, this.banner]);
    this.addHints(ui);
  }

  render(model: PumpModel, round: number): void {
    this.targetText.setText(money(model.target));
    this.nowText.setText(money(model.shownDollars()));
    this.nowText.setColor(model.isOver() ? HEX.red : HEX.led);
    const left = model.centsLeft();
    this.leftText.setText(left >= 0 ? `${money(left / 100)} to go` : `${money(-left / 100)} over`);
    this.leftText.setColor(left < 0 ? HEX.red : model.inPerfectZone() ? HEX.green : HEX.muted);
    this.flowText.setText(`Round ${round}  ·  ${model.speedLabel()} flow`);
    const combo = comboMultiplier(model.streak + 1);
    const label = model.streak >= 1 && model.phase !== 'result' ? `COMBO ×${combo}` : '';
    if (label !== this.streakText.text) {
      this.streakText.setText(label);
      if (label) this.scene.tweens.add({ targets: this.streakText, scale: { from: 1.6, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    }
    this.setStatus(this.statusFor(model));
  }

  setScore(total: number): void {
    const from = Number(this.scoreText.text.replace(/,/g, '')) || 0;
    if (from === total) return;
    this.scene.tweens.addCounter({
      from, to: total, duration: 700, ease: 'Cubic.easeOut',
      onUpdate: (tw) => this.scoreText.setText(Math.round(tw.getValue() ?? total).toLocaleString()),
    });
    this.scene.tweens.add({ targets: this.scoreText, scale: { from: 1.3, to: 1 }, duration: 300, ease: 'Back.easeOut' });
  }

  /** Where tip coins land. */
  scoreAnchor(): { x: number; y: number } {
    return { x: X + W - 40, y: Y + 220 };
  }

  bumpScore(): void {
    this.scene.tweens.killTweensOf(this.frame);
    this.scene.tweens.add({ targets: this.frame, y: { from: 3, to: 0 }, duration: 90 });
    this.scene.tweens.add({ targets: this.scoreText, scale: { from: 1.25, to: 1 }, duration: 160 });
  }

  setMuted(muted: boolean): void {
    this.muteText.setText(muted ? 'SOUND OFF  ·  M' : '');
  }

  showBanner(label: string, color: string): void {
    this.banner.setText(label).setColor(color).setAlpha(1).setScale(0.6).setY(30);
    this.scene.tweens.killTweensOf(this.banner);
    this.scene.tweens.add({ targets: this.banner, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.banner, alpha: 0, y: 14, delay: 1600, duration: 400 });
  }

  private statusFor(model: PumpModel): Status {
    if (model.isOver()) return { label: 'OVER', color: C.red };
    if (model.phase === 'result') return { label: 'DONE', color: C.muted };
    if (model.inPerfectZone()) return { label: 'STOP ZONE', color: C.green };
    if (model.flowing()) return { label: 'PUMPING', color: C.amber };
    return { label: 'READY', color: C.green };
  }

  private setStatus(s: Status): void {
    const key = `${s.label}${s.color}`;
    if (key === this.status) return;
    this.status = key;
    this.badge.clear();
    this.badge.fillStyle(s.color, 1);
    this.badge.fillRoundedRect(X + W - 122, Y + 22, 100, 26, 13);
    this.badgeText.setText(s.label);
    this.scene.tweens.add({ targets: this.badgeText, scale: { from: 1.25, to: 1 }, duration: 200 });
  }

  private addHints(ui: Phaser.GameObjects.Container): void {
    const hints: [string, string][] = [['SPACE / CLICK', 'Hold to pump'], ['R', 'Next'], ['H', 'Honk'], ['M', 'Mute']];
    const row = this.scene.add.container(0, 696);
    let x = 0;
    for (const [key, label] of hints) {
      const k = txt(this.scene, x + 10, 0, key, { fontSize: '12px', fontStyle: '800', color: HEX.ink }).setOrigin(0, 0.5);
      const g = this.scene.add.graphics();
      g.fillStyle(0xf5f3ee, 0.92);
      g.fillRoundedRect(x, -12, k.width + 20, 24, 6);
      g.fillStyle(0x000000, 0.25);
      g.fillRect(x + 3, 10, k.width + 14, 2);
      const l = txt(this.scene, x + k.width + 28, 0, label, { fontSize: '13px', color: HEX.text }).setOrigin(0, 0.5);
      row.add([g, k, l]);
      x += k.width + l.width + 56;
    }
    row.setX(WIDTH / 2 + 180 - x / 2);
    ui.add(row);
  }
}
