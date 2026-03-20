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
  BattleCard, SideState, BattleEvent,
  initSideState, applyEntryEffects, effSpeed,
  executeAttack, resolveKill, resolveDefeat,
  drawCard, aiSelectCard, aiDecide,
  executeAIProactiveSwap, resolvePostRound,
  calcBattleRewards,
} from '../battle/battleEngine';
import { buildAiDeck } from '../battle/aiDeck';

export type BattlePhase = 'init' | 'ready' | 'animating' | 'result' | 'selecting' | 'swapping' | 'done';
type RoundAction = 'attack' | 'draw' | 'swap';

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
  winner:          'player' | 'ai' | null;
  typeRevealed:    boolean;
  rewards:         { credits: number; xp: number; streakBonus: boolean } | null;
  tierColor:       string;
  tierName:        string;
  canDraw:         boolean;
  canSwap:         boolean;
  // ── Session 12 animation signals ─────────────────────────────────────────
  playerHitKey:            number;              // increments each time player's card is hit
  aiHitKey:                number;              // increments each time AI's card is hit
  aiAttackKey:             number;              // increments when AI card lunges to attack
  lastDefeatedPlayerCard:  BattleCard | null;  // player's last killed card (for defeat animation)
  lastDefeatedAiCard:      BattleCard | null;  // AI's last killed card (for defeat animation)
  swapOutCardId:           number | null;      // id of the card that just moved from active→hand
  attack:          () => void;
  draw:            () => void;
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
}

