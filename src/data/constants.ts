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
