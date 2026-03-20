// Battle Engine — TypeScript port of web/src/battle-engine.js
// Pure functions, no React, no Firebase.
// All abilities handle ability === undefined gracefully (Session 14 assigns them).

import { Card } from '../data/cards';
import { BATTLE_REWARDS } from '../data/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BattleCard extends Card {
  hp: number;
  maxHp: number;
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
  _label:          'player' | 'ai';
}

export type BattleEvent =
  | { type: 'BATTLE_START';   playerActive: { name: string; rarity: string; hp: number; maxHp: number }; aiActive: { name: string; rarity: string; hp: number; maxHp: number } }
  | { type: 'ROUND_START';    round: number; playerHp: number; playerMaxHp: number; aiHp: number; aiMaxHp: number }
  | { type: 'ATTACK';         attacker: string; attackerSide?: string; defender: string; defenderSide?: string; damage: number; bonusDamage?: number; typeMultiplier: number; hpBefore: number; hpAfter: number; defenderMaxHp: number; missed: boolean }
  | { type: 'ABILITY';        ability: string; card: string; side?: string; effect: string; hpAfter?: number; maxHp?: number }
  | { type: 'DEFEAT';         card: string; byCard: string }
  | { type: 'CARD_ENTER';     side: 'player' | 'ai'; card: string; rarity: string; hp: number; maxHp: number }
  | { type: 'FORCED_DRAW';    side: 'player' | 'ai'; card: string }
  | { type: 'AI_SWAP';        card: string; prev: string }
  | { type: 'PLAYER_DRAW';   card: string }
  | { type: 'PLAYER_SWAP';   card: string; prev: string }
  | { type: 'BATTLE_END';     winner: 'player' | 'ai'; reason?: string };

// ── 1. Type system ────────────────────────────────────────────────────────────

const BATTLE_TYPE_MAP: Record<string, string> = {
  Brawler:'Melee',    Tank:'Melee',          Alien:'Melee',
  Speedster:'Agility',Flier:'Agility',       Stealth:'Agility',
  Blaster:'Energy',   Elemental:'Energy',    Cosmic:'Energy',
  Tech:'Intelligence',Gadgets:'Intelligence',Brainiac:'Intelligence',
  Healer:'Magic',     Mystic:'Magic',        Shapeshifter:'Magic',
};

const BATTLE_CYCLE = ['Melee', 'Agility', 'Energy', 'Intelligence', 'Magic'];

export function battleCategory(type: string): string | null {
  return BATTLE_TYPE_MAP[type] ?? null;
}

