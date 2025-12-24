export enum Phase {
  MAIN_MENU = 'MAIN_MENU',
  CAMPAIGN = 'CAMPAIGN',
  TECH_TREE = 'TECH_TREE',
  BATTLE = 'BATTLE',
  GAME_OVER = 'GAME_OVER'
}

export enum FactionId {
  ROME = 'ROME',
  CARTHAGE = 'CARTHAGE',
  MACEDON = 'MACEDON',
  GAUL = 'GAUL',
  EGYPT = 'EGYPT',
  PARTHIA = 'PARTHIA',
  IBERIA = 'IBERIA',
  BRITANNIA = 'BRITANNIA',
  GERMANIA = 'GERMANIA',
  REBELS = 'REBELS',
  NEUTRAL = 'NEUTRAL'
}

export enum MapMode {
  POLITICAL = 'POLITICAL',
  TERRAIN = 'TERRAIN',
  ECONOMY = 'ECONOMY'
}

export enum TechCategory {
  MILITARY = 'MILITARY',
  ECONOMIC = 'ECONOMIC',
  ADMIN = 'ADMIN'
}

export enum TerrainType {
  PLAINS = 'PLAINS',
  FOREST = 'FOREST',
  HILLS = 'HILLS',
  DESERT = 'DESERT',
  MOUNTAIN = 'MOUNTAIN'
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: TechCategory;
  prerequisiteId: string | null;
  effect: (faction: Faction) => void;
  image: string;
}

export interface RoguelikeTrait {
  id: string;
  name: string;
  description: string;
  effectType: 'GOLD_MOD' | 'MANPOWER_MOD' | 'COMBAT_MOD' | 'STABILITY_MOD';
  value: number;
}

export interface Faction {
  id: FactionId;
  name: string;
  leaderName: string; 
  group: 'ROMAN' | 'PUNIC' | 'HELLENIC' | 'BARBARIAN' | 'EASTERN' | 'NEUTRAL';
  color: string;
  textColor: string;
  gold: number;
  manpower: number;
  stability: number; // 0-100
  isPlayer: boolean;
  desc: string;
  unlockedTechs: string[];
  traits: RoguelikeTrait[]; 
  images: {
    leader: string;
    background: string;
  };
}

export type UnitType = 'INFANTRY' | 'CAVALRY' | 'ARCHER' | 'MILITIA';

export interface Unit {
  id: string;
  type: UnitType;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  ownerId: FactionId;
}

export interface Building {
  id: string;
  name: string;
  cost: number;
  turnsToBuild: number;
  description: string;
  icon: string;
  effect: {
    gold?: number;
    manpower?: number;
    stability?: number;
    defense?: number;
  };
}

export interface Decree {
  id: string;
  name: string;
  description: string;
  costPerTurn: number; // Can be negative for income
  effectDescription: string;
}

export interface Province {
  id: string;
  name: string;
  x: number; 
  y: number; 
  ownerId: FactionId;
  neighbors: string[]; 
  resourceValue: number; // Base Gold
  manpowerValue: number; // Base Manpower
  defenseBonus: number;
  terrain: TerrainType; // New terrain property
  troops: Unit[];
  buildings: string[]; // Array of Building IDs
  activeDecreeId: string | null;
  hasRebellionRisk: boolean;
  currentConstruction?: {
    buildingId: string;
    name: string;
    progress: number;
    total: number;
  };
}

export interface GameState {
  turn: number;
  year: number;
  phase: Phase;
  playerFactionId: FactionId | null;
  factions: Record<FactionId, Faction>;
  provinces: Province[];
  selectedProvinceId: string | null;
  moveSourceId: string | null; 
  logs: string[];
  activeBattle: BattleState | null;
  loadingAI: boolean; 
  modalMessage: { title: string; body: string; image?: string } | null;
  isPaused: boolean; // For in-game menu
  mapMode: MapMode;
}

export interface BattleState {
  attackerId: FactionId;
  defenderId: FactionId;
  provinceId: string;
  attackerUnits: Unit[];
  defenderUnits: Unit[];
  round: number;
  logs: string[];
  winner: FactionId | null;
}