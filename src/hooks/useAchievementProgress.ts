import { useMemo } from 'react';
import { useGameStateContext } from '../context/GameStateContext';
import { ACHIEVEMENT_CATEGORIES, AchievementCategoryId } from '../data/constants';
import {
  ACHIEVEMENTS, AchievementFamily, ProgressContext,
  getFamiliesForCategory,
} from '../data/achievements';
import { isOwned } from './useGameState';

export interface AchievementProgressData {
  familiesByCategory: Record<AchievementCategoryId, AchievementFamily[]>;
  categoryStats: Record<AchievementCategoryId, { completed: number; total: number }>;
  totalEarned: number;
  totalAchievements: number;
  uncollectedCount: number;
}

export function useAchievementProgress(): AchievementProgressData {
  const gs = useGameStateContext();

  return useMemo(() => {
    const roster = gs.cardRoster;
    const collection = gs.collection;

    // Pre-compute collection stats (mirrors computeNewAchievements in useGameState.ts)
    const ownedCards = roster.filter(c => isOwned(collection, c.id));
    const uniqueOwnedCount = ownedCards.length;
    const rarityCount = (r: string) => ownedCards.filter(c => c.rarity === r).length;
    const allianceCount = (a: string) => ownedCards.filter(c => c.alliance === a).length;
    const uniqueTypes = new Set(ownedCards.map(c => c.type)).size;
    const packOwned = (p: number) => ownedCards.filter(c => c.pack === p).length;
    const packTotal = (p: number) => roster.filter(c => c.pack === p).length;
    const purchasedAvatarCount = gs.ownedAvatars.filter(id => id !== 'a1').length;

    const ctx: ProgressContext = {
      uniqueOwnedCount,
      packsOpened: gs.packsOpened,
      level: gs.level,
      totalTrades: gs.totalTrades,
      purchasedAvatarCount,
      rarityCount,
      allianceCount,
      uniqueTypes,
      packOwned,
      packTotal,
      battleStats: gs.battleStats,
    };

    const earnedIds = new Set(gs.earnedAchievements);
    const collectedIds = new Set(gs.collectedAchievements);

    const familiesByCategory = {} as Record<AchievementCategoryId, AchievementFamily[]>;
    const categoryStats = {} as Record<AchievementCategoryId, { completed: number; total: number }>;

    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const families = getFamiliesForCategory(cat.id, ACHIEVEMENTS, earnedIds, collectedIds, ctx);
      familiesByCategory[cat.id] = families;

      let completed = 0;
      let total = 0;
      for (const fam of families) {
        for (const tier of fam.tiers) {
          total++;
          if (tier.status === 'completed') completed++;
        }
      }
      categoryStats[cat.id] = { completed, total };
    }

    return {
      familiesByCategory,
      categoryStats,
      totalEarned: gs.earnedAchievements.length,
      totalAchievements: ACHIEVEMENTS.length,
      uncollectedCount: gs.uncollectedCount,
    };
  }, [
    gs.earnedAchievements, gs.collectedAchievements, gs.collection, gs.cardRoster,
    gs.packsOpened, gs.level, gs.totalTrades, gs.ownedAvatars,
    gs.battleStats, gs.uncollectedCount,
  ]);
}
