import { Faction, FactionId, Province, Technology, TechCategory, RoguelikeTrait } from './types';

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
  { id: 'r_m1', name: 'Manipular System', description: 'Flexible legion organization. +10% Defense.', cost: 200, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {} },
  { id: 'r_m2', name: 'Fortified Camps (Castra)', description: 'Armies heal faster in enemy territory.', cost: 400, category: TechCategory.MILITARY, prerequisiteId: 'r_m1', effect: () => {} },
  { id: 'r_m3', name: 'Marian Reforms', description: 'Professional army. High upkeep, massive stats.', cost: 800, category: TechCategory.MILITARY, prerequisiteId: 'r_m2', effect: () => {} },
  // ECO
  { id: 'r_e1', name: 'Roman Roads', description: 'Improved movement and commerce.', cost: 150, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {} },
  { id: 'r_e2', name: 'Denarius Coinage', description: 'Standardized currency reduces corruption.', cost: 300, category: TechCategory.ECONOMIC, prerequisiteId: 'r_e1', effect: () => {} },
  { id: 'r_e3', name: 'Concrete', description: 'Building infrastructure is cheaper.', cost: 600, category: TechCategory.ECONOMIC, prerequisiteId: 'r_e2', effect: () => {} },
  // ADMIN
  { id: 'r_a1', name: 'Latin Rights', description: 'Easier integration of conquered people.', cost: 200, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {} },
  { id: 'r_a2', name: 'Cursus Honorum', description: 'Formalized political career ladder.', cost: 400, category: TechCategory.ADMIN, prerequisiteId: 'r_a1', effect: () => {} },
];

const PUNIC_TECH: Technology[] = [
  // MILITARY
  { id: 'c_m1', name: 'Numidian Contracts', description: 'Access to superior light cavalry.', cost: 200, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {} },
  { id: 'c_m2', name: 'War Elephants', description: 'Massive shock damage units.', cost: 500, category: TechCategory.MILITARY, prerequisiteId: 'c_m1', effect: () => {} },
  { id: 'c_m3', name: 'Barcid Leadership', description: 'Mercenaries have higher morale.', cost: 700, category: TechCategory.MILITARY, prerequisiteId: 'c_m2', effect: () => {} },
  // ECO
  { id: 'c_e1', name: 'Cothon Ports', description: 'Naval superiority and trade.', cost: 200, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {} },
  { id: 'c_e2', name: 'Purple Dye Monopoly', description: 'Huge gold boost from coastal cities.', cost: 400, category: TechCategory.ECONOMIC, prerequisiteId: 'c_e1', effect: () => {} },
  { id: 'c_e3', name: 'Punic Banking', description: 'Can go into debt without penalty.', cost: 600, category: TechCategory.ECONOMIC, prerequisiteId: 'c_e2', effect: () => {} },
  // ADMIN
  { id: 'c_a1', name: 'Shophetim Council', description: 'Merchant oligarchs manage taxes.', cost: 300, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {} },
];

const HELLENIC_TECH: Technology[] = [
  // MILITARY
  { id: 'h_m1', name: 'Sarissa Reform', description: 'Phalanx formations. +20% Frontal Def.', cost: 200, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {} },
  { id: 'h_m2', name: 'Companion Cavalry', description: 'Elite shock cavalry.', cost: 450, category: TechCategory.MILITARY, prerequisiteId: 'h_m1', effect: () => {} },
  // ECO
  { id: 'h_e1', name: 'Nile Agriculture', description: '+30% Food/Manpower in river lands.', cost: 250, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {} },
  { id: 'h_e2', name: 'Silk Road End', description: 'High trade income.', cost: 500, category: TechCategory.ECONOMIC, prerequisiteId: 'h_e1', effect: () => {} },
  // ADMIN
  { id: 'h_a1', name: 'Koine Greek', description: 'Better diplomacy with Greek states.', cost: 200, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {} },
  { id: 'h_a2', name: 'Library of Alexandria', description: 'Free tech research every 20 turns.', cost: 800, category: TechCategory.ADMIN, prerequisiteId: 'h_a1', effect: () => {} },
];

const BARBARIAN_TECH: Technology[] = [
  // MILITARY
  { id: 'b_m1', name: 'Blood Oath', description: 'High morale units.', cost: 150, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {} },
  { id: 'b_m2', name: 'Guerrilla Warfare', description: 'Ambush bonuses in forests.', cost: 300, category: TechCategory.MILITARY, prerequisiteId: 'b_m1', effect: () => {} },
  // ECO
  { id: 'b_e1', name: 'Amber Trade', description: 'Trade income.', cost: 200, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {} },
  { id: 'b_e2', name: 'Raiding Culture', description: 'Gain gold from battles.', cost: 400, category: TechCategory.ECONOMIC, prerequisiteId: 'b_e1', effect: () => {} },
  // ADMIN
  { id: 'b_a1', name: 'Druidic Circle', description: 'Cultural unity reduces revolts.', cost: 300, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {} },
];

