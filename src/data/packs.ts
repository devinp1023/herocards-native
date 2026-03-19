export interface Pack {
  id: number;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  glow: string;
  grad: string;
}

export const PACKS: Record<number, Pack> = {
  1:{id:1,name:"Infinite Waves",subtitle:"Heroes of the open ocean and sky",emoji:"🌊",color:"#4fc3f7",glow:"#4fc3f744",grad:"linear-gradient(135deg,#0a1628,#0f2a40)"},
  2:{id:2,name:"Shrouded Mysteries",subtitle:"Shadows, secrets and arcane power",emoji:"🌑",color:"#cc6dff",glow:"#cc6dff44",grad:"linear-gradient(135deg,#180d28,#2a1040)"},
};

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
