// Builds a randomised AI deck for a given difficulty tier.
// Uses AI_DECK_COMP from constants to pick the right rarity mix.

import { Card } from '../data/cards';
import { ALL_CARDS } from '../data/cards';
import { AI_DECK_COMP } from '../data/constants';

export function buildAiDeck(tier: number): Card[] {
  const comp = AI_DECK_COMP[tier] ?? AI_DECK_COMP[1];
  const deck: Card[] = [];

  for (const [rarity, count] of Object.entries(comp)) {
    if (!count) continue;
    const pool = [...ALL_CARDS.filter(c => c.rarity === rarity)].sort(() => Math.random() - 0.5);
    deck.push(...pool.slice(0, count));
  }

  return deck.sort(() => Math.random() - 0.5);
}
