/**
 * assign-v2-types.js
 *
 * Sprint 1: assigns one of the 9 v2 battle types to all 200 cards in cards.ts.
 * Old type values are discarded.
 *
 * Distribution targets:
 *   Cosmic: 16 cards (intentionally rare)
 *   All other 8 types: 23 cards each  (8 × 23 + 16 = 200)
 *
 * Stamina assignment is handled separately in Sprint 2.
 *
 * Usage: node scripts/assign-v2-types.js
 */

const fs   = require('fs');
const path = require('path');

const TYPE_COUNTS = {
  Blaster:   23,
  Magic:     23,
  Psychic:   23,
  Shadow:    23,
  Tank:      23,
  Speedster: 23,
  Nature:    23,
  Tech:      23,
  Cosmic:    16,
};

const total = Object.values(TYPE_COUNTS).reduce((a, b) => a + b, 0);
if (total !== 200) throw new Error(`Type counts sum to ${total}, expected 200`);

// Build a shuffled pool of 200 type assignments
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let typePool = [];
for (const [type, count] of Object.entries(TYPE_COUNTS)) {
  for (let i = 0; i < count; i++) typePool.push(type);
}
typePool = shuffle(typePool);

// Read cards.ts
const cardsPath = path.join(__dirname, '../src/data/cards.ts');
let result = fs.readFileSync(cardsPath, 'utf8');

// Find start position of each card block
const cardStartRegex = /\{\s*\n\s*"id":\s*\d+/g;
const allCardMatches = [];
let m;
while ((m = cardStartRegex.exec(result)) !== null) {
  allCardMatches.push(m.index);
}

if (allCardMatches.length !== 200) {
  throw new Error(`Expected 200 card blocks, found ${allCardMatches.length}`);
}

// Work backwards to preserve string positions
for (let i = allCardMatches.length - 1; i >= 0; i--) {
  const startPos = allCardMatches[i];
  const endPos   = i + 1 < allCardMatches.length ? allCardMatches[i + 1] : result.length;
  const block    = result.slice(startPos, endPos);

  const newBlock = block.replace(/"type":\s*"[^"]*"/, `"type": "${typePool[i]}"`);
  result = result.slice(0, startPos) + newBlock + result.slice(endPos);
}

fs.writeFileSync(cardsPath, result, 'utf8');

// Print summary
const typeCounts = {};
for (const [, type] of result.matchAll(/"type":\s*"([^"]+)"/g)) {
  typeCounts[type] = (typeCounts[type] || 0) + 1;
}

console.log('\nType distribution:');
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(12)} ${count} cards`);
}
console.log(`\nTotal: ${Object.values(typeCounts).reduce((a, b) => a + b, 0)} cards`);
console.log('\nDone. Run: npx tsc --noEmit');
