// Battle Engine — TypeScript port of web/src/battle-engine.js
// Pure functions, no React, no Firebase.
// All abilities handle ability === undefined gracefully (Session 14 assigns them).

import { Card } from '../data/cards';
import { BATTLE_REWARDS } from '../data/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttackWeight = 'light' | 'medium' | 'heavy';

const WEIGHT_MODIFIER: Record<AttackWeight, number> = { light: 0.8, medium: 1.0, heavy: 1.5 };
const WEIGHT_COST:     Record<AttackWeight, number> = { light: 1,   medium: 3,   heavy: 5   };

// ── Amp constants ──────────────────────────────────────────────────────────────
export const WEIGHT_AMP: Record<AttackWeight, number> = { light: 3, medium: 6, heavy: 10 };

export type AmpEffectName = 'Overcharge' | 'TypeFlip' | 'Exhaustion' | 'FieldMedic' | 'LockOn' | 'Equaliser';
const ALL_AMP_EFFECTS: AmpEffectName[] = ['Overcharge','TypeFlip','Exhaustion','FieldMedic','LockOn','Equaliser'];
const EFFECT_DURATION: Record<AmpEffectName, number> = {
  Overcharge: 2, TypeFlip: 2, Exhaustion: 2, FieldMedic: 0, LockOn: 3, Equaliser: 2,
};

export interface AmpField {
  poolEffect:       AmpEffectName;        // current effect in the shared pool
  activeEffect:     AmpEffectName | null; // currently running triggered effect
  effectRoundsLeft: number;               // rounds remaining (0 = not active)
  triggeredBy:      'player' | 'ai' | null; // who triggered the active effect
}

export interface BattleCard extends Card {
  hp: number;
  maxHp: number;
  stamina:    number;   // current stamina (fluctuates during battle)
  maxStamina: number;   // card's base stamina stat (never changes)
  // one-time flags
  _shieldUsed:      boolean;
  _smokeUsed:       boolean;
  _adaptableUsed:   boolean;
  _secondWindUsed:  boolean;
  _lastStandUsed:   boolean;
  _lastStandActive: boolean;
  // stack counters
  _unstoppableLeft: number;
  _fortifyBonus:    number;
  _momentumStacks:  number;
  _apexMult:        number;
  _apexSpeedMult:   number;
  // active DoT / debuffs
  _bleedRoundsLeft:  number;
  _bleedDmgPerRound: number;
  _dominateDebuff:   boolean;
  // bonus flags
  _packTactics:  boolean;
  _reboundBonus: boolean;
}

export interface SideState {
  active:          BattleCard;
  hand:            BattleCard[];
  deck:            BattleCard[];
  defeated:        BattleCard[];
  attackMult:      number;
  intimidated:     boolean;
  pendingRebound:  boolean;
  pendingDominate: boolean;
  amp:             number;   // 0–100 Amp meter
  _label:          'player' | 'ai';
}

export type BattleEvent =
  | { type: 'BATTLE_START';   playerActive: { name: string; rarity: string; hp: number; maxHp: number }; aiActive: { name: string; rarity: string; hp: number; maxHp: number } }
  | { type: 'ROUND_START';    round: number; playerHp: number; playerMaxHp: number; aiHp: number; aiMaxHp: number }
  | { type: 'ATTACK';         attacker: string; attackerSide?: string; defender: string; defenderSide?: string; damage: number; bonusDamage?: number; typeMultiplier: number; attackWeight?: AttackWeight; hpBefore: number; hpAfter: number; defenderMaxHp: number; missed: boolean }
  | { type: 'REST';           card: string; side: 'player' | 'ai'; staminaBefore: number; staminaAfter: number }
  | { type: 'ABILITY';        ability: string; card: string; side?: string; effect: string; hpAfter?: number; maxHp?: number }
  | { type: 'DEFEAT';         card: string; byCard: string }
  | { type: 'CARD_ENTER';     side: 'player' | 'ai'; card: string; rarity: string; hp: number; maxHp: number }
  | { type: 'FORCED_DRAW';    side: 'player' | 'ai'; card: string }
  | { type: 'AI_SWAP';        card: string; prev: string }
  | { type: 'PLAYER_DRAW';   card: string }
  | { type: 'PLAYER_SWAP';   card: string; prev: string }
  | { type: 'BATTLE_END';     winner: 'player' | 'ai'; reason?: string }
  | { type: 'AMP_TRIGGER';    side: 'player' | 'ai'; effect: AmpEffectName; newEffect: AmpEffectName; healAmount?: number }
  | { type: 'AMP_SPEND';      side: 'player' | 'ai'; newEffect: AmpEffectName }
  | { type: 'AMP_EFFECT_END'; effect: AmpEffectName }
  | { type: 'AMP_BLOCKED';    side: 'player' | 'ai'; action: 'swap' | 'draw' };

