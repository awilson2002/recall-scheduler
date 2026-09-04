import { test } from "node:test";
import assert from "node:assert/strict";
import { createCard, review } from "./scheduler.js";
import type { Deck } from "./store.js";
import { toCsv, fromCsv } from "./importexport.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

test("toCsv then fromCsv round-trips a deck's full scheduling state", () => {
  let card = createCard("1", "capital of Peru", "Lima", NOW);
  card = review(card, 4, NOW);
  const deck: Deck = { cards: [card] };

  const csv = toCsv(deck);
  const { deck: reimported, added, updated } = fromCsv(csv, { cards: [] });

  assert.equal(added, 1);
  assert.equal(updated, 0);
  assert.deepEqual(reimported.cards[0], card);
});

test("fromCsv updates existing cards by id instead of duplicating them", () => {
  const card = createCard("1", "capital of Peru", "Lima", NOW);
  const deck: Deck = { cards: [card] };
  const csv = toCsv(deck);

  const { deck: merged, added, updated } = fromCsv(csv, deck);

  assert.equal(added, 0);
  assert.equal(updated, 1);
  assert.equal(merged.cards.length, 1);
});

test("fromCsv with a bare front,back header adds new cards with fresh scheduling state", () => {
  const csv = 'front,back\n"capital of Peru",Lima\n"capital of Chile",Santiago\n';
  const { deck, added, updated } = fromCsv(csv, { cards: [] });

  assert.equal(added, 2);
  assert.equal(updated, 0);
  assert.equal(deck.cards[0].front, "capital of Peru");
  assert.equal(deck.cards[0].back, "Lima");
  assert.equal(deck.cards[0].interval, 0);
  assert.equal(deck.cards[1].id, "2");
});

test("fromCsv handles quoted fields containing commas and embedded quotes", () => {
  const csv = 'front,back\n"say ""hi"", or ""hello""","greeting, informal"\n';
  const { deck } = fromCsv(csv, { cards: [] });

  assert.equal(deck.cards[0].front, 'say "hi", or "hello"');
  assert.equal(deck.cards[0].back, "greeting, informal");
});

test("fromCsv rejects a header it does not recognize", () => {
  assert.throws(() => fromCsv("foo,bar\n1,2\n", { cards: [] }), /unrecognized CSV header/);
});

test("fromCsv on an empty string leaves the deck untouched", () => {
  const { deck, added, updated } = fromCsv("", { cards: [] });
  assert.equal(added, 0);
  assert.equal(updated, 0);
  assert.equal(deck.cards.length, 0);
});
