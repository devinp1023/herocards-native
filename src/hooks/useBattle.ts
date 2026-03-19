// useBattle — drives the step-by-step battle state machine.
// Three player actions per turn: attack, draw, swap.
// Free-hit rule: attack vs non-attack → attacker gets one unreciprocated hit.
//                both non-attack → no combat this round.

import { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_CARDS } from '../data/cards';
import { TIER_INFO } from '../data/constants';
import { useGameStateContext } from '../context/GameStateContext';
import {
  BattleCard, SideState, BattleEvent,
  initSideState, applyEntryEffects, effSpeed,
  executeAttack, resolveKill, resolveDefeat,
  drawCard, aiSelectCard, resolvePostRound,
  executeAIProactiveSwap, aiSwapTarget, calcBattleRewards,
} from '../battle/battleEngine';
import { buildAiDeck } from '../battle/aiDeck';

export type BattlePhase = 'init' | 'ready' | 'result' | 'selecting' | 'swapping' | 'done';

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
  attack:          () => void;
  draw:            () => void;
  enterSwapMode:   () => void;
  cancelSwapMode:  () => void;
  swapCard:        (id: number) => void;   // voluntary swap (phase === 'swapping')
  selectCard:      (id: number) => void;   // forced replacement (phase === 'selecting')
  nextRound:       () => void;
}

