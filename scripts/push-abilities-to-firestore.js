#!/usr/bin/env node
// push-abilities-to-firestore.js
//
// Sprint 4a: pushes the ability field from cards.ts to all 200 Firestore
// card documents. Only the ability field is updated.
//
// Usage: node scripts/push-abilities-to-firestore.js

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PROJECT_ID            = 'hero-cards-1f345';
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const FIREBASE_CLIENT_ID    = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET= 'j9iVZfS8kkCEFUPaAeJV0sAi';

function parseCardAbilities() {
  const src = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');
  const map = {};
  // Match id + ability within each card block
  for (const m of src.matchAll(/"id":\s*(\d+)[^}]*?"ability":\s*"([^"]+)"/gs)) {
    map[m[1]] = m[2];
  }
  return map;
}

async function getAccessToken() {
  const config = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'));
  const { refresh_token } = config.tokens;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token,
      client_id: FIREBASE_CLIENT_ID, client_secret: FIREBASE_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data.error)}`);
  return data.access_token;
}

async function updateAbility(accessToken, docId, ability) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/cards/${docId}` +
    `?updateMask.fieldPaths=ability`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fields: { ability: { stringValue: ability } } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Card ${docId}: ${err.error?.message}`);
  }
}

async function main() {
  const abilityMap = parseCardAbilities();
  const ids = Object.keys(abilityMap);
  console.log(`Pushing ability updates for ${ids.length} cards...\n`);

  const accessToken = await getAccessToken();
  let done = 0;
  const CHUNK = 20;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await Promise.all(chunk.map(id => updateAbility(accessToken, id, abilityMap[id])));
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${ids.length} updated`);
  }
  console.log('\n\nDone. Restart app with npx expo start --clear.');
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
