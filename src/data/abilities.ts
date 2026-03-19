// Ability pool per rarity tier + UI descriptions.
// Random assignment to cards happens in Session 14 (God Mode CMS).
// The engine handles ability: undefined gracefully for all cards until then.

export const ABILITY_POOL: Record<string, readonly string[]> = {
  Common:    ['Grit', 'Opportunist', 'Resilience', 'Shield Up', 'Tenacity'],
  Uncommon:  ['Smoke Screen', 'Adrenaline', 'Pack Tactics', 'Adaptable', 'Rebound'],
  Rare:      ['Counterstrike', 'Fortify', 'Bleed', 'Intimidate', 'Momentum'],
  Epic:      ['Unstoppable', 'Execute', 'Drain', 'Second Wind', 'Overwhelm'],
  Legendary: ['Apex Predator', 'Immunity', 'Last Stand', 'Overwhelming Force', 'Dominate'],
};

export const ABILITY_DESC: Record<string, string> = {
  'Grit':               'Takes 15% reduced damage when HP < 50%',
  'Opportunist':        '+20% damage vs opponents below 40% HP',
  'Resilience':         'Recovers 5 HP at the start of each round',
  'Shield Up':          'First attack received reduced by 30%',
  'Tenacity':           'Win streak protected on one loss',
  'Smoke Screen':       "Opponent's first attack has 50% chance to miss",
  'Adrenaline':         '+20% attack when below 30% HP',
  'Pack Tactics':       '+15% damage if a deck ally shares your battle category',
  'Adaptable':          'First type-advantage hit against this card becomes neutral',
  'Rebound':            'When defeated, next friendly card gets +15% damage',
  'Counterstrike':      '25% chance to reflect half damage received each round',
  'Fortify':            'Gains +8 defense each time it defeats an opponent',
  'Bleed':              'Applies 8% max HP damage-over-time for 2 rounds',
  'Intimidate':         'Reduces opponent attack −15% for entire battle on entry',
  'Momentum':           '+10% damage per consecutive kill (resets on defeat)',
  'Unstoppable':        'Type disadvantage ignored for first 3 attacks',
  'Execute':            'Deals double damage to opponents below 25% HP',
  'Drain':              'Heals 25% of all damage dealt each round',
  'Second Wind':        'Survives one killing blow, restores 20% HP',
  'Overwhelm':          'Type advantage multiplier becomes ×2.0 instead of ×1.5',
  'Apex Predator':      'All stats +8% per kill (stacks); speed applies next round',
  'Immunity':           'Immune to all negative effects',
  'Last Stand':         'Survives once at 1 HP, gains +50% attack permanently',
  'Overwhelming Force': 'Deals 10% opponent max HP as bonus damage per round',
  'Dominate':           'After a kill, next opponent card enters with −25% attack',
};