// ── 1. Type system (v2 — 9 standalone types) ─────────────────────────────────
//
// Main cycle: Blaster → Magic → Psychic → Shadow → Tank → Speedster → Blaster
//   Each type is ×2.0 against the next and ×0.5 against the previous.
// Rival pair: Nature ↔ Tech (both ×2.0 against each other).
// Cosmic: resists Blaster, Shadow, Nature, Tech (×0.5 incoming);
//         neutral vs Magic, Psychic, Tank, Speedster;
//         ×2.0 only vs other Cosmic.
// All unlisted matchups are ×1.0 (neutral).

const TYPE_CHART: Record<string, Record<string, number>> = {
  Blaster:   { Magic:2.0,     Speedster:0.5, Cosmic:0.5 },
  Magic:     { Psychic:2.0,   Blaster:0.5 },
  Psychic:   { Shadow:2.0,    Magic:0.5 },
  Shadow:    { Tank:2.0,      Psychic:0.5,   Cosmic:0.5 },
  Tank:      { Speedster:2.0, Shadow:0.5 },
  Speedster: { Blaster:2.0,   Tank:0.5 },
  Nature:    { Tech:2.0,      Cosmic:0.5 },
  Tech:      { Nature:2.0,    Cosmic:0.5 },
  Cosmic:    { Cosmic:2.0 },
};

export function getTypeMultiplier(atkType: string, defType: string): number {
  return TYPE_CHART[atkType]?.[defType] ?? 1.0;
}

// ── 2. HP & effective stats ───────────────────────────────────────────────────

function calcMaxHp(card: Card): number {
  return Math.round(100 + card.defense * 0.5);
}

export function effPower(bc: BattleCard): number {
  let p = bc.power;
  if (bc._apexMult > 1) p = Math.round(p * bc._apexMult);
  return p;
}
export function effDefense(bc: BattleCard): number {
  let d = bc.defense + bc._fortifyBonus;
  if (bc._apexMult > 1) d = Math.round(bc.defense * bc._apexMult) + bc._fortifyBonus;
  return d;
}
export function effSpeed(bc: BattleCard): number {
  let s = bc.speed;
  if (bc._apexSpeedMult > 1) s = Math.round(s * bc._apexSpeedMult);
  return s;
}

// ── 3. Battle card init ───────────────────────────────────────────────────────

function initBattleCard(card: Card, fullDeck: Card[]): BattleCard {
  const baseStamina = card.stamina ?? 10;
  const bc: BattleCard = {
    ...card,
    hp:         calcMaxHp(card),
    maxHp:      calcMaxHp(card),
    stamina:    baseStamina,
    maxStamina: baseStamina,
    ability: card.ability ?? null as any,
    _shieldUsed:       false,
    _smokeUsed:        false,
    _adaptableUsed:    false,
    _secondWindUsed:   false,
    _lastStandUsed:    false,
    _lastStandActive:  false,
    _unstoppableLeft:  3,
    _fortifyBonus:     0,
    _momentumStacks:   0,
    _apexMult:         1,
    _apexSpeedMult:    1,
    _bleedRoundsLeft:  0,
    _bleedDmgPerRound: 0,
    _dominateDebuff:   false,
    _packTactics:      false,
    _reboundBonus:     false,
  };
  if (bc.ability === 'Pack Tactics' && fullDeck) {
    bc._packTactics = fullDeck.some(c => c.id !== bc.id && c.type === bc.type);
  }
  return bc;
}

// ── 4. Side state init ────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function initSideState(deck: Card[], label: 'player' | 'ai'): SideState {
  const cards = shuffle(deck).map(c => initBattleCard(c, deck));
  return {
    active:          cards[0],
    hand:            cards.slice(1, 5),
    deck:            cards.slice(5),
    defeated:        [],
    attackMult:      1.0,
    intimidated:     false,
    pendingRebound:  false,
    pendingDominate: false,
    amp:             0,
    _label:          label,
  };
}

