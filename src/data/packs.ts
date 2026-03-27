export interface Pack {
  id: number;
  name: string;
  subtitle: string;
  icon: string;   // MaterialCommunityIcons name (was emoji)
  color: string;
  glow: string;
  grad: string;
}

export const PACKS: Record<number, Pack> = {
  1:{id:1,name:"Infinite Waves",subtitle:"Heroes of the open ocean and sky",icon:"water",color:"#4fc3f7",glow:"#4fc3f744",grad:"linear-gradient(135deg,#0a1628,#0f2a40)"},
  2:{id:2,name:"Shrouded Mysteries",subtitle:"Shadows, secrets and arcane power",icon:"moon-waning-crescent",color:"#cc6dff",glow:"#cc6dff44",grad:"linear-gradient(135deg,#180d28,#2a1040)"},
};

// ── Purchaseable avatars ──────────────────────────────────────────────────────
export interface PurchasableAvatar {
  id: string;
  symbol: string;   // Unicode symbol — no emoji, renders on Hermes
  color: string;    // accent color for avatar ring + symbol
  name: string;
  tier: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  price: number;    // in credits
}

export const AVATAR_TIER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Common:    { color: '#9e9e9e', bg: '#9e9e9e18', border: '#9e9e9e44' },
  Rare:      { color: '#2196f3', bg: '#2196f318', border: '#2196f344' },
  Epic:      { color: '#cc6dff', bg: '#cc6dff18', border: '#cc6dff44' },
  Legendary: { color: '#ff9800', bg: '#ff980018', border: '#ff980044' },
  LevelUp:   { color: '#00e676', bg: '#00e67618', border: '#00e67644' },
};

export const AVATARS: PurchasableAvatar[] = [
  // Common — 200 credits
  { id: 'a1',  symbol: 'θ', color: '#cc6dff', name: 'Mystic Elder',    tier: 'Common',    price: 200  },
  { id: 'a2',  symbol: 'Λ', color: '#607d8b', name: 'Iron Bot',        tier: 'Common',    price: 200  },
  { id: 'a3',  symbol: 'ξ', color: '#7a7a8a', name: 'Undead One',      tier: 'Common',    price: 200  },
  { id: 'a4',  symbol: 'δ', color: '#78909c', name: 'Wolfpack',        tier: 'Common',    price: 200  },
  { id: 'a5',  symbol: 'σ', color: '#ff8c00', name: 'Fox Spirit',      tier: 'Common',    price: 200  },
  { id: 'a6',  symbol: 'Γ', color: '#43a047', name: 'Young Drake',     tier: 'Common',    price: 200  },
  // Rare — 500 credits
  { id: 'a7',  symbol: 'Δ', color: '#2196f3', name: 'The Hero',        tier: 'Rare',      price: 500  },
  { id: 'a8',  symbol: 'Σ', color: '#ef5350', name: 'The Villain',     tier: 'Rare',      price: 500  },
  { id: 'a9',  symbol: 'β', color: '#7c3aed', name: 'Night Lord',      tier: 'Rare',      price: 500  },
  { id: 'a10', symbol: '∞', color: '#4fc3f7', name: 'Sea Sovereign',   tier: 'Rare',      price: 500  },
  { id: 'a11', symbol: 'μ', color: '#00e676', name: 'Forest Warden',   tier: 'Rare',      price: 500  },
  { id: 'a12', symbol: 'ν', color: '#ffd700', name: 'Sky Stalker',     tier: 'Rare',      price: 500  },
  // Epic — 1200 credits
  { id: 'a13', symbol: 'Π', color: '#ff6d00', name: 'Inferno',         tier: 'Epic',      price: 1200 },
  { id: 'a14', symbol: 'Ξ', color: '#ffc400', name: 'Stormcaller',     tier: 'Epic',      price: 1200 },
  { id: 'a15', symbol: 'Υ', color: '#00e5ff', name: 'Tidal Force',     tier: 'Epic',      price: 1200 },
  { id: 'a16', symbol: 'χ', color: '#9c27b0', name: 'Shadow Wraith',   tier: 'Epic',      price: 1200 },
  // Legendary — 3000 credits
  { id: 'a17', symbol: 'Θ', color: '#ff9800', name: 'The Sovereign',   tier: 'Legendary', price: 3000 },
  { id: 'a18', symbol: 'Ω', color: '#ef5350', name: 'Death Incarnate', tier: 'Legendary', price: 3000 },
];

