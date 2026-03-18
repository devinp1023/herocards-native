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
  emoji: string;
  name: string;
  tier: string;
  unlocksAt?: number;
}

export const LEVEL_AVATARS: LevelAvatar[] = [{"id": "lv5", "emoji": "🌟", "name": "Star Seeker", "tier": "LevelUp", "unlocksAt": 5}, {"id": "lv10", "emoji": "🏆", "name": "Champion", "tier": "LevelUp", "unlocksAt": 10}, {"id": "lv15", "emoji": "🦁", "name": "Lionheart", "tier": "LevelUp", "unlocksAt": 15}, {"id": "lv20", "emoji": "🐲", "name": "Elder Drake", "tier": "LevelUp", "unlocksAt": 20}, {"id": "lv25", "emoji": "⚔️", "name": "Bladewarden", "tier": "LevelUp", "unlocksAt": 25}, {"id": "lv30", "emoji": "🌌", "name": "Void Walker", "tier": "LevelUp", "unlocksAt": 30}, {"id": "lv35", "emoji": "🧬", "name": "Gene Wraith", "tier": "LevelUp", "unlocksAt": 35}, {"id": "lv40", "emoji": "🌪️", "name": "Storm Rider", "tier": "LevelUp", "unlocksAt": 40}, {"id": "lv45", "emoji": "💫", "name": "Comet", "tier": "LevelUp", "unlocksAt": 45}, {"id": "lv50", "emoji": "🔱", "name": "Trident Lord", "tier": "LevelUp", "unlocksAt": 50}, {"id": "lv55", "emoji": "🌠", "name": "Starfall", "tier": "LevelUp", "unlocksAt": 55}, {"id": "lv60", "emoji": "🦋", "name": "Metamorph", "tier": "LevelUp", "unlocksAt": 60}, {"id": "lv65", "emoji": "🗡️", "name": "Shadowblade", "tier": "LevelUp", "unlocksAt": 65}, {"id": "lv70", "emoji": "🌈", "name": "Prism", "tier": "LevelUp", "unlocksAt": 70}, {"id": "lv75", "emoji": "🔮", "name": "Oracle", "tier": "LevelUp", "unlocksAt": 75}, {"id": "lv80", "emoji": "🌊", "name": "Tide Sovereign", "tier": "LevelUp", "unlocksAt": 80}, {"id": "lv85", "emoji": "☄️", "name": "Comet Lord", "tier": "LevelUp", "unlocksAt": 85}, {"id": "lv90", "emoji": "🦄", "name": "Ascendant", "tier": "LevelUp", "unlocksAt": 90}, {"id": "lv95", "emoji": "🌺", "name": "Eternal Bloom", "tier": "LevelUp", "unlocksAt": 95}, {"id": "lv100", "emoji": "👁️", "name": "The All-Seeing", "tier": "LevelUp", "unlocksAt": 100}];