// ── 5. Immunity helper ────────────────────────────────────────────────────────

function isImmune(bc: BattleCard): boolean {
  return bc.ability === 'Immunity';
}

// ── 6. Entry effects ──────────────────────────────────────────────────────────

export function applyEntryEffects(bc: BattleCard, side: SideState, opponentSide: SideState, log: BattleEvent[]): void {
  if (side.pendingRebound) {
    bc._reboundBonus = true;
    side.pendingRebound = false;
    log.push({ type: 'ABILITY', ability: 'Rebound', card: bc.name, side: side._label, effect: '+15% damage this card' });
  }
  if (side.pendingDominate && !isImmune(bc)) {
    bc._dominateDebuff = true;
    side.pendingDominate = false;
    log.push({ type: 'ABILITY', ability: 'Dominate', card: bc.name, side: side._label, effect: '−25% attack this card' });
  }
  if (bc.ability === 'Intimidate' && !opponentSide.intimidated) {
    opponentSide.attackMult *= 0.85;
    opponentSide.intimidated = true;
    log.push({ type: 'ABILITY', ability: 'Intimidate', card: bc.name, effect: 'Opponent attack −15% for remainder of battle' });
  }
}

// ── 7. Draw ───────────────────────────────────────────────────────────────────

export function drawCard(side: SideState): boolean {
  if (side.deck.length > 0) { side.hand.push(side.deck.shift()!); return true; }
  return false;
}

// ── 8. AI card selection ──────────────────────────────────────────────────────

export function aiSelectCard(hand: BattleCard[], opponentActiveType: string): BattleCard | null {
  if (!hand.length) return null;
  const totalStat = (c: BattleCard) => c.power + c.defense + c.speed;
  const adv = hand.filter(c => getTypeMultiplier(c.type, opponentActiveType) === 2.0);
  if (adv.length) return adv.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
  const notWeak = hand.filter(c => getTypeMultiplier(c.type, opponentActiveType) !== 0.5);
  if (notWeak.length) return notWeak.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
  return hand.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
}

// ── 9. Execute one attack ─────────────────────────────────────────────────────

