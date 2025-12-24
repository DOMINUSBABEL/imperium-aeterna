import { Faction, FactionId, Province, Technology, TechCategory, RoguelikeTrait, Building, Decree, Unit, UnitType, TerrainType } from './types';

const GEN_URL = "https://image.pollinations.ai/prompt";

// --- BUILDINGS ---
export const BUILDINGS: Record<string, Building> = {
  'market': {
    id: 'market', name: 'Grand Market', cost: 150, turnsToBuild: 3, description: 'Increases tax revenue.',
    icon: '⚖️', effect: { gold: 5 }
  },
  'barracks': {
    id: 'barracks', name: 'Legion Barracks', cost: 200, turnsToBuild: 4, description: 'Improves recruitment speed and manpower.',
    icon: '⚔️', effect: { manpower: 10 }
  },
  'walls': {
    id: 'walls', name: 'Stone Walls', cost: 300, turnsToBuild: 5, description: 'Significant defense bonus against sieges.',
    icon: '🏰', effect: { defense: 2 }
  },
  'temple': {
    id: 'temple', name: 'Temple of Jupiter', cost: 250, turnsToBuild: 4, description: 'Increases public order and stability.',
    icon: '🏛️', effect: { stability: 5 }
  },
  'roads': {
    id: 'roads', name: 'Paved Roads', cost: 100, turnsToBuild: 2, description: 'Small commerce boost.',
    icon: '🛤️', effect: { gold: 2 }
  }
};

// --- DECREES ---
export const DECREES: Record<string, Decree> = {
  'games': { id: 'games', name: 'Bread & Circuses', description: 'Host games to appease the mob.', costPerTurn: 10, effectDescription: '+10% Stability' },
  'taxes': { id: 'taxes', name: 'War Taxes', description: 'Extract maximum value from the province.', costPerTurn: -15, effectDescription: '-10% Stability, +15 Gold' }, // Negative cost = gain
  'levies': { id: 'levies', name: 'Emergency Levies', description: 'Force conscription.', costPerTurn: 0, effectDescription: '+20 Manpower, -5% Stability' },
};

// --- UNIT ROSTER ---
export const UNIT_TYPES: Record<UnitType, { name: string, cost: number, manpower: number, hp: number, damage: number }> = {
  'INFANTRY': { name: 'Heavy Infantry', cost: 50, manpower: 100, hp: 100, damage: 15 },
  'ARCHER': { name: 'Archer Cohort', cost: 40, manpower: 60, hp: 60, damage: 20 },
  'CAVALRY': { name: 'Equites Cavalry', cost: 90, manpower: 80, hp: 120, damage: 25 },
  'MILITIA': { name: 'Local Militia', cost: 0, manpower: 0, hp: 50, damage: 5 }, // AI/Neutral only mostly
};

// --- ROGUELIKE TRAITS ---
export const ROGUELIKE_TRAITS: RoguelikeTrait[] = [
  { id: 'wealthy_patrons', name: 'Wealthy Patrons', description: '+15% Gold Income', effectType: 'GOLD_MOD', value: 0.15 },
  { id: 'fertile_lands', name: 'Fertile Lands', description: '+20% Manpower Growth', effectType: 'MANPOWER_MOD', value: 0.20 },
  { id: 'warrior_culture', name: 'Warrior Culture', description: '+10% Combat Effectiveness', effectType: 'COMBAT_MOD', value: 1.1 },
  { id: 'iron_fist', name: 'Iron Fist', description: 'Stability degrades slower', effectType: 'STABILITY_MOD', value: 2 },
  { id: 'plague_survivors', name: 'Plague Survivors', description: '-10% Manpower, +10 Stability', effectType: 'MANPOWER_MOD', value: -0.10 },
  { id: 'corrupt_senate', name: 'Corrupt Senate', description: '-10% Gold, +10% Combat', effectType: 'GOLD_MOD', value: -0.10 },
  { id: 'naval_tradition', name: 'Naval Tradition', description: 'Trade routes yield more gold', effectType: 'GOLD_MOD', value: 0.10 },
  { id: 'barbarian_heritage', name: 'Barbarian Heritage', description: 'Units are cheaper but less disciplined', effectType: 'COMBAT_MOD', value: 0.9 },
];

