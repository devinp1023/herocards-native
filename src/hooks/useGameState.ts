// useGameState — in-memory game state hook.
// Session 13 replaces the mock data here with real Firebase reads/writes.
//
// Boundary rule: this hook never imports Firebase directly.
// It will call useFirebase().saveData() once Session 13 wires persistence.

import { useState, useEffect, useRef } from 'react';
import { ALL_CARDS, Card } from '../data/cards';
import { XP_THRESHOLDS, STARTING_CREDITS } from '../data/constants';
import { AVATARS, LEVEL_AVATARS } from '../data/packs';
import { ACHIEVEMENTS, Achievement } from '../data/achievements';
import { hasBattleCooldown } from '../data/constants';
import { DAILY_QUESTS, getTodaysQuests, Quest } from '../data/quests';
import { saveGameData, PersistedGameData } from './useFirebase';

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

// ── Date helper ───────────────────────────────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Achievement check helper ──────────────────────────────────────────────────
// Returns achievements newly earned given the current game state.
function computeNewAchievements(
  collection: Record<number, number>,
  packsOpened: number,
  level: number,
  totalTrades: number,
  ownedAvatars: string[],
  alreadyEarned: string[],
  roster: Card[],
): Achievement[] {
  const earned = new Set(alreadyEarned);
  const newlyEarned: Achievement[] = [];

  // Pre-compute collection stats
  const uniqueOwned = Object.keys(collection).map(Number);
  const ownedCards  = roster.filter(c => (collection[c.id] ?? 0) > 0);

  const rarityCount  = (r: string)  => ownedCards.filter(c => c.rarity === r).length;
  const allianceCount= (a: string)  => ownedCards.filter(c => c.alliance === a).length;
  const uniqueTypes  = new Set(ownedCards.map(c => c.type)).size;
  const packCount    = (p: number)  => ownedCards.filter(c => c.pack === p).length;
  const packTotal    = (p: number)  => roster.filter(c => c.pack === p).length;
  // Purchased avatars = all except the default 'a1'
  const purchasedAvatars = ownedAvatars.filter(id => id !== 'a1').length;

  for (const ach of ACHIEVEMENTS) {
    if (earned.has(ach.id)) continue;
    const { type, n, rarity, alliance, pack, pct } = ach.req;
    let met = false;

    switch (type) {
      case 'col':      met = uniqueOwned.length >= n; break;
      case 'packs':    met = packsOpened >= n; break;
      case 'rarity':   met = rarity ? rarityCount(rarity) >= n : false; break;
      case 'level':    met = level >= n; break;
      case 'trades':   met = totalTrades >= n; break;
      case 'avatars':  met = purchasedAvatars >= n; break;
      case 'alliance': met = alliance ? allianceCount(alliance) >= n : false; break;
      case 'types':    met = uniqueTypes >= n; break;
      case 'pack': {
        if (pack == null) break;
        const total = packTotal(pack);
        const owned = packCount(pack);
        if (pct != null) {
          met = owned >= Math.ceil(total * pct / 100);
        } else {
          met = owned >= n;
        }
        break;
      }
    }

    if (met) newlyEarned.push(ach);
  }
  return newlyEarned;
}

export interface GameState {
  cardRoster: Card[];                       // live card list from Firestore (falls back to ALL_CARDS)
  battleCooldowns: Record<number, number>;  // card id → cooldown start timestamp (ms)
  coins: number;
  xp: number;
  level: number;
  xpInLevel: number;
  xpNeeded: number;
  collection: Record<number, number>;  // card id → count owned
  activeAvatar: string;
  ownedAvatars: string[];
  packsOpened: number;
  totalTrades: number;
  questDate: string;
  questProgress: Record<string, number>;  // quest id → progress count
  earnedAchievements: string[];           // achievement ids
  pendingAchievements: Achievement[];     // popup queue
  // Mutators
  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addCards: (ids: number[]) => void;
  equipAvatar: (id: string) => void;
  purchaseAvatar: (id: string, price: number) => boolean;
  incrementPacksOpened: () => void;
  incrementTrades: (n?: number) => void;
  advanceQuest: (type: Quest['req']['type'], opts?: { rarity?: string; alliance?: string }) => void;
  dismissAchievement: () => void;
  addBattleCooldowns: (cardIds: number[]) => void;
  battleWinStreak: number;
  recordBattleResult: (winner: 'player' | 'ai' | 'tie', tenacityProtected: boolean) => void;
}

