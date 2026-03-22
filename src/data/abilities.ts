// Ability pool per rarity tier + UI descriptions.
// v2: 10 abilities per rarity tier, 50 total.
// One ability per card, randomly assigned within rarity tier.

export const ABILITY_POOL: Record<string, readonly string[]> = {
  Common:    ['Grit', 'Opportunist', 'Resilience', 'Shield Up', 'Tenacity', 'Steady', 'Scrapper', 'Last Effort', 'Warm Up', 'Stubborn'],
  Uncommon:  ['Smoke Screen', 'Adrenaline', 'Pack Tactics', 'Adaptable', 'Rebound', 'Heavy Handed', 'Stamina Leech', 'Rested and Ready', 'Momentum', 'Counterpunch'],
  Rare:      ['Bleed', 'Intimidate', 'Fortify', 'Amp Siphon', 'Dead Weight', 'Payback', 'Amp Shield', 'Counterstrike', 'Type Bully', 'Pressure'],
  Epic:      ['Second Wind', 'Execute', 'Drain', 'Unstoppable', 'Overwhelm', 'Amp Surge', 'Stamina Vampire', 'Berserker', 'Death Mark', 'Riposte'],
  Legendary: ['Apex Predator', 'Immunity', 'Last Stand', 'Overwhelming Force', 'Dominate', 'Amp Drain', 'Juggernaut', 'Nullify', 'Siege', 'The Floor is Yours'],
};

export const ABILITY_DESC: Record<string, string> = {
  // ── Common ──────────────────────────────────────────────────────────────────
  'Grit':              'Takes 15% reduced damage when HP is below 50%',
  'Opportunist':       'Deals +20% damage to opponents below 40% HP',
  'Resilience':        'Recovers 5 HP at the start of each round',
  'Shield Up':         'First attack received this battle is reduced by 30%',
  'Tenacity':          'First loss of a win streak does not reset the streak',
  'Steady':            'Light attacks cost 0 stamina instead of 1',
  'Scrapper':          'Gains +3 Amp each time this card takes damage',
  'Last Effort':       'On defeat, the opponent\'s active card loses 10% of its max HP',
  'Warm Up':           'Starts battle with +3 bonus stamina (can exceed normal max)',
  'Stubborn':          'The first hit that would drop this card below 20% HP is reduced so it survives at exactly 20%',

  // ── Uncommon ────────────────────────────────────────────────────────────────
  'Smoke Screen':      'When this card enters, the opponent\'s first attack has a 50% chance to miss',
  'Adrenaline':        'Deals +20% damage when this card is below 30% HP',
  'Pack Tactics':      'Deals +15% damage if another card in your deck shares this card\'s type',
  'Adaptable':         'The first type-advantage attack against this card each time it enters is reduced to neutral',
  'Rebound':           'On defeat, the next card you play enters with +15% damage',
  'Heavy Handed':      'Each Heavy attack this card lands generates +5 bonus Amp',
  'Stamina Leech':     'Each hit drains 1 stamina from the opponent; if this card is faster and drains to 0, the opponent\'s attack is cancelled this round',
  'Rested and Ready':  'When entering from hand at full stamina, the first attack deals 30% bonus damage',
  'Momentum':          'Each consecutive opponent defeated raises damage by 10% (max +50%)',
  'Counterpunch':      'When hit by a Heavy attack, automatically retaliates for 20% of the damage received',

  // ── Rare ────────────────────────────────────────────────────────────────────
  'Bleed':             'First attack after entering applies a DoT: 8% max HP damage per round for 3 rounds',
  'Intimidate':        'On entry, reduces the opponent\'s active card attack by 15% for 3 rounds',
  'Fortify':           'Gains 8% damage reduction each time it defeats an opponent (max 40%)',
  'Amp Siphon':        'Each hit steals 3 Amp from the opponent and adds it to your meter',
  'Dead Weight':       'On entry, the opponent\'s active card loses 20% of its current stamina',
  'Payback':           'Stores 10% of damage taken each round; releases all stored damage in one hit when it defeats an opponent',
  'Amp Shield':        'Takes 20% reduced damage while your Amp meter is above 50',
  'Counterstrike':     '25% chance each round to reflect half the damage received back to the attacker',
  'Type Bully':        'When this card has a type advantage, Heavy attacks cost 2 less stamina',
  'Pressure':          'Each round active, opponent\'s Medium attacks cost +1 stamina (max +3). Resets on swap.',

  // ── Epic ────────────────────────────────────────────────────────────────────
  'Second Wind':       'Once per battle, survives a killing blow at 20% HP instead of dying',
  'Execute':           'Deals double damage to opponents below 25% HP',
  'Drain':             'Heals for 25% of all damage dealt each round',
  'Unstoppable':       'First 3 attacks after entering ignore type disadvantage',
  'Overwhelm':         'Each consecutive round active with type advantage, damage increases by 20% (resets on swap)',
  'Amp Surge':         'When this card triggers Amp, gains an additional 25 Amp immediately after the meter resets',
  'Stamina Vampire':   'On defeating an opponent\'s card, steals all of that card\'s remaining stamina',
  'Berserker':         'Each round this card takes damage, its attack permanently increases by 8% (max +80%)',
  'Death Mark':        'On entry, marks the opponent\'s active card. If the marked card is ever defeated, your next card enters at full stamina',
  'Riposte':           'When this card Rests, it does not take a free hit and retaliates 50% of any damage it would have received',

  // ── Legendary ───────────────────────────────────────────────────────────────
  'Apex Predator':      'Each kill permanently raises all stats by 8%; speed bonus applies from the next round',
  'Immunity':           'Blocks all debuffs: Bleed, Intimidate, Dead Weight, Pressure, Dominate, Nullify, and type disadvantage',
  'Last Stand':         'Survives the first killing blow at 1 HP and permanently gains +50% attack',
  'Overwhelming Force': 'Deals bonus damage equal to 10% of the opponent\'s max HP each round, capped at 30',
  'Dominate':           'After a kill, the next opponent card enters with −25% attack for 3 rounds',
  'Amp Drain':          'Each round active, drains 5 Amp from the opponent\'s meter and adds it to yours',
  'Juggernaut':         'Each consecutive round this card attacks, damage increases by 10%. Resets on Rest or Swap.',
  'Nullify':            'On entry, the opponent\'s active card loses its ability for 5 rounds',
  'Siege':              'Each round active, reduces the opponent\'s stamina cap by 1 (min 3). Resets on swap.',
  'The Floor is Yours': 'While your Amp meter is at 100, this card deals 20% bonus damage until you trigger Amp',
};
