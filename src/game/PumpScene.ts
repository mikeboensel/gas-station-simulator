import Phaser from 'phaser';
import {
  DEFAULT_PUMP_CONFIG,
  createPump,
  formatGallons,
  formatMoney,
  gradeStop,
  inPerfectZone,
  pickTargetDollars,
  requestStop,
  startPump,
  tickPump,
  type PumpSnapshot,
} from './pumpModel';
import { drawForecourt } from './forecourtBg';
import {
  buildPumpCabinet,
  buildStatsPanel,
  setExactLight,
  setFlowLight,
  setHoldButtonState,
  setLedSale,
  setStatusBadge,
  type PumpCabinet,
  type StatsPanel,
} from './pumpUi';
import { GSS, GSS_HEX } from './theme';
import { scenePanel } from './uiChrome';

type RoundPhase = 'ready' | 'pumping' | 'result';

const WIDTH = 820;
const HEIGHT = 720;

export class PumpScene extends Phaser.Scene {
  private pump: PumpSnapshot = createPump();
  private targetDollars = 12;
  private phase: RoundPhase = 'ready';
  private totalScore = 0;
  private holdActive = false;

  private stats!: StatsPanel;
  private cabinet!: PumpCabinet;
  private flowTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: 'PumpScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GSS.skyLow);
    drawForecourt(this, WIDTH, HEIGHT);
    this.targetDollars = pickTargetDollars();

