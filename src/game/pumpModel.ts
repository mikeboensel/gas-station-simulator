export interface PumpConfig {
  pricePerGallon: number;
  flowGallonsPerSec: number;
  stopLatencySec: number;
}

export interface PumpSnapshot {
  gallons: number;
  dollars: number;
  pumping: boolean;
  pendingStop: boolean;
  stopTimer: number;
}

export const PERFECT_ZONE_DOLLARS = 0.05;

export const DEFAULT_PUMP_CONFIG: PumpConfig = {
  pricePerGallon: 3,
  flowGallonsPerSec: 0.78,
  stopLatencySec: 0.14,
};

export function dollarsFromTarget(target: number, current: number): number {
  return Math.max(0, target - current);
}

export function inPerfectZone(target: number, current: number): boolean {
  return current <= target && dollarsFromTarget(target, current) <= PERFECT_ZONE_DOLLARS;
}

export function createPump(): PumpSnapshot {
  return {
    gallons: 0,
    dollars: 0,
    pumping: false,
    pendingStop: false,
    stopTimer: 0,
  };
}

export function startPump(snapshot: PumpSnapshot): PumpSnapshot {
  if (snapshot.pendingStop) {
    return snapshot;
  }
  return { ...snapshot, pumping: true };
}

export function requestStop(
  snapshot: PumpSnapshot,
  config: PumpConfig,
): PumpSnapshot {
  if (!snapshot.pumping) {
    return snapshot;
  }
  return {
    ...snapshot,
    pumping: false,
    pendingStop: true,
    stopTimer: config.stopLatencySec,
  };
}

export function tickPump(
  snapshot: PumpSnapshot,
  dt: number,
  config: PumpConfig,
): PumpSnapshot {
  let { gallons, dollars, pumping, pendingStop, stopTimer } = snapshot;

  if (pendingStop && stopTimer > 0) {
    stopTimer = Math.max(0, stopTimer - dt);
    if (stopTimer === 0) {
      pendingStop = false;
    }
  }

  const flowing = pumping || (pendingStop && stopTimer > 0);
  if (flowing) {
    gallons += config.flowGallonsPerSec * dt;
    dollars = gallons * config.pricePerGallon;
  }

  return { gallons, dollars, pumping, pendingStop, stopTimer };
}

export function pickTargetDollars(min = 10, max = 15): number {
  const options: number[] = [];
  for (let dollars = min; dollars <= max; dollars += 2) {
    options.push(dollars);
  }
  return options[Math.floor(Math.random() * options.length)]!;
}

export interface StopGrade {
  over: boolean;
  centsOff: number;
  score: number;
  label: string;
}

export function gradeStop(target: number, final: number): StopGrade {
  if (final > target + 0.000_1) {
    const centsOver = (final - target) * 100;
    return {
      over: true,
      centsOff: centsOver,
      score: 0,
      label: `Over by $${(final - target).toFixed(2)}`,
    };
  }

  const dollarsShort = target - final;
  const centsOff = dollarsShort * 100;
  let score = Math.round(1000 - centsOff * 20);
  score = Math.max(0, score);

  let label = 'Solid stop';
  if (centsOff < 0.5) {
    label = 'Perfect — nailed it!';
  } else if (centsOff <= 5) {
    label = 'So close!';
  } else if (centsOff <= 20) {
    label = 'Pretty good';
  }

  return { over: false, centsOff, score, label };
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatGallons(gallons: number): string {
  return `${gallons.toFixed(3)} gal`;
}