import Phaser from 'phaser';
import { C, FONT, HEIGHT, HEX, WIDTH, card, money, txt } from './theme';
import type { Grade } from './model';
import type { Sfx } from './sfx';

const W = 480;
const H = 360;
const X = (WIDTH - W) / 2;
const Y = (HEIGHT - H) / 2 - 20;

export interface ResultInfo {
  grade: Grade;
  stoppedAt: number;
  target: number;
}

export class ResultsCard {
  readonly root: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly subtitle: Phaser.GameObjects.Text;
  private readonly stars: Phaser.GameObjects.Graphics[] = [];
  private readonly tiles: Phaser.GameObjects.Text[] = [];
  private readonly points: Phaser.GameObjects.Text;

  private readonly scene: Phaser.Scene;
  private readonly sfx: Sfx;

  constructor(
    scene: Phaser.Scene,
    ui: Phaser.GameObjects.Container,
    sfx: Sfx,
    onRetry: () => void,
    onNext: () => void,
  ) {
    this.scene = scene;
    this.sfx = sfx;
    this.root = scene.add.container(0, 0).setVisible(false);
    this.dim = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x05050a, 0.55).setOrigin(0).setInteractive();
    this.panel = scene.add.container(WIDTH / 2, HEIGHT / 2);
    this.frame = scene.add.graphics();
    const ox = -WIDTH / 2;
    const oy = -HEIGHT / 2;
    this.title = txt(scene, 0, oy + Y + 34, '', { fontFamily: FONT.display, fontSize: '56px' }).setOrigin(0.5, 0);
    this.subtitle = txt(scene, 0, oy + Y + 96, '', { fontSize: '15px', color: HEX.muted }).setOrigin(0.5, 0);
    this.panel.add([this.frame, this.title, this.subtitle]);
    for (let i = 0; i < 3; i++) {
      const star = scene.add.graphics().setPosition((i - 1) * 62, oy + Y + 150);
      this.stars.push(star);
      this.panel.add(star);
    }
    ['STOPPED AT', 'TARGET', 'DIFFERENCE'].forEach((label, i) => {
      const tx = ox + X + 24 + i * 148;
      const bg = scene.add.graphics();
      bg.fillStyle(0xffffff, 0.06);
      bg.fillRoundedRect(tx, oy + Y + 192, 136, 64, 10);
      const cap = txt(scene, tx + 68, oy + Y + 202, label, { fontSize: '10px', fontStyle: '700', color: HEX.muted })
        .setOrigin(0.5, 0);
      const val = txt(scene, tx + 68, oy + Y + 218, '', { fontFamily: FONT.display, fontSize: '30px' }).setOrigin(0.5, 0);
      this.tiles.push(val);
      this.panel.add([bg, cap, val]);
    });
    this.points = txt(scene, ox + X + 26, oy + Y + 292, '', { fontFamily: FONT.display, fontSize: '34px', color: HEX.green });
    this.panel.add([
      this.points,
      this.button(ox + X + W - 330, oy + Y + 286, 140, 'Try again', false, onRetry),
      this.button(ox + X + W - 180, oy + Y + 286, 156, 'Next target  ↵', true, onNext),
    ]);
    this.root.add([this.dim, this.panel]);
    ui.add(this.root);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  show(info: ResultInfo): void {
    const { grade } = info;
    const accent = grade.over ? C.red : grade.perfect ? C.green : grade.score > 0 ? C.amber : C.muted;
    card(this.frame, X - WIDTH / 2, Y - HEIGHT / 2, W, H, accent, 0.97);
    const title = grade.over ? 'Over target' : grade.label;
    this.title.setText(title).setColor(grade.over ? HEX.red : grade.perfect ? HEX.green : HEX.text);
    this.subtitle.setText(this.subtitleFor(info));
    const diff = Math.round(info.stoppedAt * 100) - Math.round(info.target * 100);
    this.tiles[0].setText(money(info.stoppedAt));
    this.tiles[1].setText(money(info.target));
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
    const size = Math.abs(diff);
    this.tiles[2].setText(`${sign}${size < 100 ? `${size}¢` : money(size / 100)}`)
      .setColor(diff > 0 ? HEX.red : diff === 0 ? HEX.green : HEX.text);
    this.points.setText(grade.over ? 'No points' : `+${grade.score} pts`).setColor(grade.score > 0 ? HEX.green : HEX.muted);
    const earned = grade.over ? 0 : grade.perfect ? 3 : grade.centsOff <= 5 ? 2 : grade.score > 0 ? 1 : 0;
    this.stars.forEach((s, i) => {
      this.drawStar(s, false);
      s.setScale(1);
      if (i >= earned) return;
      this.scene.time.delayedCall(350 + i * 220, () => {
        this.drawStar(s, true);
        this.sfx.star(i);
        this.scene.tweens.add({ targets: s, scale: { from: 1.8, to: 1 }, duration: 320, ease: 'Back.easeOut' });
      });
    });
    this.root.setVisible(true);
    this.dim.setAlpha(0);
    this.panel.setScale(0.85).setAlpha(0);
    this.scene.tweens.add({ targets: this.dim, alpha: 1, duration: 200 });
    this.scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
  }

  hide(): void {
    this.root.setVisible(false);
  }

  private subtitleFor({ grade }: ResultInfo): string {
    if (grade.over) return `Boom. ${money(grade.centsOff / 100)} past the target.`;
    if (grade.perfect) return grade.streak > 1 ? `Dead on. ${grade.streak} in a row!` : 'Dead on, to the cent.';
    if (grade.centsOff <= 5) return `Just ${grade.centsOff}¢ short.`;
    return `${money(grade.centsOff / 100)} short of the target.`;
  }

  private drawStar(g: Phaser.GameObjects.Graphics, lit: boolean): void {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 24 : 10;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.clear();
    g.fillStyle(lit ? C.amber : 0xffffff, lit ? 1 : 0.12);
    g.fillPoints(pts, true);
  }

  private button(x: number, y: number, w: number, label: string, primary: boolean, onClick: () => void) {
    const btn = this.scene.add.container(x + w / 2, y + 22);
    const g = this.scene.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(primary ? C.greenDark : 0x000000, primary ? 1 : 0.4);
      g.fillRoundedRect(-w / 2, -18, w, 44, 12);
      g.fillStyle(primary ? (hover ? 0x2ee6a6 : C.green) : hover ? 0x3a3a46 : 0x2a2a34, 1);
      g.fillRoundedRect(-w / 2, -22, w, 44, 12);
    };
    draw(false);
    const t = txt(this.scene, 0, 0, label, { fontSize: '15px', fontStyle: '800', color: primary ? HEX.ink : HEX.text })
      .setOrigin(0.5);
    btn.add([g, t]);
    btn.setSize(w, 44).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => draw(true));
    btn.on('pointerout', () => draw(false));
    btn.on('pointerdown', () => {
      this.scene.tweens.add({ targets: btn, scale: { from: 0.94, to: 1 }, duration: 140 });
      onClick();
    });
    return btn;
  }
}
