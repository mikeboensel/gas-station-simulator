/** Pure pump simulation: no Phaser. Mirrors the Godot build's mechanics. */

export const PRICE_PER_GALLON = 3;
export const STOP_LATENCY_SEC = 0.14;
export const PERFECT_ZONE_CENTS = 5;
export const FALSE_START_DOLLARS = 1;
const TARGET_MIN = 6;
const TARGET_MAX = 10;
const TARGET_STEP = 0.25;
const FLOW_RANGE = [0.35, 1.3] as const;
/** Over the last stretch the nozzle eases off to this fraction of full flow. */
const EASE_OFF_FACTOR = 0.3;
const EASE_OFF_START = 1.5;
const EASE_OFF_END = 0.4;

export type Phase = 'ready' | 'pumping' | 'result';

export interface Grade {
  over: boolean;
  perfect: boolean;
  centsOff: number;
  score: number;
  label: string;
  streak: number;
  multiplier: number;
}

/** Consecutive stops within the perfect zone stack a bonus: ×1, ×1.5, ×2 … capped at ×3. */
export function comboMultiplier(streak: number): number {
  return 1 + 0.5 * clamp(streak - 1, 0, 4);
}

export class PumpModel {
  target = 8;
  flowGallonsPerSec = 0.78;
  gallons = 0;
  dollars = 0;
  pumping = false;
  pendingStop = false;
  phase: Phase = 'ready';
  totalScore = 0;
  streak = 0;
  bestStreak = 0;
  private stopTimer = 0;

  newTarget(): void {
    const steps = Math.round((TARGET_MAX - TARGET_MIN) / TARGET_STEP);
    this.target = TARGET_MIN + TARGET_STEP * Math.floor(Math.random() * (steps + 1));
    // Pick a round length first so big targets don't drag; flow speed follows from it.
    const fullSpeedSecs = 3.4 + Math.random() * 2.2;
    this.flowGallonsPerSec = clamp(
      this.target / PRICE_PER_GALLON / fullSpeedSecs,
      FLOW_RANGE[0],
      FLOW_RANGE[1],
    );
    this.reset();
  }

  reset(): void {
    this.gallons = 0;
    this.dollars = 0;
    this.pumping = false;
    this.pendingStop = false;
    this.stopTimer = 0;
    this.phase = 'ready';
  }

  start(): boolean {
    if (this.phase === 'result' || this.pendingStop || this.pumping) return false;
    this.phase = 'pumping';
    this.pumping = true;
    return true;
  }

  stop(): boolean {
    if (!this.pumping) return false;
    this.pumping = false;
    this.pendingStop = true;
    this.stopTimer = STOP_LATENCY_SEC;
    return true;
  }

  /** Advances flow; returns 'finished' or 'false_start' when the round ends this tick. */
  tick(dt: number): 'finished' | 'false_start' | null {
    let flowTime = 0;
    if (this.pumping) {
      flowTime = dt;
    } else if (this.pendingStop) {
      flowTime = Math.min(dt, this.stopTimer);
      this.stopTimer -= flowTime;
      if (this.stopTimer <= 0) this.pendingStop = false;
    }
    if (flowTime > 0) {
      this.gallons += this.flowGallonsPerSec * this.flowRatio() * flowTime;
      this.dollars = this.gallons * PRICE_PER_GALLON;
    }
    if (this.phase === 'pumping' && !this.pumping && !this.pendingStop) {
      if (this.dollars < FALSE_START_DOLLARS) {
        this.reset();
        return 'false_start';
      }
      this.phase = 'result';
      return 'finished';
    }
    return null;
  }

  grade(): Grade {
    const diff = this.shownCents() - Math.round(this.target * 100);
    if (diff > 0) {
      this.streak = 0;
      return {
        over: true, perfect: false, centsOff: diff, score: 0, label: `Over by ${cents(diff)}`, streak: 0, multiplier: 1,
      };
    }
    const off = -diff;
    this.streak = off <= PERFECT_ZONE_CENTS ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const multiplier = comboMultiplier(this.streak);
    const score = Math.max(0, Math.round((1000 - off * 20) * multiplier));
    this.totalScore += score;
    let label = 'Solid stop';
    if (off === 0) label = 'Perfect stop';
    else if (off <= PERFECT_ZONE_CENTS) label = 'So close';
    else if (off <= 20) label = 'Pretty good';
    else if (score === 0) label = 'Way short';
    return { over: false, perfect: off === 0, centsOff: off, score, label, streak: this.streak, multiplier };
  }

  /** Testing aid: ends the flow exactly on `goalCents`. */
  forceStopAt(goalCents: number): void {
    this.dollars = goalCents / 100 + 1e-6;
    this.gallons = this.dollars / PRICE_PER_GALLON;
    this.pumping = false;
    this.pendingStop = false;
  }

  flowing(): boolean {
    return this.pumping || this.pendingStop;
  }

  flowRatio(): number {
    const t = smoothstep(this.target - EASE_OFF_START, this.target - EASE_OFF_END, this.dollars);
    return 1 + (EASE_OFF_FACTOR - 1) * t;
  }

  dollarsPerSec(): number {
    return this.flowGallonsPerSec * PRICE_PER_GALLON * this.flowRatio();
  }

  speedLabel(): string {
    const perSec = this.flowGallonsPerSec * PRICE_PER_GALLON;
    return perSec < 1.6 ? 'Slow' : perSec < 2.4 ? 'Steady' : 'Fast';
  }

  /** The sale as the pump shows it: truncated to whole cents. */
  shownCents(): number {
    return Math.floor(this.dollars * 100 + 1e-6);
  }

  shownDollars(): number {
    return this.shownCents() / 100;
  }

  centsLeft(): number {
    return Math.round(this.target * 100) - this.shownCents();
  }

  isOver(): boolean {
    return this.centsLeft() < 0;
  }

  inPerfectZone(): boolean {
    const left = this.centsLeft();
    return this.shownCents() > 0 && left >= 0 && left <= PERFECT_ZONE_CENTS;
  }

  /** 0 far from the target, 1 at it. */
  tension(): number {
    if (this.dollars <= 0) return 0;
    return clamp(1 - (this.target - this.dollars) / 2.5, 0, 1);
  }
}

export function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
