import Phaser from 'phaser';
import { C, HEX, txt } from './theme';
import { FUEL_DOOR, GROUND } from './world';

const WHEEL_X = [830, 1090];
const WHEEL_Y = 586;
const WHEEL_R = 36;
/** Cars face right: they pull in from the left and leave to the right. */
const ENTRY_OFFSET = -1300;
const EXIT_OFFSET = 1000;
const COLORS = [0x2b6fd6, 0xe0483e, 0xf2c23a, 0x37b37e, 0xe8e4dc, 0x8a4fd6, 0xff7a3d];

interface Shape {
  bodyTop: number;
  roof: number;
  cabin: number[];
  windows: number[][];
}

const SHAPES: Shape[] = [
  {
    bodyTop: 488, roof: 424, cabin: [800, 494, 870, 424, 1050, 424, 1130, 494],
    windows: [[822, 492, 878, 436, 955, 436, 955, 492], [967, 492, 967, 436, 1044, 436, 1106, 492]],
  },
  {
    bodyTop: 488, roof: 420, cabin: [770, 494, 790, 420, 1000, 420, 1090, 494],
    windows: [[790, 492, 806, 432, 890, 432, 890, 492], [902, 492, 902, 432, 990, 432, 1068, 492]],
  },
  {
    bodyTop: 470, roof: 396, cabin: [744, 476, 754, 396, 1080, 396, 1150, 476],
    windows: [[768, 468, 774, 410, 900, 410, 900, 468], [912, 468, 912, 410, 1072, 410, 1128, 468]],
  },
];

