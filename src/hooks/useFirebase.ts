// useFirebase — all Firestore read/write for game state.
// Session 13: full persistence for collection, XP, quests, achievements,
// credits, avatars, and battle cooldowns.
//
// Boundary rule: this is the ONLY file that imports the Firebase SDK directly.
// useGameState calls saveGameData from here; it never imports firebase itself.

import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Card, ALL_CARDS } from '../data/cards';
import { SavedDeck } from '../data/decks';

export interface PersistedGameData {
  coins:              number;
  xp:                 number;
  collection:         Record<string, number>;   // string keys (Firestore requirement)
  activeAvatar:       string;
  ownedAvatars:       string[];
  packsOpened:        number;
  totalTrades:        number;
  questDate:          string;
  questProgress:      Record<string, number>;
  earnedAchievements:    string[];
  collectedAchievements?: string[];             // earned + rewards claimed
  battleWinStreak:    number;
  battleStats?:       Record<string, number>;  // cumulative battle stat counters
  savedBattle?:       any | null;              // serialized in-progress battle state
  savedDecks?:        SavedDeck[];             // up to 5 premade decks
}

export async function loadGameData(uid: string): Promise<PersistedGameData | null> {
  console.log('[Firebase] loadGameData called for uid:', uid);
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) { console.log('[Firebase] loadGameData: doc not found'); return null; }
    console.log('[Firebase] loadGameData: doc found, collection keys:', Object.keys(snap.data().collection ?? {}).length);
    const d = snap.data();
    return {
      coins:              typeof d.coins === 'number'          ? d.coins : 0,
      xp:                 typeof d.xp === 'number'             ? d.xp : 0,
      collection:         d.collection         ?? {},
      activeAvatar:       typeof d.activeAvatar === 'string'   ? d.activeAvatar : 'a1',
      ownedAvatars:       Array.isArray(d.ownedAvatars)        ? d.ownedAvatars : ['a1'],
      packsOpened:        typeof d.packsOpened === 'number'    ? d.packsOpened : 0,
      totalTrades:        typeof d.totalTrades === 'number'    ? d.totalTrades : 0,
      questDate:          typeof d.questDate === 'string'      ? d.questDate : '',
      questProgress:      d.questProgress      ?? {},
      earnedAchievements:    Array.isArray(d.earnedAchievements)  ? d.earnedAchievements : [],
      collectedAchievements: Array.isArray(d.collectedAchievements) ? d.collectedAchievements : [],
      battleWinStreak:    typeof d.battleWinStreak === 'number' ? d.battleWinStreak : 0,
      battleStats:        d.battleStats        ?? {},
      savedBattle:        d.savedBattle        ?? null,
      savedDecks:         Array.isArray(d.savedDecks) ? d.savedDecks : [],
    };
  } catch {
    return null;
  }
}

// Load card roster from Firestore `cards` collection.
// Falls back to the bundled ALL_CARDS if Firestore is unavailable or empty.
export async function loadCardRoster(): Promise<Card[]> {
  try {
    const snap = await getDocs(collection(db, 'cards'));
    if (snap.empty) return ALL_CARDS;
    const cards = snap.docs.map(d => ({ ...d.data(), id: Number(d.id) } as Card));
    cards.sort((a, b) => a.id - b.id);
    return cards;
  } catch {
    return ALL_CARDS;
  }
}

// Recursively strip `undefined` values from an object tree.
// Firestore rejects documents containing `undefined` — this converts them
// to clean objects that Firestore can persist.
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return obj;
}

export async function saveGameData(uid: string, data: PersistedGameData): Promise<void> {
  console.log('[Firebase] saveGameData called, collection size:', Object.keys(data.collection).length);
  try {
    const sanitized = stripUndefined(data);
    await setDoc(doc(db, 'users', uid), sanitized, { merge: true });
    console.log('[Firebase] saveGameData success');
  } catch (err) {
    console.error('[Firebase] saveGameData FAILED:', err);
  }
}