// --- TECH TREES ---

const ROMAN_TECH: Technology[] = [
  // MILITARY
  { id: 'r_m1', name: 'Manipular System', description: 'Flexible legion organization. +10% Defense.', cost: 200, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/roman%20legion%20formation%20manipular?width=300&height=200&nologo=true` },
  { id: 'r_m2', name: 'Fortified Camps', description: 'Armies heal faster in enemy territory.', cost: 400, category: TechCategory.MILITARY, prerequisiteId: 'r_m1', effect: () => {}, image: `${GEN_URL}/roman%20castra%20camp%20fortification?width=300&height=200&nologo=true` },
  { id: 'r_m3', name: 'Marian Reforms', description: 'Professional army. High upkeep, massive stats.', cost: 800, category: TechCategory.MILITARY, prerequisiteId: 'r_m2', effect: () => {}, image: `${GEN_URL}/marian%20reforms%20legionary%20armor?width=300&height=200&nologo=true` },
  // ECO
  { id: 'r_e1', name: 'Roman Roads', description: 'Improved movement and commerce.', cost: 150, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/ancient%20roman%20road%20appian%20way?width=300&height=200&nologo=true` },
  { id: 'r_e2', name: 'Denarius Coinage', description: 'Standardized currency reduces corruption.', cost: 300, category: TechCategory.ECONOMIC, prerequisiteId: 'r_e1', effect: () => {}, image: `${GEN_URL}/roman%20silver%20coins%20mint?width=300&height=200&nologo=true` },
  { id: 'r_e3', name: 'Concrete', description: 'Building infrastructure is cheaper.', cost: 600, category: TechCategory.ECONOMIC, prerequisiteId: 'r_e2', effect: () => {}, image: `${GEN_URL}/roman%20pantheon%20construction%20concrete?width=300&height=200&nologo=true` },
  // ADMIN
  { id: 'r_a1', name: 'Latin Rights', description: 'Easier integration of conquered people.', cost: 200, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/roman%20citizenship%20scroll?width=300&height=200&nologo=true` },
  { id: 'r_a2', name: 'Cursus Honorum', description: 'Formalized political career ladder.', cost: 400, category: TechCategory.ADMIN, prerequisiteId: 'r_a1', effect: () => {}, image: `${GEN_URL}/roman%20senate%20debate?width=300&height=200&nologo=true` },
];

const SHARED_TECH: Technology[] = [
    { id: 'g_m1', name: 'Iron Weapons', description: 'Basic iron working.', cost: 200, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/blacksmith%20forging%20sword%20ancient?width=300&height=200&nologo=true` },
    { id: 'g_e1', name: 'Trade Hubs', description: 'Marketplaces.', cost: 200, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/ancient%20market%20bazaar?width=300&height=200&nologo=true` },
    { id: 'g_a1', name: 'Code of Laws', description: 'Written laws.', cost: 200, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {}, image: `${GEN_URL}/stone%20tablet%20laws?width=300&height=200&nologo=true` },
];

export const TECH_TREES: Record<string, Technology[]> = {
  'ROMAN': ROMAN_TECH,
  'PUNIC': SHARED_TECH,
  'HELLENIC': SHARED_TECH,
  'BARBARIAN': SHARED_TECH,
  'EASTERN': SHARED_TECH,
  'NEUTRAL': []
};

// --- DATA ---

export const INITIAL_FACTIONS: Record<FactionId, Faction> = {
  [FactionId.ROME]: {
    id: FactionId.ROME, name: 'Rome', leaderName: 'Augustus', group: 'ROMAN', color: '#b91c1c', textColor: '#fee2e2', gold: 200, manpower: 1000, stability: 80, isPlayer: false, desc: 'Disciplined legions and diverse administration.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/portrait%20of%20roman%20emperor%20augustus%20statue%20marble%20dramatic%20lighting%20dark%20background%20strategy%20game%20art?width=512&height=512&nologo=true`, background: `${GEN_URL}/roman%20forum%20ancient%20city%20sunset%20digital%20art?width=800&height=600&nologo=true` }
  },
  [FactionId.CARTHAGE]: {
    id: FactionId.CARTHAGE, name: 'Carthage', leaderName: 'Hannibal', group: 'PUNIC', color: '#e5e5e5', textColor: '#1c1917', gold: 400, manpower: 600, stability: 70, isPlayer: false, desc: 'Masters of trade and naval warfare.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/portrait%20of%20hannibal%20barca%20carthage%20general%20rugged%20beard%20armor%20cinematic%20lighting?width=512&height=512&nologo=true`, background: `${GEN_URL}/carthage%20harbor%20ancient%20ships%20digital%20art?width=800&height=600&nologo=true` }
  },
  [FactionId.MACEDON]: {
    id: FactionId.MACEDON, name: 'Macedon', leaderName: 'Philip V', group: 'HELLENIC', color: '#1e3a8a', textColor: '#dbeafe', gold: 150, manpower: 800, stability: 60, isPlayer: false, desc: 'Heirs of Alexander with pike phalanxes.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/greek%20king%20philip%20macedon%20helmet%20golden%20armor%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/greek%20phalanx%20formation%20battlefield?width=800&height=600&nologo=true` }
  },
  [FactionId.GAUL]: {
    id: FactionId.GAUL, name: 'Gaul', leaderName: 'Vercingetorix', group: 'BARBARIAN', color: '#15803d', textColor: '#dcfce7', gold: 50, manpower: 1500, stability: 40, isPlayer: false, desc: 'Fierce warriors spread across Europa.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/vercingetorix%20gaul%20chieftain%20long%20hair%20mustache%20celtic%20tattoos%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/celtic%20forest%20village%20misty?width=800&height=600&nologo=true` }
  },
  [FactionId.EGYPT]: {
    id: FactionId.EGYPT, name: 'Egypt', leaderName: 'Cleopatra', group: 'HELLENIC', color: '#eab308', textColor: '#422006', gold: 500, manpower: 500, stability: 65, isPlayer: false, desc: 'Ancient riches and hellenic culture.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/cleopatra%20egypt%20queen%20golden%20crown%20makeup%20beautiful%20portrait%20cinematic?width=512&height=512&nologo=true`, background: `${GEN_URL}/pyramids%20of%20giza%20nile%20river%20ancient?width=800&height=600&nologo=true` }
  },
  [FactionId.PARTHIA]: {
    id: FactionId.PARTHIA, name: 'Parthia', leaderName: 'Mithridates', group: 'EASTERN', color: '#7e22ce', textColor: '#f3e8ff', gold: 200, manpower: 800, stability: 55, isPlayer: false, desc: 'Masters of horse archery from the East.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/parthian%20king%20eastern%20armor%20crown%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/desert%20cavalry%20charge%20parthian?width=800&height=600&nologo=true` }
  },
  [FactionId.IBERIA]: {
    id: FactionId.IBERIA, name: 'Iberia', leaderName: 'Indibilis', group: 'BARBARIAN', color: '#c2410c', textColor: '#ffedd5', gold: 80, manpower: 900, stability: 45, isPlayer: false, desc: 'Resilient warriors of the peninsula.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/iberian%20warrior%20chief%20falcata%20sword%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/spanish%20hills%20ancient%20fort?width=800&height=600&nologo=true` }
  },
  [FactionId.BRITANNIA]: {
    id: FactionId.BRITANNIA, name: 'Britannia', leaderName: 'Cassivellaunus', group: 'BARBARIAN', color: '#0f766e', textColor: '#ccfbf1', gold: 40, manpower: 800, stability: 40, isPlayer: false, desc: 'Isolated tribes with painted warriors.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/celtic%20briton%20king%20woad%20paint%20chariot%20background%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/stonehenge%20misty%20morning?width=800&height=600&nologo=true` }
  },
  [FactionId.GERMANIA]: {
    id: FactionId.GERMANIA, name: 'Germania', leaderName: 'Arminius', group: 'BARBARIAN', color: '#3f3f46', textColor: '#e4e4e7', gold: 30, manpower: 1200, stability: 35, isPlayer: false, desc: 'Untamed forests and terrifying raids.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/germanic%20barbarian%20arminius%20forest%20portrait?width=512&height=512&nologo=true`, background: `${GEN_URL}/teutoburg%20forest%20dark%20ancient?width=800&height=600&nologo=true` }
  },
  [FactionId.NEUTRAL]: {
    id: FactionId.NEUTRAL, name: 'Independent', leaderName: 'Local Governor', group: 'NEUTRAL', color: '#57534e', textColor: '#d6d3d1', gold: 0, manpower: 0, stability: 50, isPlayer: false, desc: 'Independent city-states and tribes.', unlockedTechs: [], traits: [],
    images: { leader: `${GEN_URL}/roman%20senator%20statue%20neutral%20grey?width=512&height=512&nologo=true`, background: '' }
  },
  [FactionId.REBELS]: {
    id: FactionId.REBELS, name: 'Rebels', leaderName: 'Spartacus', group: 'BARBARIAN', color: '#000000', textColor: '#ef4444', gold: 0, manpower: 0, stability: 0, isPlayer: false, desc: 'Those who oppose the ruling order.', unlockedTechs: [], traits: [],
    images: { leader: '', background: '' }
  }
};