/** The customer's car: drives in, bounces, honks, talks, drives off. */
export class Car {
  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private readonly paint: Phaser.GameObjects.Graphics;
  private readonly soot: Phaser.GameObjects.Graphics;
  private readonly wheels: Phaser.GameObjects.Graphics[] = [];
  private readonly head: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Container;
  private readonly bubbleBg: Phaser.GameObjects.Graphics;
  private readonly bubbleText: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private shape = SHAPES[0];
  private lastX = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, onClick: () => void) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    layer.add(this.root);
    const shadow = scene.add.ellipse(960, GROUND + 4, 480, 34, 0x000000, 0.45);
    this.body = scene.add.container(0, 0);
    this.paint = scene.add.graphics();
    this.head = scene.add.image(1192, 510, 'glow').setDisplaySize(160, 70)
      .setTint(0xfff2c0).setBlendMode(Phaser.BlendModes.ADD);
    const tail = scene.add.image(732, 506, 'glow').setDisplaySize(60, 50)
      .setTint(C.red).setBlendMode(Phaser.BlendModes.ADD);
    this.soot = scene.add.graphics();
    this.body.add([this.paint, this.soot, this.head, tail]);
    this.root.add([shadow, this.body]);
    for (const wx of WHEEL_X) {
      const w = scene.add.graphics().setPosition(wx, WHEEL_Y);
      w.fillStyle(0x0c0c10, 1).fillCircle(0, 0, WHEEL_R);
      w.fillStyle(0xa8adb8, 1).fillCircle(0, 0, 19);
      w.fillStyle(0x52565f, 1);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        w.fillCircle(Math.cos(a) * 11, Math.sin(a) * 11, 3.5);
      }
      w.fillStyle(0x2a2c33, 1).fillCircle(0, 0, 5);
      this.wheels.push(w);
      this.root.add(w);
    }
    this.bubbleBg = scene.add.graphics();
    this.bubbleText = txt(scene, 0, 0, '', { fontSize: '17px', fontStyle: '800', color: HEX.ink })
      .setOrigin(0.5);
    this.bubble = scene.add.container(980, 360, [this.bubbleBg, this.bubbleText]).setScale(0);
    this.root.add(this.bubble);
    const hit = scene.add.zone(960, 520, 470, 200).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    this.root.add(hit);
    this.restyle();
  }

  /** New customer: random model and paint, parked off to the right. */
  restyle(): void {
    this.shape = Phaser.Utils.Array.GetRandom(SHAPES);
    const color = Phaser.Utils.Array.GetRandom(COLORS);
    const dark = Phaser.Display.Color.ValueToColor(color).darken(28).color;
    const light = Phaser.Display.Color.ValueToColor(color).lighten(15).color;
    const s = this.shape;
    const g = this.paint.clear();
    g.fillStyle(color, 1).fillRoundedRect(730, s.bodyTop, 460, 584 - s.bodyTop, 30);
    poly(g, s.cabin);
    g.fillStyle(0x1b2a44, 1);
    s.windows.forEach((w) => poly(g, w));
    g.fillStyle(0xffffff, 0.14);
    const [wx, , , wy] = s.windows[0];
    poly(g, [wx + 60, wy + 6, wx + 82, wy + 6, wx + 44, 488, wx + 22, 488]);
    g.fillStyle(light, 1).fillRect(740, 520, 440, 4);
    g.fillStyle(dark, 1).fillRoundedRect(730, 556, 460, 28, { tl: 0, tr: 0, bl: 30, br: 30 });
    g.fillStyle(0xd8e2f0, 1).fillRect(960, 528, 22, 5);
    g.fillStyle(dark, 1).fillRect(730, FUEL_DOOR.y - 14, 22, 28);
    g.fillStyle(0x0d0d0d, 1).fillCircle(FUEL_DOOR.x, FUEL_DOOR.y, 6);
    g.fillStyle(0xfff2c0, 1).fillRoundedRect(1176, 500, 14, 16, 4);
    g.fillStyle(C.red, 1).fillRoundedRect(730, 498, 10, 18, 3);
    const soot = this.soot.clear().setAlpha(0);
    soot.fillStyle(0x140f0c, 1).fillRoundedRect(730, s.bodyTop, 460, 584 - s.bodyTop, 30);
    poly(soot, s.cabin);
    this.bubble.setY(s.roof - 52);
    this.root.setPosition(ENTRY_OFFSET, 0).setAngle(0);
    this.body.setPosition(0, 0).setAngle(0);
    this.lastX = ENTRY_OFFSET;
  }

  driveIn(onArrive: () => void): void {
    this.scene.tweens.add({
      targets: this.root, x: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: this.body, y: 6, angle: 1.4, duration: 130, yoyo: true, ease: 'Sine.easeOut' });
        onArrive();
      },
    });
  }

  driveOff(onGone: () => void): void {
    this.hideBubble();
    this.scene.tweens.add({ targets: this.body, angle: -1.2, duration: 160, yoyo: true });
    this.scene.tweens.add({
      targets: this.root, x: EXIT_OFFSET, duration: 900, ease: 'Cubic.easeIn', delay: 120, onComplete: onGone,
    });
  }

  /** Spins wheels to match travel and idles the engine. */
  update(time: number, idling: boolean): void {
    const dx = this.root.x - this.lastX;
    this.lastX = this.root.x;
    for (const w of this.wheels) w.rotation += dx / WHEEL_R;
    if (idling && !this.scene.tweens.isTweening(this.body)) this.body.setY(Math.sin(time / 45) * 0.6);
  }

  honk(): void {
    this.scene.tweens.add({ targets: this.body, y: -8, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.head, alpha: 0.2, duration: 60, yoyo: true, repeat: 2 });
  }

  /** Blast reaction: hop, then the paint chars over. */
  jolt(): void {
    this.scene.tweens.add({ targets: this.body, y: -26, angle: -2, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.soot, alpha: 0.6, duration: 500, delay: 120 });
  }

  say(line: string, hold = 2400): void {
    this.bubbleText.setText(line);
    const w = this.bubbleText.width + 32;
    const g = this.bubbleBg.clear();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 3, -22, w, 44, 14);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -25, w, 44, 14);
    g.fillTriangle(-10, 18, 10, 18, -4, 32);
    this.scene.tweens.killTweensOf(this.bubble);
    this.bubble.setScale(0).setAlpha(1);
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.bubble, alpha: 0, delay: hold, duration: 300 });
  }

  hideBubble(): void {
    this.scene.tweens.killTweensOf(this.bubble);
    this.bubble.setScale(0);
  }

  /** Where tip coins fly from, in world coordinates. */
  windowPoint(): { x: number; y: number } {
    return { x: this.root.x + 940, y: this.shape.roof + 40 };
  }
}

function poly(g: Phaser.GameObjects.Graphics, xy: number[]): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < xy.length; i += 2) pts.push(new Phaser.Math.Vector2(xy[i], xy[i + 1]));
  g.fillPoints(pts, true);
}