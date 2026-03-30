// useBattle — drives the step-by-step battle state machine.
//
// Each round both sides act independently:
//   player chooses: attack | draw | swap
//   AI chooses:     attack | draw | swap  (via aiDecide — evaluated independently)
//
// Free-hit rule:
//   both attack            → two-way combat (speed order)
//   one attacks, other not → attacker gets one free undefended hit
//   both non-attack        → no combat this round

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { TIER_INFO } from '../data/constants';
import { CHOREO, slamDuration, drawDuration, runSteps } from '../battle/choreography';
import { useBattleChoreography, BattleChoreography } from './useBattleChoreography';
import { useGameStateContext } from '../context/GameStateContext';
import {
  BattleCard, SideState, BattleEvent, AttackWeight, AmpField, AmpEffectName,
  initSideState, applyEntryEffects, effSpeed,
  executeAttack, resolveKill, resolveDefeat,
  drawCard, aiSelectCard, aiDecide, aiChooseAttackWeight, applyRestAction,
  executeAIProactiveSwap, resolvePostRound,
  calcBattleRewards,
  initAmpField, gainAmp, triggerAmp as triggerAmpFn, spendAmp as spendAmpFn,
  aiDecideAmp, isLockOnActive, WEIGHT_AMP, legendaryLocked, getTypeMultiplier,
  serializeBattleCard, serializeSideState,
  rehydrateSideState,
} from '../battle/battleEngine';
import { buildAiDeck } from '../battle/aiDeck';

export type BattlePhase = 'init' | 'ready' | 'animating' | 'result' | 'selecting' | 'swapping' | 'done';
type RoundAction = 'attack' | 'draw' | 'swap' | 'rest';

export interface UseBattleResult {
  phase:           BattlePhase;
  round:           number;
  playerActive:    BattleCard | null;
  aiActive:        BattleCard | null;
  playerHand:      BattleCard[];
  aiHandCount:     number;
  playerDeckCount: number;
  aiDeckCount:     number;
  lastEvents:      BattleEvent[];
  winner:          'player' | 'ai' | 'tie' | null;
  typeRevealed:    boolean;
  rewards:         { credits: number; xp: number; streakBonus: boolean } | null;
  tierColor:       string;
  tierName:        string;
  tierSymbol:      string;
  canDraw:         boolean;
  canSwap:         boolean;
  playerAmp:       number;
  aiAmp:           number;
  ampPoolEffect:   AmpEffectName;
  ampActiveEffect: AmpEffectName | null;
  ampRoundsLeft:   number;
  ampTriggeredBy:  'player' | 'ai' | null;
  canTrigger:      boolean;
  canSpend:        boolean;
  // ── Sprint 5: Legendary Lock ──────────────────────────────────────────────
  playerKillCount: number;  // kills credited to the player side
  // ── Session 12 animation signals ─────────────────────────────────────────
  playerHitKey:            number;              // increments each time player's card is hit
  aiHitKey:                number;              // increments each time AI's card is hit
  lastDefeatedPlayerCard:  BattleCard | null;  // player's last killed card (for defeat animation)
  lastDefeatedAiCard:      BattleCard | null;  // AI's last killed card (for defeat animation)
  swapOutCardId:           number | null;      // id of the card that just moved from active→hand
  // ── Choreography hook (animation shared values + triggers) ──────────────
  choreo:                  BattleChoreography;
  attack:          (weight: AttackWeight) => void;
  rest:            () => void;
  draw:            () => void;
  triggerAmp:      () => void;
  spendAmp:        () => void;
  enterSwapMode:   () => void;
  cancelSwapMode:  () => void;
  swapCard:        (id: number) => void;
  selectCard:      (id: number) => void;
  forfeit:         () => void;
}

// Stable snapshot of the mutable ref state, committed at each refresh() call.
// This guarantees the UI always reads a consistent, atomic display state rather
// than whatever pRef/aRef happen to contain at React's unpredictable render time.
interface DisplaySnapshot {
  playerActive:    BattleCard | null;
  aiActive:        BattleCard | null;
  playerHand:      BattleCard[];
  aiHandCount:     number;
  playerDeckCount: number;
  aiDeckCount:     number;
  playerAmp:       number;
  aiAmp:           number;
  ampPoolEffect:   AmpEffectName;
  ampActiveEffect: AmpEffectName | null;
  ampRoundsLeft:   number;
  ampTriggeredBy:  'player' | 'ai' | null;
  playerKillCount: number;
}

