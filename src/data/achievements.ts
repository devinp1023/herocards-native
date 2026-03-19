// Achievements — ported from web data.js.
// emoji replaced with symbol + color (emoji don't render on Hermes/RN).

export interface Achievement {
  id: string;
  family: string;
  symbol: string;   // Unicode symbol — renders on Hermes
  color: string;    // accent color for the symbol + border
  cat: string;
  tier: string;
  name: string;
  desc: string;
  req: {
    type: 'col' | 'packs' | 'rarity' | 'level' | 'trades' | 'avatars' | 'alliance' | 'types' | 'pack';
    rarity?: string;
    alliance?: string;
    pack?: number;
    pct?: number;
    n: number;
  };
  xp: number;
  credits: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Card Collector ─────────────────────────────────────────────────────────
  {id:'card_collector_1', family:'Card Collector',   symbol:'◈', color:'#4fc3f7', cat:'Collection', tier:'I',   name:'Card Collector I',   desc:'Collect 1 card',        req:{type:'col',n:1},    xp:100,  credits:50},
  {id:'card_collector_2', family:'Card Collector',   symbol:'◈', color:'#4fc3f7', cat:'Collection', tier:'II',  name:'Card Collector II',  desc:'Collect 10 cards',      req:{type:'col',n:10},   xp:200,  credits:100},
  {id:'card_collector_3', family:'Card Collector',   symbol:'◈', color:'#4fc3f7', cat:'Collection', tier:'III', name:'Card Collector III', desc:'Collect 50 cards',      req:{type:'col',n:50},   xp:500,  credits:250},
  {id:'card_collector_4', family:'Card Collector',   symbol:'◈', color:'#4fc3f7', cat:'Collection', tier:'IV',  name:'Card Collector IV',  desc:'Collect 100 cards',     req:{type:'col',n:100},  xp:1000, credits:500},
  {id:'card_collector_5', family:'Card Collector',   symbol:'◈', color:'#4fc3f7', cat:'Collection', tier:'V',   name:'Card Collector V',   desc:'Collect all 200 cards', req:{type:'col',n:200},  xp:5000, credits:3000},

  // ── Pack Rat ───────────────────────────────────────────────────────────────
  {id:'pack_rat_1', family:'Pack Rat', symbol:'▣', color:'#ff9800', cat:'Packs', tier:'I',   name:'Pack Rat I',   desc:'Open 1 pack',    req:{type:'packs',n:1},   xp:100,  credits:50},
  {id:'pack_rat_2', family:'Pack Rat', symbol:'▣', color:'#ff9800', cat:'Packs', tier:'II',  name:'Pack Rat II',  desc:'Open 10 packs',  req:{type:'packs',n:10},  xp:300,  credits:150},
  {id:'pack_rat_3', family:'Pack Rat', symbol:'▣', color:'#ff9800', cat:'Packs', tier:'III', name:'Pack Rat III', desc:'Open 50 packs',  req:{type:'packs',n:50},  xp:1000, credits:500},
  {id:'pack_rat_4', family:'Pack Rat', symbol:'▣', color:'#ff9800', cat:'Packs', tier:'IV',  name:'Pack Rat IV',  desc:'Open 100 packs', req:{type:'packs',n:100}, xp:3000, credits:2000},
  {id:'pack_rat_5', family:'Pack Rat', symbol:'▣', color:'#ff9800', cat:'Packs', tier:'V',   name:'Pack Rat V',   desc:'Open 500 packs', req:{type:'packs',n:500}, xp:10000,credits:5000},

