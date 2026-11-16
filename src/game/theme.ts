import Phaser from 'phaser';

export const WIDTH = 1280;
export const HEIGHT = 720;

export const C = {
  night: 0x0b0b14,
  skyTop: 0x141238,
  skyMid: 0x5a2a5e,
  skyLow: 0xff8a5c,
  asphalt: 0x23232b,
  asphaltLight: 0x34343e,
  canopy: 0x1c1c26,
  canopyLight: 0xfff3d6,
  neonPink: 0xff4fa3,
  neonGreen: 0x2ee6a6,
  green: 0x16c58f,
  greenDark: 0x0b7a59,
  amber: 0xffb627,
  red: 0xff4d3d,
  redDark: 0x9e2318,
  card: 0x111118,
  text: 0xf5f3ee,
  muted: 0x9b9ba8,
  pumpBody: 0xeee6d6,
  pumpShade: 0xcfc3ad,
  lcd: 0x07120d,
  led: 0x52ff9d,
} as const;

export const HEX = {
  text: '#f5f3ee',
  muted: '#9b9ba8',
  green: '#16c58f',
  amber: '#ffb627',
  red: '#ff4d3d',
  pink: '#ff6ad5',
  led: '#52ff9d',
  ink: '#111118',
} as const;

export const FONT = {
  display: '"Bebas Neue", "DIN Condensed", Impact, sans-serif',
  body: 'Inter, system-ui, sans-serif',
  lcd: '"Share Tech Mono", ui-monospace, monospace',
} as const;

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: FONT.body,
    color: HEX.text,
    resolution: 2,
    ...style,
  });
}

/** Rounded card with a colored accent strip along the top. */
export function card(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: number,
  alpha = 0.92,
): void {
  g.clear();
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x + 4, y + 10, w, h, 18);
  g.fillStyle(C.card, alpha);
  g.fillRoundedRect(x, y, w, h, 18);
  g.fillStyle(accent, 1);
  g.fillRoundedRect(x, y, w, 5, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.lineStyle(1, 0xffffff, 0.08);
  g.strokeRoundedRect(x, y, w, h, 18);
}

export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