export function useBattle(playerDeckIds: number[], tier: number, savedState?: any): UseBattleResult {
  const gs = useGameStateContext();

  const pRef      = useRef<SideState | null>(null);
  const aRef      = useRef<SideState | null>(null);
  const eventsRef = useRef<BattleEvent[]>([]);
  const ampRef    = useRef<AmpField>(initAmpField());

  // ── Per-battle stats tracking ─────────────────────────────────────────────
  const perBattleStatsRef = useRef<Record<string, number>>({});
  function resetPerBattleStats() { perBattleStatsRef.current = {}; }
  function incStat(key: string, val = 1) {
    perBattleStatsRef.current[key] = (perBattleStatsRef.current[key] ?? 0) + val;
  }
  // Called after any attack by the player to track stamina-based and juggernaut stats.
  function checkPostPlayerAttack() {
    const p = pRef.current;
    if (!p?.active) return;
    // Iron Will: player card stamina hit 0
    if (p.active.stamina === 0) {
      perBattleStatsRef.current.ironWillHit = 1;
    }
    // Juggernaut +50%: juggerStacks >= 5 means +50% dmg bonus (5 * 0.1 = 0.5 — 50% bonus)
    if (p.active.ability === 'Juggernaut' && (p.active._juggerStacks ?? 0) >= 5) {
      perBattleStatsRef.current.juggernauts50Win = 1;
    }
    // Well Rested: Rested and Ready fired for player card — check if _restedAndReady was consumed
    // _restedAndReady starts true on full-stamina entry and flips false after first attack
    // We can't check after-the-fact easily; track via ABILITY event for Rested and Ready below
  }

  const [phase,        setPhase]        = useState<BattlePhase>('init');
  const [snap,         setSnap]         = useState<DisplaySnapshot>({
    playerActive: null, aiActive: null, playerHand: [],
    aiHandCount: 0, playerDeckCount: 0, aiDeckCount: 0,
    playerAmp: 0, aiAmp: 0,
    ampPoolEffect: ampRef.current.poolEffect,
    ampActiveEffect: null, ampRoundsLeft: 0, ampTriggeredBy: null,
    playerKillCount: 0,
  });
  const [round,        setRound]        = useState(1);
  const [winner,       setWinner]       = useState<'player' | 'ai' | 'tie' | null>(null);
  const [typeRevealed, setTypeRevealed] = useState(false);
  const [rewards,      setRewards]      = useState<{ credits: number; xp: number; streakBonus: boolean } | null>(null);

  // ── Session 12 animation state ────────────────────────────────────────────
  const [playerHitKey,           setPlayerHitKey]           = useState(0);
  const [aiHitKey,               setAiHitKey]               = useState(0);
  const [lastDefeatedPlayerCard, setLastDefeatedPlayerCard] = useState<BattleCard | null>(null);
  const [lastDefeatedAiCard,     setLastDefeatedAiCard]     = useState<BattleCard | null>(null);
  const [swapOutCardId,          setSwapOutCardId]          = useState<number | null>(null);

  // ── Choreography hook (animation shared values + triggers) ──────────────
  const choreo = useBattleChoreography();

  // ── Phase ref for sync reads inside async runSteps ──────────────────────
  const phaseRef = useRef<BattlePhase>('init');
  const updatePhase = useCallback((p: BattlePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);
  const cancelled = useCallback(() => phaseRef.current === 'done', []);

  // refresh() snapshots the current ref state into React state.
  // Using useCallback with no deps ensures a stable identity while always
  // reading the latest ref values (refs are always current by definition).
  const refresh = useCallback(() => {
    setSnap({
      playerActive:    pRef.current?.active ?? null,
      aiActive:        aRef.current?.active ?? null,
      playerHand:      pRef.current ? [...pRef.current.hand] : [],
      aiHandCount:     aRef.current?.hand.length ?? 0,
      playerDeckCount: pRef.current?.deck.length ?? 0,
      aiDeckCount:     aRef.current?.deck.length ?? 0,
      playerAmp:       pRef.current?.amp ?? 0,
      aiAmp:           aRef.current?.amp ?? 0,
      ampPoolEffect:   ampRef.current.poolEffect,
      ampActiveEffect: ampRef.current.activeEffect,
      ampRoundsLeft:   ampRef.current.effectRoundsLeft,
      ampTriggeredBy:  ampRef.current.triggeredBy,
      playerKillCount: pRef.current?.killCount ?? 0,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tierInfo = TIER_INFO.find(t => t.tier === tier) ?? TIER_INFO[0];

  // ── Helper: scan events and bump hit keys ─────────────────────────────────
  const processHitKeys = useCallback((events: BattleEvent[]) => {
    let pHit = false, aHit = false;
    for (const e of events) {
      if (e.type === 'ATTACK' && !e.missed && e.damage > 0) {
        if (e.attackerSide === 'player') aHit = true;
        else pHit = true;
      }
    }
    if (aHit) setAiHitKey(k => k + 1);
    if (pHit) setPlayerHitKey(k => k + 1);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { cardRoster } = gs;

    // ── Resume path: restore from saved battle state ──────────────────────
    if (savedState && savedState.version === 1) {
      try {
        const p = rehydrateSideState(savedState.player, cardRoster);
        const a = rehydrateSideState(savedState.ai, cardRoster);
        pRef.current      = p;
        aRef.current      = a;
        eventsRef.current = savedState.events ?? [];
        ampRef.current    = savedState.ampField ?? initAmpField();
        perBattleStatsRef.current = savedState.perBattleStats ?? {};
        const resumeRound = savedState.round ?? 1;
        setRound(resumeRound);
        choreo.showRoundBanner(resumeRound);
        updatePhase('ready');
        refresh();
        return;
      } catch (err) {
        console.warn('[useBattle] Failed to restore saved battle, starting fresh:', err);
        gs.clearBattleState();
      }
    }

    // ── Fresh path: new battle ────────────────────────────────────────────
    const playerCards = playerDeckIds.map(id => cardRoster.find(c => c.id === id)!).filter(Boolean);
    const aiCards     = buildAiDeck(tier, cardRoster);
    const p = initSideState(playerCards, 'player');
    const a = initSideState(aiCards,     'ai');

    // Sprint 5: Legendary Lock — opening card cannot be Legendary.
    const ensureNonLegendaryOpener = (side: SideState) => {
      if (side.active.rarity === 'Legendary') {
        const firstNonLeg = side.hand.findIndex(c => c.rarity !== 'Legendary');
        if (firstNonLeg !== -1) {
          const replacement = side.hand[firstNonLeg];
          side.hand[firstNonLeg] = side.active;
          side.active = replacement;
        }
      }
    };
    ensureNonLegendaryOpener(p);
    ensureNonLegendaryOpener(a);

    // Reset per-battle stats for new battle
    resetPerBattleStats();

    // Track opening type disadvantage (player opener vs AI opener)
    if (getTypeMultiplier(p.active.type, a.active.type) < 1.0) {
      perBattleStatsRef.current.openingDisadvantage = 1;
    }

    const initEvents: BattleEvent[] = [];
    applyEntryEffects(p.active, p, a, initEvents);
    applyEntryEffects(a.active, a, p, initEvents);
    initEvents.push({
      type: 'BATTLE_START',
      playerActive: { name: p.active.name, rarity: p.active.rarity, hp: p.active.hp, maxHp: p.active.maxHp },
      aiActive:     { name: a.active.name, rarity: a.active.rarity, hp: a.active.hp, maxHp: a.active.maxHp },
    });
    pRef.current      = p;
    aRef.current      = a;
    eventsRef.current = initEvents;
    choreo.showRoundBanner(1);
    updatePhase('ready');
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End battle ────────────────────────────────────────────────────────────
  const endBattle = useCallback((w: 'player' | 'ai' | 'tie') => {
    gs.clearBattleState();
    eventsRef.current.push({ type: 'BATTLE_END', winner: w });

    // ── Scan battle events to compute stats ──────────────────────────────────
    const events = eventsRef.current;
    const pSide  = pRef.current;
    const bs: Record<string, number> = {};

    // Basic battle outcome counters
    bs.battlesPlayed = 1;
    if (w === 'player') bs.battlesWon = 1;
    if (w === 'player' && tier >= 3) bs.giantKillerWins = 1;
    if (w === 'player' && tier === 5) bs.tier5Wins = 1;
    if (w === 'tie') bs.tieBattles = 1;

    // Win streak high watermark
    if (w === 'player') {
      bs.maxWinStreak = gs.battleWinStreak + 1; // recordBattleStats takes max
    }

    // Amp events
    const playerAmpTriggers = events.filter(e => e.type === 'AMP_TRIGGER' && (e as any).side === 'player');
    bs.ampTriggers = playerAmpTriggers.length;
    bs.ampSwitches = events.filter(e => e.type === 'AMP_SPEND' && (e as any).side === 'player').length;

    // Photo Finish and Amp Race — tracked in perBattleStatsRef during battle
    bs.photoFinishTriggers    = perBattleStatsRef.current.photoFinishTriggers    ?? 0;
    bs.ampRaceTriggers        = perBattleStatsRef.current.ampRaceTriggers        ?? 0;
    bs.battlefieldControlBattles = perBattleStatsRef.current.battlefieldControlBattles ?? 0;

    // Ability activations for player cards
    const playerCardNames = new Set(
      playerDeckIds.map(id => gs.cardRoster.find(c => c.id === id)?.name).filter(Boolean),
    );
    bs.abilityActivations = events.filter(e =>
      e.type === 'ABILITY' &&
      ((e as any).side === 'player' || playerCardNames.has((e as any).card)),
    ).length;

    // Second Chance survivals (Second Wind or Last Stand for player)
    bs.secondChanceSurvivals = events.filter(e =>
      e.type === 'ABILITY' &&
      ((e as any).ability === 'Second Wind' || (e as any).ability === 'Last Stand') &&
      ((e as any).side === 'player' || playerCardNames.has((e as any).card)),
    ).length;

    // Heavy kills: player ATTACK with heavy weight that killed the target (hpAfter <= 0)
    bs.heavyKills = events.filter(e =>
      e.type === 'ATTACK' &&
      (e as any).attackerSide === 'player' &&
      (e as any).attackWeight === 'heavy' &&
      (e as any).hpAfter <= 0,
    ).length;

    // Execute kills: player attacker with Execute ability, target below 25% HP, killed
    const executeCardNames = new Set(
      playerDeckIds
        .map(id => gs.cardRoster.find(c => c.id === id))
        .filter(c => c?.ability === 'Execute')
        .map(c => c!.name),
    );
    bs.executionerKills = events.filter(e =>
      e.type === 'ATTACK' &&
      (e as any).attackerSide === 'player' &&
      (e as any).hpAfter <= 0 &&
      (e as any).hpBefore < (e as any).defenderMaxHp * 0.25 &&
      executeCardNames.has((e as any).attacker),
    ).length;

    // Iron Will: player won and any player card hit 0 stamina
    if (w === 'player' && perBattleStatsRef.current.ironWillHit) {
      bs.ironWillWins = 1;
    }

    // Well Rested round wins: ABILITY 'Rested and Ready' fired for a player card in a
    // round where the player also scored a kill (hpAfter <= 0 ATTACK by player, same round)
    {
      let wellRestedCount = 0;
      let restedInRound = false;
      let killedInRound = false;
      for (const ev of events) {
        if (ev.type === 'ROUND_START') {
          // Tally previous round
          if (restedInRound && killedInRound) wellRestedCount++;
          restedInRound = false;
          killedInRound = false;
        } else if (
          ev.type === 'ABILITY' &&
          (ev as any).ability === 'Rested and Ready' &&
          playerCardNames.has((ev as any).card)
        ) {
          restedInRound = true;
        } else if (
          ev.type === 'ATTACK' &&
          (ev as any).attackerSide === 'player' &&
          (ev as any).hpAfter <= 0
        ) {
          killedInRound = true;
        }
      }
      // Tally last round
      if (restedInRound && killedInRound) wellRestedCount++;
      bs.wellRestedRoundWins = wellRestedCount;
    }

    // Perfect Battle: player won and no player card hit 0 stamina
    if (w === 'player' && !perBattleStatsRef.current.ironWillHit) {
      bs.perfectBattles = 1;
    }

    // The Comeback: player won with active card only (hand and deck empty)
    if (w === 'player' && pSide && pSide.hand.length === 0 && pSide.deck.length === 0) {
      bs.comebackWins = 1;
    }

    // Survivor: player won and Last Stand fired for a player card at least once
    if (w === 'player') {
      const lastStandFired = events.some(e =>
        e.type === 'ABILITY' &&
        (e as any).ability === 'Last Stand' &&
        ((e as any).side === 'player' || playerCardNames.has((e as any).card)),
      );
      if (lastStandFired) bs.survivorWins = 1;
    }

    // Type Advantage wins: final kill by player was at typeMultiplier >= 2.0
    if (w === 'player') {
      const finalKillAttack = [...events].reverse().find(e =>
        e.type === 'ATTACK' && (e as any).attackerSide === 'player' && (e as any).hpAfter <= 0,
      );
      if (finalKillAttack && (finalKillAttack as any).typeMultiplier >= 2.0) {
        bs.typeAdvantageWins = 1;
      }
    }

    // Cosmic Clash: player won, and the final kill attack had both cards as Cosmic.
    // Check: player's active card (the winner) is Cosmic, and look up the last defeated AI card type.
    if (w === 'player' && pSide?.active && pSide.active.type === 'Cosmic') {
      // Find the last DEFEAT event (that's the final AI card killed)
      const lastDefeat = [...events].reverse().find(e => e.type === 'DEFEAT');
      if (lastDefeat) {
        const defeatedCardName = (lastDefeat as any).card as string;
        // Look up type from AI roster (find in cardRoster by name, from aRef defeated list)
        const aFinal = aRef.current;
        const defeatedCard = aFinal?.defeated.find(c => c.name === defeatedCardName) ??
          gs.cardRoster.find(c => c.name === defeatedCardName);
        if (defeatedCard && defeatedCard.type === 'Cosmic') {
          bs.cosmicClashWins = 1;
        }
      }
    }

    // Against All Odds: player won and had opening type disadvantage
    if (w === 'player' && perBattleStatsRef.current.openingDisadvantage) {
      bs.typeDisadvantageWins = 1;
    }

    // Legendary Lock achievements
    if (pSide && pSide.killCount >= 3) bs.lockBreakerCount = 1;
    bs.legendaryUnleashed = perBattleStatsRef.current.legendaryUnleashed ?? 0;
    if (w === 'player' && perBattleStatsRef.current.legendaryUsed) {
      bs.legendaryVictorWins = 1;
    }

    // Juggernaut +50% wins — tracked in perBattleStatsRef
    if (w === 'player' && perBattleStatsRef.current.juggernauts50Win) {
      bs.juggernauts50Wins = 1;
    }

    // ── Finalize ─────────────────────────────────────────────────────────────
    const tenacityProtected = playerDeckIds.some(
      id => gs.cardRoster.find(c => c.id === id)?.ability === 'Tenacity',
    );
    const r = calcBattleRewards(tier, w, gs.battleWinStreak);
    setRewards(r);
    setWinner(w);
    updatePhase('done');
    // Haptic: victory or defeat
    if (w === 'player') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    gs.addCoins(r.credits);
    gs.addXp(r.xp);
    gs.recordBattleResult(w, tenacityProtected);
    gs.recordBattleStats(bs);
    refresh();
  }, [tier, playerDeckIds, gs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sprint 5: check if a side is stuck — all remaining hand cards are
  //    Legendary while the Legendary Lock is still active. Returns true if
  //    that side has immediately lost and endBattle was scheduled.
  const checkLegendaryStuck = useCallback((side: SideState, sideLabel: 'player' | 'ai', _events: BattleEvent[]): boolean => {
    if (!legendaryLocked(side)) return false;
    if (side.hand.length === 0) return false;
    const allLegendary = side.hand.every(c => c.rarity === 'Legendary');
    if (!allLegendary) return false;
    // All remaining cards are Legendary and lock is active → immediate loss
    const winner = sideLabel === 'player' ? 'ai' : 'player';
    updatePhase('result');
    refresh();
    setTimeout(() => endBattle(winner), 0);
    return true;
  }, [endBattle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Post-round cleanup (bleed ticks, Resilience, bleed deaths) ────────────
  const finishRound = useCallback((events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;
    resolvePostRound(p, a, events, ampRef.current);
    if (p.active && p.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: p.active.name, byCard: 'Bleed' });
      resolveDefeat(p.active, p, events, a);
      setLastDefeatedPlayerCard(p.active);
      // Last Effort could have killed a.active
      if (a.active && a.active.hp <= 0) {
        resolveDefeat(a.active, a, events);
        setLastDefeatedAiCard(a.active);
        (a as any).active = null;
        (p as any).active = null;
        if (p.hand.length === 0 && p.deck.length === 0 && a.hand.length === 0 && a.deck.length === 0) { updatePhase('result'); refresh(); setTimeout(() => endBattle('tie'), 0); return; }
        if (a.hand.length === 0 && a.deck.length === 0) { (p as any).active = null; updatePhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
        (p as any).active = null;
        doAiReplace(events);
        if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
        updatePhase('result'); refresh(); return;
      }
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) { updatePhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      // Sprint 5: player stuck with only locked Legendaries
      if (checkLegendaryStuck(p, 'player', events)) return;
    }
    if (a.active && a.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: a.active.name, byCard: 'Bleed' });
      resolveDefeat(a.active, a, events, p);
      setLastDefeatedAiCard(a.active);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { updatePhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      // Sprint 5: AI stuck with only locked Legendaries
      if (checkLegendaryStuck(a, 'ai', events)) return;
      doAiReplace(events);
    }
    updatePhase('result');
    refresh();
  }, [endBattle, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance: result → ready (or selecting if player card was killed) ──
  useEffect(() => {
    if (phase !== 'result') return;
    choreo.showRoundBanner(round + 1);
    const total = CHOREO.roundEndPause + CHOREO.roundTransition + CHOREO.roundStartDelay;
    const id = setTimeout(() => {
      const p = pRef.current;
      if (!p) return;
      if (!p.active) {
        updatePhase('selecting');
      } else {
        setRound(r => r + 1);
        updatePhase('ready');
      }
      refresh();
    }, total);
    return () => clearTimeout(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI replaces its defeated active card ──────────────────────────────────
  const doAiReplace = useCallback((events: BattleEvent[]) => {
    const a = aRef.current!;
    const p = pRef.current!;
    if (a.hand.length === 0 && a.deck.length > 0) drawCard(a);
    const next = aiSelectCard(a.hand, p.active?.type ?? 'Brawler');
    if (!next) { endBattle('player'); return; }
    a.hand   = a.hand.filter(c => c.id !== next.id);
    a.active = next;
    applyEntryEffects(next, a, p, events, true);
    events.push({ type: 'CARD_ENTER', side: 'ai', card: next.name, rarity: next.rarity, hp: next.hp, maxHp: next.maxHp });
  }, [endBattle]);

  // ── Choreographed defeat sequence ──────────────────────────────────────────
  // Plays KO hold → fall → gap → replacement for killed cards.
  // Returns true if battle ended (no cards left).
  const choreographDefeat = useCallback(async (
    pKilled: boolean,
    aKilled: boolean,
    events: BattleEvent[],
  ) => {
    const p = pRef.current!;
    const a = aRef.current!;

    // KO hold — defeated card visible with pulsing red vignette
    // (DefeatingCardAnim renders via lastDefeatedPlayerCard / lastDefeatedAiCard)
    refresh();
    await runSteps([[() => {}, CHOREO.defeatHold]], cancelled);
    if (cancelled()) return true;

    // Resolve kills and set active to null → triggers fall animation
    if (aKilled && pKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events, p);
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events, a);
      (a as any).active = null; (p as any).active = null;
    } else if (aKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events, p);
      (a as any).active = null;
    } else if (pKilled) {
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events, a);
      // Check Last Effort killing AI
      if (a.active && a.active.hp <= 0) {
        resolveDefeat(a.active, a, events);
        setLastDefeatedAiCard(a.active);
        (a as any).active = null;
      }
      (p as any).active = null;
    }
    refresh();

    // Defeat fall + gap — empty slot visible
    await runSteps([
      [() => {}, CHOREO.defeatFall],
      [() => {}, CHOREO.defeatGap],
    ], cancelled);
    if (cancelled()) return true;

    // Check battle end conditions
    const aOut = !a.active && a.hand.length === 0 && a.deck.length === 0;
    const pOut = !p.active && p.hand.length === 0 && p.deck.length === 0;
    if (aOut && pOut) { updatePhase('result'); refresh(); setTimeout(() => endBattle('tie'), 0); return true; }
    if (aOut) { updatePhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return true; }
    if (pOut) { updatePhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return true; }

    // AI replacement — card springs into active slot
    if (!a.active) {
      if (checkLegendaryStuck(a, 'ai', events)) return true;
      if (a.hand.length === 0 && a.deck.length > 0) drawCard(a);
      doAiReplace(events);
      refresh();
      await runSteps([[() => {}, CHOREO.replaceEntry + CHOREO.replaceSettle]], cancelled);
      if (cancelled()) return true;
    }

    // Player forced draw if needed
    if (!p.active) {
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      if (checkLegendaryStuck(p, 'player', events)) return true;
    }

    return false; // battle continues
  }, [endBattle, doAiReplace, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Two-way combat deaths handler (both attacked) ─────────────────────────
  // NOTE: setLastDefeated* must be called by the caller before invoking.
  const handleCombatDeaths = useCallback(async (pKilled: boolean, aKilled: boolean, events: BattleEvent[]) => {
    if (pKilled || aKilled) {
      const ended = await choreographDefeat(pKilled, aKilled, events);
      if (ended || cancelled()) return;
      updatePhase('result'); refresh();
    } else {
      finishRound(events);
    }
  }, [choreographDefeat, finishRound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute AI's chosen action (non-combat part) ──────────────────────────
  // When AI draws, only fires the animation — call completeAiDraw() after drawDuration('ai') to mutate state.
  const executeAiAction = useCallback((aiAction: RoundAction, events: BattleEvent[]) => {
    const a   = aRef.current!;
    const p   = pRef.current!;
    if (aiAction === 'draw') {
      choreo.fireDrawAnimation('ai');
      // State mutation deferred to completeAiDraw()
    } else if (aiAction === 'swap') {
      executeAIProactiveSwap(a, p, events);
      gainAmp(a, 3);
    } else if (aiAction === 'rest') {
      applyRestAction(a.active, a, events);
      choreo.fireStaminaPopup(5, 'ai');
      gainAmp(a, 2);
    }
    // 'attack' has no pre-combat side effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Complete AI draw — called after draw animation lands
  const completeAiDraw = useCallback(() => {
    const a = aRef.current!;
    drawCard(a);
    gainAmp(a, 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI Amp decision (trigger/spend at start of each round) ────────────────
  // Returns 'trigger' | 'spend' | null so the caller can add choreography waits.
  const processAiAmp = useCallback((events: BattleEvent[]): 'trigger' | 'spend' | null => {
    const a   = aRef.current!;
    const p   = pRef.current!;
    const amp = ampRef.current;
    const decision = aiDecideAmp(a, p, amp);
    if (decision === 'trigger') {
      const effectName = amp.poolEffect;
      choreo.fireAmpActivation('ai', effectName, 'trigger');
      triggerAmpFn(a, p, amp, events);
      return 'trigger';
    }
    if (decision === 'spend') {
      choreo.fireAmpActivation('ai', 'scramble', 'spend');
      spendAmpFn(a, amp, events);
      return 'spend';
    }
    return null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ATTACK — sequential steps ──────────────────────────────────────────────
  //
  //  player \ AI  │  attack (both)          non-attack (free hit)
  //  ─────────────┼──────────────────────────────────────────────
  //  Both attack  │  step1: first hit        —
  //               │  step2: second hit       —
  //  Free hit     │  step1: AI action shown  step1: AI action shown
  //               │  step2: player hits AI   —
  //
  // ── Haptic helpers ──────────────────────────────────────────────────────────
  const hapticForAttack = (w: AttackWeight, isPlayer: boolean) => {
    if (!isPlayer) return; // only fire haptics for player-visible hits
    if (w === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const hapticForIncomingHit = (w: AttackWeight) => {
    if (w === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const attack = useCallback(async (weight: AttackWeight) => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    updatePhase('animating');

    // AI Amp decision happens at round start, before actions resolve
    const aiAmpAction = processAiAmp(events);
    if (aiAmpAction) {
      refresh();
      const ampWait = aiAmpAction === 'trigger'
        ? CHOREO.ampTriggerFlash + CHOREO.ampEffectReveal + CHOREO.ampEffectHold
        : 800;
      await runSteps([[() => {}, ampWait], [() => { choreo.clearAmpActivation(); }, 0]], cancelled);
      if (cancelled()) return;
    }

    const aiAction = aiDecide(a, p, ampRef.current, events);
    const slamWeight = weight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';

    if (aiAction !== 'attack') {
      // ── Player attacks, AI did non-combat action ────────────────────────
      executeAiAction(aiAction, events);
      const aiLabel = aiAction === 'rest' ? 'AI RESTED' : aiAction === 'draw' ? 'AI DREW A CARD' : 'AI SWAPPED';
      choreo.showActionLabel(aiLabel, 'ai');
      refresh();

      if (aiAction === 'draw') {
        await runSteps([[() => {}, drawDuration('ai')], [() => { completeAiDraw(); refresh(); }, 0]], cancelled);
        if (cancelled()) return;
      }

      await runSteps([
        [() => {}, aiAction === 'draw' ? CHOREO.aiDrawSettle : CHOREO.actionShow],
        [() => {
          choreo.clearActionLabel();
          choreo.triggerPlayerSlam(slamWeight);
          const r = executeAttack(p.active, a.active, p, a, events, weight, ampRef.current);
          choreo.fireDamagePopup(r.damage, 'ai', slamWeight, getTypeMultiplier(p.active.type, a.active.type));
          if (r.staminaCost > 0) choreo.fireStaminaPopup(-r.staminaCost, 'player');
          gainAmp(p, WEIGHT_AMP[weight]);
          checkPostPlayerAttack();
          setTypeRevealed(true);
          setAiHitKey(k => k + 1);
          (p as any)._lastAttackKilled = r.killed || a.active.hp <= 0;
          refresh();
        }, slamDuration(slamWeight)],
        [() => {}, CHOREO.damageSettle],
        [() => {}, CHOREO.postAttackPause],
      ], cancelled);
      if (cancelled()) return;

      const aKilled = (p as any)._lastAttackKilled;
      delete (p as any)._lastAttackKilled;
      if (aKilled) {
        setLastDefeatedAiCard(a.active);
        gainAmp(p, 15);
        const ended = await choreographDefeat(false, true, events);
        if (ended || cancelled()) return;
        updatePhase('result'); refresh();
      } else {
        finishRound(events);
      }

    } else {
      // ── Both attack: determine turn order ───────────────────────────────
      const aiWeight    = aiChooseAttackWeight(a, p, ampRef.current);
      const pSpd        = effSpeed(p.active);
      const aSpd        = effSpeed(a.active);
      const bothHeavy   = weight === 'heavy' && aiWeight === 'heavy';
      const playerHeavy = weight === 'heavy' && !bothHeavy;
      const aiHeavy     = aiWeight === 'heavy' && !bothHeavy;

      let playerFirst: boolean;
      if (playerHeavy)     playerFirst = false;
      else if (aiHeavy)    playerFirst = true;
      else                 playerFirst = pSpd >= aSpd;

      const [fSide, fOpp, fWeight] = playerFirst
        ? [p, a, weight]    as const
        : [a, p, aiWeight]  as const;
      const [sSide, sOpp, sWeight] = playerFirst
        ? [a, p, aiWeight]  as const
        : [p, a, weight]    as const;

      // First hit
      const staminaBeforeR1 = sSide.active.stamina;
      const fSlamWeight = fWeight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';
      if (fSide === p) choreo.triggerPlayerSlam(fSlamWeight);
      else choreo.triggerAiSlam(fSlamWeight);
      const r1 = executeAttack(fSide.active, fOpp.active, fSide, fOpp, events, fWeight, ampRef.current);
      choreo.fireDamagePopup(r1.damage, fOpp === a ? 'ai' : 'player', fSlamWeight, getTypeMultiplier(fSide.active.type, fOpp.active.type));
      if (r1.staminaCost > 0) choreo.fireStaminaPopup(-r1.staminaCost, fSide === p ? 'player' : 'ai');
      if (fSide !== p) hapticForIncomingHit(fWeight);
      gainAmp(fSide, WEIGHT_AMP[fWeight]);
      if (fSide === p) checkPostPlayerAttack();
      setTypeRevealed(true);
      if (fSide === p) { setAiHitKey(k => k + 1); }
      else { setPlayerHitKey(k => k + 1); }
      const firstKilled = r1.killed || fOpp.active.hp <= 0;
      const staminaLeechCancelled = !firstKilled
        && fSide.active.ability === 'Stamina Leech'
        && fOpp.active.stamina === 0 && staminaBeforeR1 > 0;
      refresh();

      // Wait for first slam to settle
      await runSteps([
        [() => {}, slamDuration(fSlamWeight)],
        [() => {}, CHOREO.damageSettle],
        [() => {}, CHOREO.postAttackPause],
      ], cancelled);
      if (cancelled()) return;

      if (firstKilled) {
        const aKilled = fOpp === a;
        const pKilled = fOpp === p;
        if (aKilled) { setLastDefeatedAiCard(a.active); gainAmp(fSide, 15); }
        if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(fSide, 15); }
        handleCombatDeaths(pKilled, aKilled, events);
      } else if (staminaLeechCancelled) {
        finishRound(events);
      } else {
        // Second hit
        const sSlamWeight = sWeight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';
        await runSteps([
          [() => {}, CHOREO.betweenAttacks],
          [() => {
            if (sSide === p) choreo.triggerPlayerSlam(sSlamWeight);
            else choreo.triggerAiSlam(sSlamWeight);
            const r2 = executeAttack(sSide.active, sOpp.active, sSide, sOpp, events, sWeight, ampRef.current);
            choreo.fireDamagePopup(r2.damage, sOpp === a ? 'ai' : 'player', sSlamWeight, getTypeMultiplier(sSide.active.type, sOpp.active.type));
            if (r2.staminaCost > 0) choreo.fireStaminaPopup(-r2.staminaCost, sSide === p ? 'player' : 'ai');
            if (sSide !== p) hapticForIncomingHit(sWeight);
            gainAmp(sSide, WEIGHT_AMP[sWeight]);
            if (sSide === p) checkPostPlayerAttack();
            if (sSide === p) { setAiHitKey(k => k + 1); }
            else { setPlayerHitKey(k => k + 1); }
            const pK = p.active.hp <= 0;
            const aK = a.active.hp <= 0;
            if (aK) { setLastDefeatedAiCard(a.active); gainAmp(sSide, 15); }
            if (pK) { setLastDefeatedPlayerCard(p.active); gainAmp(sSide, 15); }
            (p as any)._pKilled = pK;
            (a as any)._aKilled = aK;
            refresh();
          }, slamDuration(sSlamWeight)],
          [() => {}, CHOREO.damageSettle],
          [() => {}, CHOREO.postAttackPause],
        ], cancelled);
        if (cancelled()) return;

        const pKilled = (p as any)._pKilled; delete (p as any)._pKilled;
        const aKilled = (a as any)._aKilled; delete (a as any)._aKilled;
        if (pKilled || aKilled) handleCombatDeaths(pKilled, aKilled, events);
        else finishRound(events);
      }
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, doAiReplace, finishRound, handleCombatDeaths, choreographDefeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DRAW — sequential steps ────────────────────────────────────────────────
  //  step 1 (t=0):       player draws → card bounces into hand
  //  step 2 (t=STEP_MS): AI non-combat action shown (if applicable)
  //  step 3 (t=2*STEP_MS or STEP_MS): combat or finish
  const draw = useCallback(async () => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.hand.length >= 5 || p.deck.length === 0) return;
    if (isLockOnActive(ampRef.current, 'player')) return;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    updatePhase('animating');

    const topCard = p.deck[p.deck.length - 1]; // peek at card that will be drawn
    choreo.fireDrawAnimation('player', topCard);
    choreo.showActionLabel('DREW A CARD', 'player');

    // Wait for draw animation to land, THEN add the card to hand
    await runSteps([
      [() => {}, drawDuration('player')],
      [() => { drawCard(p); gainAmp(p, 2); events.push({ type: 'PLAYER_DRAW', card: p.hand[p.hand.length - 1].name }); refresh(); }, CHOREO.drawSettle],
    ], cancelled);
    if (cancelled()) return;

    const drawAiAmpAction = processAiAmp(events);
    if (drawAiAmpAction) {
      refresh();
      const ampWait = drawAiAmpAction === 'trigger'
        ? CHOREO.ampTriggerFlash + CHOREO.ampEffectReveal + CHOREO.ampEffectHold
        : 800;
      await runSteps([[() => {}, ampWait], [() => { choreo.clearAmpActivation(); }, 0]], cancelled);
      if (cancelled()) return;
    }
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      const aiLabel = aiAction === 'rest' ? 'AI RESTED' : aiAction === 'draw' ? 'AI DREW A CARD' : 'AI SWAPPED';
      await runSteps([
        [() => { choreo.clearActionLabel(); choreo.showActionLabel(aiLabel, 'ai'); executeAiAction(aiAction, events); refresh(); }, aiAction === 'draw' ? drawDuration('ai') : CHOREO.actionShow],
        [() => { if (aiAction === 'draw') { completeAiDraw(); refresh(); } }, aiAction === 'draw' ? CHOREO.aiDrawSettle : 0],
        [() => { choreo.clearActionLabel(); }, 0],
      ], cancelled);
      if (cancelled()) return;
      finishRound(events);
    } else {
      const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
      const aiSlamW = aiWeight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';
      let pKilled = false;

      await runSteps([
        [() => {
          choreo.clearActionLabel();
          choreo.triggerAiSlam(aiSlamW);
          const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
          choreo.fireDamagePopup(r.damage, 'player', aiSlamW, getTypeMultiplier(a.active.type, p.active.type));
          if (r.staminaCost > 0) choreo.fireStaminaPopup(-r.staminaCost, 'ai');
          hapticForIncomingHit(aiWeight);
          gainAmp(a, WEIGHT_AMP[aiWeight]);
          setPlayerHitKey(k => k + 1);
          pKilled = r.killed || p.active.hp <= 0;
          if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(a, 15); }
          refresh();
        }, slamDuration(aiSlamW)],
        [() => {}, CHOREO.damageSettle],
        [() => {}, CHOREO.postAttackPause],
      ], cancelled);
      if (cancelled()) return;

      if (pKilled) {
        const ended = await choreographDefeat(true, false, events);
        if (ended || cancelled()) return;
        updatePhase('result'); refresh();
      } else {
        finishRound(events);
      }
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck, choreographDefeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── REST — sequential steps ────────────────────────────────────────────────
  //  step 1 (t=0):       player rests (+5 stamina) — no attack
  //  step 2 (t=STEP_MS): AI non-combat action shown, or AI free hit fires
  //  step 3 (t=2*STEP_MS or STEP_MS): finish or handle death
  const rest = useCallback(async () => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    updatePhase('animating');

    applyRestAction(p.active, p, events);
    choreo.fireStaminaPopup(5, 'player');
    gainAmp(p, 2);
    refresh();

    const restAiAmpAction = processAiAmp(events);
    if (restAiAmpAction) {
      refresh();
      const ampWait = restAiAmpAction === 'trigger'
        ? CHOREO.ampTriggerFlash + CHOREO.ampEffectReveal + CHOREO.ampEffectHold
        : 800;
      await runSteps([[() => {}, ampWait], [() => { choreo.clearAmpActivation(); }, 0]], cancelled);
      if (cancelled()) return;
    }
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      const aiLabel = aiAction === 'rest' ? 'AI RESTED' : aiAction === 'draw' ? 'AI DREW A CARD' : 'AI SWAPPED';
      await runSteps([
        [() => {}, CHOREO.actionShow],
        [() => { choreo.clearActionLabel(); choreo.showActionLabel(aiLabel, 'ai'); executeAiAction(aiAction, events); refresh(); }, aiAction === 'draw' ? drawDuration('ai') : CHOREO.actionShow],
        [() => { if (aiAction === 'draw') { completeAiDraw(); refresh(); } }, aiAction === 'draw' ? CHOREO.aiDrawSettle : 0],
        [() => { choreo.clearActionLabel(); }, 0],
      ], cancelled);
      if (cancelled()) return;
      finishRound(events);
    } else {
      const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
      const aiSlamW = aiWeight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';
      let pKilled = false;

      await runSteps([
        [() => {}, CHOREO.actionShow],
        [() => {
          choreo.clearActionLabel();
          choreo.triggerAiSlam(aiSlamW);
          const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
          choreo.fireDamagePopup(r.damage, 'player', aiSlamW, getTypeMultiplier(a.active.type, p.active.type));
          if (r.staminaCost > 0) choreo.fireStaminaPopup(-r.staminaCost, 'ai');
          hapticForIncomingHit(aiWeight);
          gainAmp(a, WEIGHT_AMP[aiWeight]);
          setPlayerHitKey(k => k + 1);
          pKilled = r.killed || p.active.hp <= 0;
          if (pKilled) setLastDefeatedPlayerCard(p.active);
          refresh();
        }, slamDuration(aiSlamW)],
        [() => {}, CHOREO.damageSettle],
        [() => {}, CHOREO.postAttackPause],
      ], cancelled);
      if (cancelled()) return;

      if (pKilled) {
        gainAmp(a, 15);
        const ended = await choreographDefeat(true, false, events);
        if (ended || cancelled()) return;
        updatePhase('result'); refresh();
      } else {
        finishRound(events);
      }
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck, choreographDefeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SWAP MODE (kept for UI compatibility) ──────────────────────────────────
  const enterSwapMode = useCallback(() => {
    if (phase !== 'ready') return;
    updatePhase('swapping');
  }, [phase]);

  const cancelSwapMode = useCallback(() => {
    if (phase !== 'swapping') return;
    updatePhase('ready');
  }, [phase]);

  // ── VOLUNTARY SWAP — sequential steps ─────────────────────────────────────
  //  step 1 (t=0):       new card enters active, old card slides to hand
  //  step 2 (t=STEP_MS): AI action shown (non-combat) or AI free hit fires
  //  step 3 (t=2*STEP_MS or STEP_MS): finish or handle deaths
  const swapCard = useCallback(async (id: number) => {
    if (phase !== 'ready' && phase !== 'swapping') return;
    const p = pRef.current!;
    const a = aRef.current!;
    const chosen = p.hand.find(c => c.id === id);
    if (!chosen || !p.active) return;
    if (isLockOnActive(ampRef.current, 'player')) return;
    if (chosen.rarity === 'Legendary' && legendaryLocked(p)) return;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);

    const prev = p.active;

    if (prev.ability === 'Pressure') a.pressureStacks = 0;
    if (prev.ability === 'Siege') {
      a.siegeStacks = 0;
      if (a.active) a.active.stamina = Math.min(a.active.stamina, a.active.maxStamina);
    }
    if (prev.ability === 'Juggernaut') {
      prev._juggerStacks = 0;
      prev._juggerAttackedThisRound = false;
    }

    p.hand = p.hand.filter(c => c.id !== id);
    p.hand.push(prev);
    p.active = chosen;
    applyEntryEffects(chosen, p, a, events, true);
    events.push({ type: 'PLAYER_SWAP', card: chosen.name, prev: prev.name });
    gainAmp(p, 3);
    if (chosen.rarity === 'Legendary' && !legendaryLocked(p)) {
      incStat('legendaryUnleashed');
      perBattleStatsRef.current.legendaryUsed = 1;
    }
    setSwapOutCardId(prev.id);
    choreo.showActionLabel('SWAPPED IN ' + chosen.name.toUpperCase(), 'player');
    updatePhase('animating');
    refresh();

    const swapAiAmpAction = processAiAmp(events);
    if (swapAiAmpAction) {
      refresh();
      const ampWait = swapAiAmpAction === 'trigger'
        ? CHOREO.ampTriggerFlash + CHOREO.ampEffectReveal + CHOREO.ampEffectHold
        : 800;
      await runSteps([[() => {}, ampWait], [() => { choreo.clearAmpActivation(); }, 0]], cancelled);
      if (cancelled()) return;
    }
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      const aiLabel = aiAction === 'rest' ? 'AI RESTED' : aiAction === 'draw' ? 'AI DREW A CARD' : 'AI SWAPPED';
      await runSteps([
        [() => {}, CHOREO.actionShow],
        [() => { setSwapOutCardId(null); choreo.clearActionLabel(); choreo.showActionLabel(aiLabel, 'ai'); executeAiAction(aiAction, events); refresh(); }, aiAction === 'draw' ? drawDuration('ai') : CHOREO.actionShow],
        [() => { if (aiAction === 'draw') { completeAiDraw(); refresh(); } }, aiAction === 'draw' ? CHOREO.aiDrawSettle : 0],
        [() => { choreo.clearActionLabel(); }, 0],
      ], cancelled);
      if (cancelled()) return;
      finishRound(events);
    } else {
      const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
      const aiSlamW = aiWeight.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY';
      let pKilled = false;

      await runSteps([
        [() => {}, CHOREO.actionShow],
        [() => {
          setSwapOutCardId(null);
          choreo.clearActionLabel();
          choreo.triggerAiSlam(aiSlamW);
          const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
          choreo.fireDamagePopup(r.damage, 'player', aiSlamW, getTypeMultiplier(a.active.type, p.active.type));
          if (r.staminaCost > 0) choreo.fireStaminaPopup(-r.staminaCost, 'ai');
          hapticForIncomingHit(aiWeight);
          gainAmp(a, WEIGHT_AMP[aiWeight]);
          setPlayerHitKey(k => k + 1);
          pKilled = r.killed || p.active.hp <= 0;
          if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(a, 15); }
          refresh();
        }, slamDuration(aiSlamW)],
        [() => {}, CHOREO.damageSettle],
        [() => {}, CHOREO.postAttackPause],
      ], cancelled);
      if (cancelled()) return;

      if (pKilled) {
        gainAmp(a, 15);
        const ended = await choreographDefeat(true, false, events);
        if (ended || cancelled()) return;
        updatePhase('result'); refresh();
      } else {
        finishRound(events);
      }
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck, choreographDefeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Forced card replacement (active card was killed) ──────────────────────
  const selectCard = useCallback((id: number) => {
    if (phase !== 'selecting') return;
    const p = pRef.current!;
    const a = aRef.current!;
    const chosen = p.hand.find(c => c.id === id);
    if (!chosen) return;
    setLastDefeatedPlayerCard(null);
    setSwapOutCardId(null);
    p.hand   = p.hand.filter(c => c.id !== id);
    p.active = chosen;
    applyEntryEffects(chosen, p, a, eventsRef.current, true);
    eventsRef.current.push({ type: 'CARD_ENTER', side: 'player', card: chosen.name, rarity: chosen.rarity, hp: chosen.hp, maxHp: chosen.maxHp });
    // Track Legendary Unleashed on forced replacement
    if (chosen.rarity === 'Legendary' && !legendaryLocked(p)) {
      incStat('legendaryUnleashed');
      perBattleStatsRef.current.legendaryUsed = 1;
    }
    setRound(r => r + 1);
    updatePhase('ready');
    refresh();
  }, [phase]);

  // ── TRIGGER AMP ────────────────────────────────────────────────────────────
  const triggerAmp = useCallback(async () => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.amp < 100) return;
    // Track photo finish: player triggers while opponent had >=80 Amp
    if (a.amp >= 80) incStat('photoFinishTriggers');
    // Track amp race: both meters were at 100 this same trigger moment
    if (a.amp >= 100) incStat('ampRaceTriggers');

    const effectName = ampRef.current.poolEffect;
    updatePhase('animating');
    choreo.fireAmpActivation('player', effectName, 'trigger');
    triggerAmpFn(p, a, ampRef.current, eventsRef.current);

    // Track battlefield control: count distinct effects the player has triggered this battle
    const triggeredEffects = new Set(
      eventsRef.current
        .filter(e => e.type === 'AMP_TRIGGER' && (e as any).side === 'player')
        .map(e => (e as any).effect),
    );
    if (triggeredEffects.size >= 6) {
      perBattleStatsRef.current.battlefieldControlBattles = 1;
    }
    refresh();

    // Choreographed pause — screen dim + label burst + hold
    await runSteps([
      [() => {}, CHOREO.ampTriggerFlash],
      [() => {}, CHOREO.ampEffectReveal],
      [() => {}, CHOREO.ampEffectHold],
      [() => { choreo.clearAmpActivation(); }, 0],
    ], cancelled);
    if (cancelled()) return;

    updatePhase('ready');
    refresh();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SPEND AMP ──────────────────────────────────────────────────────────────
  const spendAmp = useCallback(async () => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    if (p.amp < 50) return;

    updatePhase('animating');
    choreo.fireAmpActivation('player', 'scramble', 'spend');
    refresh();

    // Wait for text scramble to play, then apply the spend
    await runSteps([[() => {}, 800]], cancelled);
    if (cancelled()) return;

    spendAmpFn(p, ampRef.current, eventsRef.current);
    choreo.clearAmpActivation();
    updatePhase('ready');
    refresh();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Forfeit: clear saved battle before navigating away ───────────────────
  const forfeit = useCallback(() => {
    gs.clearBattleState();
  }, [gs]);

  // ── Checkpoint save: persist battle state when stable ────────────────────
  useEffect(() => {
    if (phase !== 'ready' || winner !== null) return;
    if (!pRef.current || !aRef.current) return;
    // Collect all AI card IDs from all zones (hand, deck, active, defeated)
    const allAiCards = [
      aRef.current.active,
      ...aRef.current.hand,
      ...aRef.current.deck,
      ...aRef.current.defeated,
    ].filter(Boolean);
    const serialized = {
      version:        1,
      playerDeckIds,
      aiDeckIds:      allAiCards.map(c => c.id),
      tier,
      round,
      player:         serializeSideState(pRef.current),
      ai:             serializeSideState(aRef.current),
      ampField:       { ...ampRef.current },
      events:         eventsRef.current,
      perBattleStats: { ...perBattleStatsRef.current },
      savedAt:        Date.now(),
    };
    gs.saveBattleState(serialized);
  }, [phase, winner, round]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    phase,
    round,
    playerActive:    snap.playerActive,
    aiActive:        snap.aiActive,
    playerHand:      snap.playerHand,
    aiHandCount:     snap.aiHandCount,
    playerDeckCount: snap.playerDeckCount,
    aiDeckCount:     snap.aiDeckCount,
    lastEvents:      eventsRef.current,
    winner,
    typeRevealed,
    rewards,
    tierColor:       tierInfo.color,
    tierName:        tierInfo.name,
    tierSymbol:      tierInfo.symbol,
    canDraw:         snap.playerHand.length < 5 && snap.playerDeckCount > 0 && !isLockOnActive(ampRef.current, 'player'),
    canSwap:         !!snap.playerActive && snap.playerHand.length > 0 && !isLockOnActive(ampRef.current, 'player'),
    playerAmp:       snap.playerAmp,
    aiAmp:           snap.aiAmp,
    ampPoolEffect:   snap.ampPoolEffect,
    ampActiveEffect: snap.ampActiveEffect,
    ampRoundsLeft:   snap.ampRoundsLeft,
    ampTriggeredBy:  snap.ampTriggeredBy,
    canTrigger:      snap.playerAmp >= 100 && phase === 'ready',
    canSpend:        snap.playerAmp >= 50 && phase === 'ready',
    playerKillCount: snap.playerKillCount,
    playerHitKey,
    aiHitKey,
    lastDefeatedPlayerCard,
    lastDefeatedAiCard,
    swapOutCardId,
    choreo,
    attack,
    rest,
    draw,
    triggerAmp,
    spendAmp,
    enterSwapMode,
    cancelSwapMode,
    swapCard,
    selectCard,
    forfeit,
  };
}
