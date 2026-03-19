// useGameState — in-memory game state hook.
// Session 13 replaces the mock data here with real Firebase reads/writes.
//
// Boundary rule: this hook never imports Firebase directly.
// It will call useFirebase().saveData() once Session 13 wires persistence.

import { useState, useMemo } from 'react';
import { ALL_CARDS } from '../data/cards';
import { XP_THRESHOLDS, STARTING_CREDITS } from '../data/constants';

// ── Level helpers (mirrors web getLevel) ─────────────────────────────────────
export function getLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[level - 1] ?? 0;
}

// ── Collection helpers ────────────────────────────────────────────────────────
export function isOwned(collection: Record<number, number>, cardId: number): boolean {
  return (collection[cardId] ?? 0) > 0;
}

export function cardCount(collection: Record<number, number>, cardId: number): number {
  return collection[cardId] ?? 0;
}

export function totalUniqueOwned(collection: Record<number, number>): number {
  return Object.keys(collection).length;
}

export interface GameState {
  coins: number;
  xp: number;
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  collection: Record<number, number>;  // card id → count owned
  activeAvatar: string;
  ownedAvatars: string[];
  // Mutators (real implementations added in Session 13)
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addCards: (ids: number[]) => void;
}

export function useGameState(uid: string): GameState {
  const isGod = uid === '__god__';

  // ── Mock initial state ───────────────────────────────────────────────────
  // Session 13 replaces these with Firestore-loaded values.
  const [coins,      setCoins]      = useState(isGod ? 99999 : STARTING_CREDITS);
  const [xp,         setXp]         = useState(isGod ? 45000 : 0);
  const [collection, setCollection] = useState<Record<number, number>>(
    () => isGod ? Object.fromEntries(ALL_CARDS.map(c => [c.id, 1])) : {},
  );

  const ownedAvatars = useMemo(() => ['a1'], []);
  const activeAvatar = 'a1';

  // ── Derived XP progress ───────────────────────────────────────────────────
  const level      = getLevel(xp);
  const xpInLevel  = xp - xpForLevel(level);
  const xpNeeded   = (xpForLevel(level + 1) || xpForLevel(level)) - xpForLevel(level);

  // ── Mutators ──────────────────────────────────────────────────────────────
  const addXp    = (amount: number) => setXp(prev => prev + amount);
  const addCoins = (amount: number) => setCoins(prev => prev + amount);
  const spendCoins = (amount: number): boolean => {
    if (coins < amount) return false;
    setCoins(prev => prev - amount);
    return true;
  };
  const addCards = (ids: number[]) => {
    setCollection(prev => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = (next[id] ?? 0) + 1;
      }
      return next;
    });
  };

  return {
    coins, xp, level, xpInLevel, xpNeeded,
    collection, activeAvatar, ownedAvatars,
    addXp, addCoins, spendCoins, addCards,
  };
}
