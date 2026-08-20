import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Card } from "./scheduler.js";

export interface Deck {
  cards: Card[];
}

export function loadDeck(path: string): Deck {
  if (!existsSync(path)) {
    return { cards: [] };
  }
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as Deck;
  if (!Array.isArray(parsed.cards)) {
    throw new Error(`${path} does not look like a deck file (missing "cards" array)`);
  }
  return parsed;
}

export function saveDeck(path: string, deck: Deck): void {
  writeFileSync(path, JSON.stringify(deck, null, 2) + "\n", "utf8");
}

export function nextId(deck: Deck): string {
  let max = 0;
  for (const card of deck.cards) {
    const n = Number(card.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}
