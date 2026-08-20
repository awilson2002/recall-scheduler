// SM-2 scheduling. Reference: P.A. Wozniak's SuperMemo 2 algorithm (1987),
// the same formula Anki's older scheduler was built on.

export interface Card {
  id: string;
  front: string;
  back: string;
  due: string; // ISO date, review is due when due <= now
  interval: number; // days until next review, once graduated
  repetitions: number; // consecutive correct recalls
  easeFactor: number; // multiplier applied to interval on a correct recall
  lapses: number; // total times this card has been forgotten
}

// Grade follows the original SM-2 scale: 0-2 is a failed recall (the card
// is reset), 3-5 is a pass, with 5 meaning "trivially easy".
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export function createCard(id: string, front: string, back: string, now = new Date()): Card {
  return {
    id,
    front,
    back,
    due: now.toISOString(),
    interval: 0,
    repetitions: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    lapses: 0,
  };
}

export function isDue(card: Card, now = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

// Applies one review outcome and returns the card's next state. Does not
// mutate the input, so callers can keep the old card around if needed.
export function review(card: Card, grade: Grade, now = new Date()): Card {
  const nextEase = clampEase(
    card.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  let interval: number;
  let repetitions: number;
  let lapses = card.lapses;

  if (grade < 3) {
    // A failed recall restarts the graduation sequence but keeps the
    // ease factor's slow decay, mirroring how Anki's SM-2 clone treats
    // a lapse as a setback rather than a full reset of learning history.
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(card.interval * nextEase);
    }
  }

  const due = new Date(now);
  due.setDate(due.getDate() + interval);

  return {
    ...card,
    due: due.toISOString(),
    interval,
    repetitions,
    easeFactor: nextEase,
    lapses,
  };
}

function clampEase(value: number): number {
  return Math.max(MIN_EASE_FACTOR, value);
}
