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
  _stubborn:        boolean;   // Stubborn: fires once (first hit below 20%)
  _lastEffortFired: boolean;   // Last Effort: fires once on defeat
  _restedAndReady:  boolean;   // Rested and Ready: fires once on first attack after entry at full stamina
  // stack counters
  _unstoppableLeft: number;
  _fortifyBonus:    number;
  _momentumStacks:  number;
  _apexMult:        number;
  _apexSpeedMult:   number;
  // active DoT / debuffs
  _bleedRoundsLeft:   number;
  _bleedDmgPerRound:  number;
  _bleedEntryPending: boolean;   // Bleed v2: set on entry, cleared after first attack
  _dominateDebuff:    boolean;
  _intimidatedRoundsLeft: number; // Intimidate v2: per-card debuff countdown
  // bonus flags
  _packTactics:  boolean;
  _reboundBonus: boolean;
  // ── Sprint 4b: Rare flags ──────────────────────────────────────────────────
  _paybackStored:   number;    // Payback: accumulated damage to release on next opp. entry
  // ── Sprint 4b: Epic flags ──────────────────────────────────────────────────
  _overwhelmStacks: number;    // Overwhelm: consecutive rounds with type advantage
  _berserkerBonus:  number;    // Berserker: attack multiplier bonus (0.0–0.8, +0.08 per hit taken)
  _deathMarked:     boolean;   // this card has been marked by Death Mark
  _riposteActive:   boolean;   // set when this card rests (if ability === 'Riposte')
  // ── Sprint 4b: Legendary flags ────────────────────────────────────────────
  _nullifiedRoundsLeft: number;      // rounds remaining under Nullify (0 = not nullified)
  _nullifiedAbility:    string | null; // stored ability during Nullify
  _juggerStacks:        number;      // Juggernaut: consecutive attack rounds
  _juggerAttackedThisRound: boolean; // Juggernaut: set in executeAttack, read in resolvePostRound
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
  // ── Sprint 4b: new SideState fields ───────────────────────────────────────
  pressureStacks:     number;  // medium attack cost penalty from opponent Pressure (0–3)
  siegeStacks:        number;  // stamina cap reduction from opponent Siege (0 to maxStamina-3)
  pendingFullStamina: boolean; // Death Mark reward: next card enters at full stamina
  pendingPayback:     number;  // Payback: damage to deal to the next card this side plays
  // ── Sprint 5: Legendary Lock ──────────────────────────────────────────────
  killCount:          number;  // number of opponent cards defeated; must be ≥ 3 to play a Legendary
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
  | { type: 'BATTLE_END';     winner: 'player' | 'ai' | 'tie'; reason?: string }
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
    _stubborn:         false,
    _lastEffortFired:  false,
    _restedAndReady:   false,
    _unstoppableLeft:  3,
    _fortifyBonus:     0,
    _momentumStacks:   0,
    _apexMult:         1,
    _apexSpeedMult:    1,
    _bleedRoundsLeft:   0,
    _bleedDmgPerRound:  0,
    _bleedEntryPending: false,
    _dominateDebuff:   false,
    _intimidatedRoundsLeft: 0,
    _packTactics:      false,
    _reboundBonus:     false,
    // Sprint 4b
    _paybackStored:        0,
    _overwhelmStacks:      0,
    _berserkerBonus:       0,
    _deathMarked:          false,
    _riposteActive:        false,
    _nullifiedRoundsLeft:  0,
    _nullifiedAbility:     null,
    _juggerStacks:         0,
    _juggerAttackedThisRound: false,
  };
  if (bc.ability === 'Pack Tactics' && fullDeck) {
    bc._packTactics = fullDeck.some(c => c.id !== bc.id && c.type === bc.type);
  }
  // Warm Up: start with +3 bonus stamina (can exceed maxStamina intentionally)
  if (bc.ability === 'Warm Up') {
    bc.stamina += 3;
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
    // Sprint 4b
    pressureStacks:     0,
    siegeStacks:        0,
    pendingFullStamina: false,
    pendingPayback:     0,
    // Sprint 5
    killCount:          0,
  };
}