const EASTERN_TECH: Technology[] = [
  { id: 'e_m1', name: 'Parthian Shot', description: 'Horse archers can fire while retreating.', cost: 300, category: TechCategory.MILITARY, prerequisiteId: null, effect: () => {} },
  { id: 'e_e1', name: 'Silk Road Control', description: 'Maximized trade profit.', cost: 400, category: TechCategory.ECONOMIC, prerequisiteId: null, effect: () => {} },
  { id: 'e_a1', name: 'Satrap Autonomy', description: 'Lower admin costs for large empires.', cost: 350, category: TechCategory.ADMIN, prerequisiteId: null, effect: () => {} },
];

export const TECH_TREES: Record<string, Technology[]> = {
  'ROMAN': ROMAN_TECH,
  'PUNIC': PUNIC_TECH,
  'HELLENIC': HELLENIC_TECH,
  'BARBARIAN': BARBARIAN_TECH,
  'EASTERN': EASTERN_TECH
};

// --- DATA ---
// Using pollinations.ai to simulate "Generated" images based on prompts
const GEN_URL = "https://image.pollinations.ai/prompt";

export const INITIAL_FACTIONS: Record<FactionId, Faction> = {
  [FactionId.ROME]: {
    id: FactionId.ROME,
    name: 'Rome',
    leaderName: 'Augustus Caesar',
    group: 'ROMAN',
    color: '#b91c1c', 
    textColor: '#fee2e2',
    gold: 200,
    manpower: 1000,
    stability: 80,
    isPlayer: false,
    desc: 'Disciplined legions and diverse administration.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/portrait%20of%20roman%20emperor%20augustus%20statue%20marble%20dramatic%20lighting%20dark%20background%20strategy%20game%20art?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/roman%20forum%20ancient%20city%20sunset%20digital%20art?width=800&height=600&nologo=true`
    }
  },
  [FactionId.CARTHAGE]: {
    id: FactionId.CARTHAGE,
    name: 'Carthage',
    leaderName: 'Hannibal Barca',
    group: 'PUNIC',
    color: '#e5e5e5', 
    textColor: '#1c1917',
    gold: 400,
    manpower: 600,
    stability: 70,
    isPlayer: false,
    desc: 'Masters of trade and naval warfare.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/portrait%20of%20hannibal%20barca%20carthage%20general%20rugged%20beard%20armor%20cinematic%20lighting?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/carthage%20harbor%20ancient%20ships%20digital%20art?width=800&height=600&nologo=true`
    }
  },
  [FactionId.MACEDON]: {
    id: FactionId.MACEDON,
    name: 'Macedon',
    leaderName: 'Philip V',
    group: 'HELLENIC',
    color: '#1e3a8a', 
    textColor: '#dbeafe',
    gold: 150,
    manpower: 800,
    stability: 60,
    isPlayer: false,
    desc: 'Heirs of Alexander with pike phalanxes.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/greek%20king%20philip%20macedon%20helmet%20golden%20armor%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/greek%20phalanx%20formation%20battlefield?width=800&height=600&nologo=true`
    }
  },
  [FactionId.GAUL]: {
    id: FactionId.GAUL,
    name: 'Gaul',
    leaderName: 'Vercingetorix',
    group: 'BARBARIAN',
    color: '#15803d', 
    textColor: '#dcfce7',
    gold: 50,
    manpower: 1500,
    stability: 40,
    isPlayer: false,
    desc: 'Fierce warriors spread across Europa.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/vercingetorix%20gaul%20chieftain%20long%20hair%20mustache%20celtic%20tattoos%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/celtic%20forest%20village%20misty?width=800&height=600&nologo=true`
    }
  },
  [FactionId.EGYPT]: {
    id: FactionId.EGYPT,
    name: 'Egypt',
    leaderName: 'Cleopatra VII',
    group: 'HELLENIC',
    color: '#eab308', 
    textColor: '#422006',
    gold: 500,
    manpower: 500,
    stability: 65,
    isPlayer: false,
    desc: 'Ancient riches and hellenic culture.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/cleopatra%20egypt%20queen%20golden%20crown%20makeup%20beautiful%20portrait%20cinematic?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/pyramids%20of%20giza%20nile%20river%20ancient?width=800&height=600&nologo=true`
    }
  },
  [FactionId.PARTHIA]: {
    id: FactionId.PARTHIA,
    name: 'Parthia',
    leaderName: 'Mithridates',
    group: 'EASTERN',
    color: '#7e22ce', 
    textColor: '#f3e8ff',
    gold: 200,
    manpower: 800,
    stability: 55,
    isPlayer: false,
    desc: 'Masters of horse archery from the East.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/parthian%20king%20eastern%20armor%20crown%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/desert%20cavalry%20charge%20parthian?width=800&height=600&nologo=true`
    }
  },
  [FactionId.IBERIA]: {
    id: FactionId.IBERIA,
    name: 'Iberia',
    leaderName: 'Indibilis',
    group: 'BARBARIAN',
    color: '#c2410c', 
    textColor: '#ffedd5',
    gold: 80,
    manpower: 900,
    stability: 45,
    isPlayer: false,
    desc: 'Resilient warriors of the peninsula.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/iberian%20warrior%20chief%20falcata%20sword%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/spanish%20hills%20ancient%20fort?width=800&height=600&nologo=true`
    }
  },
  [FactionId.BRITANNIA]: {
    id: FactionId.BRITANNIA,
    name: 'Britannia',
    leaderName: 'Cassivellaunus',
    group: 'BARBARIAN',
    color: '#0f766e', 
    textColor: '#ccfbf1',
    gold: 40,
    manpower: 800,
    stability: 40,
    isPlayer: false,
    desc: 'Isolated tribes with painted warriors.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/celtic%20briton%20king%20woad%20paint%20chariot%20background%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/stonehenge%20misty%20morning?width=800&height=600&nologo=true`
    }
  },
  [FactionId.GERMANIA]: {
    id: FactionId.GERMANIA,
    name: 'Germania',
    leaderName: 'Arminius',
    group: 'BARBARIAN',
    color: '#3f3f46', 
    textColor: '#e4e4e7',
    gold: 30,
    manpower: 1200,
    stability: 35,
    isPlayer: false,
    desc: 'Untamed forests and terrifying raids.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: `${GEN_URL}/germanic%20barbarian%20arminius%20forest%20portrait?width=512&height=512&nologo=true`,
      background: `${GEN_URL}/teutoburg%20forest%20dark%20ancient?width=800&height=600&nologo=true`
    }
  },
  [FactionId.REBELS]: {
    id: FactionId.REBELS,
    name: 'Rebels',
    leaderName: 'Spartacus',
    group: 'BARBARIAN',
    color: '#000000',
    textColor: '#ef4444',
    gold: 0,
    manpower: 0,
    stability: 0,
    isPlayer: false,
    desc: 'Those who oppose the ruling order.',
    unlockedTechs: [],
    traits: [],
    images: {
      leader: '',
      background: ''
    }
  }
};