export function useGameState(uid: string, initialData?: PersistedGameData | null, cardRoster: Card[] = ALL_CARDS): GameState {
  const isGod = uid === '__god__';

  // ── Core state ────────────────────────────────────────────────────────────
  const [coins,      setCoins]      = useState(() =>
    isGod ? 99999 : (initialData?.coins ?? STARTING_CREDITS));
  const [xp,         setXp]         = useState(() =>
    isGod ? 45000 : (initialData?.xp ?? 0));
  const [collection, setCollection] = useState<Record<number, number>>(() => {
    if (isGod) return Object.fromEntries(ALL_CARDS.map(c => [c.id, 1]));
    if (initialData?.collection) {
      return Object.fromEntries(
        Object.entries(initialData.collection).map(([k, v]) => [parseInt(k, 10), v]),
      );
    }
    return {};
  });
  const [ownedAvatars, setOwnedAvatars] = useState<string[]>(() => {
    if (isGod) return [...new Set([...AVATARS.map(a => a.id), ...LEVEL_AVATARS.map(a => a.id)])];
    return initialData?.ownedAvatars ?? ['a1'];
  });
  const [activeAvatar, setActiveAvatar] = useState(() =>
    initialData?.activeAvatar ?? 'a1');

  // ── Battle state ─────────────────────────────────────────────────────────
  const [battleCooldowns, setBattleCooldowns] = useState<Record<number, number>>(() => {
    if (!initialData?.battleCooldowns) return {};
    return Object.fromEntries(
      Object.entries(initialData.battleCooldowns).map(([k, v]) => [parseInt(k, 10), v]),
    );
  });
  const [battleWinStreak, setBattleWinStreak] = useState(() =>
    isGod ? 0 : (initialData?.battleWinStreak ?? 0));

  // ── Quest state ───────────────────────────────────────────────────────────
  const [packsOpened,  setPacksOpened]  = useState(() => initialData?.packsOpened  ?? 0);
  const [totalTrades,  setTotalTrades]  = useState(() => initialData?.totalTrades  ?? 0);
  const [questDate,    setQuestDate]    = useState(() => initialData?.questDate || todayStr());
  const [questProgress,setQuestProgress]= useState<Record<string, number>>(() =>
    initialData?.questProgress ?? {});

  // ── Achievement state ─────────────────────────────────────────────────────
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>(() =>
    isGod ? ACHIEVEMENTS.map(a => a.id) : (initialData?.earnedAchievements ?? []));
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  // ── Derived XP progress ───────────────────────────────────────────────────
  const level      = getLevel(xp);
  const xpInLevel  = xp - xpForLevel(level);
  const xpNeeded   = (xpForLevel(level + 1) || xpForLevel(level)) - xpForLevel(level);

  // ── Daily quest reset + login quest ──────────────────────────────────────
  useEffect(() => {
    const today = todayStr();
    if (today !== questDate) {
      setQuestDate(today);
      setQuestProgress({});
    }
    // Login quest: auto-complete once per day
    const loginQuests = getTodaysQuests().filter(q => q.req.type === 'login');
    for (const q of loginQuests) {
      setQuestProgress(prev => {
        if ((prev[q.id] ?? 0) >= q.req.n) return prev;
        setXp(p => p + q.xp);
        setCoins(p => p + q.credits);
        return { ...prev, [q.id]: q.req.n };
      });
    }
  }, []); // run once on mount

  // ── Achievement check on relevant state changes ───────────────────────────
  // Use a ref to hold the latest earnedAchievements to avoid stale closure in
  // the effect callback while keeping the dep array stable.
  const earnedRef = useRef(earnedAchievements);
  earnedRef.current = earnedAchievements;

  useEffect(() => {
    if (isGod) return; // god mode already has all achievements
    const newlyEarned = computeNewAchievements(
      collection, packsOpened, level, totalTrades, ownedAvatars, earnedRef.current, cardRoster,
    );
    if (newlyEarned.length === 0) return;
    const newIds = newlyEarned.map(a => a.id);
    setEarnedAchievements(prev => [...prev, ...newIds]);
    setPendingAchievements(prev => [...prev, ...newlyEarned]);
    let bonusXp = 0, bonusCredits = 0;
    for (const a of newlyEarned) { bonusXp += a.xp; bonusCredits += a.credits; }
    if (bonusXp > 0) setXp(prev => prev + bonusXp);
    if (bonusCredits > 0) setCoins(prev => prev + bonusCredits);
  }, [collection, packsOpened, level, totalTrades, ownedAvatars]);

  // ── Firestore save ────────────────────────────────────────────────────────
  // Always keep a ref with the latest payload so the unmount save is never stale.
  const currentSaveRef = useRef<PersistedGameData | null>(null);
  currentSaveRef.current = (isGod || !uid) ? null : {
    coins, xp,
    collection:      Object.fromEntries(Object.entries(collection)),
    activeAvatar,    ownedAvatars,
    packsOpened,     totalTrades,
    questDate,       questProgress,
    earnedAchievements,
    battleCooldowns: Object.fromEntries(Object.entries(battleCooldowns)),
    battleWinStreak,
  };

  // Skip saving on the very first render — the mount-time state is just
  // defaults (or loaded initialData) and writing it back would overwrite
  // Firestore with stale/empty values if React didn't batch the state updates.
  const mountedRef = useRef(false);
  const dirtyRef   = useRef(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (!currentSaveRef.current) return;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (currentSaveRef.current) saveGameData(uid, currentSaveRef.current);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [coins, xp, collection, activeAvatar, ownedAvatars, packsOpened, totalTrades,
      questDate, questProgress, earnedAchievements, battleCooldowns, battleWinStreak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on unmount — only if the user actually changed something.
  useEffect(() => {
    return () => {
      if (dirtyRef.current && currentSaveRef.current) {
        saveGameData(uid, currentSaveRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const equipAvatar = (id: string) => setActiveAvatar(id);

  const purchaseAvatar = (id: string, price: number): boolean => {
    if (coins < price) return false;
    setCoins(prev => prev - price);
    setOwnedAvatars(prev => prev.includes(id) ? prev : [...prev, id]);
    setActiveAvatar(id);
    return true;
  };

  const incrementPacksOpened = () => setPacksOpened(prev => prev + 1);

  const incrementTrades = (n = 1) => setTotalTrades(prev => prev + n);

  const advanceQuest = (type: Quest['req']['type'], opts?: { rarity?: string; alliance?: string }) => {
    const today = todayStr();
    // Silently reset if day rolled over (won't happen mid-session, but defensive)
    if (today !== questDate) {
      setQuestDate(today);
      setQuestProgress({});
      return;
    }
    const todaysQuests = getTodaysQuests();
    const matching = todaysQuests.filter(q =>
      q.req.type === type &&
      (!opts?.rarity   || q.req.rarity   === opts.rarity) &&
      (!opts?.alliance || q.req.alliance === opts.alliance),
    );
    for (const q of matching) {
      setQuestProgress(prev => {
        const current = prev[q.id] ?? 0;
        if (current >= q.req.n) return prev; // already done
        const next = current + 1;
        if (next >= q.req.n) {
          // Quest complete — award XP + credits
          setXp(p => p + q.xp);
          setCoins(p => p + q.credits);
        }
        return { ...prev, [q.id]: next };
      });
    }
  };

  const dismissAchievement = () =>
    setPendingAchievements(prev => prev.slice(1));

  const recordBattleResult = (winner: 'player' | 'ai' | 'tie', tenacityProtected: boolean) => {
    if (isGod) return;
    if (winner === 'player') {
      setBattleWinStreak(prev => prev + 1);
    } else if (winner === 'ai') {
      // Tenacity protection: skip streak reset on one loss
      if (!tenacityProtected) setBattleWinStreak(0);
    }
    // 'tie': streak unchanged (per PRD — Last Effort edge case, neither side earns a win)
  };

  const addBattleCooldowns = (cardIds: number[]) => {
    const now = Date.now();
    setBattleCooldowns(prev => {
      const next = { ...prev };
      for (const id of cardIds) {
        const card = cardRoster.find(c => c.id === id);
        if (card && hasBattleCooldown(card.rarity)) next[id] = now;
      }
      return next;
    });
  };

  return {
    cardRoster,
    battleCooldowns,
    coins, xp, level, xpInLevel, xpNeeded,
    collection, activeAvatar, ownedAvatars,
    packsOpened, totalTrades,
    questDate, questProgress,
    earnedAchievements, pendingAchievements,
    addXp, addCoins, spendCoins, addCards,
    equipAvatar, purchaseAvatar,
    incrementPacksOpened, incrementTrades,
    advanceQuest, dismissAchievement,
    addBattleCooldowns,
    battleWinStreak, recordBattleResult,
  };
}
