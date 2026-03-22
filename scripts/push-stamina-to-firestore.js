#!/usr/bin/env node
// push-stamina-to-firestore.js
//
// Sprint 2: pushes the stamina field from cards.ts to all 200 Firestore
// card documents. Only the stamina field is updated.
//
// Usage: node scripts/push-stamina-to-firestore.js

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PROJECT_ID            = 'hero-cards-1f345';
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const FIREBASE_CLIENT_ID    = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET= 'j9iVZfS8kkCEFUPaAeJV0sAi';

function parseCardStamina() {
  const src = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');
  const map = {};
  for (const m of src.matchAll(/"id":\s*(\d+)[^}]*?"stamina":\s*(\d+)/gs)) {
    map[m[1]] = Number(m[2]);
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

async function updateStamina(accessToken, docId, stamina) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/cards/${docId}` +
    `?updateMask.fieldPaths=stamina`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fields: { stamina: { integerValue: stamina } } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Card ${docId}: ${err.error?.message}`);
  }
}

async function main() {
  const staminaMap = parseCardStamina();
  const ids = Object.keys(staminaMap);
  console.log(`Pushing stamina updates for ${ids.length} cards...\n`);

  const accessToken = await getAccessToken();
  let done = 0;
  const CHUNK = 20;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await Promise.all(chunk.map(id => updateStamina(accessToken, id, staminaMap[id])));
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${ids.length} updated`);
  }
  console.log('\n\nDone. Restart app with npx expo start --clear.');
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