  // ── Rarity tiers ──────────────────────────────────────────────────────────
  {id:'uncommon_ground_1', family:'Uncommon Ground', symbol:'◉', color:'#4caf50', cat:'Rarity', tier:'I',   name:'Uncommon Ground I',   desc:'Collect 1 Uncommon card',       req:{type:'rarity',rarity:'Uncommon',n:1},  xp:100,  credits:50},
  {id:'uncommon_ground_2', family:'Uncommon Ground', symbol:'◉', color:'#4caf50', cat:'Rarity', tier:'II',  name:'Uncommon Ground II',  desc:'Collect 5 Uncommon cards',      req:{type:'rarity',rarity:'Uncommon',n:5},  xp:200,  credits:100},
  {id:'uncommon_ground_3', family:'Uncommon Ground', symbol:'◉', color:'#4caf50', cat:'Rarity', tier:'III', name:'Uncommon Ground III', desc:'Collect 15 Uncommon cards',     req:{type:'rarity',rarity:'Uncommon',n:15}, xp:400,  credits:200},
  {id:'uncommon_ground_4', family:'Uncommon Ground', symbol:'◉', color:'#4caf50', cat:'Rarity', tier:'IV',  name:'Uncommon Ground IV',  desc:'Collect all 55 Uncommon cards', req:{type:'rarity',rarity:'Uncommon',n:55}, xp:1500, credits:800},

  {id:'rare_find_1', family:'Rare Find', symbol:'◉', color:'#2196f3', cat:'Rarity', tier:'I',   name:'Rare Find I',   desc:'Collect 1 Rare card',       req:{type:'rarity',rarity:'Rare',n:1},  xp:200,  credits:100},
  {id:'rare_find_2', family:'Rare Find', symbol:'◉', color:'#2196f3', cat:'Rarity', tier:'II',  name:'Rare Find II',  desc:'Collect 5 Rare cards',      req:{type:'rarity',rarity:'Rare',n:5},  xp:400,  credits:200},
  {id:'rare_find_3', family:'Rare Find', symbol:'◉', color:'#2196f3', cat:'Rarity', tier:'III', name:'Rare Find III', desc:'Collect 15 Rare cards',     req:{type:'rarity',rarity:'Rare',n:15}, xp:800,  credits:400},
  {id:'rare_find_4', family:'Rare Find', symbol:'◉', color:'#2196f3', cat:'Rarity', tier:'IV',  name:'Rare Find IV',  desc:'Collect all 30 Rare cards', req:{type:'rarity',rarity:'Rare',n:30}, xp:2000, credits:1000},

  {id:'epic_discovery_1', family:'Epic Discovery', symbol:'◉', color:'#cc6dff', cat:'Rarity', tier:'I',   name:'Epic Discovery I',   desc:'Collect 1 Epic card',       req:{type:'rarity',rarity:'Epic',n:1},  xp:400,  credits:200},
  {id:'epic_discovery_2', family:'Epic Discovery', symbol:'◉', color:'#cc6dff', cat:'Rarity', tier:'II',  name:'Epic Discovery II',  desc:'Collect 5 Epic cards',      req:{type:'rarity',rarity:'Epic',n:5},  xp:800,  credits:400},
  {id:'epic_discovery_3', family:'Epic Discovery', symbol:'◉', color:'#cc6dff', cat:'Rarity', tier:'III', name:'Epic Discovery III', desc:'Collect all 10 Epic cards', req:{type:'rarity',rarity:'Epic',n:10}, xp:2000, credits:1200},

  {id:'legendary_hoard_1', family:'Legendary Hoard', symbol:'◉', color:'#ff9800', cat:'Rarity', tier:'I',   name:'Legendary Hoard I',   desc:'Collect 1 Legendary card',       req:{type:'rarity',rarity:'Legendary',n:1}, xp:800,  credits:400},
  {id:'legendary_hoard_2', family:'Legendary Hoard', symbol:'◉', color:'#ff9800', cat:'Rarity', tier:'II',  name:'Legendary Hoard II',  desc:'Collect 3 Legendary cards',      req:{type:'rarity',rarity:'Legendary',n:3}, xp:2000, credits:1000},
  {id:'legendary_hoard_3', family:'Legendary Hoard', symbol:'◉', color:'#ff9800', cat:'Rarity', tier:'III', name:'Legendary Hoard III', desc:'Collect all 5 Legendary cards', req:{type:'rarity',rarity:'Legendary',n:5}, xp:5000, credits:3000},