export function getTypeMultiplier(atkType: string, defType: string): number {
  const a = BATTLE_CYCLE.indexOf(battleCategory(atkType) ?? '');
  const d = BATTLE_CYCLE.indexOf(battleCategory(defType) ?? '');
  if (a < 0 || d < 0) return 1.0;
  const next = (a + 1) % 5;
  const prev = (a + 4) % 5;
  if (d === next) return 1.5;           // strong against
  if (d === prev || d === a) return 0.75; // weak against or same
  return 1.0;                            // neutral
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
  const bc: BattleCard = {
    ...card,
    hp:    calcMaxHp(card),
    maxHp: calcMaxHp(card),
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
    const ownCat = battleCategory(bc.type);
    bc._packTactics = fullDeck.some(c => c.id !== bc.id && battleCategory(c.type) === ownCat);
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
  const adv = hand.filter(c => getTypeMultiplier(c.type, opponentActiveType) === 1.5);
  if (adv.length) return adv.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
  const notWeak = hand.filter(c => getTypeMultiplier(c.type, opponentActiveType) !== 0.75);
  if (notWeak.length) return notWeak.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
  return hand.reduce((b, c) => totalStat(c) > totalStat(b) ? c : b);
}

// ── 9. Execute one attack ─────────────────────────────────────────────────────

export function executeAttack(atk: BattleCard, def: BattleCard, atkSide: SideState, defSide: SideState, log: BattleEvent[]): { damage: number; killed: boolean } {
  let mult = getTypeMultiplier(atk.type, def.type);

  // Adaptable (defender)
  if (def.ability === 'Adaptable' && !def._adaptableUsed && mult === 1.5) {
    def._adaptableUsed = true;
    mult = 1.0;
    log.push({ type: 'ABILITY', ability: 'Adaptable', card: def.name, effect: 'Type advantage reduced to neutral' });
  }
  // Unstoppable (attacker)
  if (atk.ability === 'Unstoppable' && atk._unstoppableLeft > 0 && mult === 0.75) {
    atk._unstoppableLeft--;
    mult = 1.0;
    log.push({ type: 'ABILITY', ability: 'Unstoppable', card: atk.name, effect: `Type disadvantage ignored (${atk._unstoppableLeft} left)` });
  }
  // Overwhelm (attacker)
  if (atk.ability === 'Overwhelm' && mult === 1.5) {
    mult = 2.0;
    log.push({ type: 'ABILITY', ability: 'Overwhelm', card: atk.name, effect: 'Type advantage ×2.0' });
  }

  let atkPow = effPower(atk);
  atkPow = Math.round(atkPow * atkSide.attackMult);
  if (atk._dominateDebuff && !isImmune(atk)) atkPow = Math.round(atkPow * 0.75);

  const defVal = effDefense(def) * 0.5;
  let dmg = Math.max(1, Math.round(atkPow * mult - defVal));

  if (atk.ability === 'Adrenaline'  && atk.hp < atk.maxHp * 0.3)   dmg = Math.ceil(dmg * 1.2);
  if (atk.ability === 'Momentum'    && atk._momentumStacks > 0)      dmg = Math.ceil(dmg * (1 + atk._momentumStacks * 0.1));
  if (atk.ability === 'Pack Tactics' && atk._packTactics)             dmg = Math.ceil(dmg * 1.15);
  if (atk._reboundBonus)                                              dmg = Math.ceil(dmg * 1.15);
  if (atk._lastStandActive)                                           dmg = Math.ceil(dmg * 1.5);
  if (atk.ability === 'Execute'     && def.hp < def.maxHp * 0.25)    dmg = dmg * 2;
  if (atk.ability === 'Opportunist' && def.hp < def.maxHp * 0.4)     dmg = Math.ceil(dmg * 1.2);

  if (def.ability === 'Grit'      && def.hp < def.maxHp * 0.5 && !isImmune(def)) dmg = Math.ceil(dmg * 0.85);
  if (def.ability === 'Shield Up' && !def._shieldUsed) {
    def._shieldUsed = true;
    dmg = Math.ceil(dmg * 0.7);
    log.push({ type: 'ABILITY', ability: 'Shield Up', card: def.name, effect: 'First attack reduced 30%' });
  }
  if (def.ability === 'Smoke Screen' && !def._smokeUsed) {
    def._smokeUsed = true;
    if (Math.random() < 0.5) {
      log.push({ type: 'ATTACK', attacker: atk.name, attackerSide: atkSide._label, defender: def.name, defenderSide: defSide._label, damage: 0, typeMultiplier: mult, hpBefore: def.hp, hpAfter: def.hp, defenderMaxHp: def.maxHp, missed: true });
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

  log.push({ type: 'ATTACK', attacker: atk.name, attackerSide: atkSide._label, defender: def.name, defenderSide: defSide._label, damage: dmg, bonusDamage: bonus || undefined, typeMultiplier: mult, hpBefore, hpAfter: def.hp, defenderMaxHp: def.maxHp, missed: false });

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

export function resolvePostRound(playerSide: SideState, aiSide: SideState, log: BattleEvent[]): void {
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
  }
}

// ── 13. AI strategic swap ─────────────────────────────────────────────────────

export function aiSwapTarget(aSide: SideState, pSide: SideState): BattleCard | null {
  if (!aSide.active || aSide.hand.length === 0 || !pSide.active) return null;
  const hpPct = aSide.active.hp / aSide.active.maxHp;
  if (hpPct > 0.35) return null;
  const adv = aSide.hand.filter(c => getTypeMultiplier(c.type, pSide.active.type) === 1.5);
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

export function aiDecide(aSide: SideState, pSide: SideState): 'attack' | 'draw' | 'swap' {
  if (aiSwapTarget(aSide, pSide)) return 'swap';
  if (aSide.hand.length === 0 && aSide.deck.length > 0) return 'draw';
  return 'attack';
}

// ── 15. Battle reward calculation ─────────────────────────────────────────────

export function calcBattleRewards(tier: number, winner: 'player' | 'ai', streak: number): { credits: number; xp: number; streakBonus: boolean } {
  const t = BATTLE_REWARDS[tier] ?? BATTLE_REWARDS[1];
  if (winner === 'player') {
    const mult = streak >= 2 ? 2 : 1;
    return { credits: t.winCredits * mult, xp: t.winXp, streakBonus: mult === 2 };
  }
  return { credits: t.lossCredits, xp: t.lossXp, streakBonus: false };
}