export function useBattle(playerDeckIds: number[], tier: number): UseBattleResult {
  const gs = useGameStateContext();

  const pRef         = useRef<SideState | null>(null);
  const aRef         = useRef<SideState | null>(null);
  const eventsRef    = useRef<BattleEvent[]>([]);

  const [phase,        setPhase]        = useState<BattlePhase>('init');
  const [tick,         setTick]         = useState(0);
  const [round,        setRound]        = useState(1);
  const [winner,       setWinner]       = useState<'player' | 'ai' | null>(null);
  const [typeRevealed, setTypeRevealed] = useState(false);
  const [rewards,      setRewards]      = useState<{ credits: number; xp: number; streakBonus: boolean } | null>(null);

  const refresh = () => setTick(t => t + 1);

  const tierInfo = TIER_INFO.find(t => t.tier === tier) ?? TIER_INFO[0];

  // ── Initialise on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const playerCards = playerDeckIds.map(id => ALL_CARDS.find(c => c.id === id)!).filter(Boolean);
    const aiCards     = buildAiDeck(tier);

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

  // ── End battle ───────────────────────────────────────────────────────────
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

  // ── Shared: finish a round with no more combat ────────────────────────────
  // Runs bleed/Resilience, checks bleed deaths, advances round.
  const finishRound = useCallback((events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;

    resolvePostRound(p, a, events);

    // Bleed deaths
    if (p.active && p.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: p.active.name, byCard: 'Bleed' });
      resolveDefeat(p.active, p, events);
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return;
      }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }
    if (a.active && a.active.hp <= 0) {
      events.push({ type: 'DEFEAT', card: a.active.name, byCard: 'Bleed' });
      resolveDefeat(a.active, a, events);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return;
      }
      doAiReplace(events);
      setPhase('result'); refresh(); return;
    }

    setRound(r => r + 1);
    setPhase('result');
    refresh();
  }, [endBattle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI replaces its active card ──────────────────────────────────────────
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

  // ── Free AI attack (player took non-attack action, AI can attack) ─────────
  // If AI wants to proactively swap, that counts as its non-attack → no combat.
  const runFreeAiAttack = useCallback((events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;

    // If AI also takes a non-attack action → no combat
    const aiSwapped = executeAIProactiveSwap(a, p, events);
    if (aiSwapped) {
      finishRound(events);
      return;
    }

    // AI gets one free undefended attack
    const r = executeAttack(a.active, p.active, a, p, events);
    const pKilled = r.killed || p.active.hp <= 0;

    if (pKilled) {
      resolveKill(a.active, a, p, events);
      resolveDefeat(p.active, p, events);
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return;
      }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return; // nextRound → 'selecting'
    }

    finishRound(events);
  }, [endBattle, finishRound]);

  // ── Free player attack (player attacked, AI proactively swapped) ──────────
  const runFreePlayerAttack = useCallback((events: BattleEvent[]) => {
    const p = pRef.current!;
    const a = aRef.current!;

    const r = executeAttack(p.active, a.active, p, a, events);
    setTypeRevealed(true);
    const aKilled = r.killed || a.active.hp <= 0;

    if (aKilled) {
      resolveKill(p.active, p, a, events);
      resolveDefeat(a.active, a, events);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return;
      }
      doAiReplace(events);
      setPhase('result'); refresh(); return;
    }

    finishRound(events);
  }, [endBattle, doAiReplace, finishRound]);

  // ── ATTACK ────────────────────────────────────────────────────────────────
  const attack = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;

    const events: BattleEvent[] = [];
    eventsRef.current = events;

    if (p.hand.length < 5 && p.deck.length > 0) drawCard(p);
    if (a.hand.length < 5 && a.deck.length > 0) drawCard(a);

    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });

    // AI may proactively swap → player gets free undefended hit
    const aiSwapped = executeAIProactiveSwap(a, p, events);
    if (aiSwapped) {
      runFreePlayerAttack(events);
      return;
    }

    // Normal combat — faster side goes first
    const pSpd = effSpeed(p.active);
    const aSpd = effSpeed(a.active);
    const playerFirst = pSpd >= aSpd;

    const [fSide, fOpp] = playerFirst ? [p, a] as const : [a, p] as const;
    const [sSide, sOpp] = playerFirst ? [a, p] as const : [p, a] as const;

    let pKilled = false;
    let aKilled = false;

    const r1 = executeAttack(fSide.active, fOpp.active, fSide, fOpp, events);
    setTypeRevealed(true);
    if (fOpp === a) aKilled = r1.killed || a.active.hp <= 0;
    else             pKilled = r1.killed || p.active.hp <= 0;

    if (!r1.killed) {
      const r2 = executeAttack(sSide.active, sOpp.active, sSide, sOpp, events);
      if (sOpp === a) aKilled = r2.killed || a.active.hp <= 0;
      else             pKilled = r2.killed || p.active.hp <= 0;
    }

    // Counterstrike deaths
    if (p.active.hp <= 0) pKilled = true;
    if (a.active.hp <= 0) aKilled = true;

    if (aKilled && pKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events);
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events);
      (a as any).active = null; (p as any).active = null;
      const aOut = a.hand.length === 0 && a.deck.length === 0;
      const pOut = p.hand.length === 0 && p.deck.length === 0;
      if (aOut) { setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return; }
      if (pOut) { setPhase('result'); refresh(); setTimeout(() => endBattle('ai'),     0); return; }
      if (a.hand.length === 0 && a.deck.length > 0) drawCard(a);
      const next = aiSelectCard(a.hand, 'Brawler');
      if (next) { a.hand = a.hand.filter(c => c.id !== next.id); a.active = next; applyEntryEffects(next, a, p, events); }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }

    if (aKilled) {
      resolveKill(p.active, p, a, events); resolveDefeat(a.active, a, events);
      (a as any).active = null;
      if (a.hand.length === 0 && a.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('player'), 0); return;
      }
      doAiReplace(events);
      setPhase('result'); refresh(); return;
    }

    if (pKilled) {
      resolveKill(a.active, a, p, events); resolveDefeat(p.active, p, events);
      (p as any).active = null;
      if (p.hand.length === 0 && p.deck.length === 0) {
        setPhase('result'); refresh(); setTimeout(() => endBattle('ai'), 0); return;
      }
      if (p.hand.length === 0 && p.deck.length > 0) drawCard(p);
      setPhase('result'); refresh(); return;
    }

    finishRound(events);
  }, [phase, round, doAiReplace, endBattle, runFreePlayerAttack, finishRound]);

  // ── DRAW ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    if (phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    if (p.hand.length >= 5 || p.deck.length === 0) return;

    const events: BattleEvent[] = [];
    eventsRef.current = events;

    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });

    // AI response: draw if it can (mutual non-attack → no combat)
    const aiDrew = a.hand.length < 5 && a.deck.length > 0;
    if (aiDrew) drawCard(a);

    drawCard(p);
    const newCard = p.hand[p.hand.length - 1];
    events.push({ type: 'PLAYER_DRAW', card: newCard.name });
    setTypeRevealed(false);

    if (aiDrew) {
      finishRound(events);
    } else {
      // AI gets free attack (player took non-attack, AI didn't)
      runFreeAiAttack(events);
    }
  }, [phase, round, finishRound, runFreeAiAttack]);

  // ── SWAP MODE ─────────────────────────────────────────────────────────────
  const enterSwapMode = useCallback(() => {
    if (phase !== 'ready') return;
    setPhase('swapping');
  }, [phase]);

  const cancelSwapMode = useCallback(() => {
    if (phase !== 'swapping') return;
    setPhase('ready');
  }, [phase]);

  // ── VOLUNTARY SWAP ────────────────────────────────────────────────────────
  const swapCard = useCallback((id: number) => {
    if (phase !== 'swapping' && phase !== 'ready') return;
    const p = pRef.current!;
    const a = aRef.current!;
    const chosen = p.hand.find(c => c.id === id);
    if (!chosen || !p.active) return;

    const events: BattleEvent[] = [];
    eventsRef.current = events;

    events.push({ type: 'ROUND_START', round, playerHp: p.active.hp, playerMaxHp: p.active.maxHp, aiHp: a.active.hp, aiMaxHp: a.active.maxHp });

    const prev = p.active;
    p.hand = p.hand.filter(c => c.id !== id);
    p.hand.push(prev);
    p.active = chosen;
    applyEntryEffects(chosen, p, a, events);
    events.push({ type: 'PLAYER_SWAP', card: chosen.name, prev: prev.name });
    setTypeRevealed(false);

    // AI response: same as draw (draw if it can, else free attack)
    const aiDrew = a.hand.length < 5 && a.deck.length > 0;
    if (aiDrew) drawCard(a);

    if (aiDrew) {
      finishRound(events);
    } else {
      runFreeAiAttack(events);
    }
  }, [phase, round, finishRound, runFreeAiAttack]);

  // ── Advance past result screen ────────────────────────────────────────────
  const nextRound = useCallback(() => {
    if (phase !== 'result') return;
    const p = pRef.current!;
    if (!p.active) {
      setPhase('selecting');
    } else {
      setRound(r => r + 1);
      setPhase('ready');
    }
    refresh();
  }, [phase]);

  // ── Forced card replacement ───────────────────────────────────────────────
  const selectCard = useCallback((id: number) => {
    if (phase !== 'selecting') return;
    const p = pRef.current!;
    const a = aRef.current!;
    const chosen = p.hand.find(c => c.id === id);
    if (!chosen) return;
    p.hand   = p.hand.filter(c => c.id !== id);
    p.active = chosen;
    applyEntryEffects(chosen, p, a, eventsRef.current);
    eventsRef.current.push({ type: 'CARD_ENTER', side: 'player', card: chosen.name, rarity: chosen.rarity, hp: chosen.hp, maxHp: chosen.maxHp });
    setRound(r => r + 1);
    setPhase('ready');
    refresh();
  }, [phase]);

  const p = pRef.current;
  const a = aRef.current;

  return {
    phase,
    round,
    playerActive:    p?.active ?? null,
    aiActive:        a?.active ?? null,
    playerHand:      p?.hand ?? [],
    aiHandCount:     a?.hand.length ?? 0,
    playerDeckCount: p?.deck.length ?? 0,
    aiDeckCount:     a?.deck.length ?? 0,
    lastEvents:      eventsRef.current,
    winner,
    typeRevealed,
    rewards,
    tierColor:       tierInfo.color,
    tierName:        tierInfo.name,
    canDraw:         (p?.hand.length ?? 0) < 5 && (p?.deck.length ?? 0) > 0,
    canSwap:         !!(p?.active) && (p?.hand.length ?? 0) > 0,
    attack,
    draw,
    enterSwapMode,
    cancelSwapMode,
    swapCard,
    selectCard,
    nextRound,
  };
}
