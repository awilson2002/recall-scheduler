// CSV import/export for decks. Two header shapes are recognized on import:
// the full field set (round-trips scheduling state, so it doubles as a
// backup format) and a bare "front,back" pair (for bulk-adding new cards
// from a spreadsheet or word list, which get fresh scheduling state).
import { createCard, type Card } from "./scheduler.js";
import type { Deck } from "./store.js";
import { nextId } from "./store.js";

const FULL_HEADER = ["id", "front", "back", "due", "interval", "repetitions", "easeFactor", "lapses"];
const SIMPLE_HEADER = ["front", "back"];

export function toCsv(deck: Deck): string {
  const rows = [
    FULL_HEADER,
    ...deck.cards.map((c) => [
      c.id,
      c.front,
      c.back,
      c.due,
      String(c.interval),
      String(c.repetitions),
      String(c.easeFactor),
      String(c.lapses),
    ]),
  ];
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

export interface ImportResult {
  deck: Deck;
  added: number;
  updated: number;
}

export function fromCsv(text: string, deck: Deck): ImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { deck, added: 0, updated: 0 };
  }

  const header = rows[0].map((cell) => cell.trim());
  const body = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (headerMatches(header, SIMPLE_HEADER)) {
    let added = 0;
    for (const row of body) {
      const [front, back] = row;
      const card = createCard(nextId(deck), front ?? "", back ?? "");
      deck.cards.push(card);
      added++;
    }
    return { deck, added, updated: 0 };
  }

  if (headerMatches(header, FULL_HEADER)) {
    let added = 0;
    let updated = 0;
    for (const row of body) {
      const card = parseFullRow(header, row);
      const index = deck.cards.findIndex((c) => c.id === card.id);
      if (index === -1) {
        deck.cards.push(card);
        added++;
      } else {
        deck.cards[index] = card;
        updated++;
      }
    }
    return { deck, added, updated };
  }

  throw new Error(
    `unrecognized CSV header. Expected "${SIMPLE_HEADER.join(",")}" or "${FULL_HEADER.join(",")}"`
  );
}

function headerMatches(header: string[], expected: string[]): boolean {
  if (header.length !== expected.length) return false;
  return header.every((cell, i) => cell.toLowerCase() === expected[i].toLowerCase());
}

function parseFullRow(header: string[], row: string[]): Card {
  const get = (name: string): string => row[header.indexOf(name)] ?? "";

  const id = get("id");
  const front = get("front");
  const back = get("back");
  const due = get("due");
  const interval = Number(get("interval"));
  const repetitions = Number(get("repetitions"));
  const easeFactor = Number(get("easeFactor"));
  const lapses = Number(get("lapses"));

  if (!id) throw new Error("row is missing an id");
  if (Number.isNaN(new Date(due).getTime())) throw new Error(`row ${id} has an invalid due date: "${due}"`);
  if (!Number.isFinite(interval)) throw new Error(`row ${id} has an invalid interval: "${get("interval")}"`);
  if (!Number.isFinite(repetitions)) throw new Error(`row ${id} has invalid repetitions: "${get("repetitions")}"`);
  if (!Number.isFinite(easeFactor)) throw new Error(`row ${id} has an invalid easeFactor: "${get("easeFactor")}"`);
  if (!Number.isFinite(lapses)) throw new Error(`row ${id} has invalid lapses: "${get("lapses")}"`);

  return { id, front, back, due, interval, repetitions, easeFactor, lapses };
}

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r") {
      i++;
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
