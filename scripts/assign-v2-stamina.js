#!/usr/bin/env node
// assign-v2-stamina.js
//
// Sprint 2: assigns a stamina value to all 200 cards in cards.ts
// based on their v2 type. Cards must already have v2 types assigned
// (run assign-v2-types.js first).
//
// Stamina ranges by type:
//   Tank 12-16 | Nature 10-14 | Tech 10-13 | Magic 9-12
//   Psychic 8-12 | Shadow 8-11 | Cosmic 8-12 | Blaster 6-10 | Speedster 6-9
//
// Usage: node scripts/assign-v2-stamina.js

const fs   = require('fs');
const path = require('path');

const STAMINA_RANGES = {
  Tank:      [12, 16],
  Nature:    [10, 14],
  Tech:      [10, 13],
  Magic:     [9,  12],
  Psychic:   [8,  12],
  Shadow:    [8,  11],
  Cosmic:    [8,  12],
  Blaster:   [6,  10],
  Speedster: [6,   9],
};

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const cardsPath = path.join(__dirname, '../src/data/cards.ts');
let result = fs.readFileSync(cardsPath, 'utf8');

// Find each card block start
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
  let block      = result.slice(startPos, endPos);

  // Extract the type for this card
  const typeMatch = block.match(/"type":\s*"([^"]+)"/);
  if (!typeMatch) { console.warn(`Card at index ${i} has no type — skipping`); continue; }
  const type    = typeMatch[1];
  const range   = STAMINA_RANGES[type];
  if (!range) { console.warn(`Unknown type "${type}" at card index ${i} — skipping`); continue; }

  const stamina = randInt(range[0], range[1]);

  // Remove any existing stamina field, then inject after speed field
  block = block.replace(/,?\s*"stamina":\s*\d+/g, '');
  block = block.replace(
    /("speed":\s*\d+)(,?\s*\n)/,
    `$1,\n    "stamina": ${stamina}\n`
  );

  result = result.slice(0, startPos) + block + result.slice(endPos);
}

// Also add stamina to Card interface if not already there
if (!result.includes('stamina?: number')) {
  result = result.replace(
    /ability\?: string;/,
    'stamina?: number;  // v2: fixed per-card stat, assigned by type range\n  ability?: string;'
  );
}

fs.writeFileSync(cardsPath, result, 'utf8');

// Print summary
const staminaByType = {};
const cardRegex = /"type":\s*"([^"]+)"[^}]*?"stamina":\s*(\d+)/gs;
for (const [, type, sta] of result.matchAll(cardRegex)) {
  if (!staminaByType[type]) staminaByType[type] = [];
  staminaByType[type].push(Number(sta));
}

console.log('\nStamina summary by type:');
for (const [type, vals] of Object.entries(staminaByType).sort()) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  console.log(`  ${type.padEnd(12)} ${vals.length} cards  min:${min} avg:${avg} max:${max}`);
}
console.log('\nDone. Run: node scripts/push-stamina-to-firestore.js');