export function executeAttack(atk: BattleCard, def: BattleCard, atkSide: SideState, defSide: SideState, log: BattleEvent[], weight: AttackWeight = 'medium', amp?: AmpField): { damage: number; killed: boolean } {
  // Stamina cost — doubled if Exhaustion is active against this attacker
  let staminaCost = WEIGHT_COST[weight];
  if (amp?.activeEffect === 'Exhaustion' && amp.effectRoundsLeft > 0 && amp.triggeredBy !== atkSide._label) {
    staminaCost = staminaCost * 2;
  }
  atk.stamina = Math.max(0, atk.stamina - staminaCost);

  let mult = getTypeMultiplier(atk.type, def.type);

  // TypeFlip: ×0.5 disadvantage → ×2.0 advantage for the triggering side
  if (amp?.activeEffect === 'TypeFlip' && amp.effectRoundsLeft > 0 && amp.triggeredBy === atkSide._label) {
    if (mult === 0.5) mult = 2.0;
  }

  // Adaptable (defender)
  if (def.ability === 'Adaptable' && !def._adaptableUsed && mult === 2.0) {
    def._adaptableUsed = true;
    mult = 1.0;
    log.push({ type: 'ABILITY', ability: 'Adaptable', card: def.name, effect: 'Type advantage reduced to neutral' });
  }
  // Unstoppable (attacker)
  if (atk.ability === 'Unstoppable' && atk._unstoppableLeft > 0 && mult === 0.5) {
    atk._unstoppableLeft--;
    mult = 1.0;
    log.push({ type: 'ABILITY', ability: 'Unstoppable', card: atk.name, effect: `Type disadvantage ignored (${atk._unstoppableLeft} left)` });
  }
  // Overwhelm (attacker) — already at ×2.0 in v2; ability no longer applies
  // (Overwhelm is a v1 ability; Sprint 4 will replace it)

  // Equaliser: both cards use round((atk+def)/2) of buffed Power and Defense
  let atkPow: number;
  let defDef: number;
  if (amp?.activeEffect === 'Equaliser' && amp.effectRoundsLeft > 0) {
    atkPow = Math.round((effPower(atk) + effPower(def)) / 2);
    defDef = Math.round((effDefense(atk) + effDefense(def)) / 2);
  } else {
    atkPow = effPower(atk);
    defDef = effDefense(def);
  }
  atkPow = Math.round(atkPow * atkSide.attackMult);
  if (atk._dominateDebuff && !isImmune(atk)) atkPow = Math.round(atkPow * 0.75);

  // v2 damage formula: max(5, round(power × 0.4 × typeMultiplier × staminaModifier − defense × 0.15))
  const staminaMod = WEIGHT_MODIFIER[weight];
  let dmg = Math.max(5, Math.round(atkPow * 0.4 * mult * staminaMod - defDef * 0.15));

  if (atk.ability === 'Adrenaline'  && atk.hp < atk.maxHp * 0.3)   dmg = Math.ceil(dmg * 1.2);
  if (atk.ability === 'Momentum'    && atk._momentumStacks > 0)      dmg = Math.ceil(dmg * (1 + atk._momentumStacks * 0.1));
  if (atk.ability === 'Pack Tactics' && atk._packTactics)             dmg = Math.ceil(dmg * 1.15);
  if (atk._reboundBonus)                                              dmg = Math.ceil(dmg * 1.15);
  if (atk._lastStandActive)                                           dmg = Math.ceil(dmg * 1.5);
  if (atk.ability === 'Execute'     && def.hp < def.maxHp * 0.25)    dmg = dmg * 2;
  if (atk.ability === 'Opportunist' && def.hp < def.maxHp * 0.4)     dmg = Math.ceil(dmg * 1.2);

  // Overcharge: double final damage for the triggering side (after all other multipliers)
  if (amp?.activeEffect === 'Overcharge' && amp.effectRoundsLeft > 0 && amp.triggeredBy === atkSide._label) {
    dmg = dmg * 2;
  }

  if (def.ability === 'Grit'      && def.hp < def.maxHp * 0.5 && !isImmune(def)) dmg = Math.ceil(dmg * 0.85);
  if (def.ability === 'Shield Up' && !def._shieldUsed) {
    def._shieldUsed = true;
    dmg = Math.ceil(dmg * 0.7);
    log.push({ type: 'ABILITY', ability: 'Shield Up', card: def.name, effect: 'First attack reduced 30%' });
  }
  if (def.ability === 'Smoke Screen' && !def._smokeUsed) {
    def._smokeUsed = true;
    if (Math.random() < 0.5) {
      log.push({ type: 'ATTACK', attacker: atk.name, attackerSide: atkSide._label, defender: def.name, defenderSide: defSide._label, damage: 0, typeMultiplier: mult, attackWeight: weight, hpBefore: def.hp, hpAfter: def.hp, defenderMaxHp: def.maxHp, missed: true });
      return { damage: 0, killed: false };
    }
  }

  let bonus = 0;
  if (atk.ability === 'Overwhelming Force') {
    bonus = Math.max(1, Math.round(def.maxHp * 0.1));
    dmg += bonus;
  }

  const hpBefore = def.hp;
  def.hp = Math.max(0, def.hp - dmg);

  log.push({ type: 'ATTACK', attacker: atk.name, attackerSide: atkSide._label, defender: def.name, defenderSide: defSide._label, damage: dmg, bonusDamage: bonus || undefined, typeMultiplier: mult, attackWeight: weight, hpBefore, hpAfter: def.hp, defenderMaxHp: def.maxHp, missed: false });

  // Amp gain: defender gains Amp from taking damage
  if (amp && dmg > 0) gainAmp(defSide, Math.round(dmg * 0.3));

  // On-damage triggers
  if (def.ability === 'Counterstrike' && Math.random() < 0.25) {
    const reflected = Math.max(1, Math.floor(dmg * 0.5));
    atk.hp = Math.max(0, atk.hp - reflected);
    log.push({ type: 'ABILITY', ability: 'Counterstrike', card: def.name, effect: `Reflected ${reflected} dmg`, hpAfter: atk.hp });
  }
  if (atk.ability === 'Bleed' && !isImmune(def)) {
    def._bleedRoundsLeft  = 2;
    def._bleedDmgPerRound = Math.max(1, Math.round(def.maxHp * 0.08));
    log.push({ type: 'ABILITY', ability: 'Bleed', card: atk.name, effect: `Bleed applied to ${def.name} (${def._bleedDmgPerRound}/round × 2)` });
  }
  if (atk.ability === 'Drain') {
    const heal = Math.max(1, Math.round(dmg * 0.25));
    atk.hp = Math.min(atk.maxHp, atk.hp + heal);
    log.push({ type: 'ABILITY', ability: 'Drain', card: atk.name, effect: `Drained +${heal} HP` });
  }

  // Death check
  if (def.hp <= 0) {
    if (def.ability === 'Second Wind' && !def._secondWindUsed) {
      def._secondWindUsed = true;
      def.hp = Math.ceil(def.maxHp * 0.2);
      log.push({ type: 'ABILITY', ability: 'Second Wind', card: def.name, effect: `Survived! HP restored to ${def.hp}` });
      return { damage: dmg, killed: false };
    }
    if (def.ability === 'Last Stand' && !def._lastStandUsed) {
      def._lastStandUsed   = true;
      def._lastStandActive = true;
      def.hp = 1;
      log.push({ type: 'ABILITY', ability: 'Last Stand', card: def.name, effect: 'Survived with 1 HP! +50% attack' });
      return { damage: dmg, killed: false };
    }
    log.push({ type: 'DEFEAT', card: def.name, byCard: atk.name });
    return { damage: dmg, killed: true };
  }
  return { damage: dmg, killed: false };
}

