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
import { TIER_INFO } from '../data/constants';
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
  aiAttackKey:             number;              // increments when AI card lunges to attack
  lastDefeatedPlayerCard:  BattleCard | null;  // player's last killed card (for defeat animation)
  lastDefeatedAiCard:      BattleCard | null;  // AI's last killed card (for defeat animation)
  swapOutCardId:           number | null;      // id of the card that just moved from active→hand
  attack:          (weight: AttackWeight) => void;
  rest:            () => void;
  draw:            () => void;
  triggerAmp:      () => void;
  spendAmp:        () => void;
  enterSwapMode:   () => void;
  cancelSwapMode:  () => void;
  swapCard:        (id: number) => void;
  selectCard:      (id: number) => void;
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

export function useBattle(playerDeckIds: number[], tier: number): UseBattleResult {
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
  const [aiAttackKey,            setAiAttackKey]            = useState(0);
  const [lastDefeatedPlayerCard, setLastDefeatedPlayerCard] = useState<BattleCard | null>(null);
  const [lastDefeatedAiCard,     setLastDefeatedAiCard]     = useState<BattleCard | null>(null);
  const [swapOutCardId,          setSwapOutCardId]          = useState<number | null>(null);

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

  /** ms between sequential animation steps within a round */
  const STEP_MS = 1000;

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
    const playerCards = playerDeckIds.map(id => cardRoster.find(c => c.id === id)!).filter(Boolean);
    const aiCards     = buildAiDeck(tier, cardRoster);
    const p = initSideState(playerCards, 'player');
    const a = initSideState(aiCards,     'ai');

    // Sprint 5: Legendary Lock — opening card cannot be Legendary.
    // If the active card is Legendary, find the first non-Legendary in hand
    // and swap it to active, pushing the Legendary to the back of the hand.
    const ensureNonLegendaryOpener = (side: SideState) => {
      if (side.active.rarity === 'Legendary') {
        const firstNonLeg = side.hand.findIndex(c => c.rarity !== 'Legendary');
        if (firstNonLeg !== -1) {
          const replacement = side.hand[firstNonLeg];
          side.hand[firstNonLeg] = side.active;
          side.active = replacement;
        }
        // If entire hand is also Legendary (extremely unlikely), leave as-is —
        // the player still starts with a Legendary opener which is undesirable
        // but gracefully handled since no non-Legendary exists.
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
    setPhase('ready');
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End battle ────────────────────────────────────────────────────────────
  const endBattle = useCallback((w: 'player' | 'ai' | 'tie') => {
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
    setPhase('done');
    gs.addCoins(r.credits);
    gs.addXp(r.xp);
    gs.addBattleCooldowns(playerDeckIds);
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
    setPhase('result');
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
        if (p.hand.length === 0 && p.deck.length === 0 && a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('tie'), 0); return; }
        if (a.hand.length === 0 && a.deck.length === 0) { (p as any).active = null; setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
        (p as any).active = null;
        doAiReplace(events);
        if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
        setPhase('result'); refresh(); return;
      }
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      // Sprint 5: player stuck with only locked Legendaries
      if (checkLegendaryStuck(p, 'player', events)) return;
    }
    if (a.active && a.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: a.active.name, byCard: 'Bleed' });
      resolveDefeat(a.active, a, events, p);
      setLastDefeatedAiCard(a.active);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      // Sprint 5: AI stuck with only locked Legendaries
      if (checkLegendaryStuck(a, 'ai', events)) return;
      doAiReplace(events);
    }
    setPhase('result');
    refresh();
  }, [endBattle, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance: result → ready (or selecting if player card was killed) ──
  useEffect(() => {
    if (phase !== 'result') return;
    const id = setTimeout(() => {
      const p = pRef.current;
      if (!p) return;
      if (!p.active) {
        setPhase('selecting');
      } else {
        setRound(r => r + 1);
        setPhase('ready');
      }
      refresh();
    }, 800);
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

  // ── Two-way combat deaths handler (both attacked) ─────────────────────────
  const handleCombatDeaths = useCallback((pKilled: boolean, aKilled: boolean, events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;

    // NOTE: setLastDefeated* must be called by the caller before invoking this function.
    if (aKilled && pKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events, p);
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events, a);
      (a as any).active = null; (p as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0 && p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('tie'), 0); return; }
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'),     0); return; }
      if (a.hand.length === 0 && a.deck.length > 0) drawCard(a);
      const next = aiSelectCard(a.hand, 'Brawler');
      if (next) { a.hand = a.hand.filter(c => c.id !== next.id); a.active = next; applyEntryEffects(next, a, p, events, true); }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }
    if (aKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events, p);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      // Sprint 5: AI stuck with only locked Legendaries
      if (checkLegendaryStuck(a, 'ai', events)) return;
      doAiReplace(events);
      setPhase('result'); refresh(); return;
    }
    if (pKilled) {
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events, a);
      // Last Effort could kill a.active
      if (a.active && a.active.hp <= 0) {
        resolveDefeat(a.active, a, events);
        setLastDefeatedAiCard(a.active);
        (a as any).active = null; (p as any).active = null;
        if (p.hand.length === 0 && p.deck.length === 0 && a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('tie'), 0); return; }
        if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
        // Sprint 5: AI stuck with only locked Legendaries
        if (checkLegendaryStuck(a, 'ai', events)) return;
        doAiReplace(events);
        if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
        setPhase('result'); refresh(); return;
      }
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      // Sprint 5: player stuck with only locked Legendaries
      if (checkLegendaryStuck(p, 'player', events)) return;
      setPhase('result'); refresh(); return;
    }
    finishRound(events);
  }, [endBattle, doAiReplace, finishRound, checkLegendaryStuck]);

  // ── Execute AI's chosen action (non-combat part) ──────────────────────────
  const executeAiAction = useCallback((aiAction: RoundAction, events: BattleEvent[]) => {
    const a   = aRef.current!;
    const p   = pRef.current!;
    if (aiAction === 'draw') {
      drawCard(a);
      gainAmp(a, 2);
    } else if (aiAction === 'swap') {
      executeAIProactiveSwap(a, p, events);
      gainAmp(a, 3);
    } else if (aiAction === 'rest') {
      applyRestAction(a.active, a, events);
      gainAmp(a, 2);
    }
    // 'attack' has no pre-combat side effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI Amp decision (trigger/spend at start of each round) ────────────────
  const processAiAmp = useCallback((events: BattleEvent[]) => {
    const a   = aRef.current!;
    const p   = pRef.current!;
    const amp = ampRef.current;
    const decision = aiDecideAmp(a, p, amp);
    if (decision === 'trigger') triggerAmpFn(a, p, amp, events);
    else if (decision === 'spend') spendAmpFn(a, amp, events);
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
  const attack = useCallback((weight: AttackWeight) => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    setPhase('animating');

    // AI Amp decision happens at round start, before actions resolve
    processAiAmp(events);

    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      // ── Player attacks, AI did non-combat action ────────────────────────
      // Step 1 (t=0): show AI's action first
      executeAiAction(aiAction, events);
      refresh();
      // Step 2 (t=STEP_MS): player's free hit
      setTimeout(() => {
        const r = executeAttack(p.active, a.active, p, a, events, weight, ampRef.current);
        gainAmp(p, WEIGHT_AMP[weight]);
        checkPostPlayerAttack();
        setTypeRevealed(true);
        setAiHitKey(k => k + 1);
        const aKilled = r.killed || a.active.hp <= 0;
        refresh();
        setTimeout(() => {
          if (aKilled) {
            setLastDefeatedAiCard(a.active);
            gainAmp(p, 15); // +15 for kill
            resolveKill(p.active, p, a, events);
            resolveDefeat(a.active, a, events, p);
            (a as any).active = null;
            if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
            // Sprint 5: AI stuck with only locked Legendaries
            if (checkLegendaryStuck(a, 'ai', events)) return;
            doAiReplace(events);
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);

    } else {
      // ── Both attack: determine turn order ───────────────────────────────
      // Heavy attacker always goes second. Exception: both Heavy → speed check.
      const aiWeight    = aiChooseAttackWeight(a, p, ampRef.current);
      const pSpd        = effSpeed(p.active);
      const aSpd        = effSpeed(a.active);
      const bothHeavy   = weight === 'heavy' && aiWeight === 'heavy';
      const playerHeavy = weight === 'heavy' && !bothHeavy;
      const aiHeavy     = aiWeight === 'heavy' && !bothHeavy;

      // playerFirst: true if player attacks before AI this round
      let playerFirst: boolean;
      if (playerHeavy)     playerFirst = false;  // player chose Heavy → goes second
      else if (aiHeavy)    playerFirst = true;   // AI chose Heavy → player goes first
      else                 playerFirst = pSpd >= aSpd; // normal speed check

      const [fSide, fOpp, fWeight] = playerFirst
        ? [p, a, weight]    as const
        : [a, p, aiWeight]  as const;
      const [sSide, sOpp, sWeight] = playerFirst
        ? [a, p, aiWeight]  as const
        : [p, a, weight]    as const;

      // Step 1 (t=0): first hit
      const staminaBeforeR1 = sSide.active.stamina; // for Stamina Leech check
      const r1 = executeAttack(fSide.active, fOpp.active, fSide, fOpp, events, fWeight, ampRef.current);
      gainAmp(fSide, WEIGHT_AMP[fWeight]);
      if (fSide === p) checkPostPlayerAttack();
      setTypeRevealed(true);
      if (fSide === p) { setAiHitKey(k => k + 1); }
      else { setPlayerHitKey(k => k + 1); setAiAttackKey(k => k + 1); }
      const firstKilled = r1.killed || fOpp.active.hp <= 0;
      // Stamina Leech: if first attacker has Stamina Leech and drained second attacker to 0, cancel their attack
      const staminaLeechCancelled = !firstKilled
        && fSide.active.ability === 'Stamina Leech'
        && fOpp.active.stamina === 0 && staminaBeforeR1 > 0;
      refresh();

      if (firstKilled) {
        const aKilled = fOpp === a;
        const pKilled = fOpp === p;
        if (aKilled) { setLastDefeatedAiCard(a.active); gainAmp(fSide, 15); }
        if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(fSide, 15); }
        setTimeout(() => handleCombatDeaths(pKilled, aKilled, events), STEP_MS);
      } else if (staminaLeechCancelled) {
        // Second attacker's stamina drained to 0 by Stamina Leech — skip their attack
        setTimeout(() => finishRound(events), STEP_MS);
      } else {
        // Step 2 (t=STEP_MS): second hit
        setTimeout(() => {
          const r2 = executeAttack(sSide.active, sOpp.active, sSide, sOpp, events, sWeight, ampRef.current);
          gainAmp(sSide, WEIGHT_AMP[sWeight]);
          if (sSide === p) checkPostPlayerAttack();
          if (sSide === p) { setAiHitKey(k => k + 1); }
          else { setPlayerHitKey(k => k + 1); setAiAttackKey(k => k + 1); }
          const pKilled = p.active.hp <= 0;
          const aKilled = a.active.hp <= 0;
          if (aKilled) { setLastDefeatedAiCard(a.active); gainAmp(sSide, 15); }
          if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(sSide, 15); }
          refresh();
          setTimeout(() => {
            if (pKilled || aKilled) handleCombatDeaths(pKilled, aKilled, events);
            else finishRound(events);
          }, STEP_MS);
        }, STEP_MS);
      }
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, doAiReplace, finishRound, handleCombatDeaths]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DRAW — sequential steps ────────────────────────────────────────────────
  //  step 1 (t=0):       player draws → card bounces into hand
  //  step 2 (t=STEP_MS): AI non-combat action shown (if applicable)
  //  step 3 (t=2*STEP_MS or STEP_MS): combat or finish
  const draw = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.hand.length >= 5 || p.deck.length === 0) return;
    // Lock On: player cannot draw
    if (isLockOnActive(ampRef.current, 'player')) return;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    setPhase('animating');

    // Step 1 (t=0): player draws
    drawCard(p);
    gainAmp(p, 2);
    events.push({ type: 'PLAYER_DRAW', card: p.hand[p.hand.length - 1].name });
    refresh();

    processAiAmp(events);
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      // Step 2 (t=STEP_MS): AI non-combat action
      setTimeout(() => {
        executeAiAction(aiAction, events);
        refresh();
        // Step 3 (t=2*STEP_MS): no combat — finish
        setTimeout(() => finishRound(events), STEP_MS);
      }, STEP_MS);
    } else {
      // Step 2 (t=STEP_MS): AI free hit on player
      setTimeout(() => {
        const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
        const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
        gainAmp(a, WEIGHT_AMP[aiWeight]);
        setPlayerHitKey(k => k + 1);
        setAiAttackKey(k => k + 1);
        const pKilled = r.killed || p.active.hp <= 0;
        if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(a, 15); }
        refresh();
        setTimeout(() => {
          if (pKilled) {
            resolveKill(a.active, a, p, events);
            resolveDefeat(p.active, p, events, a);
            (p as any).active = null;
            if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
            if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
            // Sprint 5: player stuck with only locked Legendaries
            if (checkLegendaryStuck(p, 'player', events)) return;
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── REST — sequential steps ────────────────────────────────────────────────
  //  step 1 (t=0):       player rests (+5 stamina) — no attack
  //  step 2 (t=STEP_MS): AI non-combat action shown, or AI free hit fires
  //  step 3 (t=2*STEP_MS or STEP_MS): finish or handle death
  const rest = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    setPhase('animating');

    // Step 1 (t=0): apply rest to player
    applyRestAction(p.active, p, events);
    gainAmp(p, 2);
    refresh();

    processAiAmp(events);
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      // Step 2 (t=STEP_MS): AI non-combat action
      setTimeout(() => {
        executeAiAction(aiAction, events);
        refresh();
        // Step 3 (t=2*STEP_MS): no combat — finish
        setTimeout(() => finishRound(events), STEP_MS);
      }, STEP_MS);
    } else {
      // Step 2 (t=STEP_MS): AI free hit on resting player
      setTimeout(() => {
        const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
        const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
        gainAmp(a, WEIGHT_AMP[aiWeight]);
        setPlayerHitKey(k => k + 1);
        setAiAttackKey(k => k + 1);
        const pKilled = r.killed || p.active.hp <= 0;
        if (pKilled) setLastDefeatedPlayerCard(p.active);
        refresh();
        setTimeout(() => {
          if (pKilled) {
            gainAmp(a, 15); // +15 for kill
            resolveKill(a.active, a, p, events);
            resolveDefeat(p.active, p, events, a);
            (p as any).active = null;
            if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
            if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
            // Sprint 5: player stuck with only locked Legendaries
            if (checkLegendaryStuck(p, 'player', events)) return;
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SWAP MODE (kept for UI compatibility) ──────────────────────────────────
  const enterSwapMode = useCallback(() => {
    if (phase !== 'ready') return;
    setPhase('swapping');
  }, [phase]);

  const cancelSwapMode = useCallback(() => {
    if (phase !== 'swapping') return;
    setPhase('ready');
  }, [phase]);

  // ── VOLUNTARY SWAP — sequential steps ─────────────────────────────────────
  //  step 1 (t=0):       new card enters active, old card slides to hand
  //  step 2 (t=STEP_MS): AI action shown (non-combat) or AI free hit fires
  //  step 3 (t=2*STEP_MS or STEP_MS): finish or handle deaths
  const swapCard = useCallback((id: number) => {
    if (phase !== 'ready' && phase !== 'swapping') return;
    const p = pRef.current!;
    const a = aRef.current!;
    const chosen = p.hand.find(c => c.id === id);
    if (!chosen || !p.active) return;
    // Lock On: player cannot swap
    if (isLockOnActive(ampRef.current, 'player')) return;
    // Sprint 5: Legendary Lock — block if chosen card is Legendary and lock is active
    if (chosen.rarity === 'Legendary' && legendaryLocked(p)) return;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);

    // Step 1 (t=0): apply swap, show animations
    const prev = p.active;

    // Reset Pressure/Siege effects when swapping that card out
    if (prev.ability === 'Pressure') a.pressureStacks = 0;
    if (prev.ability === 'Siege') {
      a.siegeStacks = 0;
      if (a.active) a.active.stamina = Math.min(a.active.stamina, a.active.maxStamina);
    }
    // Reset Juggernaut stacks when swapping out
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
    // Track Legendary Unleashed: player swapped in a Legendary after lock was lifted
    if (chosen.rarity === 'Legendary' && !legendaryLocked(p)) {
      incStat('legendaryUnleashed');
      perBattleStatsRef.current.legendaryUsed = 1;
    }
    setSwapOutCardId(prev.id);
    setPhase('animating');
    refresh();

    processAiAmp(events);
    const aiAction = aiDecide(a, p, ampRef.current, events);

    if (aiAction !== 'attack') {
      // Step 2 (t=STEP_MS): AI non-combat action
      setTimeout(() => {
        setSwapOutCardId(null);
        executeAiAction(aiAction, events);
        refresh();
        // Step 3 (t=2*STEP_MS): no combat — finish
        setTimeout(() => finishRound(events), STEP_MS);
      }, STEP_MS);
    } else {
      // Step 2 (t=STEP_MS): AI free hit on player's new active card
      setTimeout(() => {
        setSwapOutCardId(null);
        const aiWeight = aiChooseAttackWeight(a, p, ampRef.current);
        const r = executeAttack(a.active, p.active, a, p, events, aiWeight, ampRef.current);
        gainAmp(a, WEIGHT_AMP[aiWeight]);
        setPlayerHitKey(k => k + 1);
        setAiAttackKey(k => k + 1);
        const pKilled = r.killed || p.active.hp <= 0;
        if (pKilled) { setLastDefeatedPlayerCard(p.active); gainAmp(a, 15); }
        refresh();
        setTimeout(() => {
          if (pKilled) {
            resolveKill(a.active, a, p, events);
            resolveDefeat(p.active, p, events, a);
            (p as any).active = null;
            if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
            if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
            // Sprint 5: player stuck with only locked Legendaries
            if (checkLegendaryStuck(p, 'player', events)) return;
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);
    }
  }, [phase, round, executeAiAction, processAiAmp, endBattle, finishRound, checkLegendaryStuck]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setPhase('ready');
    refresh();
  }, [phase]);

  // ── TRIGGER AMP ────────────────────────────────────────────────────────────
  const triggerAmp = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.amp < 100) return;
    // Track photo finish: player triggers while opponent had >=80 Amp
    if (a.amp >= 80) incStat('photoFinishTriggers');
    // Track amp race: both meters were at 100 this same trigger moment
    if (a.amp >= 100) incStat('ampRaceTriggers');
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
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SPEND AMP ──────────────────────────────────────────────────────────────
  const spendAmp = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    if (p.amp < 50) return;
    spendAmpFn(p, ampRef.current, eventsRef.current);
    refresh();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

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
    aiAttackKey,
    lastDefeatedPlayerCard,
    lastDefeatedAiCard,
    swapOutCardId,
    attack,
    rest,
    draw,
    triggerAmp,
    spendAmp,
    enterSwapMode,
    cancelSwapMode,
    swapCard,
    selectCard,
  };
}