  // ── Leveling ───────────────────────────────────────────────────────────────
  {id:'rising_star_1', family:'Rising Star', symbol:'★', color:'#ffd700', cat:'Leveling', tier:'I',   name:'Rising Star I',   desc:'Reach Level 5',   req:{type:'level',n:5},   xp:200,  credits:200},
  {id:'rising_star_2', family:'Rising Star', symbol:'★', color:'#ffd700', cat:'Leveling', tier:'II',  name:'Rising Star II',  desc:'Reach Level 10',  req:{type:'level',n:10},  xp:500,  credits:500},
  {id:'rising_star_3', family:'Rising Star', symbol:'★', color:'#ffd700', cat:'Leveling', tier:'III', name:'Rising Star III', desc:'Reach Level 25',  req:{type:'level',n:25},  xp:1500, credits:1500},
  {id:'rising_star_4', family:'Rising Star', symbol:'★', color:'#ffd700', cat:'Leveling', tier:'IV',  name:'Rising Star IV',  desc:'Reach Level 50',  req:{type:'level',n:50},  xp:5000, credits:5000},
  {id:'rising_star_5', family:'Rising Star', symbol:'★', color:'#ffd700', cat:'Leveling', tier:'V',   name:'Rising Star V',   desc:'Reach Level 100', req:{type:'level',n:100}, xp:20000,credits:20000},

  // ── Economy ────────────────────────────────────────────────────────────────
  {id:'merchant_1', family:'Merchant', symbol:'≈', color:'#4caf50', cat:'Economy', tier:'I',   name:'Merchant I',   desc:'Trade 1 duplicate',   req:{type:'trades',n:1},   xp:100,  credits:50},
  {id:'merchant_2', family:'Merchant', symbol:'≈', color:'#4caf50', cat:'Economy', tier:'II',  name:'Merchant II',  desc:'Trade 10 duplicates', req:{type:'trades',n:10},  xp:300,  credits:150},
  {id:'merchant_3', family:'Merchant', symbol:'≈', color:'#4caf50', cat:'Economy', tier:'III', name:'Merchant III', desc:'Trade 50 duplicates', req:{type:'trades',n:50},  xp:1000, credits:600},
  {id:'merchant_4', family:'Merchant', symbol:'≈', color:'#4caf50', cat:'Economy', tier:'IV',  name:'Merchant IV',  desc:'Trade 100 duplicates',req:{type:'trades',n:100}, xp:3000, credits:2000},

  {id:'big_spender_1', family:'Big Spender', symbol:'◆', color:'#ff9800', cat:'Economy', tier:'I',   name:'Big Spender I',   desc:'Buy 1 avatar from the store',   req:{type:'avatars',n:1},  xp:200,  credits:100},
  {id:'big_spender_2', family:'Big Spender', symbol:'◆', color:'#ff9800', cat:'Economy', tier:'II',  name:'Big Spender II',  desc:'Own 5 purchased avatars',       req:{type:'avatars',n:5},  xp:600,  credits:300},
  {id:'big_spender_3', family:'Big Spender', symbol:'◆', color:'#ff9800', cat:'Economy', tier:'III', name:'Big Spender III', desc:'Own 10 purchased avatars',      req:{type:'avatars',n:10}, xp:1500, credits:800},

  // ── Alliance ───────────────────────────────────────────────────────────────
  {id:'hero_path_1', family:'Hero Path', symbol:'▲', color:'#4fc3f7', cat:'Alliance', tier:'I',   name:'Hero Path I',   desc:'Collect 5 Hero cards',  req:{type:'alliance',alliance:'Hero',n:5},  xp:150, credits:75},
  {id:'hero_path_2', family:'Hero Path', symbol:'▲', color:'#4fc3f7', cat:'Alliance', tier:'II',  name:'Hero Path II',  desc:'Collect 20 Hero cards', req:{type:'alliance',alliance:'Hero',n:20}, xp:400, credits:200},
  {id:'hero_path_3', family:'Hero Path', symbol:'▲', color:'#4fc3f7', cat:'Alliance', tier:'III', name:'Hero Path III', desc:'Collect 50 Hero cards', req:{type:'alliance',alliance:'Hero',n:50}, xp:1000,credits:500},