    this.add
      .text(24, 18, 'GAS STATION SIMULATOR', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '13px',
        color: GSS_HEX.ink,
        fontStyle: '900',
        backgroundColor: 'rgba(255,255,255,0.72)',
        padding: { x: 14, y: 8 },
      })
      .setDepth(30);

    const panelY = 388;
    scenePanel(this, 228, panelY, 308, 448, 11);
    scenePanel(this, 596, panelY, 348, 548, 11);

    this.stats = buildStatsPanel(this, 228, panelY);
    this.cabinet = buildPumpCabinet(this, 596, panelY + 12);

    this.resetRound();
    this.wireInput();
    this.refreshHud();
  }

  private wireInput(): void {
    this.input.keyboard?.on('keydown-SPACE', () => this.onPumpDown());
    this.input.keyboard?.on('keyup-SPACE', () => this.onPumpUp());
    this.input.keyboard?.on('keydown-R', () => this.tryNextRound());
    this.input.keyboard?.on('keydown-ENTER', () => this.tryNextRound());
    this.input.on('pointerdown', () => this.onPumpDown());
    this.input.on('pointerup', () => this.onPumpUp());
    this.input.on('gameout', () => {
      if (this.holdActive) {
        this.onPumpUp();
      }
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.pump = tickPump(this.pump, dt, DEFAULT_PUMP_CONFIG);
    this.syncDisplays();

    if (
      this.phase === 'pumping' &&
      !this.pump.pumping &&
      !this.pump.pendingStop
    ) {
      this.finishRound();
    }
  }

  private syncDisplays(): void {
    const amount = this.pump.dollars;
    this.cabinet.saleText.setText(formatMoney(amount));
    this.cabinet.gallonsText.setText(formatGallons(this.pump.gallons).replace(' gal', ''));
    this.stats.showingText.setText(formatMoney(amount));

    const over = amount > this.targetDollars;
    const flowing = this.pump.pumping || this.pump.pendingStop;
    this.stats.showingText.setColor(over ? GSS_HEX.primary : GSS_HEX.ink);
    setLedSale(this.cabinet.saleText, over ? 'warn' : flowing ? 'normal' : 'normal');
    this.cabinet.meterStatus.setText(flowing ? 'Pumping' : 'Ready');
    this.stats.flowStatusText.setText(flowing ? 'Fuel flowing' : 'No flow');
    setFlowLight(this.stats.flowLight, flowing);

    const zone = inPerfectZone(this.targetDollars, amount) && amount > 0;
    setExactLight(this.stats.exactLight, zone);

    if (this.phase === 'pumping') {
      if (over) {
        setStatusBadge(this.stats.statusBadge, this.stats.statusBadgeBg, 'over');
      } else if (zone) {
        setStatusBadge(this.stats.statusBadge, this.stats.statusBadgeBg, 'zone');
      } else {
        setStatusBadge(this.stats.statusBadge, this.stats.statusBadgeBg, 'flow');
      }
    }
  }

  private onPumpDown(): void {
    if (this.phase === 'result') {
      this.tryNextRound();
      return;
    }
    if (this.phase === 'ready') {
      this.phase = 'pumping';
      setStatusBadge(this.stats.statusBadge, this.stats.statusBadgeBg, 'flow');
    }
    this.holdActive = true;
    this.pump = startPump(this.pump);
    setHoldButtonState(
      this.cabinet.holdButtonBg,
      this.cabinet.holdButtonShadow,
      this.cabinet.holdLabel,
      true,
    );
    this.pulseHold(true);
  }

  private onPumpUp(): void {
    if (this.phase !== 'pumping' || !this.holdActive) {
      return;
    }
    this.holdActive = false;
    this.pump = requestStop(this.pump, DEFAULT_PUMP_CONFIG);
    setHoldButtonState(
      this.cabinet.holdButtonBg,
      this.cabinet.holdButtonShadow,
      this.cabinet.holdLabel,
      false,
    );
    this.pulseHold(false);
  }

  private finishRound(): void {
    this.phase = 'result';
    this.holdActive = false;
    this.pulseHold(false);
    setHoldButtonState(
      this.cabinet.holdButtonBg,
      this.cabinet.holdButtonShadow,
      this.cabinet.holdLabel,
      false,
    );

    const grade = gradeStop(this.targetDollars, this.pump.dollars);
    setLedSale(this.cabinet.saleText, grade.over ? 'warn' : 'good');
    setExactLight(this.stats.exactLight, inPerfectZone(this.targetDollars, this.pump.dollars));
    setStatusBadge(
      this.stats.statusBadge,
      this.stats.statusBadgeBg,
      grade.over ? 'over' : inPerfectZone(this.targetDollars, this.pump.dollars) ? 'zone' : 'ready',
    );

    if (!grade.over) {
      this.totalScore += grade.score;
    }

    const detail = grade.over
      ? grade.label
      : `${grade.label} · ${grade.centsOff.toFixed(0)}¢ short · +${grade.score}`;

    this.stats.scoreText.setText(`${detail}\nSession: ${this.totalScore} pts`);
  }

  private tryNextRound(): void {
    if (this.phase !== 'result') {
      return;
    }
    this.targetDollars = pickTargetDollars();
    this.resetRound();
    this.refreshHud();
  }

  private resetRound(): void {
    this.pump = createPump();
    this.phase = 'ready';
    this.holdActive = false;
    setLedSale(this.cabinet.saleText, 'normal');
    setFlowLight(this.stats.flowLight, false);
    setExactLight(this.stats.exactLight, false);
    setStatusBadge(this.stats.statusBadge, this.stats.statusBadgeBg, 'ready');
    this.pulseHold(false);
  }

  private refreshHud(): void {
    this.stats.targetText.setText(formatMoney(this.targetDollars));
    this.stats.showingText.setText(formatMoney(0));
    this.stats.showingText.setColor(GSS_HEX.ink);
    this.cabinet.saleText.setText(formatMoney(0));
    this.cabinet.gallonsText.setText('0.000');
    this.stats.scoreText.setText(`Session: ${this.totalScore} pts`);
  }

  private pulseHold(active: boolean): void {
    this.flowTween?.stop();
    if (!active) {
      this.cabinet.holdButton.setScale(1);
      return;
    }
    this.flowTween = this.tweens.add({
      targets: this.cabinet.holdButton,
      scaleX: 1.01,
      scaleY: 0.99,
      duration: 160,
      yoyo: true,
      repeat: -1,
    });
  }
}

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'app',
  scene: [PumpScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};