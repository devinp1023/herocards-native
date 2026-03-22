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
    type: 'col' | 'packs' | 'rarity' | 'level' | 'trades' | 'avatars' | 'alliance' | 'types' | 'pack' | 'battle_stat';
    rarity?: string;
    alliance?: string;
    pack?: number;
    pct?: number;
    stat?: string;   // used when type === 'battle_stat'
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

  // ── Battle ─────────────────────────────────────────────────────────────────

  // Battle Victor — total wins
  {id:'battle_victor_1', family:'Battle Victor', symbol:'⚔', color:'#e8445a', cat:'Battle', tier:'I',   name:'Battle Victor I',   desc:'Win 1 battle',         req:{type:'battle_stat',stat:'battlesWon',n:1},   xp:200,  credits:100},
  {id:'battle_victor_2', family:'Battle Victor', symbol:'⚔', color:'#e8445a', cat:'Battle', tier:'II',  name:'Battle Victor II',  desc:'Win 10 battles',       req:{type:'battle_stat',stat:'battlesWon',n:10},  xp:500,  credits:250},
  {id:'battle_victor_3', family:'Battle Victor', symbol:'⚔', color:'#e8445a', cat:'Battle', tier:'III', name:'Battle Victor III', desc:'Win 50 battles',       req:{type:'battle_stat',stat:'battlesWon',n:50},  xp:1500, credits:750},
  {id:'battle_victor_4', family:'Battle Victor', symbol:'⚔', color:'#e8445a', cat:'Battle', tier:'IV',  name:'Battle Victor IV',  desc:'Win 150 battles',      req:{type:'battle_stat',stat:'battlesWon',n:150}, xp:4000, credits:2000},
  {id:'battle_victor_5', family:'Battle Victor', symbol:'⚔', color:'#e8445a', cat:'Battle', tier:'V',   name:'Battle Victor V',   desc:'Win 300 battles',      req:{type:'battle_stat',stat:'battlesWon',n:300}, xp:10000,credits:5000},

  // Giant Killer — wins vs tier 3+
  {id:'giant_killer_1', family:'Giant Killer', symbol:'⚔', color:'#f44336', cat:'Battle', tier:'I',   name:'Giant Killer I',   desc:'Defeat a Fighter, Elite, or Champion tier opponent',    req:{type:'battle_stat',stat:'giantKillerWins',n:1},   xp:300,  credits:150},
  {id:'giant_killer_2', family:'Giant Killer', symbol:'⚔', color:'#f44336', cat:'Battle', tier:'II',  name:'Giant Killer II',  desc:'Beat a tough opponent 10 times',   req:{type:'battle_stat',stat:'giantKillerWins',n:10},  xp:800,  credits:400},
  {id:'giant_killer_3', family:'Giant Killer', symbol:'⚔', color:'#f44336', cat:'Battle', tier:'III', name:'Giant Killer III', desc:'Beat a tough opponent 50 times',   req:{type:'battle_stat',stat:'giantKillerWins',n:50},  xp:2500, credits:1250},
  {id:'giant_killer_4', family:'Giant Killer', symbol:'⚔', color:'#f44336', cat:'Battle', tier:'IV',  name:'Giant Killer IV',  desc:'Beat a tough opponent 150 times',  req:{type:'battle_stat',stat:'giantKillerWins',n:150}, xp:6000, credits:3000},
  {id:'giant_killer_5', family:'Giant Killer', symbol:'⚔', color:'#f44336', cat:'Battle', tier:'V',   name:'Giant Killer V',   desc:'Beat a tough opponent 300 times',  req:{type:'battle_stat',stat:'giantKillerWins',n:300}, xp:15000,credits:7500},

  // Win Streak — high watermark via maxWinStreak
  {id:'win_streak_1', family:'Win Streak', symbol:'⚔', color:'#ff5722', cat:'Battle', tier:'I',   name:'Win Streak I',   desc:'Reach a 3-win streak',   req:{type:'battle_stat',stat:'maxWinStreak',n:3},  xp:300,  credits:150},
  {id:'win_streak_2', family:'Win Streak', symbol:'⚔', color:'#ff5722', cat:'Battle', tier:'II',  name:'Win Streak II',  desc:'Reach a 5-win streak',   req:{type:'battle_stat',stat:'maxWinStreak',n:5},  xp:800,  credits:400},
  {id:'win_streak_3', family:'Win Streak', symbol:'⚔', color:'#ff5722', cat:'Battle', tier:'III', name:'Win Streak III', desc:'Reach a 10-win streak',  req:{type:'battle_stat',stat:'maxWinStreak',n:10}, xp:2500, credits:1250},
  {id:'win_streak_4', family:'Win Streak', symbol:'⚔', color:'#ff5722', cat:'Battle', tier:'IV',  name:'Win Streak IV',  desc:'Reach a 15-win streak',  req:{type:'battle_stat',stat:'maxWinStreak',n:15}, xp:6000, credits:3000},
  {id:'win_streak_5', family:'Win Streak', symbol:'⚔', color:'#ff5722', cat:'Battle', tier:'V',   name:'Win Streak V',   desc:'Reach a 20-win streak',  req:{type:'battle_stat',stat:'maxWinStreak',n:20}, xp:15000,credits:7500},

  // Champion — wins vs tier 5
  {id:'champion_1', family:'Champion', symbol:'★', color:'#ffa726', cat:'Battle', tier:'I',   name:'Champion I',   desc:'Beat the Champion tier once',     req:{type:'battle_stat',stat:'tier5Wins',n:1},   xp:500,  credits:250},
  {id:'champion_2', family:'Champion', symbol:'★', color:'#ffa726', cat:'Battle', tier:'II',  name:'Champion II',  desc:'Beat the Champion tier 5 times',  req:{type:'battle_stat',stat:'tier5Wins',n:5},   xp:1500, credits:750},
  {id:'champion_3', family:'Champion', symbol:'★', color:'#ffa726', cat:'Battle', tier:'III', name:'Champion III', desc:'Beat the Champion tier 15 times', req:{type:'battle_stat',stat:'tier5Wins',n:15},  xp:4000, credits:2000},
  {id:'champion_4', family:'Champion', symbol:'★', color:'#ffa726', cat:'Battle', tier:'IV',  name:'Champion IV',  desc:'Beat the Champion tier 40 times', req:{type:'battle_stat',stat:'tier5Wins',n:40},  xp:10000,credits:5000},
  {id:'champion_5', family:'Champion', symbol:'★', color:'#ffa726', cat:'Battle', tier:'V',   name:'Champion V',   desc:'Beat the Champion tier 100 times',req:{type:'battle_stat',stat:'tier5Wins',n:100}, xp:25000,credits:12500},

  // Battles Fought — total battles played
  {id:'battles_fought_1', family:'Battles Fought', symbol:'⚔', color:'#78909c', cat:'Battle', tier:'I',   name:'Battles Fought I',   desc:'Play 1 battle',    req:{type:'battle_stat',stat:'battlesPlayed',n:1},   xp:100,  credits:50},
  {id:'battles_fought_2', family:'Battles Fought', symbol:'⚔', color:'#78909c', cat:'Battle', tier:'II',  name:'Battles Fought II',  desc:'Play 10 battles',  req:{type:'battle_stat',stat:'battlesPlayed',n:10},  xp:300,  credits:150},
  {id:'battles_fought_3', family:'Battles Fought', symbol:'⚔', color:'#78909c', cat:'Battle', tier:'III', name:'Battles Fought III', desc:'Play 50 battles',  req:{type:'battle_stat',stat:'battlesPlayed',n:50},  xp:1000, credits:500},
  {id:'battles_fought_4', family:'Battles Fought', symbol:'⚔', color:'#78909c', cat:'Battle', tier:'IV',  name:'Battles Fought IV',  desc:'Play 150 battles', req:{type:'battle_stat',stat:'battlesPlayed',n:150}, xp:3000, credits:1500},
  {id:'battles_fought_5', family:'Battles Fought', symbol:'⚔', color:'#78909c', cat:'Battle', tier:'V',   name:'Battles Fought V',   desc:'Play 300 battles', req:{type:'battle_stat',stat:'battlesPlayed',n:300}, xp:8000, credits:4000},

  // ── Type Mastery ───────────────────────────────────────────────────────────

  {id:'type_advantage_1', family:'Type Advantage', symbol:'◇', color:'#cc6dff', cat:'Battle', tier:'I',   name:'Type Advantage I',   desc:'Win 1 battle with a x2.0 type matchup final kill',    req:{type:'battle_stat',stat:'typeAdvantageWins',n:1},   xp:200,  credits:100},
  {id:'type_advantage_2', family:'Type Advantage', symbol:'◇', color:'#cc6dff', cat:'Battle', tier:'II',  name:'Type Advantage II',  desc:'Win 10 type advantage battles',   req:{type:'battle_stat',stat:'typeAdvantageWins',n:10},  xp:600,  credits:300},
  {id:'type_advantage_3', family:'Type Advantage', symbol:'◇', color:'#cc6dff', cat:'Battle', tier:'III', name:'Type Advantage III', desc:'Win 50 type advantage battles',   req:{type:'battle_stat',stat:'typeAdvantageWins',n:50},  xp:2000, credits:1000},
  {id:'type_advantage_4', family:'Type Advantage', symbol:'◇', color:'#cc6dff', cat:'Battle', tier:'IV',  name:'Type Advantage IV',  desc:'Win 150 type advantage battles',  req:{type:'battle_stat',stat:'typeAdvantageWins',n:150}, xp:5000, credits:2500},
  {id:'type_advantage_5', family:'Type Advantage', symbol:'◇', color:'#cc6dff', cat:'Battle', tier:'V',   name:'Type Advantage V',   desc:'Win 300 type advantage battles',  req:{type:'battle_stat',stat:'typeAdvantageWins',n:300}, xp:12000,credits:6000},

  {id:'cosmic_clash_1', family:'Cosmic Clash', symbol:'◇', color:'#7c3aed', cat:'Battle', tier:'I',   name:'Cosmic Clash I',   desc:'Win a battle where both active cards are Cosmic at the final kill', req:{type:'battle_stat',stat:'cosmicClashWins',n:1},   xp:400,  credits:200},
  {id:'cosmic_clash_2', family:'Cosmic Clash', symbol:'◇', color:'#7c3aed', cat:'Battle', tier:'II',  name:'Cosmic Clash II',  desc:'5 Cosmic Clash wins',  req:{type:'battle_stat',stat:'cosmicClashWins',n:5},   xp:1200, credits:600},
  {id:'cosmic_clash_3', family:'Cosmic Clash', symbol:'◇', color:'#7c3aed', cat:'Battle', tier:'III', name:'Cosmic Clash III', desc:'15 Cosmic Clash wins', req:{type:'battle_stat',stat:'cosmicClashWins',n:15},  xp:3500, credits:1750},
  {id:'cosmic_clash_4', family:'Cosmic Clash', symbol:'◇', color:'#7c3aed', cat:'Battle', tier:'IV',  name:'Cosmic Clash IV',  desc:'40 Cosmic Clash wins', req:{type:'battle_stat',stat:'cosmicClashWins',n:40},  xp:8000, credits:4000},
  {id:'cosmic_clash_5', family:'Cosmic Clash', symbol:'◇', color:'#7c3aed', cat:'Battle', tier:'V',   name:'Cosmic Clash V',   desc:'100 Cosmic Clash wins',req:{type:'battle_stat',stat:'cosmicClashWins',n:100}, xp:20000,credits:10000},

  {id:'against_all_odds_1', family:'Against All Odds', symbol:'◇', color:'#4fc3f7', cat:'Battle', tier:'I',   name:'Against All Odds I',   desc:'Win a battle with type disadvantage',     req:{type:'battle_stat',stat:'typeDisadvantageWins',n:1},   xp:300,  credits:150},
  {id:'against_all_odds_2', family:'Against All Odds', symbol:'◇', color:'#4fc3f7', cat:'Battle', tier:'II',  name:'Against All Odds II',  desc:'Win 10 type disadvantage battles',  req:{type:'battle_stat',stat:'typeDisadvantageWins',n:10},  xp:900,  credits:450},
  {id:'against_all_odds_3', family:'Against All Odds', symbol:'◇', color:'#4fc3f7', cat:'Battle', tier:'III', name:'Against All Odds III', desc:'Win 35 type disadvantage battles',  req:{type:'battle_stat',stat:'typeDisadvantageWins',n:35},  xp:2800, credits:1400},
  {id:'against_all_odds_4', family:'Against All Odds', symbol:'◇', color:'#4fc3f7', cat:'Battle', tier:'IV',  name:'Against All Odds IV',  desc:'Win 100 type disadvantage battles', req:{type:'battle_stat',stat:'typeDisadvantageWins',n:100}, xp:7000, credits:3500},
  {id:'against_all_odds_5', family:'Against All Odds', symbol:'◇', color:'#4fc3f7', cat:'Battle', tier:'V',   name:'Against All Odds V',   desc:'Win 250 type disadvantage battles', req:{type:'battle_stat',stat:'typeDisadvantageWins',n:250}, xp:18000,credits:9000},

  // ── Stamina Mastery ────────────────────────────────────────────────────────

  {id:'heavy_hitter_1', family:'Heavy Hitter', symbol:'◈', color:'#3aadad', cat:'Battle', tier:'I',   name:'Heavy Hitter I',   desc:'Defeat 1 card with a Heavy attack',    req:{type:'battle_stat',stat:'heavyKills',n:1},   xp:200,  credits:100},
  {id:'heavy_hitter_2', family:'Heavy Hitter', symbol:'◈', color:'#3aadad', cat:'Battle', tier:'II',  name:'Heavy Hitter II',  desc:'Defeat 15 cards with Heavy attacks',  req:{type:'battle_stat',stat:'heavyKills',n:15},  xp:600,  credits:300},
  {id:'heavy_hitter_3', family:'Heavy Hitter', symbol:'◈', color:'#3aadad', cat:'Battle', tier:'III', name:'Heavy Hitter III', desc:'Defeat 50 cards with Heavy attacks',  req:{type:'battle_stat',stat:'heavyKills',n:50},  xp:2000, credits:1000},
  {id:'heavy_hitter_4', family:'Heavy Hitter', symbol:'◈', color:'#3aadad', cat:'Battle', tier:'IV',  name:'Heavy Hitter IV',  desc:'Defeat 150 cards with Heavy attacks', req:{type:'battle_stat',stat:'heavyKills',n:150}, xp:5000, credits:2500},
  {id:'heavy_hitter_5', family:'Heavy Hitter', symbol:'◈', color:'#3aadad', cat:'Battle', tier:'V',   name:'Heavy Hitter V',   desc:'Defeat 400 cards with Heavy attacks', req:{type:'battle_stat',stat:'heavyKills',n:400}, xp:12000,credits:6000},

  {id:'iron_will_1', family:'Iron Will', symbol:'◈', color:'#00bcd4', cat:'Battle', tier:'I',   name:'Iron Will I',   desc:'Win a battle after any of your cards reached 0 stamina', req:{type:'battle_stat',stat:'ironWillWins',n:1},  xp:300,  credits:150},
  {id:'iron_will_2', family:'Iron Will', symbol:'◈', color:'#00bcd4', cat:'Battle', tier:'II',  name:'Iron Will II',  desc:'5 Iron Will wins',  req:{type:'battle_stat',stat:'ironWillWins',n:5},  xp:900,  credits:450},
  {id:'iron_will_3', family:'Iron Will', symbol:'◈', color:'#00bcd4', cat:'Battle', tier:'III', name:'Iron Will III', desc:'20 Iron Will wins', req:{type:'battle_stat',stat:'ironWillWins',n:20}, xp:2800, credits:1400},
  {id:'iron_will_4', family:'Iron Will', symbol:'◈', color:'#00bcd4', cat:'Battle', tier:'IV',  name:'Iron Will IV',  desc:'60 Iron Will wins', req:{type:'battle_stat',stat:'ironWillWins',n:60}, xp:7000, credits:3500},
  {id:'iron_will_5', family:'Iron Will', symbol:'◈', color:'#00bcd4', cat:'Battle', tier:'V',   name:'Iron Will V',   desc:'150 Iron Will wins',req:{type:'battle_stat',stat:'ironWillWins',n:150},xp:18000,credits:9000},

  {id:'well_rested_1', family:'Well Rested', symbol:'◈', color:'#4caf50', cat:'Battle', tier:'I',   name:'Well Rested I',   desc:'Win a round after entering at full stamina', req:{type:'battle_stat',stat:'wellRestedRoundWins',n:1},   xp:200,  credits:100},
  {id:'well_rested_2', family:'Well Rested', symbol:'◈', color:'#4caf50', cat:'Battle', tier:'II',  name:'Well Rested II',  desc:'15 well-rested round wins',  req:{type:'battle_stat',stat:'wellRestedRoundWins',n:15},  xp:600,  credits:300},
  {id:'well_rested_3', family:'Well Rested', symbol:'◈', color:'#4caf50', cat:'Battle', tier:'III', name:'Well Rested III', desc:'50 well-rested round wins',  req:{type:'battle_stat',stat:'wellRestedRoundWins',n:50},  xp:2000, credits:1000},
  {id:'well_rested_4', family:'Well Rested', symbol:'◈', color:'#4caf50', cat:'Battle', tier:'IV',  name:'Well Rested IV',  desc:'150 well-rested round wins', req:{type:'battle_stat',stat:'wellRestedRoundWins',n:150}, xp:5000, credits:2500},
  {id:'well_rested_5', family:'Well Rested', symbol:'◈', color:'#4caf50', cat:'Battle', tier:'V',   name:'Well Rested V',   desc:'350 well-rested round wins', req:{type:'battle_stat',stat:'wellRestedRoundWins',n:350}, xp:12000,credits:6000},

  // ── Amp Mastery ────────────────────────────────────────────────────────────

  {id:'amped_up_1', family:'Amped Up', symbol:'⚡', color:'#ffd700', cat:'Battle', tier:'I',   name:'Amped Up I',   desc:'Trigger Amp 1 time',    req:{type:'battle_stat',stat:'ampTriggers',n:1},   xp:200,  credits:100},
  {id:'amped_up_2', family:'Amped Up', symbol:'⚡', color:'#ffd700', cat:'Battle', tier:'II',  name:'Amped Up II',  desc:'Trigger Amp 10 times',  req:{type:'battle_stat',stat:'ampTriggers',n:10},  xp:600,  credits:300},
  {id:'amped_up_3', family:'Amped Up', symbol:'⚡', color:'#ffd700', cat:'Battle', tier:'III', name:'Amped Up III', desc:'Trigger Amp 50 times',  req:{type:'battle_stat',stat:'ampTriggers',n:50},  xp:2000, credits:1000},
  {id:'amped_up_4', family:'Amped Up', symbol:'⚡', color:'#ffd700', cat:'Battle', tier:'IV',  name:'Amped Up IV',  desc:'Trigger Amp 200 times', req:{type:'battle_stat',stat:'ampTriggers',n:200}, xp:5000, credits:2500},
  {id:'amped_up_5', family:'Amped Up', symbol:'⚡', color:'#ffd700', cat:'Battle', tier:'V',   name:'Amped Up V',   desc:'Trigger Amp 500 times', req:{type:'battle_stat',stat:'ampTriggers',n:500}, xp:12000,credits:6000},

  {id:'photo_finish_1', family:'Photo Finish', symbol:'⚡', color:'#ff9800', cat:'Battle', tier:'I',   name:'Photo Finish I',   desc:'Trigger Amp while opponent had >=80 Amp', req:{type:'battle_stat',stat:'photoFinishTriggers',n:1},  xp:400,  credits:200},
  {id:'photo_finish_2', family:'Photo Finish', symbol:'⚡', color:'#ff9800', cat:'Battle', tier:'II',  name:'Photo Finish II',  desc:'5 Photo Finish triggers',  req:{type:'battle_stat',stat:'photoFinishTriggers',n:5},  xp:1200, credits:600},
  {id:'photo_finish_3', family:'Photo Finish', symbol:'⚡', color:'#ff9800', cat:'Battle', tier:'III', name:'Photo Finish III', desc:'20 Photo Finish triggers', req:{type:'battle_stat',stat:'photoFinishTriggers',n:20}, xp:3500, credits:1750},
  {id:'photo_finish_4', family:'Photo Finish', symbol:'⚡', color:'#ff9800', cat:'Battle', tier:'IV',  name:'Photo Finish IV',  desc:'75 Photo Finish triggers', req:{type:'battle_stat',stat:'photoFinishTriggers',n:75}, xp:8000, credits:4000},
  {id:'photo_finish_5', family:'Photo Finish', symbol:'⚡', color:'#ff9800', cat:'Battle', tier:'V',   name:'Photo Finish V',   desc:'200 Photo Finish triggers',req:{type:'battle_stat',stat:'photoFinishTriggers',n:200},xp:20000,credits:10000},

  {id:'battlefield_control_1', family:'Battlefield Control', symbol:'⚡', color:'#00e5ff', cat:'Battle', tier:'I', name:'Battlefield Control', desc:'Trigger all 6 Amp effects in a single battle', req:{type:'battle_stat',stat:'battlefieldControlBattles',n:1}, xp:2000, credits:1000},

  {id:'the_switcher_1', family:'The Switcher', symbol:'⚡', color:'#ab47bc', cat:'Battle', tier:'I',   name:'The Switcher I',   desc:'Spend 50 Amp to switch effects',        req:{type:'battle_stat',stat:'ampSwitches',n:1},   xp:300,  credits:150},
  {id:'the_switcher_2', family:'The Switcher', symbol:'⚡', color:'#ab47bc', cat:'Battle', tier:'II',  name:'The Switcher II',  desc:'Switch Amp effects 10 times',  req:{type:'battle_stat',stat:'ampSwitches',n:10},  xp:900,  credits:450},
  {id:'the_switcher_3', family:'The Switcher', symbol:'⚡', color:'#ab47bc', cat:'Battle', tier:'III', name:'The Switcher III', desc:'Switch Amp effects 30 times',  req:{type:'battle_stat',stat:'ampSwitches',n:30},  xp:2800, credits:1400},
  {id:'the_switcher_4', family:'The Switcher', symbol:'⚡', color:'#ab47bc', cat:'Battle', tier:'IV',  name:'The Switcher IV',  desc:'Switch Amp effects 75 times',  req:{type:'battle_stat',stat:'ampSwitches',n:75},  xp:7000, credits:3500},
  {id:'the_switcher_5', family:'The Switcher', symbol:'⚡', color:'#ab47bc', cat:'Battle', tier:'V',   name:'The Switcher V',   desc:'Switch Amp effects 150 times', req:{type:'battle_stat',stat:'ampSwitches',n:150}, xp:18000,credits:9000},

  // ── Ability Mastery ────────────────────────────────────────────────────────

  {id:'ability_activated_1', family:'Ability Activated', symbol:'✦', color:'#ab47bc', cat:'Battle', tier:'I',   name:'Ability Activated I',   desc:'1 ability activation',      req:{type:'battle_stat',stat:'abilityActivations',n:1},    xp:100,  credits:50},
  {id:'ability_activated_2', family:'Ability Activated', symbol:'✦', color:'#ab47bc', cat:'Battle', tier:'II',  name:'Ability Activated II',  desc:'50 ability activations',    req:{type:'battle_stat',stat:'abilityActivations',n:50},   xp:400,  credits:200},
  {id:'ability_activated_3', family:'Ability Activated', symbol:'✦', color:'#ab47bc', cat:'Battle', tier:'III', name:'Ability Activated III', desc:'200 ability activations',   req:{type:'battle_stat',stat:'abilityActivations',n:200},  xp:1500, credits:750},
  {id:'ability_activated_4', family:'Ability Activated', symbol:'✦', color:'#ab47bc', cat:'Battle', tier:'IV',  name:'Ability Activated IV',  desc:'500 ability activations',   req:{type:'battle_stat',stat:'abilityActivations',n:500},  xp:4000, credits:2000},
  {id:'ability_activated_5', family:'Ability Activated', symbol:'✦', color:'#ab47bc', cat:'Battle', tier:'V',   name:'Ability Activated V',   desc:'1000 ability activations',  req:{type:'battle_stat',stat:'abilityActivations',n:1000}, xp:10000,credits:5000},

  {id:'second_chance_1', family:'Second Chance', symbol:'✦', color:'#4fc3f7', cat:'Battle', tier:'I',   name:'Second Chance I',   desc:'Survive a killing blow via Second Wind or Last Stand', req:{type:'battle_stat',stat:'secondChanceSurvivals',n:1},  xp:400,  credits:200},
  {id:'second_chance_2', family:'Second Chance', symbol:'✦', color:'#4fc3f7', cat:'Battle', tier:'II',  name:'Second Chance II',  desc:'5 Second Chance survivals',  req:{type:'battle_stat',stat:'secondChanceSurvivals',n:5},  xp:1200, credits:600},
  {id:'second_chance_3', family:'Second Chance', symbol:'✦', color:'#4fc3f7', cat:'Battle', tier:'III', name:'Second Chance III', desc:'20 Second Chance survivals', req:{type:'battle_stat',stat:'secondChanceSurvivals',n:20}, xp:3500, credits:1750},
  {id:'second_chance_4', family:'Second Chance', symbol:'✦', color:'#4fc3f7', cat:'Battle', tier:'IV',  name:'Second Chance IV',  desc:'60 Second Chance survivals', req:{type:'battle_stat',stat:'secondChanceSurvivals',n:60}, xp:8000, credits:4000},
  {id:'second_chance_5', family:'Second Chance', symbol:'✦', color:'#4fc3f7', cat:'Battle', tier:'V',   name:'Second Chance V',   desc:'150 Second Chance survivals',req:{type:'battle_stat',stat:'secondChanceSurvivals',n:150},xp:20000,credits:10000},

  {id:'executioner_1', family:'Executioner', symbol:'✦', color:'#f44336', cat:'Battle', tier:'I',   name:'Executioner I',   desc:'Land 1 Execute kill (opponent below 25% HP)',   req:{type:'battle_stat',stat:'executionerKills',n:1},   xp:300,  credits:150},
  {id:'executioner_2', family:'Executioner', symbol:'✦', color:'#f44336', cat:'Battle', tier:'II',  name:'Executioner II',  desc:'15 Execute kills',  req:{type:'battle_stat',stat:'executionerKills',n:15},  xp:900,  credits:450},
  {id:'executioner_3', family:'Executioner', symbol:'✦', color:'#f44336', cat:'Battle', tier:'III', name:'Executioner III', desc:'50 Execute kills',  req:{type:'battle_stat',stat:'executionerKills',n:50},  xp:2800, credits:1400},
  {id:'executioner_4', family:'Executioner', symbol:'✦', color:'#f44336', cat:'Battle', tier:'IV',  name:'Executioner IV',  desc:'150 Execute kills', req:{type:'battle_stat',stat:'executionerKills',n:150}, xp:7000, credits:3500},
  {id:'executioner_5', family:'Executioner', symbol:'✦', color:'#f44336', cat:'Battle', tier:'V',   name:'Executioner V',   desc:'400 Execute kills', req:{type:'battle_stat',stat:'executionerKills',n:400}, xp:18000,credits:9000},

  {id:'unstoppable_force_1', family:'Unstoppable Force', symbol:'✦', color:'#ff5722', cat:'Battle', tier:'I',   name:'Unstoppable Force I',   desc:'Win a battle with a Juggernaut card at +50% damage', req:{type:'battle_stat',stat:'juggernauts50Wins',n:1},  xp:500,  credits:250},
  {id:'unstoppable_force_2', family:'Unstoppable Force', symbol:'✦', color:'#ff5722', cat:'Battle', tier:'II',  name:'Unstoppable Force II',  desc:'5 Juggernaut +50% wins',  req:{type:'battle_stat',stat:'juggernauts50Wins',n:5},  xp:1500, credits:750},
  {id:'unstoppable_force_3', family:'Unstoppable Force', symbol:'✦', color:'#ff5722', cat:'Battle', tier:'III', name:'Unstoppable Force III', desc:'20 Juggernaut +50% wins', req:{type:'battle_stat',stat:'juggernauts50Wins',n:20}, xp:4500, credits:2250},
  {id:'unstoppable_force_4', family:'Unstoppable Force', symbol:'✦', color:'#ff5722', cat:'Battle', tier:'IV',  name:'Unstoppable Force IV',  desc:'60 Juggernaut +50% wins', req:{type:'battle_stat',stat:'juggernauts50Wins',n:60}, xp:10000,credits:5000},
  {id:'unstoppable_force_5', family:'Unstoppable Force', symbol:'✦', color:'#ff5722', cat:'Battle', tier:'V',   name:'Unstoppable Force V',   desc:'150 Juggernaut +50% wins',req:{type:'battle_stat',stat:'juggernauts50Wins',n:150},xp:25000,credits:12500},

  // ── Legendary Lock ─────────────────────────────────────────────────────────

  {id:'legendary_unleashed_1', family:'Legendary Unleashed', symbol:'★', color:'#ffd700', cat:'Battle', tier:'I',   name:'Legendary Unleashed I',   desc:'Play a Legendary after lifting the lock', req:{type:'battle_stat',stat:'legendaryUnleashed',n:1},   xp:400,  credits:200},
  {id:'legendary_unleashed_2', family:'Legendary Unleashed', symbol:'★', color:'#ffd700', cat:'Battle', tier:'II',  name:'Legendary Unleashed II',  desc:'Unleash a Legendary 10 times',  req:{type:'battle_stat',stat:'legendaryUnleashed',n:10},  xp:1200, credits:600},
  {id:'legendary_unleashed_3', family:'Legendary Unleashed', symbol:'★', color:'#ffd700', cat:'Battle', tier:'III', name:'Legendary Unleashed III', desc:'Unleash a Legendary 50 times',  req:{type:'battle_stat',stat:'legendaryUnleashed',n:50},  xp:3500, credits:1750},
  {id:'legendary_unleashed_4', family:'Legendary Unleashed', symbol:'★', color:'#ffd700', cat:'Battle', tier:'IV',  name:'Legendary Unleashed IV',  desc:'Unleash a Legendary 150 times', req:{type:'battle_stat',stat:'legendaryUnleashed',n:150}, xp:8000, credits:4000},
  {id:'legendary_unleashed_5', family:'Legendary Unleashed', symbol:'★', color:'#ffd700', cat:'Battle', tier:'V',   name:'Legendary Unleashed V',   desc:'Unleash a Legendary 400 times', req:{type:'battle_stat',stat:'legendaryUnleashed',n:400}, xp:20000,credits:10000},

  {id:'lock_breaker_1', family:'Lock Breaker', symbol:'★', color:'#ff9800', cat:'Battle', tier:'I',   name:'Lock Breaker I',   desc:'Defeat 3 opponent cards to lift the Legendary Lock', req:{type:'battle_stat',stat:'lockBreakerCount',n:1},   xp:400,  credits:200},
  {id:'lock_breaker_2', family:'Lock Breaker', symbol:'★', color:'#ff9800', cat:'Battle', tier:'II',  name:'Lock Breaker II',  desc:'Lift the lock 15 times',  req:{type:'battle_stat',stat:'lockBreakerCount',n:15},  xp:1200, credits:600},
  {id:'lock_breaker_3', family:'Lock Breaker', symbol:'★', color:'#ff9800', cat:'Battle', tier:'III', name:'Lock Breaker III', desc:'Lift the lock 75 times',  req:{type:'battle_stat',stat:'lockBreakerCount',n:75},  xp:3500, credits:1750},
  {id:'lock_breaker_4', family:'Lock Breaker', symbol:'★', color:'#ff9800', cat:'Battle', tier:'IV',  name:'Lock Breaker IV',  desc:'Lift the lock 250 times', req:{type:'battle_stat',stat:'lockBreakerCount',n:250}, xp:8000, credits:4000},
  {id:'lock_breaker_5', family:'Lock Breaker', symbol:'★', color:'#ff9800', cat:'Battle', tier:'V',   name:'Lock Breaker V',   desc:'Lift the lock 600 times', req:{type:'battle_stat',stat:'lockBreakerCount',n:600}, xp:20000,credits:10000},

  {id:'legendary_victor_1', family:'Legendary Victor', symbol:'★', color:'#ffa726', cat:'Battle', tier:'I',   name:'Legendary Victor I',   desc:'Win a battle using a Legendary card', req:{type:'battle_stat',stat:'legendaryVictorWins',n:1},   xp:600,  credits:300},
  {id:'legendary_victor_2', family:'Legendary Victor', symbol:'★', color:'#ffa726', cat:'Battle', tier:'II',  name:'Legendary Victor II',  desc:'10 Legendary Victor wins',  req:{type:'battle_stat',stat:'legendaryVictorWins',n:10},  xp:1800, credits:900},
  {id:'legendary_victor_3', family:'Legendary Victor', symbol:'★', color:'#ffa726', cat:'Battle', tier:'III', name:'Legendary Victor III', desc:'50 Legendary Victor wins',  req:{type:'battle_stat',stat:'legendaryVictorWins',n:50},  xp:5000, credits:2500},
  {id:'legendary_victor_4', family:'Legendary Victor', symbol:'★', color:'#ffa726', cat:'Battle', tier:'IV',  name:'Legendary Victor IV',  desc:'200 Legendary Victor wins', req:{type:'battle_stat',stat:'legendaryVictorWins',n:200}, xp:12000,credits:6000},
  {id:'legendary_victor_5', family:'Legendary Victor', symbol:'★', color:'#ffa726', cat:'Battle', tier:'V',   name:'Legendary Victor V',   desc:'500 Legendary Victor wins', req:{type:'battle_stat',stat:'legendaryVictorWins',n:500}, xp:30000,credits:15000},

  // ── Special Achievements (Tier I only, earned once) ────────────────────────

  {id:'perfect_battle_1', family:'Perfect Battle', symbol:'◆', color:'#00e676', cat:'Battle', tier:'I', name:'Perfect Battle', desc:'Win without any of your cards reaching 0 stamina', req:{type:'battle_stat',stat:'perfectBattles',n:1}, xp:1500, credits:750},
  {id:'the_comeback_1', family:'The Comeback', symbol:'◆', color:'#4fc3f7', cat:'Battle', tier:'I', name:'The Comeback', desc:'Win with your last card -- hand and deck both empty', req:{type:'battle_stat',stat:'comebackWins',n:1}, xp:1500, credits:750},
  {id:'survivor_1', family:'Survivor', symbol:'◆', color:'#f44336', cat:'Battle', tier:'I', name:'Survivor', desc:'Win a battle where your last card survived at 1 HP via Last Stand', req:{type:'battle_stat',stat:'survivorWins',n:1}, xp:2000, credits:1000},
  {id:'amp_race_1', family:'Amp Race', symbol:'◆', color:'#ffd700', cat:'Battle', tier:'I', name:'Amp Race', desc:"Trigger Amp in the same round the opponent's meter also hit 100", req:{type:'battle_stat',stat:'ampRaceTriggers',n:1}, xp:2000, credits:1000},
  {id:'tie_breaker_1', family:'Tie Breaker', symbol:'◆', color:'#78909c', cat:'Battle', tier:'I', name:'Tie Breaker', desc:'Play a battle that ends in a Tie', req:{type:'battle_stat',stat:'tieBattles',n:1}, xp:1000, credits:500},
];

// All unique family names in display order
export const ACHIEVEMENT_FAMILIES = [
  'Card Collector', 'Pack Rat', 'Uncommon Ground', 'Rare Find',
  'Epic Discovery', 'Legendary Hoard', 'Rising Star', 'Merchant',
  'Big Spender', 'Hero Path', 'Villain Path', 'Anti-Hero Path',
  'Type Master', 'Pack Master',
  'Battle Victor', 'Giant Killer', 'Win Streak', 'Champion', 'Battles Fought',
  'Type Advantage', 'Cosmic Clash', 'Against All Odds',
  'Heavy Hitter', 'Iron Will', 'Well Rested',
  'Amped Up', 'Photo Finish', 'Battlefield Control', 'The Switcher',
  'Ability Activated', 'Second Chance', 'Executioner', 'Unstoppable Force',
  'Legendary Unleashed', 'Lock Breaker', 'Legendary Victor',
  'Perfect Battle', 'The Comeback', 'Survivor', 'Amp Race', 'Tie Breaker',
];
