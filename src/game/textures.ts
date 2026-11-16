import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './theme';

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: Paint): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  paint(tex.getContext(), w, h);
  tex.refresh();
}

function radial(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Procedural textures shared by the world and the effects. */
export function makeTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'sky', 4, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d0b2a');
    g.addColorStop(0.45, '#3b1d52');
    g.addColorStop(0.75, '#a33b62');
    g.addColorStop(1, '#ff8a5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  canvasTexture(scene, 'ground', 4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a3442');
    g.addColorStop(0.3, '#26232d');
    g.addColorStop(1, '#121117');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  canvasTexture(scene, 'glow', 128, 128, (ctx, w, h) =>
    radial(ctx, w, h, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]),
  );
  canvasTexture(scene, 'dot', 32, 32, (ctx, w, h) =>
    radial(ctx, w, h, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]),
  );
  canvasTexture(scene, 'smoke', 64, 64, (ctx, w, h) =>
    radial(ctx, w, h, [[0, 'rgba(255,255,255,0.7)'], [0.6, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]),
  );
  canvasTexture(scene, 'spark', 24, 4, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  canvasTexture(scene, 'confetti', 10, 6, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  });
  canvasTexture(scene, 'vignette', WIDTH / 4, HEIGHT / 4, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  canvasTexture(scene, 'beam', 256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,240,210,0.55)');
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0);
    ctx.lineTo(w * 0.65, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  });
}
