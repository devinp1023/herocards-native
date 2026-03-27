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
export const MAX_SAVED_DECKS = 5;

export const DUPE_CREDITS: Record<string, number> = {
  Common:5, Uncommon:12, Rare:25, Epic:60, Legendary:150,
};

// ── XP ─────────────────────────────────────────────────────────────
export const XP_THRESHOLDS: number[] = [0,150,424,885,1591,2596,3953,5713,7924,10633,13887,17732,22212,27371,33251,39896,47347,55646,64833,74949,86034,98128,111269,125496,140848,157363,175079,194033,214263,235806,258698,282976,308676,335833,364484,394665,426410,459755,494735,531384,569738,609830,651695,695367,740880,788268,837564,888802,942015,997236,1054499,1113836,1175280,1238864,1304620,1372581,1442779,1515246,1590015,1667117,1746584,1828448,1912740,1999492,2088736,2180503,2274824,2371730,2471252,2573422,2678270,2785827,2896123,3009189,3125056,3243754,3365314,3489766,3617140,3747466,3880774,4017094,4156456,4298890,4444426,4593093,4744921,4899939,5058177,5219665,5384431,5552505,5723917,5898695,6076868,6258466,6443517,6632050,6824095,7019679];

export const XP_AWARDS: Record<string, number> = {
  pack:100, rare_card:25, daily:50, trade:10,
};

// ── Type colours (v2 — 9 types) ─────────────────────────────────────
export interface TypeMeta {
  primary: string;
  bg: string;      // deep dark tint for card body
  mid: string;     // slightly lighter for art window bg
}

export const TYPE_COLORS: Record<string, string> = {
  Blaster:   '#FF5722',  // deep orange
  Magic:     '#9C27B0',  // purple
  Psychic:   '#E91E63',  // pink
  Shadow:    '#546E7A',  // blue-grey
  Tank:      '#78909C',  // steel grey
  Speedster: '#FFC107',  // amber
  Nature:    '#4CAF50',  // green
  Tech:      '#00BCD4',  // cyan
  Cosmic:    '#5C35CC',  // deep violet (rare)
};

export const TYPE_META: Record<string, TypeMeta> = {
  Blaster:   { primary: '#FF5722', bg: '#1e0808', mid: '#3d1508' },
  Magic:     { primary: '#9C27B0', bg: '#110618', mid: '#210830' },
  Psychic:   { primary: '#E91E63', bg: '#1e0612', mid: '#35081e' },
  Shadow:    { primary: '#546E7A', bg: '#06061a', mid: '#0c1520' },
  Tank:      { primary: '#78909C', bg: '#060c14', mid: '#0e1620' },
  Speedster: { primary: '#FFC107', bg: '#141000', mid: '#2d1e00' },
  Nature:    { primary: '#4CAF50', bg: '#06120a', mid: '#0a1e0c' },
  Tech:      { primary: '#00BCD4', bg: '#040c12', mid: '#041418' },
  Cosmic:    { primary: '#5C35CC', bg: '#0e0820', mid: '#150830' },
};

// ── Rarity visual meta ──────────────────────────────────────────────
export const RARITY_META: Record<string, { color: string; shimmer: boolean }> = {
  Common:    { color: '#9CA3AF', shimmer: false },
  Uncommon:  { color: '#34D399', shimmer: true },
  Rare:      { color: '#60A5FA', shimmer: true },
  Epic:      { color: '#A78BFA', shimmer: true  },
  Legendary: { color: '#FBBF24', shimmer: true  },
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
  5: { Common:0,  Uncommon:1,  Rare:3, Epic:4, Legendary:2 },
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

// ── Achievement categories (Career skill tree) ──────────────────────
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'collector',    label: 'COLLECTOR',        icon: 'cards',          color: '#4FC3F7', description: 'Card gathering and set completion' },
  { id: 'progression',  label: 'PROGRESSION',      icon: 'arrow-up-bold',  color: '#FBBF24', description: 'Leveling, economy, and allegiance' },
  { id: 'combat',       label: 'COMBAT',           icon: 'sword-cross',    color: '#F87171', description: 'Core battle performance' },
  { id: 'strategy',     label: 'STRATEGY',         icon: 'chess-knight',   color: '#60A5FA', description: 'Type mastery, resilience, and Legendary Lock' },
  { id: 'amp',          label: 'AMP & ABILITIES',  icon: 'lightning-bolt', color: '#A78BFA', description: 'Amp system and ability-specific feats' },
  { id: 'feats',        label: 'FEATS',            icon: 'trophy',         color: '#34D399', description: 'Rare one-off achievements' },
] as const;

export type AchievementCategoryId = typeof ACHIEVEMENT_CATEGORIES[number]['id'];
