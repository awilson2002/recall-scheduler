import { test } from "node:test";
import assert from "node:assert/strict";
import { createCard, review, isDue, type Card } from "./scheduler.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

test("createCard starts unlearned and due immediately", () => {
  const card = createCard("1", "front", "back", NOW);
  assert.equal(card.interval, 0);
  assert.equal(card.repetitions, 0);
  assert.equal(card.lapses, 0);
  assert.equal(card.easeFactor, 2.5);
  assert.ok(isDue(card, NOW));
});

test("isDue is false before the due date and true once it arrives", () => {
  const card = createCard("1", "front", "back", NOW);
  const before = new Date(NOW.getTime() - 1000);
  const after = new Date(NOW.getTime() + 1000);
  assert.equal(isDue(card, before), false);
  assert.equal(isDue(card, after), true);
});

test("first and second passing reviews use the fixed 1 and 6 day intervals", () => {
  let card = createCard("1", "front", "back", NOW);

  card = review(card, 4, NOW);
  assert.equal(card.repetitions, 1);
  assert.equal(card.interval, 1);
  assert.equal(daysBetween(card.due, NOW.toISOString()), 1);

  card = review(card, 4, NOW);
  assert.equal(card.repetitions, 2);
  assert.equal(card.interval, 6);
  assert.equal(daysBetween(card.due, NOW.toISOString()), 6);
});

test("third and later passing reviews multiply the prior interval by the ease factor", () => {
  let card: Card = createCard("1", "front", "back", NOW);
  card = review(card, 4, NOW); // repetitions 1, interval 1
  card = review(card, 4, NOW); // repetitions 2, interval 6

  const easeBefore = card.easeFactor;
  card = review(card, 4, NOW); // repetitions 3
  assert.equal(card.repetitions, 3);
  assert.equal(card.interval, Math.round(6 * easeBefore));
});

test("a passing grade of 4 leaves the ease factor unchanged", () => {
  const card = createCard("1", "front", "back", NOW);
  const reviewed = review(card, 4, NOW);
  assert.equal(reviewed.easeFactor, card.easeFactor);
});

test("a trivially easy grade of 5 raises the ease factor", () => {
  const card = createCard("1", "front", "back", NOW);
  const reviewed = review(card, 5, NOW);
  assert.ok(reviewed.easeFactor > card.easeFactor);
});

test("a failed recall resets repetitions to 0, sets a 1 day interval, and counts a lapse", () => {
  let card = createCard("1", "front", "back", NOW);
  card = review(card, 4, NOW);
  card = review(card, 4, NOW);
  assert.equal(card.repetitions, 2);

  const failed = review(card, 2, NOW);
  assert.equal(failed.repetitions, 0);
  assert.equal(failed.interval, 1);
  assert.equal(failed.lapses, 1);
  assert.equal(daysBetween(failed.due, NOW.toISOString()), 1);
});

test("a failed recall still lowers the ease factor, but never below 1.3", () => {
  let card = createCard("1", "front", "back", NOW);
  for (let i = 0; i < 30; i++) {
    card = review(card, 0, NOW);
  }
  assert.equal(card.easeFactor, 1.3);
});

test("review does not mutate the card it is given", () => {
  const card = createCard("1", "front", "back", NOW);
  const snapshot = { ...card };
  review(card, 4, NOW);
  assert.deepEqual(card, snapshot);
});