// ── 10. On-kill triggers ──────────────────────────────────────────────────────

export function resolveKill(killer: BattleCard, killerSide: SideState, opponentSide: SideState, log: BattleEvent[]): void {
  if (killer.ability === 'Fortify') {
    killer._fortifyBonus += 8;
    log.push({ type: 'ABILITY', ability: 'Fortify', card: killer.name, effect: `Defence +8 (total: +${killer._fortifyBonus})` });
  }
  if (killer.ability === 'Momentum') {
    killer._momentumStacks++;
    log.push({ type: 'ABILITY', ability: 'Momentum', card: killer.name, effect: `Damage +10% (${killer._momentumStacks} stack${killer._momentumStacks > 1 ? 's' : ''})` });
  }
  if (killer.ability === 'Apex Predator') {
    killer._apexMult      = 1 + (killer._apexMult - 1) + 0.08;
    killer._apexSpeedMult = killer._apexMult;
    const pct = Math.round((killer._apexMult - 1) * 100);
    log.push({ type: 'ABILITY', ability: 'Apex Predator', card: killer.name, effect: `All stats +${pct}% (speed applies next round)` });
  }
  if (killer.ability === 'Dominate') {
    opponentSide.pendingDominate = true;
    log.push({ type: 'ABILITY', ability: 'Dominate', card: killer.name, effect: 'Next opponent card: −25% attack' });
  }
}

// ── 11. On-defeat triggers ────────────────────────────────────────────────────

export function resolveDefeat(bc: BattleCard, side: SideState, log: BattleEvent[]): void {
  if (bc.ability === 'Rebound') {
    side.pendingRebound = true;
    log.push({ type: 'ABILITY', ability: 'Rebound', card: bc.name, effect: 'Next friendly card: +15% damage' });
  }
  if (bc.ability === 'Momentum') bc._momentumStacks = 0;
  side.defeated.push(bc);
}

// ── 12. Post-round triggers ───────────────────────────────────────────────────

export function resolvePostRound(playerSide: SideState, aiSide: SideState, log: BattleEvent[], amp?: AmpField): void {
  for (const side of [playerSide, aiSide]) {
    const bc = side.active;
    if (!bc) continue;
    if (bc._bleedRoundsLeft > 0) {
      const dmg = bc._bleedDmgPerRound;
      bc.hp = Math.max(0, bc.hp - dmg);
      bc._bleedRoundsLeft--;
      log.push({ type: 'ABILITY', ability: 'Bleed', card: bc.name, effect: `Bleed tick −${dmg} HP (${bc._bleedRoundsLeft} round${bc._bleedRoundsLeft !== 1 ? 's' : ''} left)`, hpAfter: bc.hp, maxHp: bc.maxHp });
    }
    if (bc.ability === 'Resilience') {
      const heal = Math.min(5, bc.maxHp - bc.hp);
      if (heal > 0) {
        bc.hp += heal;
        log.push({ type: 'ABILITY', ability: 'Resilience', card: bc.name, effect: `+${heal} HP`, hpAfter: bc.hp, maxHp: bc.maxHp });
      }
    }
    // Hand stamina regen: each card in hand gains +1 stamina per round
    for (const c of side.hand) {
      c.stamina = Math.min(c.maxStamina, c.stamina + 1);
    }
  }

  // Decrement active Amp effect
  if (amp && amp.activeEffect && amp.effectRoundsLeft > 0) {
    amp.effectRoundsLeft--;
    if (amp.effectRoundsLeft === 0) {
      log.push({ type: 'AMP_EFFECT_END', effect: amp.activeEffect });
      amp.activeEffect = null;
      amp.triggeredBy  = null;
    }
  }
}

