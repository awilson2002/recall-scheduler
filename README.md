# recall

A small implementation of the SM-2 spaced repetition algorithm, plus a CLI
for running flashcard reviews against a JSON deck file.

## the problem

If you review a flashcard right after learning it, and then again a day
later, and then a week later, and then a month later, you remember it with
far less total study time than if you'd reviewed it ten times in the first
week. Spaced repetition schedulers exist to compute those gaps automatically:
after each review they look at whether you recalled the card and how easily,
and use that to decide when it should come back.

This is the same algorithm SuperMemo shipped in 1987 and the one Anki was
originally built on: each card tracks an interval, a repetition count, and
an "ease factor" that speeds up or slows down its interval growth based on
how you've been doing on it.

## library usage

```ts
import { createCard, review, isDue } from "./src/scheduler.js";

let card = createCard("1", "capital of Peru", "Lima");

// later, after the learner answers:
card = review(card, 4); // grade 0-5, 5 = trivially easy, 0 = total blank

if (isDue(card)) {
  // time to show it again
}
```

`review` is pure — it returns a new card rather than mutating the one you
pass in, so you can decide for yourself how to persist the result.

## CLI usage

The CLI stores a deck as a flat JSON file you point it at:

```
npx tsc                              # compile src/ to dist/
node dist/cli.js add deck.json "capital of Peru" "Lima"
node dist/cli.js due deck.json       # list cards due for review
node dist/cli.js review deck.json   # walk through due cards interactively
```

`review` shows the front, waits for you to press enter, reveals the back,
then asks you to grade yourself from 0 to 5. The deck file is rewritten
after every single grade, so an interrupted session doesn't lose progress.

## tests

```
npm test    # compiles src/ and runs src/scheduler.test.ts under node --test
```

## status

Early. The scheduler and CLI both work end to end, but there's no deck
import/export beyond hand-editing the JSON, and no way to browse or edit
cards after they're added. See the code in `src/` — it's short enough to
read in one sitting.

## license

MIT, see LICENSE.