// ── 5. Nullify / Immunity helpers ──────────────────────────────────────────────

function isNullified(bc: BattleCard): boolean {
  return bc._nullifiedRoundsLeft > 0;
}

function isImmune(bc: BattleCard): boolean {
  return bc.ability === 'Immunity' && !isNullified(bc);
}

// ── 6. Entry effects ──────────────────────────────────────────────────────────

export function applyEntryEffects(bc: BattleCard, side: SideState, opponentSide: SideState, log: BattleEvent[], fromHand = false): void {
  // Pending full stamina reward (from Death Mark)
  if (side.pendingFullStamina) {
    bc.stamina = bc.maxStamina;
    side.pendingFullStamina = false;
    log.push({ type: 'ABILITY', ability: 'Death Mark', card: bc.name, side: side._label, effect: 'Entered at full stamina (Death Mark reward)' });
  }

  // Pending Payback damage from opponent
  if (opponentSide.pendingPayback > 0) {
    const payDmg = opponentSide.pendingPayback;
    opponentSide.pendingPayback = 0;
    bc.hp = Math.max(0, bc.hp - payDmg);
    log.push({ type: 'ABILITY', ability: 'Payback', card: bc.name, side: side._label, effect: `Took ${payDmg} stored Payback damage on entry (${bc.hp} HP left)`, hpAfter: bc.hp, maxHp: bc.maxHp });
  }

  // Reset Overwhelm stacks on re-entry
  bc._overwhelmStacks = 0;

  // Adaptable: reset on each entry so the protection is restored
  if (bc.ability === 'Adaptable') {
    bc._adaptableUsed = false;
  }
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

  // Intimidate v2: 3-round per-card debuff on opponent's active card
  if (bc.ability === 'Intimidate' && !isNullified(bc) && opponentSide.active && !isImmune(opponentSide.active)) {
    opponentSide.active._intimidatedRoundsLeft = 3;
    log.push({ type: 'ABILITY', ability: 'Intimidate', card: bc.name, effect: `${opponentSide.active.name} attack −15% for 3 rounds` });
  }

  // Dead Weight (Rare): drain 20% of opponent's current stamina on entry
  if (bc.ability === 'Dead Weight' && !isNullified(bc) && opponentSide.active && !isImmune(opponentSide.active)) {
    const drain = Math.max(1, Math.round(opponentSide.active.stamina * 0.2));
    opponentSide.active.stamina = Math.max(0, opponentSide.active.stamina - drain);
    log.push({ type: 'ABILITY', ability: 'Dead Weight', card: bc.name, side: side._label, effect: `${opponentSide.active.name} −${drain} stamina (${opponentSide.active.stamina} left)` });
  }

  // Bleed v2: mark pending so first attack applies DoT
  if (bc.ability === 'Bleed') {
    bc._bleedEntryPending = true;
  }

  // Death Mark (Epic): mark opponent's active card
  if (bc.ability === 'Death Mark' && !isNullified(bc) && opponentSide.active) {
    opponentSide.active._deathMarked = true;
    log.push({ type: 'ABILITY', ability: 'Death Mark', card: bc.name, side: side._label, effect: `${opponentSide.active.name} is marked for death` });
  }

  // Nullify (Legendary): suppress opponent's active card ability for 5 rounds
  if (bc.ability === 'Nullify' && !isNullified(bc) && opponentSide.active && !isImmune(opponentSide.active)) {
    const opp = opponentSide.active;
    opp._nullifiedRoundsLeft = 5;
    opp._nullifiedAbility = opp.ability ?? null;
    (opp as any).ability = null;
    log.push({ type: 'ABILITY', ability: 'Nullify', card: bc.name, side: side._label, effect: `${opp.name}'s ability suppressed for 5 rounds` });
  }

  // Rested and Ready: bonus first attack if entering from hand at full stamina
  if (bc.ability === 'Rested and Ready' && fromHand && bc.stamina >= bc.maxStamina) {
    bc._restedAndReady = true;
    log.push({ type: 'ABILITY', ability: 'Rested and Ready', card: bc.name, side: side._label, effect: 'First attack +30% damage (full stamina)' });
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
  // Riposte: if defender rested and is Riposte, block the hit and retaliate
  if (def._riposteActive && !isNullified(def)) {
    const atkPowRip = effPower(atk);
    const defDefRip = effDefense(def);
    const baseDmgRip = Math.max(5, Math.round(atkPowRip * 0.4 * 1.0 * WEIGHT_MODIFIER[weight] - defDefRip * 0.15));
    const riposteDmg = Math.max(1, Math.round(baseDmgRip * 0.5));
    atk.hp = Math.max(0, atk.hp - riposteDmg);
    log.push({ type: 'ABILITY', ability: 'Riposte', card: def.name, side: defSide._label, effect: `Blocked! Retaliated ${riposteDmg} dmg`, hpAfter: atk.hp });
    return { damage: 0, killed: false };
  }

  // Stamina cost — Steady makes Light free; doubled if Exhaustion active against this attacker
  let staminaCost = WEIGHT_COST[weight];
  if (atk.ability === 'Steady' && weight === 'light') staminaCost = 0;
  if (amp?.activeEffect === 'Exhaustion' && amp.effectRoundsLeft > 0 && amp.triggeredBy !== atkSide._label) {
    staminaCost = staminaCost * 2;
  }
  // Pressure: medium attacks cost extra stamina for the affected side
  if (atkSide.pressureStacks > 0 && weight === 'medium') {
    staminaCost += atkSide.pressureStacks;
  }
  // Type Bully (Rare): heavy attack costs 2 less stamina when at type advantage
  const multForCost = getTypeMultiplier(atk.type, def.type);
  if (atk.ability === 'Type Bully' && !isNullified(atk) && multForCost >= 2.0 && weight === 'heavy') {
    staminaCost = Math.max(0, staminaCost - 2);
  }
  atk.stamina = Math.max(0, atk.stamina - staminaCost);

  let mult = multForCost;

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

  // Intimidate v2: per-card debuff
  if (atk._intimidatedRoundsLeft > 0) atkPow = Math.round(atkPow * 0.85);

  // v2 damage formula: max(5, round(power × 0.4 × typeMultiplier × staminaModifier − defense × 0.15))
  const staminaMod = WEIGHT_MODIFIER[weight];
  let dmg = Math.max(5, Math.round(atkPow * 0.4 * mult * staminaMod - defDef * 0.15));

  if (atk.ability === 'Adrenaline'       && atk.hp < atk.maxHp * 0.3)   dmg = Math.ceil(dmg * 1.2);
  if (atk.ability === 'Momentum'         && atk._momentumStacks > 0)    dmg = Math.ceil(dmg * (1 + atk._momentumStacks * 0.1));
  if (atk.ability === 'Pack Tactics'     && atk._packTactics)            dmg = Math.ceil(dmg * 1.15);
  if (atk._reboundBonus)                                                  dmg = Math.ceil(dmg * 1.15);
  if (atk._lastStandActive)                                               dmg = Math.ceil(dmg * 1.5);
  if (atk.ability === 'Execute'          && def.hp < def.maxHp * 0.25)  dmg = dmg * 2;
  if (atk.ability === 'Opportunist'      && def.hp < def.maxHp * 0.4)   dmg = Math.ceil(dmg * 1.2);
  if (atk._restedAndReady) {
    atk._restedAndReady = false;
    dmg = Math.ceil(dmg * 1.3);
    log.push({ type: 'ABILITY', ability: 'Rested and Ready', card: atk.name, effect: 'First attack +30% damage' });
  }

  // Overwhelm (Epic): +20% per stack when attacking with type advantage
  if (atk.ability === 'Overwhelm' && !isNullified(atk) && mult >= 2.0 && atk._overwhelmStacks > 0) {
    dmg = Math.ceil(dmg * (1 + atk._overwhelmStacks * 0.2));
  }

  // Berserker (Epic): bonus based on accumulated hits taken
  if (atk._berserkerBonus > 0 && atk.ability === 'Berserker' && !isNullified(atk)) {
    dmg = Math.ceil(dmg * (1 + atk._berserkerBonus));
  }

  // Juggernaut (Legendary): +10% per consecutive attack round
  if (atk.ability === 'Juggernaut' && !isNullified(atk) && atk._juggerStacks > 0) {
    dmg = Math.ceil(dmg * (1 + atk._juggerStacks * 0.1));
  }
  // Mark Juggernaut as attacked this round
  if (atk.ability === 'Juggernaut') {
    atk._juggerAttackedThisRound = true;
  }

  // The Floor is Yours (Legendary): +20% when Amp meter is at 100
  if (atk.ability === 'The Floor is Yours' && !isNullified(atk) && atkSide.amp >= 100) {
    dmg = Math.ceil(dmg * 1.2);
  }

  // Overcharge: double final damage for the triggering side (after all other multipliers)
  if (amp?.activeEffect === 'Overcharge' && amp.effectRoundsLeft > 0 && amp.triggeredBy === atkSide._label) {
    dmg = dmg * 2;
  }

  // Amp Shield (Legendary): reduce incoming damage by 20% when Amp > 50
  if (def.ability === 'Amp Shield' && !isNullified(def) && defSide.amp > 50) {
    dmg = Math.ceil(dmg * 0.8);
  }

  if (def.ability === 'Grit'      && def.hp < def.maxHp * 0.5 && !isImmune(def)) dmg = Math.ceil(dmg * 0.85);
  if (def.ability === 'Shield Up' && !def._shieldUsed) {
    def._shieldUsed = true;
    dmg = Math.ceil(dmg * 0.7);
    log.push({ type: 'ABILITY', ability: 'Shield Up', card: def.name, effect: 'First attack reduced 30%' });
  }
  // Stubborn: first hit that would drop below 20% HP is reduced to survive at exactly 20%
  if (def.ability === 'Stubborn' && !def._stubborn && !isImmune(def)) {
    const hpAfterHit = def.hp - dmg;
    if (hpAfterHit < def.maxHp * 0.2 && def.hp > def.maxHp * 0.2) {
      def._stubborn = true;
      dmg = Math.max(0, def.hp - Math.ceil(def.maxHp * 0.2));
      log.push({ type: 'ABILITY', ability: 'Stubborn', card: def.name, effect: `Hit reduced — survives at 20% HP` });
    }
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

  // Scrapper: defender gains +3 Amp per damage event
  if (def.ability === 'Scrapper' && dmg > 0 && amp) {
    gainAmp(defSide, 3);
    log.push({ type: 'ABILITY', ability: 'Scrapper', card: def.name, side: defSide._label, effect: '+3 Amp' });
  }

  // Heavy Handed: +5 bonus Amp when attacker lands a Heavy attack
  if (atk.ability === 'Heavy Handed' && weight === 'heavy' && dmg > 0 && amp) {
    gainAmp(atkSide, 5);
    log.push({ type: 'ABILITY', ability: 'Heavy Handed', card: atk.name, side: atkSide._label, effect: '+5 Amp (Heavy)' });
  }

  // Stamina Leech: drain 1 stamina from opponent on each hit
  if (atk.ability === 'Stamina Leech' && dmg > 0) {
    const before = def.stamina;
    def.stamina = Math.max(0, def.stamina - 1);
    if (def.stamina < before) {
      log.push({ type: 'ABILITY', ability: 'Stamina Leech', card: atk.name, side: atkSide._label, effect: `${def.name} −1 stamina (${def.stamina} left)` });
    }
  }

  // Amp Siphon (Legendary): steal 3 Amp from opponent on hit
  if (atk.ability === 'Amp Siphon' && !isNullified(atk) && dmg > 0 && amp) {
    gainAmp(atkSide, 3);
    defSide.amp = Math.max(0, defSide.amp - 3);
    log.push({ type: 'ABILITY', ability: 'Amp Siphon', card: atk.name, side: atkSide._label, effect: '+3 Amp, opponent −3 Amp' });
  }

  // Payback (Rare): store 10% of damage received (defender stores it)
  if (def.ability === 'Payback' && !isNullified(def) && dmg > 0) {
    def._paybackStored += Math.round(dmg * 0.1);
  }

  // Berserker (Epic): build bonus each time this card is hit
  if (def.ability === 'Berserker' && !isNullified(def) && dmg > 0) {
    def._berserkerBonus = Math.min(0.8, def._berserkerBonus + 0.08);
    log.push({ type: 'ABILITY', ability: 'Berserker', card: def.name, side: defSide._label, effect: `Attack bonus now +${Math.round(def._berserkerBonus * 100)}%` });
  }

  // On-damage triggers
  if (def.ability === 'Counterstrike' && Math.random() < 0.25) {
    const reflected = Math.max(1, Math.floor(dmg * 0.5));
    atk.hp = Math.max(0, atk.hp - reflected);
    log.push({ type: 'ABILITY', ability: 'Counterstrike', card: def.name, effect: `Reflected ${reflected} dmg`, hpAfter: atk.hp });
  }
  // Counterpunch: retaliate 20% damage when hit by a Heavy attack
  if (def.ability === 'Counterpunch' && weight === 'heavy' && dmg > 0 && !isImmune(atk)) {
    const counter = Math.max(1, Math.round(dmg * 0.2));
    atk.hp = Math.max(0, atk.hp - counter);
    log.push({ type: 'ABILITY', ability: 'Counterpunch', card: def.name, side: defSide._label, effect: `Retaliated ${counter} dmg`, hpAfter: atk.hp });
  }

  // Bleed v2: apply DoT only on first attack after entry (_bleedEntryPending)
  if (atk._bleedEntryPending && !isNullified(atk) && !isImmune(def)) {
    atk._bleedEntryPending = false;
    def._bleedRoundsLeft  = 3;
    def._bleedDmgPerRound = Math.max(1, Math.round(def.maxHp * 0.08));
    log.push({ type: 'ABILITY', ability: 'Bleed', card: atk.name, effect: `Bleed applied to ${def.name} (${def._bleedDmgPerRound}/round × 3)` });
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

export function legendaryLocked(side: SideState): boolean {
  return side.killCount < 3;
}

export function resolveKill(killer: BattleCard, killerSide: SideState, opponentSide: SideState, log: BattleEvent[]): void {
  // Sprint 5: track kills for Legendary Lock
  killerSide.killCount += 1;

  if (killer.ability === 'Fortify') {
    killer._fortifyBonus += 8;
    log.push({ type: 'ABILITY', ability: 'Fortify', card: killer.name, effect: `Defence +8 (total: +${killer._fortifyBonus})` });
  }
  if (killer.ability === 'Momentum') {
    killer._momentumStacks = Math.min(5, killer._momentumStacks + 1);
    log.push({ type: 'ABILITY', ability: 'Momentum', card: killer.name, effect: `Damage +${killer._momentumStacks * 10}% (${killer._momentumStacks}/5 stacks)` });
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

  // Payback (Rare): release all stored damage to next card the opponent plays
  if (killer.ability === 'Payback' && !isNullified(killer) && killer._paybackStored > 0) {
    killerSide.pendingPayback = killer._paybackStored;
    killer._paybackStored = 0;
    log.push({ type: 'ABILITY', ability: 'Payback', card: killer.name, side: killerSide._label, effect: `${killerSide.pendingPayback} stored damage will hit opponent's next card` });
  }

  // Stamina Vampire (Epic): steal all stamina from defeated card
  if (killer.ability === 'Stamina Vampire' && !isNullified(killer) && opponentSide.active) {
    const stolen = opponentSide.active.stamina;
    if (stolen > 0) {
      killer.stamina = Math.min(killer.maxStamina, killer.stamina + stolen);
      log.push({ type: 'ABILITY', ability: 'Stamina Vampire', card: killer.name, side: killerSide._label, effect: `Stole ${stolen} stamina from ${opponentSide.active.name} (${killer.stamina}/${killer.maxStamina})` });
    }
  }
}

// ── 11. On-defeat triggers ────────────────────────────────────────────────────

export function resolveDefeat(bc: BattleCard, side: SideState, log: BattleEvent[], opponentSide?: SideState): void {
  // Last Effort: chip 10% maxHP off opponent's active card on defeat
  if (bc.ability === 'Last Effort' && !bc._lastEffortFired && opponentSide?.active) {
    bc._lastEffortFired = true;
    const chip = Math.round(opponentSide.active.maxHp * 0.1);
    opponentSide.active.hp = Math.max(0, opponentSide.active.hp - chip);
    log.push({ type: 'ABILITY', ability: 'Last Effort', card: bc.name, side: side._label, effect: `Chip ${chip} dmg → ${opponentSide.active.name} (${opponentSide.active.hp} HP left)` });
  }
  if (bc.ability === 'Rebound') {
    side.pendingRebound = true;
    log.push({ type: 'ABILITY', ability: 'Rebound', card: bc.name, effect: 'Next friendly card: +15% damage' });
  }
  if (bc.ability === 'Momentum') bc._momentumStacks = 0;

  // Death Mark: grant full stamina to next friendly card
  if (bc._deathMarked && opponentSide) {
    opponentSide.pendingFullStamina = true;
    log.push({ type: 'ABILITY', ability: 'Death Mark', card: bc.name, side: side._label, effect: 'Death Mark fulfilled — opponent\'s next card enters at full stamina' });
  }

  // Pressure: reset opponent's pressure stacks when this card leaves
  if (bc.ability === 'Pressure' && !isNullified(bc) && opponentSide) {
    opponentSide.pressureStacks = 0;
  }

  // Siege: reset opponent's siege stacks and restore their stamina cap
  if (bc.ability === 'Siege' && !isNullified(bc) && opponentSide) {
    opponentSide.siegeStacks = 0;
    if (opponentSide.active) {
      opponentSide.active.stamina = Math.min(opponentSide.active.stamina, opponentSide.active.maxStamina);
    }
  }

  side.defeated.push(bc);
}

// ── 12. Post-round triggers ───────────────────────────────────────────────────

export function resolvePostRound(playerSide: SideState, aiSide: SideState, log: BattleEvent[], amp?: AmpField): void {
  for (const [side, oppSide] of [[playerSide, aiSide], [aiSide, playerSide]] as [SideState, SideState][]) {
    const bc = side.active;
    if (!bc) continue;

    // Bleed DoT tick
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

    // Nullify: decrement and restore ability when it expires
    if (bc._nullifiedRoundsLeft > 0) {
      bc._nullifiedRoundsLeft--;
      if (bc._nullifiedRoundsLeft === 0 && bc._nullifiedAbility) {
        (bc as any).ability = bc._nullifiedAbility;
        bc._nullifiedAbility = null;
        log.push({ type: 'ABILITY', ability: 'Nullify', card: bc.name, side: side._label, effect: `${bc.name}'s ability restored` });
      }
    }

    // Intimidate v2: decrement rounds
    if (bc._intimidatedRoundsLeft > 0) bc._intimidatedRoundsLeft--;

    // Riposte: clear active flag each round
    if (bc._riposteActive) bc._riposteActive = false;

    // Overwhelm (Epic): track consecutive rounds with type advantage
    if (bc.ability === 'Overwhelm' && !isNullified(bc) && oppSide.active) {
      const oppType = oppSide.active.type;
      if (getTypeMultiplier(bc.type, oppType) >= 2.0) {
        bc._overwhelmStacks++;
        if (bc._overwhelmStacks > 0) {
          log.push({ type: 'ABILITY', ability: 'Overwhelm', card: bc.name, side: side._label, effect: `+20% damage per stack (${bc._overwhelmStacks} stacks)` });
        }
      } else {
        bc._overwhelmStacks = 0;
      }
    }

    // Siege (Legendary): reduce opponent's stamina cap by 1 per round (max 3 reduction)
    if (bc.ability === 'Siege' && !isNullified(bc) && oppSide.active) {
      if (oppSide.siegeStacks < oppSide.active.maxStamina - 3) {
        oppSide.siegeStacks++;
        const effectiveCap = Math.max(3, oppSide.active.maxStamina - oppSide.siegeStacks);
        if (oppSide.active.stamina > effectiveCap) oppSide.active.stamina = effectiveCap;
        log.push({ type: 'ABILITY', ability: 'Siege', card: bc.name, side: side._label, effect: `Opponent stamina cap reduced (cap now ${effectiveCap})` });
      }
    }

    // Pressure (Legendary): increase medium attack cost for opponent by 1 per round (max 3)
    if (bc.ability === 'Pressure' && !isNullified(bc) && oppSide.pressureStacks < 3) {
      oppSide.pressureStacks++;
      log.push({ type: 'ABILITY', ability: 'Pressure', card: bc.name, side: side._label, effect: `Opponent Medium costs +${oppSide.pressureStacks} stamina` });
    }

    // Amp Drain (Legendary): drain 5 Amp from opponent each round
    if (bc.ability === 'Amp Drain' && !isNullified(bc)) {
      const drain = Math.min(5, oppSide.amp);
      if (drain > 0) {
        oppSide.amp = Math.max(0, oppSide.amp - drain);
        gainAmp(side, drain);
        log.push({ type: 'ABILITY', ability: 'Amp Drain', card: bc.name, side: side._label, effect: `Drained ${drain} Amp from opponent` });
      }
    }

    // Juggernaut (Legendary): track consecutive attack rounds
    if (bc.ability === 'Juggernaut') {
      if (bc._juggerAttackedThisRound) {
        bc._juggerStacks++;
        log.push({ type: 'ABILITY', ability: 'Juggernaut', card: bc.name, side: side._label, effect: `+10% damage per stack (${bc._juggerStacks} stacks)` });
      } else {
        bc._juggerStacks = 0;
      }
      bc._juggerAttackedThisRound = false;
    }

    // Hand stamina regen: each card in hand gains +1 stamina per round
    for (const c of side.hand) {
      // Apply Siege cap to hand cards too when they regen
      const effectiveCap = side.siegeStacks > 0 ? Math.max(3, c.maxStamina - side.siegeStacks) : c.maxStamina;
      c.stamina = Math.min(effectiveCap, c.stamina + 1);
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
  // Riposte: block incoming attack this round
  if (bc.ability === 'Riposte' && !isNullified(bc)) {
    bc._riposteActive = true;
    log.push({ type: 'ABILITY', ability: 'Riposte', card: bc.name, side: side._label, effect: 'Riposte active — will block and retaliate next hit' });
  }
  // Juggernaut: reset stacks on rest
  if (bc.ability === 'Juggernaut') {
    bc._juggerStacks = 0;
    bc._juggerAttackedThisRound = false;
  }
}

// ── 13. AI strategic swap ─────────────────────────────────────────────────────

export function aiSwapTarget(aSide: SideState, pSide: SideState): BattleCard | null {
  if (!aSide.active || aSide.hand.length === 0 || !pSide.active) return null;
  const hpPct = aSide.active.hp / aSide.active.maxHp;

  // Don't swap out Overwhelm card if it has type advantage and stacks > 0
  if (aSide.active.ability === 'Overwhelm' && !isNullified(aSide.active) && aSide.active._overwhelmStacks > 0 && getTypeMultiplier(aSide.active.type, pSide.active.type) >= 2.0) {
    return null;
  }

  // Don't swap out Last Stand card on low HP (it has a safety net)
  if (aSide.active.ability === 'Last Stand' && !aSide.active._lastStandUsed && hpPct <= 0.25) {
    return null;
  }

  // Sprint 5: Legendary Lock — if lock is active and kill count is 2, don't proactively
  // swap away; prioritise securing the 3rd kill to unlock Legendary play
  if (legendaryLocked(aSide) && aSide.killCount === 2 && aSide.hand.some(c => c.rarity === 'Legendary')) {
    return null;
  }

  if (hpPct > 0.35) return null;

  // Sprint 5: filter out locked Legendaries from swap candidates
  const eligible = legendaryLocked(aSide)
    ? aSide.hand.filter(c => c.rarity !== 'Legendary')
    : aSide.hand;
  if (eligible.length === 0) return null;

  const adv = eligible.filter(c => getTypeMultiplier(c.type, pSide.active.type) === 2.0);
  if (adv.length) return adv.reduce((b, c) => c.hp > b.hp ? c : b);
  if (hpPct <= 0.2) {
    const best = eligible.reduce((b, c) => c.hp > b.hp ? c : b);
    if (best.hp > aSide.active.hp) return best;
  }
  return null;
}

export function executeAIProactiveSwap(aSide: SideState, pSide: SideState, log: BattleEvent[]): boolean {
  const target = aiSwapTarget(aSide, pSide);
  if (!target) return false;
  const prev = aSide.active;

  // Reset Pressure/Siege on the swapped-out card
  if (prev.ability === 'Pressure' && !isNullified(prev)) pSide.pressureStacks = 0;
  if (prev.ability === 'Siege'    && !isNullified(prev)) {
    pSide.siegeStacks = 0;
    if (pSide.active) pSide.active.stamina = Math.min(pSide.active.stamina, pSide.active.maxStamina);
  }
  // Reset Juggernaut stacks on swap-out
  if (prev.ability === 'Juggernaut') {
    prev._juggerStacks = 0;
    prev._juggerAttackedThisRound = false;
  }

  aSide.hand = aSide.hand.filter(c => c.id !== target.id);
  aSide.hand.push(prev);
  aSide.active = target;
  applyEntryEffects(target, aSide, pSide, log, true);
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

  // Riposte AI: sometimes rest to bait opponent
  if (aSide.active.ability === 'Riposte' && !isNullified(aSide.active)) {
    const hpPct = aSide.active.hp / aSide.active.maxHp;
    if (hpPct > 0.5 && aSide.active.stamina >= 3 && Math.random() < 0.3) {
      return 'rest';
    }
  }

  // Avoid attacking when player has Riposte active
  if (pSide.active?.ability === 'Riposte' && !isNullified(pSide.active) && pSide.active._riposteActive) {
    return 'rest';
  }

  // Bleed: always attack on first attack after entry to apply DoT
  if (aSide.active._bleedEntryPending) return 'attack';

  // Stamina Leech awareness: if opponent has it and AI is low stamina, prefer rest or swap
  if (pSide.active?.ability === 'Stamina Leech' && aSide.active.stamina <= 1) {
    if (!locked && wantsSwap) return 'swap';
    return 'rest';
  }

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

  // Amp Surge: prefer Heavy to reach 100 Amp faster
  if (aSide.active.ability === 'Amp Surge' && !isNullified(aSide.active) && stamina >= 5) return 'heavy';

  // Type Bully: heavy costs 2 less at type advantage — prefer heavy if affordable
  if (aSide.active.ability === 'Type Bully' && !isNullified(aSide.active) && mult >= 2.0 && stamina >= 3) return 'heavy';

  // Juggernaut: don't break the chain by switching to light
  if (aSide.active.ability === 'Juggernaut' && !isNullified(aSide.active) && aSide.active._juggerStacks > 0 && stamina >= 3) return 'medium';

  // Berserker: willing to take hits, prefer heavy for more damage when healthy
  if (aSide.active.ability === 'Berserker' && !isNullified(aSide.active) && hpPct > 0.5 && stamina >= 5) return 'heavy';

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

  // Amp Surge (Legendary): gain 25 Amp immediately after triggering
  if (side.active.ability === 'Amp Surge' && !isNullified(side.active)) {
    gainAmp(side, 25);
    log.push({ type: 'ABILITY', ability: 'Amp Surge', card: side.active.name, side: side._label, effect: '+25 Amp after Amp trigger' });
  }
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

export function calcBattleRewards(tier: number, winner: 'player' | 'ai' | 'tie', streak: number): { credits: number; xp: number; streakBonus: boolean } {
  const t = BATTLE_REWARDS[tier] ?? BATTLE_REWARDS[1];
  if (winner === 'player') {
    const mult = streak >= 1 ? 2 : 1;
    return { credits: t.winCredits * mult, xp: t.winXp, streakBonus: mult === 2 };
  }
  // tie: loss rewards, no streak bonus
  return { credits: t.lossCredits, xp: t.lossXp, streakBonus: false };
}
