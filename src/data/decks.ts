// Deck data model and helpers for the Deck Builder feature.

import { DECK_SIZE, BATTLE_RARITY_LIMITS } from './constants';

export interface SavedDeck {
  id: string;        // "deck_" + Date.now()
  name: string;      // user-configurable
  cardIds: number[]; // 0–10 card IDs
  createdAt: number;
  updatedAt: number;
}

export function isDeckComplete(deck: SavedDeck): boolean {
  return deck.cardIds.length === DECK_SIZE;
}

export function isDeckValid(deck: SavedDeck, collection: Record<number, number>): boolean {
  return deck.cardIds.every(id => (collection[id] ?? 0) > 0);
}

/** Remove cards no longer in collection. Returns same object if nothing changed. */
export function sanitizeDeck(deck: SavedDeck, collection: Record<number, number>): SavedDeck {
  const validIds = deck.cardIds.filter(id => (collection[id] ?? 0) > 0);
  if (validIds.length === deck.cardIds.length) return deck;
  return { ...deck, cardIds: validIds, updatedAt: Date.now() };
}