// ── 12b. Rest action ──────────────────────────────────────────────────────────
// Adds +5 stamina to the active card (capped at maxStamina). Returns stamina gained.

export function applyRestAction(bc: BattleCard, side: SideState, log: BattleEvent[]): void {
  const before = bc.stamina;
  bc.stamina = Math.min(bc.maxStamina, bc.stamina + 5);
  log.push({ type: 'REST', card: bc.name, side: side._label, staminaBefore: before, staminaAfter: bc.stamina });
}

// ── 13. AI strategic swap ─────────────────────────────────────────────────────

export function aiSwapTarget(aSide: SideState, pSide: SideState): BattleCard | null {
  if (!aSide.active || aSide.hand.length === 0 || !pSide.active) return null;
  const hpPct = aSide.active.hp / aSide.active.maxHp;
  if (hpPct > 0.35) return null;
  const adv = aSide.hand.filter(c => getTypeMultiplier(c.type, pSide.active.type) === 2.0);
  if (adv.length) return adv.reduce((b, c) => c.hp > b.hp ? c : b);
  if (hpPct <= 0.2) {
    const best = aSide.hand.reduce((b, c) => c.hp > b.hp ? c : b);
    if (best.hp > aSide.active.hp) return best;
  }
  return null;
}

export function executeAIProactiveSwap(aSide: SideState, pSide: SideState, log: BattleEvent[]): boolean {
  const target = aiSwapTarget(aSide, pSide);
  if (!target) return false;
  const prev = aSide.active;
  aSide.hand = aSide.hand.filter(c => c.id !== target.id);
  aSide.hand.push(prev);
  aSide.active = target;
  applyEntryEffects(target, aSide, pSide, log);
  log.push({ type: 'AI_SWAP', card: target.name, prev: prev.name });
  return true;
}

// ── 14. AI independent action decision ────────────────────────────────────────
// Called once per round, independently of what the player chose.
// Priority: swap (critical HP) > draw (empty hand) > attack.

export function aiDecide(aSide: SideState, pSide: SideState, amp?: AmpField, log?: BattleEvent[]): 'attack' | 'draw' | 'swap' | 'rest' {
  // Must rest if stamina is 0 — no attack option available
  if (aSide.active.stamina === 0) return 'rest';
  const locked = amp ? isLockOnActive(amp, 'ai') : false;
  const wantsSwap = !!aiSwapTarget(aSide, pSide);
  const wantsDraw = aSide.hand.length === 0 && aSide.deck.length > 0;
  if (locked && (wantsSwap || wantsDraw) && log) {
    log.push({ type: 'AMP_BLOCKED', side: 'ai', action: wantsSwap ? 'swap' : 'draw' });
  }
  if (!locked && wantsSwap) return 'swap';
  if (!locked && wantsDraw) return 'draw';
  return 'attack';
}

// ── 14b. AI attack weight selection ──────────────────────────────────────────
// Called after aiDecide returns 'attack'. Picks the best weight given stamina,
// type advantage, and HP.

export function aiChooseAttackWeight(aSide: SideState, pSide: SideState, amp?: AmpField): AttackWeight {
  const stamina = aSide.active.stamina;
  const mult    = getTypeMultiplier(aSide.active.type, pSide.active?.type ?? '');
  const hpPct   = aSide.active.hp / aSide.active.maxHp;

  // Exhaustion doubles costs — AI prefers Light to conserve stamina
  const exhausted = amp?.activeEffect === 'Exhaustion' && amp.effectRoundsLeft > 0 && amp.triggeredBy !== aSide._label;
  if (exhausted) return stamina >= 2 ? 'light' : 'light';

  // Heavy: type advantage, full stamina available, healthy HP
  if (stamina >= 5 && mult >= 2.0 && hpPct > 0.3) return 'heavy';
  // Light: low stamina or near death — conserve
  if (stamina <= 2 || hpPct < 0.25) return 'light';
  // Medium: default
  if (stamina >= 3) return 'medium';
  return 'light';
}

