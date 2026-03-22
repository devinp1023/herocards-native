#!/usr/bin/env node
// assign-v2-abilities.js
//
// Sprint 4a: randomly assigns one v2 ability per card within its rarity tier
// and writes the result back into src/data/cards.ts.
//
// Usage: node scripts/assign-v2-abilities.js

const fs   = require('fs');
const path = require('path');

const CARDS_PATH = path.join(__dirname, '../src/data/cards.ts');

const ABILITY_POOL = {
  Common:    ['Grit', 'Opportunist', 'Resilience', 'Shield Up', 'Tenacity', 'Steady', 'Scrapper', 'Last Effort', 'Warm Up', 'Stubborn'],
  Uncommon:  ['Smoke Screen', 'Adrenaline', 'Pack Tactics', 'Adaptable', 'Rebound', 'Heavy Handed', 'Stamina Leech', 'Rested and Ready', 'Momentum', 'Counterpunch'],
  Rare:      ['Bleed', 'Intimidate', 'Fortify', 'Amp Siphon', 'Dead Weight', 'Payback', 'Amp Shield', 'Counterstrike', 'Type Bully', 'Pressure'],
  Epic:      ['Second Wind', 'Execute', 'Drain', 'Unstoppable', 'Overwhelm', 'Amp Surge', 'Stamina Vampire', 'Berserker', 'Death Mark', 'Riposte'],
  Legendary: ['Apex Predator', 'Immunity', 'Last Stand', 'Overwhelming Force', 'Dominate', 'Amp Drain', 'Juggernaut', 'Nullify', 'Siege', 'The Floor is Yours'],
};

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

let src = fs.readFileSync(CARDS_PATH, 'utf8');

// Match each card object block and replace/insert the ability field
let count = 0;
src = src.replace(
  /("rarity":\s*"(Common|Uncommon|Rare|Epic|Legendary)"[^}]*?)"ability":\s*"[^"]*"/gs,
  (match, prefix, rarity) => {
    const ability = pick(ABILITY_POOL[rarity]);
    count++;
    return `${prefix}"ability": "${ability}"`;
  }
);

// If any card didn't have an ability field yet, add one after rarity
let added = 0;
src = src.replace(
  /("rarity":\s*"(Common|Uncommon|Rare|Epic|Legendary)",\s*\n(?![\s\S]*?"ability":)[^}]*?)(},)/g,
  (match, body, rarity, closing) => {
    // Only inject if ability not already in this block
    if (body.includes('"ability"')) return match;
    const ability = pick(ABILITY_POOL[rarity]);
    added++;
    return `${body}  "ability": "${ability}",\n${closing}`;
  }
);

fs.writeFileSync(CARDS_PATH, src, 'utf8');
console.log(`Done. Updated ${count} existing ability fields, added ${added} new. Total cards processed: ${count + added}.`);
console.log('Next: node scripts/push-abilities-to-firestore.js');
