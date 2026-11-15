import Phaser from 'phaser';
import { DEFAULT_PUMP_CONFIG, formatMoney } from './pumpModel';
import { GSS, GSS_HEX } from './theme';
import { meterScreenBg, pumpCabinetBody } from './uiChrome';

export interface PumpCabinet {
  root: Phaser.GameObjects.Container;
  holdButton: Phaser.GameObjects.Container;
  holdButtonBg: Phaser.GameObjects.Rectangle;
  holdButtonShadow: Phaser.GameObjects.Rectangle;
  holdLabel: Phaser.GameObjects.Text;
  saleText: Phaser.GameObjects.Text;
  gallonsText: Phaser.GameObjects.Text;
  priceText: Phaser.GameObjects.Text;
  meterStatus: Phaser.GameObjects.Text;
}

function ledRow(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  label: string,
  value: string,
): Phaser.GameObjects.Text {
  parent.add(scene.add.rectangle(0, y, 248, 36, 0xffffff, 0.08));
  parent.add(
    scene.add.text(-112, y, label, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: GSS_HEX.white45,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5),
  );
  const valueText = scene.add.text(112, y, value, {
    fontFamily: 'SFMono-Regular, Consolas, monospace',
    fontSize: '30px',
    color: GSS_HEX.led,
    fontStyle: '900',
  }).setOrigin(1, 0.5);
  parent.add(valueText);
  return valueText;
}

