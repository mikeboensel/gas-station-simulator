import Phaser from 'phaser';
import type { Grade } from './model';
import { money } from './theme';

const pick = <T>(items: T[]): T => Phaser.Utils.Array.GetRandom(items);

export function greeting(target: number): string {
  const t = money(target);
  return pick([
    `Exactly ${t}, please!`,
    `${t} on pump 4. Exactly.`,
    `I've got ${t} in cash. No more.`,
    `${t}, and not a penny over!`,
    `Fill 'er up… to ${t}.`,
    `Just ${t}. I'm counting.`,
  ]);
}

export function reaction(grade: Grade): string {
  if (grade.over) {
    return pick(['MY CAR!!', 'I said EXACTLY!', 'Was that… my bumper?', "I'm not paying for that.", 'Smells like… regret.']);
  }
  if (grade.perfect) {
    if (grade.streak >= 3) return pick(['Legend. Keep the change!', 'Are you a robot?', 'Unreal. Again!']);
    return pick(['To the cent! Keep the change.', 'Wow, perfect!', 'Now THAT is service.', 'Chef’s kiss.']);
  }
  if (grade.centsOff <= 5) return pick(['So close! Nice.', 'I can live with that.', 'Pretty much perfect.']);
  if (grade.score > 0) return pick(['Eh, close enough.', 'Hmm. Okay.', 'Could be closer…']);
  return pick(['That’s it?', 'I wanted MORE gas.', 'Are we done already?']);
}

export function waitingLine(): string {
  return pick(['Any day now…', '*taps steering wheel*', 'Hello? Pump?', 'I have places to be.']);
}