export const INITIAL_PROVINCES: Province[] = [
  // --- BRITANNIA & GAUL (Forests/Hills) ---
  { id: 'p_caledonia', name: 'Caledonia', x: 340, y: 100, ownerId: FactionId.NEUTRAL, neighbors: ['p_britannia_n'], resourceValue: 5, manpowerValue: 40, defenseBonus: 2, terrain: TerrainType.HILLS, troops: [{id:'m1', type:'MILITIA', name: 'Tribal Militia', hp:50, maxHp:50, damage:5, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_britannia_n', name: 'Eboracum', x: 360, y: 140, ownerId: FactionId.BRITANNIA, neighbors: ['p_caledonia', 'p_britannia_s', 'p_hibernia'], resourceValue: 8, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_hibernia', name: 'Hibernia', x: 290, y: 150, ownerId: FactionId.NEUTRAL, neighbors: ['p_britannia_n'], resourceValue: 4, manpowerValue: 30, defenseBonus: 1, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_britannia_s', name: 'Londinium', x: 370, y: 190, ownerId: FactionId.BRITANNIA, neighbors: ['p_britannia_n', 'p_belgica', 'p_lugdunensis'], resourceValue: 12, manpowerValue: 70, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  
  { id: 'p_lugdunensis', name: 'Lugdunensis', x: 350, y: 240, ownerId: FactionId.GAUL, neighbors: ['p_britannia_s', 'p_belgica', 'p_aquitania', 'p_gallia_comata'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_belgica', name: 'Belgica', x: 410, y: 220, ownerId: FactionId.GAUL, neighbors: ['p_britannia_s', 'p_lugdunensis', 'p_germania_inf', 'p_gallia_comata'], resourceValue: 10, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_gallia_comata', name: 'Gallia Comata', x: 390, y: 270, ownerId: FactionId.GAUL, neighbors: ['p_belgica', 'p_lugdunensis', 'p_aquitania', 'p_transalpina', 'p_germania_sup'], resourceValue: 8, manpowerValue: 90, defenseBonus: 0, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_aquitania', name: 'Aquitania', x: 330, y: 310, ownerId: FactionId.GAUL, neighbors: ['p_lugdunensis', 'p_gallia_comata', 'p_narbonensis', 'p_tarraconensis'], resourceValue: 8, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_transalpina', name: 'Transalpina', x: 420, y: 310, ownerId: FactionId.GAUL, neighbors: ['p_gallia_comata', 'p_germania_sup', 'p_cisalpina', 'p_narbonensis'], resourceValue: 10, manpowerValue: 70, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_narbonensis', name: 'Narbonensis', x: 380, y: 350, ownerId: FactionId.ROME, neighbors: ['p_aquitania', 'p_transalpina', 'p_tarraconensis'], resourceValue: 15, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- HISPANIA (Hills/Desert) ---
  { id: 'p_tarraconensis', name: 'Tarraconensis', x: 300, y: 360, ownerId: FactionId.IBERIA, neighbors: ['p_aquitania', 'p_narbonensis', 'p_lusitania', 'p_carthaginensis'], resourceValue: 12, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_lusitania', name: 'Lusitania', x: 220, y: 380, ownerId: FactionId.IBERIA, neighbors: ['p_tarraconensis', 'p_baetica'], resourceValue: 8, manpowerValue: 50, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_carthaginensis', name: 'Carthaginensis', x: 290, y: 400, ownerId: FactionId.IBERIA, neighbors: ['p_tarraconensis', 'p_baetica'], resourceValue: 10, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_baetica', name: 'Baetica', x: 250, y: 430, ownerId: FactionId.NEUTRAL, neighbors: ['p_lusitania', 'p_carthaginensis', 'p_tingitana'], resourceValue: 15, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [{id:'m2', type:'MILITIA', name: 'City Watch', hp:60, maxHp:60, damage:5, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- GERMANIA & CENTRAL EU (Deep Forest/Mountains) ---
  { id: 'p_germania_inf', name: 'Germania Inf.', x: 450, y: 200, ownerId: FactionId.GERMANIA, neighbors: ['p_belgica', 'p_germania_magna'], resourceValue: 6, manpowerValue: 70, defenseBonus: 1, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_germania_magna', name: 'Germania Magna', x: 500, y: 210, ownerId: FactionId.GERMANIA, neighbors: ['p_germania_inf', 'p_germania_sup', 'p_sarmatia'], resourceValue: 6, manpowerValue: 100, defenseBonus: 2, terrain: TerrainType.FOREST, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_germania_sup', name: 'Germania Sup.', x: 460, y: 260, ownerId: FactionId.GERMANIA, neighbors: ['p_germania_magna', 'p_gallia_comata', 'p_transalpina', 'p_raetia'], resourceValue: 6, manpowerValue: 60, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_raetia', name: 'Raetia', x: 490, y: 290, ownerId: FactionId.NEUTRAL, neighbors: ['p_germania_sup', 'p_cisalpina', 'p_noricum'], resourceValue: 5, manpowerValue: 40, defenseBonus: 2, terrain: TerrainType.MOUNTAIN, troops: [{id:'m3', type:'MILITIA', name: 'Hill Tribes', hp:50, maxHp:50, damage:5, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_noricum', name: 'Noricum', x: 530, y: 290, ownerId: FactionId.NEUTRAL, neighbors: ['p_raetia', 'p_pannonia', 'p_cisalpina'], resourceValue: 8, manpowerValue: 40, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_pannonia', name: 'Pannonia', x: 570, y: 300, ownerId: FactionId.NEUTRAL, neighbors: ['p_noricum', 'p_illyria', 'p_dacia'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- ITALIA (Plains/Hills) ---
  { id: 'p_cisalpina', name: 'Cisalpina', x: 480, y: 320, ownerId: FactionId.ROME, neighbors: ['p_transalpina', 'p_raetia', 'p_noricum', 'p_illyria', 'p_etruria'], resourceValue: 15, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_etruria', name: 'Etruria', x: 490, y: 360, ownerId: FactionId.ROME, neighbors: ['p_cisalpina', 'p_roma', 'p_sardinia'], resourceValue: 12, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_roma', name: 'Roma', x: 510, y: 390, ownerId: FactionId.ROME, neighbors: ['p_etruria', 'p_campania', 'p_samnium'], resourceValue: 30, manpowerValue: 120, defenseBonus: 3, terrain: TerrainType.PLAINS, troops: [], buildings: ['market'], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_samnium', name: 'Samnium', x: 530, y: 380, ownerId: FactionId.ROME, neighbors: ['p_roma', 'p_campania', 'p_apulia'], resourceValue: 8, manpowerValue: 50, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_campania', name: 'Campania', x: 520, y: 400, ownerId: FactionId.ROME, neighbors: ['p_roma', 'p_samnium'], resourceValue: 12, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_apulia', name: 'Apulia', x: 550, y: 390, ownerId: FactionId.ROME, neighbors: ['p_samnium', 'p_calabria'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_calabria', name: 'Calabria', x: 560, y: 410, ownerId: FactionId.ROME, neighbors: ['p_apulia', 'p_sicily'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  
  // --- ISLANDS ---
  { id: 'p_corsica', name: 'Corsica', x: 460, y: 380, ownerId: FactionId.NEUTRAL, neighbors: ['p_sardinia'], resourceValue: 5, manpowerValue: 20, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_sardinia', name: 'Sardinia', x: 450, y: 410, ownerId: FactionId.CARTHAGE, neighbors: ['p_corsica', 'p_carthage'], resourceValue: 8, manpowerValue: 30, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_sicily', name: 'Sicilia', x: 520, y: 450, ownerId: FactionId.CARTHAGE, neighbors: ['p_calabria', 'p_carthage', 'p_syracuse'], resourceValue: 15, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_syracuse', name: 'Syracuse', x: 540, y: 460, ownerId: FactionId.NEUTRAL, neighbors: ['p_sicily'], resourceValue: 12, manpowerValue: 40, defenseBonus: 2, terrain: TerrainType.PLAINS, troops: [{id:'m_syr', type:'MILITIA', name: 'Syracusan Guard', hp:80, maxHp:80, damage:8, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- AFRICA (Desert/Plains) ---
  { id: 'p_tingitana', name: 'Mauretania Ting.', x: 260, y: 470, ownerId: FactionId.NEUTRAL, neighbors: ['p_baetica', 'p_mauretania_caes'], resourceValue: 6, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_mauretania_caes', name: 'Mauretania Caes.', x: 320, y: 470, ownerId: FactionId.NEUTRAL, neighbors: ['p_tingitana', 'p_numidia'], resourceValue: 8, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_numidia', name: 'Numidia', x: 380, y: 480, ownerId: FactionId.CARTHAGE, neighbors: ['p_mauretania_caes', 'p_carthage'], resourceValue: 10, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_carthage', name: 'Carthago', x: 440, y: 470, ownerId: FactionId.CARTHAGE, neighbors: ['p_numidia', 'p_tripolitania', 'p_sicily'], resourceValue: 25, manpowerValue: 100, defenseBonus: 2, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_tripolitania', name: 'Tripolitania', x: 500, y: 510, ownerId: FactionId.CARTHAGE, neighbors: ['p_carthage', 'p_cyrenaica'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_cyrenaica', name: 'Cyrenaica', x: 600, y: 500, ownerId: FactionId.EGYPT, neighbors: ['p_tripolitania', 'p_aegyptus', 'p_crete'], resourceValue: 10, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  
  // --- BALKANS & GREECE (Mountains/Hills) ---
  { id: 'p_illyria', name: 'Illyria', x: 560, y: 340, ownerId: FactionId.NEUTRAL, neighbors: ['p_cisalpina', 'p_pannonia', 'p_dalmatia'], resourceValue: 6, manpowerValue: 50, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [{id:'m_ill', type:'MILITIA', name: 'Illyrian Pirates', hp:60, maxHp:60, damage:5, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_dalmatia', name: 'Dalmatia', x: 580, y: 360, ownerId: FactionId.MACEDON, neighbors: ['p_illyria', 'p_moesia', 'p_macedonia'], resourceValue: 8, manpowerValue: 40, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_dacia', name: 'Dacia', x: 620, y: 280, ownerId: FactionId.NEUTRAL, neighbors: ['p_pannonia', 'p_moesia', 'p_sarmatia'], resourceValue: 10, manpowerValue: 80, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [{id:'m_dac', type:'MILITIA', name: 'Dacian Falxmen', hp:70, maxHp:70, damage:6, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_moesia', name: 'Moesia', x: 610, y: 330, ownerId: FactionId.MACEDON, neighbors: ['p_dalmatia', 'p_dacia', 'p_thrace', 'p_macedonia'], resourceValue: 8, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_macedonia', name: 'Macedonia', x: 600, y: 380, ownerId: FactionId.MACEDON, neighbors: ['p_dalmatia', 'p_moesia', 'p_thrace', 'p_thessaly'], resourceValue: 15, manpowerValue: 90, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_thrace', name: 'Thrace', x: 650, y: 350, ownerId: FactionId.MACEDON, neighbors: ['p_moesia', 'p_macedonia', 'p_asia'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_thessaly', name: 'Thessaly', x: 610, y: 400, ownerId: FactionId.MACEDON, neighbors: ['p_macedonia', 'p_attica', 'p_epirus'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_epirus', name: 'Epirus', x: 590, y: 390, ownerId: FactionId.MACEDON, neighbors: ['p_thessaly'], resourceValue: 6, manpowerValue: 30, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_attica', name: 'Attica', x: 620, y: 420, ownerId: FactionId.NEUTRAL, neighbors: ['p_thessaly', 'p_peloponnese'], resourceValue: 20, manpowerValue: 60, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [{id:'m_ath', type:'MILITIA', name: 'Athenian Hoplites', hp:80, maxHp:80, damage:8, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_peloponnese', name: 'Peloponnese', x: 610, y: 440, ownerId: FactionId.NEUTRAL, neighbors: ['p_attica'], resourceValue: 12, manpowerValue: 50, defenseBonus: 2, terrain: TerrainType.MOUNTAIN, troops: [{id:'m_spa', type:'MILITIA', name: 'Spartan Remnant', hp:90, maxHp:90, damage:10, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_crete', name: 'Crete', x: 630, y: 470, ownerId: FactionId.NEUTRAL, neighbors: ['p_peloponnese', 'p_cyrenaica'], resourceValue: 8, manpowerValue: 30, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- EASTERN EUROPE (Plains) ---
  { id: 'p_sarmatia', name: 'Sarmatia', x: 680, y: 220, ownerId: FactionId.NEUTRAL, neighbors: ['p_germania_magna', 'p_dacia', 'p_scythia'], resourceValue: 5, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_scythia', name: 'Scythia', x: 750, y: 230, ownerId: FactionId.NEUTRAL, neighbors: ['p_sarmatia', 'p_colchis'], resourceValue: 5, manpowerValue: 100, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },

  // --- ASIA MINOR (Hills/Mountains) ---
  { id: 'p_asia', name: 'Asia', x: 700, y: 400, ownerId: FactionId.NEUTRAL, neighbors: ['p_thrace', 'p_bithynia', 'p_lycia'], resourceValue: 20, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [{id:'m_per', type:'MILITIA', name: 'Pergamon Guard', hp:60, maxHp:60, damage:5, ownerId:FactionId.NEUTRAL}], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_bithynia', name: 'Bithynia', x: 720, y: 360, ownerId: FactionId.NEUTRAL, neighbors: ['p_asia', 'p_galatia', 'p_pontus'], resourceValue: 10, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_lycia', name: 'Lycia', x: 710, y: 430, ownerId: FactionId.NEUTRAL, neighbors: ['p_asia', 'p_galatia', 'p_cilicia'], resourceValue: 8, manpowerValue: 30, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_galatia', name: 'Galatia', x: 750, y: 390, ownerId: FactionId.NEUTRAL, neighbors: ['p_bithynia', 'p_lycia', 'p_pontus', 'p_cappadocia'], resourceValue: 8, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_pontus', name: 'Pontus', x: 770, y: 350, ownerId: FactionId.PARTHIA, neighbors: ['p_bithynia', 'p_galatia', 'p_armenia'], resourceValue: 12, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_cappadocia', name: 'Cappadocia', x: 780, y: 400, ownerId: FactionId.PARTHIA, neighbors: ['p_galatia', 'p_cilicia', 'p_armenia', 'p_syria'], resourceValue: 10, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_cilicia', name: 'Cilicia', x: 760, y: 430, ownerId: FactionId.PARTHIA, neighbors: ['p_lycia', 'p_cappadocia', 'p_syria', 'p_cyprus'], resourceValue: 10, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_cyprus', name: 'Cyprus', x: 740, y: 460, ownerId: FactionId.EGYPT, neighbors: ['p_cilicia', 'p_syria'], resourceValue: 8, manpowerValue: 20, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  
  // --- NEAR EAST & EGYPT (Desert/Plains) ---
  { id: 'p_armenia', name: 'Armenia', x: 830, y: 360, ownerId: FactionId.PARTHIA, neighbors: ['p_pontus', 'p_cappadocia', 'p_colchis', 'p_media', 'p_mesopotamia'], resourceValue: 12, manpowerValue: 70, defenseBonus: 2, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_colchis', name: 'Colchis', x: 830, y: 320, ownerId: FactionId.NEUTRAL, neighbors: ['p_scythia', 'p_armenia'], resourceValue: 6, manpowerValue: 30, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_syria', name: 'Syria', x: 800, y: 440, ownerId: FactionId.PARTHIA, neighbors: ['p_cilicia', 'p_cappadocia', 'p_mesopotamia', 'p_palestina'], resourceValue: 18, manpowerValue: 80, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_palestina', name: 'Palestina', x: 780, y: 480, ownerId: FactionId.EGYPT, neighbors: ['p_syria', 'p_arabia_petraea', 'p_aegyptus'], resourceValue: 12, manpowerValue: 50, defenseBonus: 0, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: true },
  { id: 'p_arabia_petraea', name: 'Arabia Petraea', x: 810, y: 500, ownerId: FactionId.NEUTRAL, neighbors: ['p_palestina', 'p_aegyptus', 'p_arabia'], resourceValue: 8, manpowerValue: 30, defenseBonus: 1, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_aegyptus', name: 'Aegyptus', x: 750, y: 520, ownerId: FactionId.EGYPT, neighbors: ['p_palestina', 'p_cyrenaica', 'p_arabia_petraea', 'p_thebais'], resourceValue: 30, manpowerValue: 150, defenseBonus: 1, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_thebais', name: 'Thebais', x: 760, y: 580, ownerId: FactionId.EGYPT, neighbors: ['p_aegyptus'], resourceValue: 15, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  
  // --- MESOPOTAMIA & PERSIA (Plains/Desert/Hills) ---
  { id: 'p_mesopotamia', name: 'Mesopotamia', x: 860, y: 420, ownerId: FactionId.PARTHIA, neighbors: ['p_armenia', 'p_syria', 'p_babylonia', 'p_media'], resourceValue: 20, manpowerValue: 90, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_babylonia', name: 'Babylonia', x: 890, y: 460, ownerId: FactionId.PARTHIA, neighbors: ['p_mesopotamia', 'p_susiana', 'p_arabia'], resourceValue: 25, manpowerValue: 100, defenseBonus: 1, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_arabia', name: 'Arabia', x: 850, y: 520, ownerId: FactionId.NEUTRAL, neighbors: ['p_arabia_petraea', 'p_babylonia'], resourceValue: 5, manpowerValue: 40, defenseBonus: 0, terrain: TerrainType.DESERT, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_media', name: 'Media', x: 920, y: 380, ownerId: FactionId.PARTHIA, neighbors: ['p_armenia', 'p_mesopotamia', 'p_parthia_prop', 'p_susiana'], resourceValue: 15, manpowerValue: 70, defenseBonus: 1, terrain: TerrainType.MOUNTAIN, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_susiana', name: 'Susiana', x: 940, y: 440, ownerId: FactionId.PARTHIA, neighbors: ['p_babylonia', 'p_media', 'p_persis'], resourceValue: 15, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_persis', name: 'Persis', x: 980, y: 480, ownerId: FactionId.NEUTRAL, neighbors: ['p_susiana'], resourceValue: 12, manpowerValue: 50, defenseBonus: 1, terrain: TerrainType.HILLS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
  { id: 'p_parthia_prop', name: 'Parthia Prop.', x: 1000, y: 350, ownerId: FactionId.NEUTRAL, neighbors: ['p_media'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, terrain: TerrainType.PLAINS, troops: [], buildings: [], activeDecreeId: null, hasRebellionRisk: false },
];