function addPayGrid(scene: Phaser.Scene, root: Phaser.GameObjects.Container): void {
  const reader = scene.add.rectangle(-64, 150, 150, 58, GSS.ink);
  root.add(reader);
  root.add(
    scene.add.text(-122, 122, 'Card reader', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: 'rgba(255,255,255,0.6)',
      fontStyle: 'bold',
    }).setOrigin(0, 0),
  );
  root.add(
    scene.add.text(-12, 122, 'Approved', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: 'rgba(255,255,255,0.6)',
      fontStyle: 'bold',
    }).setOrigin(1, 0),
  );
  root.add(scene.add.rectangle(-122, 142, 116, 6, 0xffffff, 0.16).setOrigin(0, 0));
  root.add(scene.add.rectangle(-122, 156, 116, 14, 0x2f2f2f).setOrigin(0, 0));

  const pad = scene.add.rectangle(78, 150, 110, 58, 0x525252);
  root.add(pad);
  for (let n = 0; n < 9; n++) {
    const col = n % 3;
    const row = Math.floor(n / 3);
    const key = scene.add.rectangle(46 + col * 36, 126 + row * 18, 30, 14, GSS.ink);
    root.add(key);
    root.add(
      scene.add.text(46 + col * 36, 126 + row * 18, `${n + 1}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)',
        fontStyle: '900',
      }).setOrigin(0.5),
    );
  }
}

export function buildPumpCabinet(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PumpCabinet {
  const root = scene.add.container(x, y).setDepth(14);
  const w = 300;
  const h = 500;
  pumpCabinetBody(scene, root, w, h);

  const header = scene.add.rectangle(0, -h / 2 + 6, 224, 48, GSS.primary);
  root.add(header);
  root.add(scene.add.circle(-78, -h / 2 + 6, 8, GSS.accent));
  root.add(
    scene.add.text(8, -h / 2 + 6, 'Fuel Shift', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: '900',
    }).setOrigin(0.5),
  );

  const topBar = scene.add.rectangle(0, -h / 2 + 52, w - 20, 34, GSS.beige);
  root.add(topBar);
  root.add(
    scene.add.text(-132, -h / 2 + 52, 'Pump 02', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: GSS_HEX.neutral700,
      fontStyle: '900',
    }).setOrigin(0, 0.5),
  );
  root.add(
    scene.add.text(0, -h / 2 + 52, 'Self serve', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: GSS_HEX.neutral700,
      fontStyle: '900',
    }).setOrigin(0.5),
  );
  root.add(
    scene.add.text(132, -h / 2 + 52, 'Pay at pump', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      color: GSS_HEX.neutral700,
      fontStyle: '900',
    }).setOrigin(1, 0.5),
  );

  const meterScreen = scene.add.container(0, -118);
  root.add(meterScreen);
  meterScreenBg(scene, meterScreen, 272, 176);
  meterScreen.add(scene.add.rectangle(0, -64, 248, 1, 0xffffff, 0.1));
  meterScreen.add(
    scene.add.text(-112, -74, 'Regular unleaded', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: GSS_HEX.white54,
      fontStyle: '900',
    }).setOrigin(0, 0.5),
  );
  const meterStatus = scene.add.text(112, -74, 'Ready', {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '11px',
    color: GSS_HEX.white54,
    fontStyle: '900',
  }).setOrigin(1, 0.5);
  meterScreen.add(meterStatus);

  const saleText = ledRow(scene, meterScreen, -24, 'Sale', '$0.00');
  const gallonsText = ledRow(scene, meterScreen, 18, 'Gallons', '0.000');
  const priceText = ledRow(
    scene,
    meterScreen,
    60,
    'Price/Gal',
    formatMoney(DEFAULT_PUMP_CONFIG.pricePerGallon),
  );

  [87, 89, 93].forEach((oct, i) => {
    const gx = -92 + i * 92;
    const gy = -4;
    const card = scene.add.rectangle(gx, gy, 82, 72, 0xffffff, i === 0 ? 0.9 : 0.5);
    card.setStrokeStyle(1, GSS.ink, 0.1);
    root.add(card);
    root.add(scene.add.circle(gx, gy - 16, 18, GSS.accent));
    root.add(
      scene.add.text(gx, gy - 16, `${oct}`, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        color: GSS_HEX.ink,
        fontStyle: '900',
      }).setOrigin(0.5),
    );
    root.add(
      scene.add.text(gx, gy + 20, 'Regular', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '9px',
        color: GSS_HEX.neutral500,
        fontStyle: '900',
      }).setOrigin(0.5, 0),
    );
  });

  addPayGrid(scene, root);

  const holdButtonShadow = scene.add.rectangle(0, 218, w - 28, 64, GSS.primaryDark);
  const holdButtonBg = scene.add.rectangle(0, 211, w - 28, 64, GSS.primary);
  const holdLabel = scene.add.text(0, 211, 'Hold to pump', {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '22px',
    color: '#ffffff',
    fontStyle: '900',
  }).setOrigin(0.5);
  const holdButton = scene.add.container(0, 0, [holdButtonShadow, holdButtonBg, holdLabel]);
  root.add(holdButton);

  const nozzleSide = scene.add.container(-w / 2 - 8, 20);
  nozzleSide.add(scene.add.rectangle(-28, 0, 12, 144, GSS.ink));
  nozzleSide.add(scene.add.rectangle(-8, 80, 72, 10, GSS.ink));
  nozzleSide.add(scene.add.rectangle(38, 64, 48, 26, GSS.ink, 0.96));
  nozzleSide.add(scene.add.rectangle(64, 70, 36, 10, GSS.ink));
  nozzleSide.add(scene.add.rectangle(48, 54, 24, 16, GSS.primary));
  root.addAt(nozzleSide, 0);

  return {
    root,
    holdButton,
    holdButtonBg,
    holdButtonShadow,
    holdLabel,
    saleText,
    gallonsText,
    priceText,
    meterStatus,
  };
}

export function setHoldButtonState(
  bg: Phaser.GameObjects.Rectangle,
  shadow: Phaser.GameObjects.Rectangle,
  label: Phaser.GameObjects.Text,
  pumping: boolean,
): void {
  bg.setFillStyle(pumping ? GSS.secondary : GSS.primary);
  shadow.setFillStyle(pumping ? 0x065a42 : GSS.primaryDark);
  label.setText(pumping ? 'Release to stop' : 'Hold to pump');
  const y = pumping ? 214 : 211;
  bg.y = y;
  shadow.y = y + 7;
  label.y = y;
}

export function setLedSale(
  text: Phaser.GameObjects.Text,
  mode: 'normal' | 'warn' | 'good',
): void {
  const colors = { normal: GSS_HEX.led, warn: GSS_HEX.primary, good: '#7dffb8' };
  text.setColor(colors[mode]);
}