export const INITIAL_PROVINCES: Province[] = [
  // ITALY
  { id: 'p_roma', name: 'Roma', x: 480, y: 350, ownerId: FactionId.ROME, neighbors: ['p_cisalpina', 'p_magna_graecia'], resourceValue: 20, manpowerValue: 100, defenseBonus: 2, troops: [], hasRebellionRisk: false, currentConstruction: { name: 'Grand Forum', progress: 2, total: 5 } },
  { id: 'p_magna_graecia', name: 'Magna Graecia', x: 500, y: 400, ownerId: FactionId.ROME, neighbors: ['p_roma', 'p_sicily'], resourceValue: 12, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_cisalpina', name: 'Cisalpina', x: 460, y: 300, ownerId: FactionId.ROME, neighbors: ['p_roma', 'p_transalpina', 'p_illyria'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  
  // AFRICA
  { id: 'p_carthage', name: 'Carthago', x: 450, y: 450, ownerId: FactionId.CARTHAGE, neighbors: ['p_sicily', 'p_numidia', 'p_sardinia'], resourceValue: 25, manpowerValue: 80, defenseBonus: 2, troops: [], hasRebellionRisk: false, currentConstruction: { name: 'Great Harbor', progress: 3, total: 4 } },
  { id: 'p_numidia', name: 'Numidia', x: 380, y: 460, ownerId: FactionId.CARTHAGE, neighbors: ['p_carthage', 'p_mauretania'], resourceValue: 8, manpowerValue: 90, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_mauretania', name: 'Mauretania', x: 300, y: 450, ownerId: FactionId.IBERIA, neighbors: ['p_numidia', 'p_hispania_baetica'], resourceValue: 5, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },

  // ISLANDS
  { id: 'p_sicily', name: 'Sicilia', x: 480, y: 430, ownerId: FactionId.CARTHAGE, neighbors: ['p_carthage', 'p_magna_graecia', 'p_sardinia'], resourceValue: 15, manpowerValue: 40, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_sardinia', name: 'Sardinia', x: 420, y: 390, ownerId: FactionId.CARTHAGE, neighbors: ['p_sicily', 'p_carthage', 'p_cisalpina'], resourceValue: 8, manpowerValue: 20, defenseBonus: 0, troops: [], hasRebellionRisk: false },

  // IBERIA
  { id: 'p_hispania_citerior', name: 'Hispania Citerior', x: 320, y: 380, ownerId: FactionId.IBERIA, neighbors: ['p_transalpina', 'p_hispania_baetica', 'p_lusitania'], resourceValue: 12, manpowerValue: 60, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_hispania_baetica', name: 'Hispania Baetica', x: 280, y: 420, ownerId: FactionId.IBERIA, neighbors: ['p_hispania_citerior', 'p_lusitania', 'p_mauretania'], resourceValue: 15, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_lusitania', name: 'Lusitania', x: 250, y: 390, ownerId: FactionId.IBERIA, neighbors: ['p_hispania_citerior', 'p_hispania_baetica'], resourceValue: 8, manpowerValue: 40, defenseBonus: 1, troops: [], hasRebellionRisk: false },

  // GAUL & GERMANIA & BRITANNIA
  { id: 'p_transalpina', name: 'Gallia Transalpina', x: 400, y: 320, ownerId: FactionId.GAUL, neighbors: ['p_cisalpina', 'p_hispania_citerior', 'p_gallia_comata'], resourceValue: 10, manpowerValue: 70, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_gallia_comata', name: 'Gallia Comata', x: 380, y: 260, ownerId: FactionId.GAUL, neighbors: ['p_transalpina', 'p_belgica', 'p_aquitania'], resourceValue: 8, manpowerValue: 100, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_aquitania', name: 'Aquitania', x: 340, y: 300, ownerId: FactionId.GAUL, neighbors: ['p_gallia_comata', 'p_hispania_citerior'], resourceValue: 6, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_belgica', name: 'Belgica', x: 410, y: 220, ownerId: FactionId.GAUL, neighbors: ['p_gallia_comata', 'p_germania_magna', 'p_britannia_s'], resourceValue: 8, manpowerValue: 80, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_germania_magna', name: 'Germania Magna', x: 480, y: 200, ownerId: FactionId.GERMANIA, neighbors: ['p_belgica', 'p_raetia', 'p_sarmatia'], resourceValue: 5, manpowerValue: 120, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_britannia_s', name: 'Britannia', x: 360, y: 180, ownerId: FactionId.BRITANNIA, neighbors: ['p_belgica'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  
  // CENTRAL/EAST EUROPE
  { id: 'p_raetia', name: 'Raetia', x: 470, y: 260, ownerId: FactionId.GAUL, neighbors: ['p_cisalpina', 'p_germania_magna', 'p_noricum'], resourceValue: 5, manpowerValue: 30, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_noricum', name: 'Noricum', x: 510, y: 270, ownerId: FactionId.GAUL, neighbors: ['p_raetia', 'p_pannonia', 'p_illyria'], resourceValue: 10, manpowerValue: 40, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_pannonia', name: 'Pannonia', x: 550, y: 280, ownerId: FactionId.GAUL, neighbors: ['p_noricum', 'p_dacia', 'p_moesia'], resourceValue: 8, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_illyria', name: 'Illyria', x: 530, y: 330, ownerId: FactionId.MACEDON, neighbors: ['p_cisalpina', 'p_noricum', 'p_macedonia'], resourceValue: 6, manpowerValue: 60, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_dacia', name: 'Dacia', x: 600, y: 250, ownerId: FactionId.GERMANIA, neighbors: ['p_pannonia', 'p_moesia', 'p_sarmatia'], resourceValue: 10, manpowerValue: 70, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_sarmatia', name: 'Sarmatia', x: 650, y: 200, ownerId: FactionId.GERMANIA, neighbors: ['p_dacia', 'p_germania_magna'], resourceValue: 4, manpowerValue: 100, defenseBonus: 0, troops: [], hasRebellionRisk: false },

  // GREECE & BALKANS
  { id: 'p_macedonia', name: 'Macedonia', x: 580, y: 360, ownerId: FactionId.MACEDON, neighbors: ['p_illyria', 'p_achaia', 'p_thrace', 'p_moesia'], resourceValue: 15, manpowerValue: 80, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_achaia', name: 'Achaia', x: 590, y: 400, ownerId: FactionId.MACEDON, neighbors: ['p_macedonia', 'p_crete', 'p_asia'], resourceValue: 12, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_moesia', name: 'Moesia', x: 590, y: 310, ownerId: FactionId.MACEDON, neighbors: ['p_pannonia', 'p_dacia', 'p_thrace', 'p_macedonia'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_thrace', name: 'Thrace', x: 630, y: 340, ownerId: FactionId.MACEDON, neighbors: ['p_moesia', 'p_macedonia', 'p_asia'], resourceValue: 10, manpowerValue: 60, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_crete', name: 'Crete', x: 600, y: 440, ownerId: FactionId.EGYPT, neighbors: ['p_achaia', 'p_cyrenaica'], resourceValue: 8, manpowerValue: 20, defenseBonus: 0, troops: [], hasRebellionRisk: false },

  // ASIA & EAST
  { id: 'p_asia', name: 'Asia', x: 680, y: 380, ownerId: FactionId.EGYPT, neighbors: ['p_thrace', 'p_achaia', 'p_galatia', 'p_cilicia'], resourceValue: 25, manpowerValue: 90, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_galatia', name: 'Galatia', x: 720, y: 360, ownerId: FactionId.GAUL, neighbors: ['p_asia', 'p_cappadocia', 'p_pontus'], resourceValue: 8, manpowerValue: 60, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_pontus', name: 'Pontus', x: 730, y: 330, ownerId: FactionId.PARTHIA, neighbors: ['p_galatia', 'p_armenia'], resourceValue: 10, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_cappadocia', name: 'Cappadocia', x: 740, y: 390, ownerId: FactionId.PARTHIA, neighbors: ['p_galatia', 'p_cilicia', 'p_armenia', 'p_syria'], resourceValue: 8, manpowerValue: 40, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_cilicia', name: 'Cilicia', x: 710, y: 410, ownerId: FactionId.PARTHIA, neighbors: ['p_asia', 'p_cappadocia', 'p_syria', 'p_cyprus'], resourceValue: 10, manpowerValue: 40, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_armenia', name: 'Armenia', x: 800, y: 340, ownerId: FactionId.PARTHIA, neighbors: ['p_pontus', 'p_cappadocia', 'p_mesopotamia'], resourceValue: 12, manpowerValue: 70, defenseBonus: 2, troops: [], hasRebellionRisk: false },
  { id: 'p_cyprus', name: 'Cyprus', x: 720, y: 440, ownerId: FactionId.EGYPT, neighbors: ['p_cilicia', 'p_syria'], resourceValue: 8, manpowerValue: 20, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_syria', name: 'Syria', x: 750, y: 430, ownerId: FactionId.PARTHIA, neighbors: ['p_cappadocia', 'p_cilicia', 'p_mesopotamia', 'p_palestina'], resourceValue: 20, manpowerValue: 80, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_mesopotamia', name: 'Mesopotamia', x: 820, y: 410, ownerId: FactionId.PARTHIA, neighbors: ['p_armenia', 'p_syria', 'p_babylonia'], resourceValue: 18, manpowerValue: 100, defenseBonus: 0, troops: [], hasRebellionRisk: false },
  { id: 'p_babylonia', name: 'Babylonia', x: 860, y: 450, ownerId: FactionId.PARTHIA, neighbors: ['p_mesopotamia'], resourceValue: 30, manpowerValue: 120, defenseBonus: 1, troops: [], hasRebellionRisk: false },
  { id: 'p_palestina', name: 'Palestina', x: 730, y: 460, ownerId: FactionId.EGYPT, neighbors: ['p_syria', 'p_aegyptus'], resourceValue: 10, manpowerValue: 50, defenseBonus: 0, troops: [], hasRebellionRisk: true },
  
  // AFRICA PT 2
  { id: 'p_aegyptus', name: 'Aegyptus', x: 700, y: 500, ownerId: FactionId.EGYPT, neighbors: ['p_palestina', 'p_cyrenaica'], resourceValue: 35, manpowerValue: 150, defenseBonus: 1, troops: [], hasRebellionRisk: false, currentConstruction: { name: 'Pyramid Repair', progress: 1, total: 10 } },
  { id: 'p_cyrenaica', name: 'Cyrenaica', x: 600, y: 480, ownerId: FactionId.EGYPT, neighbors: ['p_aegyptus', 'p_crete'], resourceValue: 10, manpowerValue: 30, defenseBonus: 0, troops: [], hasRebellionRisk: false },
];