// ── 15. Amp system functions ──────────────────────────────────────────────────

export function initAmpField(): AmpField {
  return {
    poolEffect:       ALL_AMP_EFFECTS[Math.floor(Math.random() * ALL_AMP_EFFECTS.length)],
    activeEffect:     null,
    effectRoundsLeft: 0,
    triggeredBy:      null,
  };
}

export function gainAmp(side: SideState, amount: number): void {
  side.amp = Math.min(100, side.amp + amount);
}

function selectNextEffect(exclude: AmpEffectName): AmpEffectName {
  const pool = ALL_AMP_EFFECTS.filter(e => e !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function isLockOnActive(field: AmpField, sideLabel: 'player' | 'ai'): boolean {
  if (field.activeEffect !== 'LockOn' || field.effectRoundsLeft <= 0) return false;
  // Lock On restricts the OPPONENT of the triggering side
  return field.triggeredBy !== sideLabel;
}

export function triggerAmp(side: SideState, oppSide: SideState, field: AmpField, log: BattleEvent[]): void {
  const effect  = field.poolEffect;
  side.amp      = 0;
  const newPool = selectNextEffect(effect);

  if (effect === 'FieldMedic') {
    // Instant: heal 40% of active card max HP, no duration
    const heal = Math.round(side.active.maxHp * 0.4);
    side.active.hp = Math.min(side.active.maxHp, side.active.hp + heal);
    log.push({ type: 'AMP_TRIGGER', side: side._label, effect, newEffect: newPool, healAmount: heal });
  } else {
    field.activeEffect     = effect;
    field.effectRoundsLeft = EFFECT_DURATION[effect];
    field.triggeredBy      = side._label;
    log.push({ type: 'AMP_TRIGGER', side: side._label, effect, newEffect: newPool });
  }

  field.poolEffect = newPool;
}

export function spendAmp(side: SideState, field: AmpField, log: BattleEvent[]): void {
  side.amp      = Math.max(0, side.amp - 50);
  const newPool = selectNextEffect(field.poolEffect);
  field.poolEffect = newPool;
  log.push({ type: 'AMP_SPEND', side: side._label, newEffect: newPool });
}

export function aiDecideAmp(aSide: SideState, pSide: SideState, field: AmpField): 'trigger' | 'spend' | 'pass' {
  if (aSide.amp >= 100) {
    const effect = field.poolEffect;
    // Don't trigger Equaliser if AI's card is stronger
    if (effect === 'Equaliser') {
      const aiTotal = effPower(aSide.active) + effDefense(aSide.active);
      const pTotal  = effPower(pSide.active) + effDefense(pSide.active);
      if (aiTotal > pTotal) return 'spend';
    }
    // Don't waste Field Medic if healthy
    if (effect === 'FieldMedic' && aSide.active.hp > aSide.active.maxHp * 0.6) return 'spend';
    return 'trigger';
  }
  if (aSide.amp >= 50) {
    const effect = field.poolEffect;
    // Spend to switch an unfavorable effect
    const unfavorable = (
      (effect === 'Equaliser' && effPower(aSide.active) + effDefense(aSide.active) > effPower(pSide.active) + effDefense(pSide.active)) ||
      (effect === 'FieldMedic' && aSide.active.hp > aSide.active.maxHp * 0.85)
    );
    if (unfavorable) return 'spend';
  }
  return 'pass';
}

// ── 16. Battle reward calculation ─────────────────────────────────────────────

export function calcBattleRewards(tier: number, winner: 'player' | 'ai', streak: number): { credits: number; xp: number; streakBonus: boolean } {
  const t = BATTLE_REWARDS[tier] ?? BATTLE_REWARDS[1];
  if (winner === 'player') {
    const mult = streak >= 2 ? 2 : 1;
    return { credits: t.winCredits * mult, xp: t.winXp, streakBonus: mult === 2 };
  }
  return { credits: t.lossCredits, xp: t.lossXp, streakBonus: false };
}