// ── Level-up avatars ──────────────────────────────────────────────────────────
export interface LevelAvatar {
  id: string;
  symbol: string;   // Unicode symbol — no emoji, renders on Hermes
  color: string;    // accent color for the avatar ring + symbol
  name: string;
  tier: string;
  unlocksAt?: number;
}

export const LEVEL_AVATARS: LevelAvatar[] = [
  { id: 'lv5',   symbol: '★',  color: '#ffd700', name: 'Star Seeker',    tier: 'LevelUp', unlocksAt: 5   },
  { id: 'lv10',  symbol: '◆',  color: '#ff9800', name: 'Champion',       tier: 'LevelUp', unlocksAt: 10  },
  { id: 'lv15',  symbol: '▲',  color: '#ffb300', name: 'Lionheart',      tier: 'LevelUp', unlocksAt: 15  },
  { id: 'lv20',  symbol: '◉',  color: '#ff4060', name: 'Elder Drake',    tier: 'LevelUp', unlocksAt: 20  },
  { id: 'lv25',  symbol: '✦',  color: '#c0c8dc', name: 'Bladewarden',    tier: 'LevelUp', unlocksAt: 25  },
  { id: 'lv30',  symbol: 'ψ',  color: '#cc6dff', name: 'Void Walker',    tier: 'LevelUp', unlocksAt: 30  },
  { id: 'lv35',  symbol: '✶',  color: '#00e676', name: 'Gene Wraith',    tier: 'LevelUp', unlocksAt: 35  },
  { id: 'lv40',  symbol: '◇',  color: '#4fc3f7', name: 'Storm Rider',    tier: 'LevelUp', unlocksAt: 40  },
  { id: 'lv45',  symbol: '✧',  color: '#ffe040', name: 'Comet',          tier: 'LevelUp', unlocksAt: 45  },
  { id: 'lv50',  symbol: 'Ψ',  color: '#00e5ff', name: 'Trident Lord',   tier: 'LevelUp', unlocksAt: 50  },
  { id: 'lv55',  symbol: '✴',  color: '#ffc400', name: 'Starfall',       tier: 'LevelUp', unlocksAt: 55  },
  { id: 'lv60',  symbol: '◑',  color: '#e040fb', name: 'Metamorph',      tier: 'LevelUp', unlocksAt: 60  },
  { id: 'lv65',  symbol: '◈',  color: '#8890b0', name: 'Shadowblade',    tier: 'LevelUp', unlocksAt: 65  },
  { id: 'lv70',  symbol: 'Φ',  color: '#00bcd4', name: 'Prism',          tier: 'LevelUp', unlocksAt: 70  },
  { id: 'lv75',  symbol: '◎',  color: '#7c3aed', name: 'Oracle',         tier: 'LevelUp', unlocksAt: 75  },
  { id: 'lv80',  symbol: '≈',  color: '#1e88e5', name: 'Tide Sovereign', tier: 'LevelUp', unlocksAt: 80  },
  { id: 'lv85',  symbol: '✸',  color: '#ff6b00', name: 'Comet Lord',     tier: 'LevelUp', unlocksAt: 85  },
  { id: 'lv90',  symbol: 'Ω',  color: '#ffd700', name: 'Ascendant',      tier: 'LevelUp', unlocksAt: 90  },
  { id: 'lv95',  symbol: '✿',  color: '#ff4081', name: 'Eternal Bloom',  tier: 'LevelUp', unlocksAt: 95  },
  { id: 'lv100', symbol: '●',  color: '#ffffff', name: 'The All-Seeing', tier: 'LevelUp', unlocksAt: 100 },
];