export function useBattle(playerDeckIds: number[], tier: number): UseBattleResult {
  const gs = useGameStateContext();

  const pRef      = useRef<SideState | null>(null);
  const aRef      = useRef<SideState | null>(null);
  const eventsRef = useRef<BattleEvent[]>([]);

  const [phase,        setPhase]        = useState<BattlePhase>('init');
  const [snap,         setSnap]         = useState<DisplaySnapshot>({
    playerActive: null, aiActive: null, playerHand: [],
    aiHandCount: 0, playerDeckCount: 0, aiDeckCount: 0,
  });
  const [round,        setRound]        = useState(1);
  const [winner,       setWinner]       = useState<'player' | 'ai' | null>(null);
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
  const endBattle = useCallback((w: 'player' | 'ai') => {
    eventsRef.current.push({ type: 'BATTLE_END', winner: w });
    const r = calcBattleRewards(tier, w, 0);
    setRewards(r);
    setWinner(w);
    setPhase('done');
    gs.addCoins(r.credits);
    gs.addXp(r.xp);
    gs.addBattleCooldowns(playerDeckIds);
    refresh();
  }, [tier, playerDeckIds, gs]);

  // ── Post-round cleanup (bleed ticks, Resilience, bleed deaths) ────────────
  const finishRound = useCallback((events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;
    resolvePostRound(p, a, events);
    if (p.active && p.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: p.active.name, byCard: 'Bleed' });
      resolveDefeat(p.active, p, events);
      setLastDefeatedPlayerCard(p.active);
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
    }
    if (a.active && a.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: a.active.name, byCard: 'Bleed' });
      resolveDefeat(a.active, a, events);
      setLastDefeatedAiCard(a.active);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      doAiReplace(events);
    }
    setPhase('result');
    refresh();
  }, [endBattle]); // eslint-disable-line react-hooks/exhaustive-deps

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
    applyEntryEffects(next, a, p, events);
    events.push({ type: 'CARD_ENTER', side: 'ai', card: next.name, rarity: next.rarity, hp: next.hp, maxHp: next.maxHp });
  }, [endBattle]);

  // ── Two-way combat deaths handler (both attacked) ─────────────────────────
  const handleCombatDeaths = useCallback((pKilled: boolean, aKilled: boolean, events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;

    // NOTE: setLastDefeated* must be called by the caller before invoking this function.
    if (aKilled && pKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events);
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events);
      (a as any).active = null; (p as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'),     0); return; }
      if (a.hand.length === 0 && a.deck.length > 0) drawCard(a);
      const next = aiSelectCard(a.hand, 'Brawler');
      if (next) { a.hand = a.hand.filter(c => c.id !== next.id); a.active = next; applyEntryEffects(next, a, p, events); }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }
    if (aKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      doAiReplace(events);
      setPhase('result'); refresh(); return;
    }
    if (pKilled) {
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events);
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }
    finishRound(events);
  }, [endBattle, doAiReplace, finishRound]);

  // ── Execute AI's chosen action (non-combat part) ──────────────────────────
  const executeAiAction = useCallback((aiAction: RoundAction, events: BattleEvent[]) => {
    const a = aRef.current!;
    const p = pRef.current!;
    if (aiAction === 'draw') {
      drawCard(a);
    } else if (aiAction === 'swap') {
      executeAIProactiveSwap(a, p, events);
    }
    // 'attack' has no pre-combat side effect
  }, []);

  // ── ATTACK — sequential steps ──────────────────────────────────────────────
  //
  //  player \ AI  │  attack (both)          non-attack (free hit)
  //  ─────────────┼──────────────────────────────────────────────
  //  Both attack  │  step1: first hit        —
  //               │  step2: second hit       —
  //  Free hit     │  step1: AI action shown  step1: AI action shown
  //               │  step2: player hits AI   —
  //
  const attack = useCallback(() => {
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

    const aiAction = aiDecide(a, p);

    if (aiAction !== 'attack') {
      // ── Player attacks, AI did non-combat action ────────────────────────
      // Step 1 (t=0): show AI's action first
      executeAiAction(aiAction, events);
      refresh();
      // Step 2 (t=STEP_MS): player's free hit
      setTimeout(() => {
        const r = executeAttack(p.active, a.active, p, a, events);
        setTypeRevealed(true);
        setAiHitKey(k => k + 1);
        const aKilled = r.killed || a.active.hp <= 0;
        refresh();
        setTimeout(() => {
          if (aKilled) {
            setLastDefeatedAiCard(a.active);
            resolveKill(p.active, p, a, events);
            resolveDefeat(a.active, a, events);
            (a as any).active = null;
            if (a.hand.length === 0 && a.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
            doAiReplace(events);
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);

    } else {
      // ── Both attack: sequential by speed order ──────────────────────────
      const pSpd = effSpeed(p.active);
      const aSpd = effSpeed(a.active);
      const playerFirst = pSpd >= aSpd;
      const [fSide, fOpp] = playerFirst ? [p, a] as const : [a, p] as const;
      const [sSide, sOpp] = playerFirst ? [a, p] as const : [p, a] as const;

      // Step 1 (t=0): first hit (player's spring-back is the visual "lunge")
      const r1 = executeAttack(fSide.active, fOpp.active, fSide, fOpp, events);
      setTypeRevealed(true);
      if (fSide === p) { setAiHitKey(k => k + 1); }
      else { setPlayerHitKey(k => k + 1); setAiAttackKey(k => k + 1); }
      const firstKilled = r1.killed || fOpp.active.hp <= 0;
      refresh();

      if (firstKilled) {
        const aKilled = fOpp === a;
        const pKilled = fOpp === p;
        if (aKilled) setLastDefeatedAiCard(a.active);
        if (pKilled) setLastDefeatedPlayerCard(p.active);
        setTimeout(() => handleCombatDeaths(pKilled, aKilled, events), STEP_MS);
      } else {
        // Step 2 (t=STEP_MS): second hit
        setTimeout(() => {
          const r2 = executeAttack(sSide.active, sOpp.active, sSide, sOpp, events);
          if (sSide === p) { setAiHitKey(k => k + 1); }
          else { setPlayerHitKey(k => k + 1); setAiAttackKey(k => k + 1); }
          const pKilled = p.active.hp <= 0;
          const aKilled = a.active.hp <= 0;
          if (aKilled) setLastDefeatedAiCard(a.active);
          if (pKilled) setLastDefeatedPlayerCard(p.active);
          refresh();
          setTimeout(() => {
            if (pKilled || aKilled) handleCombatDeaths(pKilled, aKilled, events);
            else finishRound(events);
          }, STEP_MS);
        }, STEP_MS);
      }
    }
  }, [phase, round, executeAiAction, endBattle, doAiReplace, finishRound, handleCombatDeaths]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DRAW — sequential steps ────────────────────────────────────────────────
  //  step 1 (t=0):       player draws → card bounces into hand
  //  step 2 (t=STEP_MS): AI non-combat action shown (if applicable)
  //  step 3 (t=2*STEP_MS or STEP_MS): combat or finish
  const draw = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.hand.length >= 5 || p.deck.length === 0) return;
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);
    setPhase('animating');

    // Step 1 (t=0): player draws
    drawCard(p);
    events.push({ type: 'PLAYER_DRAW', card: p.hand[p.hand.length - 1].name });
    refresh();

    const aiAction = aiDecide(a, p);

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
        const r = executeAttack(a.active, p.active, a, p, events);
        setPlayerHitKey(k => k + 1);
        setAiAttackKey(k => k + 1);
        const pKilled = r.killed || p.active.hp <= 0;
        if (pKilled) setLastDefeatedPlayerCard(p.active);
        refresh();
        setTimeout(() => {
          if (pKilled) {
            resolveKill(a.active, a, p, events);
            resolveDefeat(p.active, p, events);
            (p as any).active = null;
            if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
            if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);
    }
  }, [phase, round, executeAiAction, endBattle, finishRound]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setLastDefeatedPlayerCard(null);
    setLastDefeatedAiCard(null);
    const events: BattleEvent[] = [];
    eventsRef.current = events;
    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });
    setTypeRevealed(false);

    // Step 1 (t=0): apply swap, show animations
    const prev = p.active;
    p.hand = p.hand.filter(c => c.id !== id);
    p.hand.push(prev);
    p.active = chosen;
    applyEntryEffects(chosen, p, a, events);
    events.push({ type: 'PLAYER_SWAP', card: chosen.name, prev: prev.name });
    setSwapOutCardId(prev.id);
    setPhase('animating');
    refresh();

    const aiAction = aiDecide(a, p);

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
        const r = executeAttack(a.active, p.active, a, p, events);
        setPlayerHitKey(k => k + 1);
        setAiAttackKey(k => k + 1);
        const pKilled = r.killed || p.active.hp <= 0;
        if (pKilled) setLastDefeatedPlayerCard(p.active);
        refresh();
        setTimeout(() => {
          if (pKilled) {
            resolveKill(a.active, a, p, events);
            resolveDefeat(p.active, p, events);
            (p as any).active = null;
            if (p.hand.length === 0 && p.deck.length === 0) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return; }
            if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
            setPhase('result'); refresh();
          } else {
            finishRound(events);
          }
        }, STEP_MS);
      }, STEP_MS);
    }
  }, [phase, round, executeAiAction, endBattle, finishRound]); // eslint-disable-line react-hooks/exhaustive-deps

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
    applyEntryEffects(chosen, p, a, eventsRef.current);
    eventsRef.current.push({ type: 'CARD_ENTER', side: 'player', card: chosen.name, rarity: chosen.rarity, hp: chosen.hp, maxHp: chosen.maxHp });
    setRound(r => r + 1);
    setPhase('ready');
    refresh();
  }, [phase]);

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
    canDraw:         snap.playerHand.length < 5 && snap.playerDeckCount > 0,
    canSwap:         !!snap.playerActive && snap.playerHand.length > 0,
    playerHitKey,
    aiHitKey,
    aiAttackKey,
    lastDefeatedPlayerCard,
    lastDefeatedAiCard,
    swapOutCardId,
    attack,
    draw,
    enterSwapMode,
    cancelSwapMode,
    swapCard,
    selectCard,
  };
}
