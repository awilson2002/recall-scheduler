#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createCard, isDue, review, type Grade } from "./scheduler.js";
import { loadDeck, saveDeck, nextId } from "./store.js";
import { toCsv, fromCsv } from "./importexport.js";

function usage(): void {
  console.log(
    [
      "usage:",
      "  recall add <deck.json> <front> <back>",
      "  recall due <deck.json>",
      "  recall review <deck.json>",
      "  recall export <deck.json> <out.csv>",
      "  recall import <deck.json> <in.csv>",
    ].join("\n")
  );
}

function cmdAdd(deckPath: string, front: string, back: string): void {
  const deck = loadDeck(deckPath);
  const card = createCard(nextId(deck), front, back);
  deck.cards.push(card);
  saveDeck(deckPath, deck);
  console.log(`added card ${card.id}`);
}

function cmdDue(deckPath: string): void {
  const deck = loadDeck(deckPath);
  const due = deck.cards.filter((c) => isDue(c));
  if (due.length === 0) {
    console.log("nothing due");
    return;
  }
  for (const card of due) {
    console.log(`${card.id}\t${card.front}`);
  }
}

async function cmdReview(deckPath: string): Promise<void> {
  const deck = loadDeck(deckPath);
  const due = deck.cards.filter((c) => isDue(c));
  if (due.length === 0) {
    console.log("nothing due");
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    for (const card of due) {
      console.log(`\n${card.front}`);
      await rl.question("(press enter to reveal) ");
      console.log(card.back);

      let grade: Grade | null = null;
      while (grade === null) {
        const answer = await rl.question("grade 0-5 (0=blackout, 5=trivial): ");
        const n = Number(answer);
        if (Number.isInteger(n) && n >= 0 && n <= 5) {
          grade = n as Grade;
        } else {
          console.log("enter a whole number from 0 to 5");
        }
      }

      const index = deck.cards.findIndex((c) => c.id === card.id);
      deck.cards[index] = review(card, grade);
      saveDeck(deckPath, deck);
    }
  } finally {
    rl.close();
  }
  console.log("\ndone for now");
}

function cmdExport(deckPath: string, outPath: string): void {
  const deck = loadDeck(deckPath);
  writeFileSync(outPath, toCsv(deck), "utf8");
  console.log(`exported ${deck.cards.length} card(s) to ${outPath}`);
}

function cmdImport(deckPath: string, inPath: string): void {
  const deck = loadDeck(deckPath);
  const csv = readFileSync(inPath, "utf8");
  const { added, updated } = fromCsv(csv, deck);
  saveDeck(deckPath, deck);
  console.log(`added ${added} card(s), updated ${updated} card(s)`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "add": {
      const [deckPath, front, back] = rest;
      if (!deckPath || !front || !back) return usage();
      cmdAdd(deckPath, front, back);
      break;
    }
    case "due": {
      const [deckPath] = rest;
      if (!deckPath) return usage();
      cmdDue(deckPath);
      break;
    }
    case "review": {
      const [deckPath] = rest;
      if (!deckPath) return usage();
      await cmdReview(deckPath);
      break;
    }
    case "export": {
      const [deckPath, outPath] = rest;
      if (!deckPath || !outPath) return usage();
      cmdExport(deckPath, outPath);
      break;
    }
    case "import": {
      const [deckPath, inPath] = rest;
      if (!deckPath || !inPath) return usage();
      cmdImport(deckPath, inPath);
      break;
    }
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
