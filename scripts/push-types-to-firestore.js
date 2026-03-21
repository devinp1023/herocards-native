#!/usr/bin/env node
// push-types-to-firestore.js
//
// Sprint 1: pushes updated `type` field from cards.ts to Firestore.
// Uses the stored firebase-tools OAuth credentials — no extra login needed.
//
// Usage: node scripts/push-types-to-firestore.js

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PROJECT_ID       = 'hero-cards-1f345';
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');

// ── Parse card id → type from cards.ts ────────────────────────────────────────
function parseCardTypes() {
  const src = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');
  const map = {};
  for (const m of src.matchAll(/"id":\s*(\d+)[^}]*?"type":\s*"([^"]+)"/gs)) {
    map[m[1]] = m[2];
  }
  return map;
}

// ── Refresh the OAuth access token using the stored refresh token ──────────────
async function getAccessToken() {
  const config = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'));
  const { refresh_token } = config.tokens;

  // firebase-tools OAuth client credentials
  const FIREBASE_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
  const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     FIREBASE_CLIENT_ID,
      client_secret: FIREBASE_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data.error)}`);
  return data.access_token;
}

// ── Firestore REST: update the type field on one card doc ─────────────────────
async function updateType(accessToken, docId, type) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/cards/${docId}` +
    `?updateMask.fieldPaths=type`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fields: { type: { stringValue: type } } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Card ${docId}: ${err.error?.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const typeMap = parseCardTypes();
  const ids = Object.keys(typeMap);
  console.log(`Pushing type updates for ${ids.length} cards...\n`);

  const accessToken = await getAccessToken();

  let done = 0;
  const CHUNK = 20;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await Promise.all(chunk.map(id => updateType(accessToken, id, typeMap[id])));
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${ids.length} updated`);
  }

  console.log('\n\nDone. All card types pushed to Firestore.');
  console.log('Restart the app (npx expo start --clear) to pick up the changes.');
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
