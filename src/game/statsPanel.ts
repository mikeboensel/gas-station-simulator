import Phaser from 'phaser';
import { formatMoney } from './pumpModel';
import { GSS, GSS_HEX } from './theme';
import { dashedInset } from './uiChrome';

export interface StatsPanel {
  root: Phaser.GameObjects.Container;
  targetText: Phaser.GameObjects.Text;
  showingText: Phaser.GameObjects.Text;
  statusBadge: Phaser.GameObjects.Text;
  statusBadgeBg: Phaser.GameObjects.Rectangle;
  flowLight: Phaser.GameObjects.Ellipse;
  exactLight: Phaser.GameObjects.Ellipse;
  scoreText: Phaser.GameObjects.Text;
  flowStatusText: Phaser.GameObjects.Text;
}

const LX = -102;
const TY = 24;

export function buildStatsPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
): StatsPanel {
  const root = scene.add.container(x, y).setDepth(14);

  const back = scene.add.circle(LX, -182 + TY, 20, GSS.ink);
  root.add(back);
  root.add(
    scene.add.text(LX - 5, -182 + TY, '←', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: '900',
    }).setOrigin(0.5),
  );

  const soloG = scene.add.graphics();
  soloG.fillStyle(GSS.secondary, 1);
  soloG.fillRoundedRect(24, -198 + TY, 108, 32, 16);
  root.add(soloG);
  root.add(
    scene.add.text(78, -182 + TY, 'Solo Run', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: '900',
    }).setOrigin(0.5),
  );

  dashedInset(scene, root, -92, 248, 230);

  root.add(
    scene.add.text(LX, -168, 'Pump order', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: GSS_HEX.neutral500,
      fontStyle: '900',
    }).setOrigin(0, 0),
  );
  root.add(
    scene.add.text(LX, -150, 'Stop as close as possible', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '13px',
      color: GSS_HEX.neutral700,
      fontStyle: 'bold',
    }).setOrigin(0, 0),
  );

  const statusBadgeBg = scene.add.rectangle(70, -158, 98, 24, GSS.ink);
  const statusBadge = scene.add
    .text(70, -158, 'Ready', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: '900',
    })
    .setOrigin(0.5);
  root.add([statusBadgeBg, statusBadge]);

  root.add(
    scene.add.text(LX, -108, 'Target amount', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: GSS_HEX.neutral500,
      fontStyle: '900',
    }).setOrigin(0, 0),
  );
  const targetText = scene.add.text(LX, -78, formatMoney(12), {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '48px',
    color: GSS_HEX.ink,
    fontStyle: '900',
  }).setOrigin(0, 0);
  root.add(targetText);

  const showingCard = scene.add.rectangle(0, 2, 228, 72, 0xffffff, 0.68);
  showingCard.setStrokeStyle(1, GSS.ink, 0.12);
  root.add(showingCard);
  root.add(
    scene.add.text(LX, -22, 'Now showing', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: GSS_HEX.neutral500,
      fontStyle: '900',
    }).setOrigin(0, 0),
  );
  const showingText = scene.add.text(LX, 6, formatMoney(0), {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '30px',
    color: GSS_HEX.ink,
    fontStyle: '900',
  }).setOrigin(0, 0);
  root.add(showingText);

  const lights = scene.add.rectangle(0, 82, 228, 78, GSS.ink);
  root.add(lights);
  root.add(
    scene.add.text(LX, 46, 'Panel lights', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: 'rgba(255,255,255,0.6)',
      fontStyle: '900',
    }).setOrigin(0, 0),
  );
  const flowStatusText = scene.add.text(100, 46, 'No flow', {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontStyle: '900',
  }).setOrigin(1, 0);
  root.add(flowStatusText);

  const powerLight = scene.add.ellipse(-68, 88, 10, 10, GSS.led);
  const flowLight = scene.add.ellipse(0, 88, 10, 10, 0xffffff, 0.18);
  const exactLight = scene.add.ellipse(68, 88, 10, 10, 0xffffff, 0.18);
  root.add([powerLight, flowLight, exactLight]);
  [-68, 0, 68].forEach((lx, i) => {
    root.add(
      scene.add.text(lx, 104, ['Power', 'Flow', 'Exact'][i]!, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.62)',
        fontStyle: '900',
      }).setOrigin(0.5, 0),
    );
  });

  const scoreText = scene.add.text(0, 138, 'Session: 0 pts', {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '13px',
    color: GSS_HEX.neutral700,
    fontStyle: 'bold',
  }).setOrigin(0.5, 0);
  root.add(scoreText);

  return {
    root,
    targetText,
    showingText,
    statusBadge,
    statusBadgeBg,
    flowLight,
    exactLight,
    scoreText,
    flowStatusText,
  };
}

export function setFlowLight(flow: Phaser.GameObjects.Ellipse, on: boolean): void {
  flow.setFillStyle(on ? GSS.led : 0xffffff, on ? 1 : 0.18);
}

export function setExactLight(exact: Phaser.GameObjects.Ellipse, on: boolean): void {
  exact.setFillStyle(on ? GSS.led : 0xffffff, on ? 1 : 0.18);
}

export function setStatusBadge(
  badge: Phaser.GameObjects.Text,
  bg: Phaser.GameObjects.Rectangle,
  mode: 'ready' | 'flow' | 'zone' | 'over',
): void {
  const styles = {
    ready: { text: 'Ready', color: GSS.ink },
    flow: { text: 'Keep pumping', color: GSS.ink },
    zone: { text: 'Perfect zone', color: GSS.secondary },
    over: { text: 'Over target', color: GSS.primary },
  };
  const s = styles[mode];
  badge.setText(s.text);
  bg.setFillStyle(s.color);
  badge.setColor('#ffffff');
}