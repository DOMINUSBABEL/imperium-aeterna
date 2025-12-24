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
  EGYPT = 'EGYPT', // Ptolemaic
  PARTHIA = 'PARTHIA',
  IBERIA = 'IBERIA',
  BRITANNIA = 'BRITANNIA',
  GERMANIA = 'GERMANIA',
  REBELS = 'REBELS'
}

export enum TechCategory {
  MILITARY = 'MILITARY',
  ECONOMIC = 'ECONOMIC',
  ADMIN = 'ADMIN'
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: TechCategory;
  prerequisiteId: string | null;
  effect: (faction: Faction) => void; // Description of effect handled in logic
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
  leaderName: string; // New: For the UI
  group: 'ROMAN' | 'PUNIC' | 'HELLENIC' | 'BARBARIAN' | 'EASTERN';
  color: string;
  textColor: string;
  gold: number;
  manpower: number;
  stability: number; // 0-100
  isPlayer: boolean;
  desc: string;
  unlockedTechs: string[];
  traits: RoguelikeTrait[]; // Roguelike elements
  images: {
    leader: string;
    background: string;
  };
}

export interface Unit {
  id: string;
  type: 'INFANTRY' | 'CAVALRY' | 'ARCHER';
  hp: number;
  maxHp: number;
  damage: number;
  ownerId: FactionId;
}

export interface Province {
  id: string;
  name: string;
  x: number; // For SVG map
  y: number; // For SVG map
  ownerId: FactionId;
  neighbors: string[]; // Array of Province IDs
  resourceValue: number; // Gold per turn
  manpowerValue: number; // Manpower per turn
  defenseBonus: number;
  troops: Unit[];
  hasRebellionRisk: boolean;
  currentConstruction?: {
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
  moveSourceId: string | null; // For relocation logic
  logs: string[];
  activeBattle: BattleState | null;
  loadingAI: boolean; 
  modalMessage: { title: string; body: string } | null;
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