  {id:'villain_path_1', family:'Villain Path', symbol:'✦', color:'#f44336', cat:'Alliance', tier:'I',   name:'Villain Path I',   desc:'Collect 5 Villain cards',  req:{type:'alliance',alliance:'Villain',n:5},  xp:150, credits:75},
  {id:'villain_path_2', family:'Villain Path', symbol:'✦', color:'#f44336', cat:'Alliance', tier:'II',  name:'Villain Path II',  desc:'Collect 20 Villain cards', req:{type:'alliance',alliance:'Villain',n:20}, xp:400, credits:200},
  {id:'villain_path_3', family:'Villain Path', symbol:'✦', color:'#f44336', cat:'Alliance', tier:'III', name:'Villain Path III', desc:'Collect 50 Villain cards', req:{type:'alliance',alliance:'Villain',n:50}, xp:1000,credits:500},

  {id:'anti_hero_path_1', family:'Anti-Hero Path', symbol:'✸', color:'#ff6b00', cat:'Alliance', tier:'I',   name:'Anti-Hero Path I',   desc:'Collect 5 Anti-Hero cards',  req:{type:'alliance',alliance:'Anti-Hero',n:5},  xp:150, credits:75},
  {id:'anti_hero_path_2', family:'Anti-Hero Path', symbol:'✸', color:'#ff6b00', cat:'Alliance', tier:'II',  name:'Anti-Hero Path II',  desc:'Collect 20 Anti-Hero cards', req:{type:'alliance',alliance:'Anti-Hero',n:20}, xp:400, credits:200},
  {id:'anti_hero_path_3', family:'Anti-Hero Path', symbol:'✸', color:'#ff6b00', cat:'Alliance', tier:'III', name:'Anti-Hero Path III', desc:'Collect 50 Anti-Hero cards', req:{type:'alliance',alliance:'Anti-Hero',n:50}, xp:1000,credits:500},

  // ── Type Master ────────────────────────────────────────────────────────────
  {id:'type_master_1', family:'Type Master', symbol:'◇', color:'#cc6dff', cat:'Collection', tier:'I',   name:'Type Master I',   desc:'Own cards of 5 different types',  req:{type:'types',n:5},  xp:200,  credits:100},
  {id:'type_master_2', family:'Type Master', symbol:'◇', color:'#cc6dff', cat:'Collection', tier:'II',  name:'Type Master II',  desc:'Own cards of 10 different types', req:{type:'types',n:10}, xp:500,  credits:250},
  {id:'type_master_3', family:'Type Master', symbol:'◇', color:'#cc6dff', cat:'Collection', tier:'III', name:'Type Master III', desc:'Own cards of all 15 types',       req:{type:'types',n:15}, xp:1500, credits:750},

  // ── Pack Master ────────────────────────────────────────────────────────────
  {id:'pack_master_1', family:'Pack Master', symbol:'Ψ', color:'#00e676', cat:'Collection', tier:'I',   name:'Pack Master I',   desc:'Collect 50% of Infinite Waves',     req:{type:'pack',pack:1,pct:50,n:50},  xp:500,  credits:300},
  {id:'pack_master_2', family:'Pack Master', symbol:'Ψ', color:'#00e676', cat:'Collection', tier:'II',  name:'Pack Master II',  desc:'Complete Infinite Waves',           req:{type:'pack',pack:1,pct:100,n:100},xp:2500, credits:1500},
  {id:'pack_master_3', family:'Pack Master', symbol:'Ψ', color:'#00e676', cat:'Collection', tier:'III', name:'Pack Master III', desc:'Collect 50% of Shrouded Mysteries', req:{type:'pack',pack:2,pct:50,n:50},  xp:500,  credits:300},
  {id:'pack_master_4', family:'Pack Master', symbol:'Ψ', color:'#00e676', cat:'Collection', tier:'IV',  name:'Pack Master IV',  desc:'Complete Shrouded Mysteries',       req:{type:'pack',pack:2,pct:100,n:100},xp:2500, credits:1500},
];

// All unique family names in display order
export const ACHIEVEMENT_FAMILIES = [
  'Card Collector', 'Pack Rat', 'Uncommon Ground', 'Rare Find',
  'Epic Discovery', 'Legendary Hoard', 'Rising Star', 'Merchant',
  'Big Spender', 'Hero Path', 'Villain Path', 'Anti-Hero Path',
  'Type Master', 'Pack Master',
];
