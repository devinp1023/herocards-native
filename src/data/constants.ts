// ── Rarity config ──────────────────────────────────────────────────
export interface RarityConfig {
  color: string;
  glow: string;
  chance: number;
  grad: string;
  border: string;
}

export const RC: Record<string, RarityConfig> = {
  Common:   {color:'#b0b8c8',glow:'#9e9e9e44',chance:50,  grad:'linear-gradient(160deg,#1e2130 0%,#252a3a 50%,#1a1e2c 100%)',border:'#4a5068'},
  Uncommon: {color:'#5ddb6a',glow:'#4caf5044',chance:27.5,grad:'linear-gradient(160deg,#0d1f12 0%,#132b1a 50%,#0a1a0f 100%)',border:'#2d7a3a'},
  Rare:     {color:'#5ab4ff',glow:'#2196f344',chance:15,  grad:'linear-gradient(160deg,#0a1628 0%,#0f2040 50%,#081220 100%)',border:'#1e5fa8'},
  Epic:     {color:'#cc6dff',glow:'#9c27b044',chance:5,   grad:'linear-gradient(160deg,#180d28 0%,#241038 50%,#130920 100%)',border:'#6a1fa0'},
  Legendary:{color:'#ffc04a',glow:'#ff980055',chance:2.5, grad:'linear-gradient(160deg,#241200 0%,#3a1e00 50%,#1e0f00 100%)',border:'#b06000'},
};

// Sort order: Legendary first
export const RO: Record<string, number> = {Legendary:0,Epic:1,Rare:2,Uncommon:3,Common:4};

// ── Economy ────────────────────────────────────────────────────────
export const PACK_COST = 100;

export const DUPE_CREDITS: Record<string, number> = {
  Common:5, Uncommon:12, Rare:25, Epic:60, Legendary:150,
};

// ── XP ─────────────────────────────────────────────────────────────
export const XP_THRESHOLDS: number[] = [0,150,424,885,1591,2596,3953,5713,7924,10633,13887,17732,22212,27371,33251,39896,47347,55646,64833,74949,86034,98128,111269,125496,140848,157363,175079,194033,214263,235806,258698,282976,308676,335833,364484,394665,426410,459755,494735,531384,569738,609830,651695,695367,740880,788268,837564,888802,942015,997236,1054499,1113836,1175280,1238864,1304620,1372581,1442779,1515246,1590015,1667117,1746584,1828448,1912740,1999492,2088736,2180503,2274824,2371730,2471252,2573422,2678270,2785827,2896123,3009189,3125056,3243754,3365314,3489766,3617140,3747466,3880774,4017094,4156456,4298890,4444426,4593093,4744921,4899939,5058177,5219665,5384431,5552505,5723917,5898695,6076868,6258466,6443517,6632050,6824095,7019679];

export const XP_AWARDS: Record<string, number> = {
  pack:100, rare_card:25, daily:50, trade:10,
};

// ── Type colours ────────────────────────────────────────────────────
export const TYPE_COLORS: Record<string, string> = {
  Speedster:   '#ffe600',
  Brainiac:    '#ff007f',
  Blaster:     '#ff3300',
  Tank:        '#546e7a',
  Healer:      '#00e676',
  Stealth:     '#311b92',
  Elemental:   '#00b0ff',
  Tech:        '#00e5ff',
  Mystic:      '#ea80fc',
  Brawler:     '#ff6d00',
  Flier:       '#2979ff',
  Shapeshifter:'#76ff03',
  Cosmic:      '#ffd740',
  Alien:       '#69f0ae',
  Gadgets:     '#ff4081',
};

// ── Battle deck limits ──────────────────────────────────────────────
export const BATTLE_RARITY_LIMITS: Record<string, number> = {
  Legendary:1, Epic:2, Rare:4, Uncommon:10, Common:10,
};

export const DECK_SIZE = 10;

// ── Starting credits ────────────────────────────────────────────────
export const STARTING_CREDITS = 350;

// ── Battle cooldowns ─────────────────────────────────────────────────
// Only Legendary and Epic cards go on cooldown after battle.
export const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function hasBattleCooldown(rarity: string): boolean {
  return rarity === 'Legendary' || rarity === 'Epic';
}
export function isCardOnCooldown(cardId: number, cooldowns: Record<number, number>): boolean {
  const ts = cooldowns[cardId];
  return ts ? Date.now() - ts < COOLDOWN_MS : false;
}
export function cooldownRemaining(cardId: number, cooldowns: Record<number, number>): number {
  const ts = cooldowns[cardId];
  if (!ts) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - ts));
}
export function formatCooldown(ms: number): string {
  if (ms <= 0) return 'Ready';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Battle rewards per tier ──────────────────────────────────────────
export const BATTLE_REWARDS: Record<number, { winCredits: number; winXp: number; lossCredits: number; lossXp: number }> = {
  1: { winCredits: 50,  winXp: 100, lossCredits: 10, lossXp: 25 },
  2: { winCredits: 100, winXp: 150, lossCredits: 15, lossXp: 35 },
  3: { winCredits: 200, winXp: 250, lossCredits: 20, lossXp: 50 },
  4: { winCredits: 350, winXp: 375, lossCredits: 30, lossXp: 75 },
  5: { winCredits: 600, winXp: 500, lossCredits: 50, lossXp: 100 },
};

// ── AI deck composition per tier ─────────────────────────────────────
export const AI_DECK_COMP: Record<number, Record<string, number>> = {
  1: { Common:10, Uncommon:0,  Rare:0, Epic:0, Legendary:0 },
  2: { Common:6,  Uncommon:4,  Rare:0, Epic:0, Legendary:0 },
  3: { Common:3,  Uncommon:4,  Rare:3, Epic:0, Legendary:0 },
  4: { Common:2,  Uncommon:3,  Rare:3, Epic:2, Legendary:0 },
  5: { Common:1,  Uncommon:1,  Rare:2, Epic:3, Legendary:3 },
};

// ── Opponent tier info (symbols instead of emoji for Hermes) ─────────
export interface TierInfo {
  tier: number;
  name: string;
  symbol: string;
  color: string;
  difficulty: number;   // 1–5 filled difficulty dots
  description: string;
}
export const TIER_INFO: TierInfo[] = [
  { tier:1, name:'Rookie',   symbol:'○', color:'#78909c', difficulty:1, description:'A brand-new trainer running a random collection. Great for testing your deck.' },
  { tier:2, name:'Scrapper', symbol:'✦', color:'#66bb6a', difficulty:2, description:'A scrappy fighter who plays fast and loose with common and uncommon cards.' },
  { tier:3, name:'Fighter',  symbol:'▲', color:'#42a5f5', difficulty:3, description:'A seasoned duelist with a balanced deck and a few rare tricks up their sleeve.' },
  { tier:4, name:'Elite',    symbol:'◆', color:'#ab47bc', difficulty:4, description:'An elite challenger running powerful epic combinations. Expect a real fight.' },
  { tier:5, name:'Champion', symbol:'★', color:'#ffa726', difficulty:5, description:'The reigning champion. Runs legendary cards and counters everything.' },
];
