// Daily quests — ported from web data.js
// getTodaysQuests() returns 3 deterministic quests (Easy/Medium/Hard)
// seeded by today's date so every user gets the same 3 quests each day.

export interface Quest {
  id: string;
  diff: 'Easy' | 'Medium' | 'Hard';
  symbol: string;  // Unicode symbol — renders on Hermes
  color: string;   // accent color for the symbol
  task: string;
  req: {
    type: 'packs' | 'login' | 'trades' | 'newcards' | 'rarity' | 'alliance' | 'types'
        | 'battle_win' | 'battle_type_advantage_win' | 'battle_reach_amp' | 'battle_heavy_attacks'
        | 'battle_trigger_amp' | 'battle_lift_lock' | 'battle_type_kills'
        | 'battle_rest_then_kill' | 'battle_ability_activations'
        | 'battle_win_tier5' | 'battle_amp_effects' | 'battle_legendary_win'
        | 'battle_type_disadvantage_win' | 'battle_stamina_saver' | 'battle_stamina_zero_win';
    rarity?: string;
    alliance?: string;
    n: number;
  };
  xp: number;
  credits: number;
}

export const DAILY_QUESTS: Quest[] = [
  {id:'q_open1',    diff:'Easy',   symbol:'▣', color:'#ff9800', task:'Open 1 pack',                   req:{type:'packs',n:1},                    xp:80,  credits:60},
  {id:'q_daily',    diff:'Easy',   symbol:'★', color:'#ffd700', task:'Log in today',                  req:{type:'login',n:1},                    xp:50,  credits:40},
  {id:'q_trade1',   diff:'Easy',   symbol:'≈', color:'#4caf50', task:'Trade 1 duplicate',             req:{type:'trades',n:1},                   xp:60,  credits:50},
  {id:'q_collect3', diff:'Easy',   symbol:'◈', color:'#00FFAA', task:'Collect 3 new cards',           req:{type:'newcards',n:3},                 xp:70,  credits:55},
  {id:'q_uncommon', diff:'Easy',   symbol:'◉', color:'#4caf50', task:'Get 1 Uncommon card',           req:{type:'rarity',rarity:'Uncommon',n:1}, xp:60,  credits:50},
  {id:'q_battle_type_adv',     diff:'Easy',   symbol:'◇', color:'#cc6dff', task:'Win 1 battle with a type advantage final kill',       req:{type:'battle_type_advantage_win',n:1}, xp:80,  credits:60},
  {id:'q_battle_stamina_saver',diff:'Easy',   symbol:'◈', color:'#3aadad', task:'Complete a battle with any card at 8+ stamina',       req:{type:'battle_stamina_saver',n:1},       xp:70,  credits:55},
  {id:'q_battle_reach_amp',    diff:'Easy',   symbol:'⚡', color:'#ffd700', task:'Reach 100 Amp in any battle',                        req:{type:'battle_reach_amp',n:1},           xp:80,  credits:65},
  {id:'q_battle_heavy3',       diff:'Easy',   symbol:'⚔', color:'#e8445a', task:'Land 3 Heavy attacks in a single battle',            req:{type:'battle_heavy_attacks',n:3},       xp:75,  credits:60},
  {id:'q_open3',    diff:'Medium', symbol:'▣', color:'#ff9800', task:'Open 3 packs',                  req:{type:'packs',n:3},                    xp:180, credits:140},
  {id:'q_rare',     diff:'Medium', symbol:'◉', color:'#2196f3', task:'Collect 1 Rare card',           req:{type:'rarity',rarity:'Rare',n:1},     xp:200, credits:150},
  {id:'q_trade3',   diff:'Medium', symbol:'≈', color:'#4caf50', task:'Trade 3 duplicates',            req:{type:'trades',n:3},                   xp:160, credits:120},
  {id:'q_collect10',diff:'Medium', symbol:'◈', color:'#00FFAA', task:'Collect 10 new cards',          req:{type:'newcards',n:10},                xp:200, credits:150},
  {id:'q_alliance', diff:'Medium', symbol:'▲', color:'#00FFAA', task:'Get 2 Hero alliance cards',     req:{type:'alliance',alliance:'Hero',n:2}, xp:180, credits:130},
  {id:'q_villain',  diff:'Medium', symbol:'✦', color:'#f44336', task:'Get 2 Villain alliance cards',  req:{type:'alliance',alliance:'Villain',n:2},xp:180,credits:130},
  {id:'q_battle_trigger_amp',  diff:'Medium', symbol:'⚡', color:'#ffd700', task:'Successfully trigger Amp in a battle',                         req:{type:'battle_trigger_amp',n:1},        xp:180, credits:140},
  {id:'q_battle_lift_lock',    diff:'Medium', symbol:'★', color:'#ff9800', task:'Defeat 3 opponent cards to lift the Legendary Lock',            req:{type:'battle_lift_lock',n:1},          xp:200, credits:150},
  {id:'q_battle_type_tourist', diff:'Medium', symbol:'◇', color:'#cc6dff', task:'Deal final kills with 3 different card types today',            req:{type:'battle_type_kills',n:3},         xp:180, credits:140},
  {id:'q_battle_rest_kill',    diff:'Medium', symbol:'◈', color:'#4caf50', task:'Defeat an opponent the round after using Rest',                  req:{type:'battle_rest_then_kill',n:1},     xp:170, credits:130},
  {id:'q_battle_ability5',     diff:'Medium', symbol:'✦', color:'#ab47bc', task:'Have 5 ability activations across your battles today',          req:{type:'battle_ability_activations',n:5},xp:190, credits:145},
  {id:'q_open5',    diff:'Hard',   symbol:'▣', color:'#ff9800', task:'Open 5 packs',                  req:{type:'packs',n:5},                    xp:400, credits:300},
  {id:'q_epic',     diff:'Hard',   symbol:'◉', color:'#cc6dff', task:'Collect 1 Epic card',           req:{type:'rarity',rarity:'Epic',n:1},     xp:500, credits:400},
  {id:'q_trade5',   diff:'Hard',   symbol:'≈', color:'#4caf50', task:'Trade 5 duplicates',            req:{type:'trades',n:5},                   xp:350, credits:280},
  {id:'q_newtype',  diff:'Hard',   symbol:'◇', color:'#cc6dff', task:'Collect cards of 3 diff types', req:{type:'types',n:3},                    xp:450, credits:350},
  {id:'q_legendary',diff:'Hard',   symbol:'◉', color:'#ff9800', task:'Collect 1 Legendary card',      req:{type:'rarity',rarity:'Legendary',n:1},xp:1000,credits:800},
  {id:'q_battle_tier5',          diff:'Hard',   symbol:'★', color:'#ffa726', task:'Win a Tier 5 Champion battle',                                    req:{type:'battle_win_tier5',n:1},          xp:500, credits:400},
  {id:'q_battle_amp_effects',    diff:'Hard',   symbol:'⚡', color:'#ffd700', task:'Trigger or experience 3 different Amp effects today',             req:{type:'battle_amp_effects',n:3},        xp:450, credits:350},
  {id:'q_battle_legendary_win',  diff:'Hard',   symbol:'◉', color:'#ff9800', task:'Win a battle using a Legendary card (lock lifted first)',          req:{type:'battle_legendary_win',n:1},      xp:600, credits:500},
  {id:'q_battle_odds',           diff:'Hard',   symbol:'▲', color:'#f44336', task:'Win a battle where your opening card had a type disadvantage',     req:{type:'battle_type_disadvantage_win',n:1},xp:500,credits:400},
];

// Returns today's 3 quests (1 Easy, 1 Medium, 1 Hard) seeded by date.
// Same algorithm as web version — same quests across all users each day.
export function getTodaysQuests(): Quest[] {
  const today = new Date();
  const seed   = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const seededRand = (n: number, offset = 0) =>
    Math.floor((((seed + offset) * 9301 + 49297) % 233280) / 233280 * n);

  const easy   = DAILY_QUESTS.filter(q => q.diff === 'Easy');
  const medium = DAILY_QUESTS.filter(q => q.diff === 'Medium');
  const hard   = DAILY_QUESTS.filter(q => q.diff === 'Hard');

  return [
    easy[seededRand(easy.length, 0)],
    medium[seededRand(medium.length, 1)],
    hard[seededRand(hard.length, 2)],
  ];
}

export const DIFF_COLOR: Record<string, string> = {
  Easy:   '#4caf50',
  Medium: '#ff9800',
  Hard:   '#f44336',
};
