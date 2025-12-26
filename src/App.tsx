import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  GameState, Phase, FactionId, Faction, Province, Unit, BattleState, 
  TechCategory, Technology, RoguelikeTrait, UnitType, TerrainType, MapMode, Building
} from './types';
import { INITIAL_FACTIONS, INITIAL_PROVINCES, TECH_TREES, ROGUELIKE_TRAITS, BUILDINGS, DECREES, UNIT_TYPES } from './constants';

// --- ICONS & ASSETS ---
const TERRAIN_ICONS: Record<TerrainType, string> = {
  [TerrainType.PLAINS]: '🌾',
  [TerrainType.FOREST]: '🌲',
  [TerrainType.HILLS]: '⛰️',
  [TerrainType.DESERT]: '🏜️',
  [TerrainType.MOUNTAIN]: '🗻'
};

const UNIT_ICONS: Record<UnitType, string> = {
  'INFANTRY': '🛡️',
  'ARCHER': '🏹',
  'CAVALRY': '🐎',
  'MILITIA': '🔨'
};

// Expanded Stats for UI
const FACTION_STATS: Record<FactionId, { military: number, industry: number, culture: number, unitName: string, unitDesc: string, unitImage: string }> = {
    [FactionId.ROME]: { 
        military: 95, industry: 60, culture: 80, 
        unitName: 'Legionary', 
        unitDesc: 'Heavy infantry with high discipline. Masters of formation warfare.',
        unitImage: 'https://image.pollinations.ai/prompt/roman%20legionary%20portrait%20helmet%20armor?width=200&height=200&nologo=true' 
    },
    [FactionId.CARTHAGE]: { 
        military: 60, industry: 95, culture: 70, 
        unitName: 'Sacred Band', 
        unitDesc: 'Elite citizen infantry supported by mercenary armies and war elephants.',
        unitImage: 'https://image.pollinations.ai/prompt/carthaginian%20soldier%20white%20shield%20spear?width=200&height=200&nologo=true'
    },
    [FactionId.MACEDON]: { 
        military: 90, industry: 50, culture: 75, 
        unitName: 'Companion Cavalry', 
        unitDesc: 'Shock cavalry capable of breaking enemy lines. Best used for flanking.',
        unitImage: 'https://image.pollinations.ai/prompt/macedonian%20companion%20cavalry%20helmet?width=200&height=200&nologo=true'
    },
    [FactionId.GAUL]: { 
        military: 80, industry: 40, culture: 50, 
        unitName: 'Oathsworn', 
        unitDesc: 'Fierce warriors who fight with high morale. Devastating charge bonus.',
        unitImage: 'https://image.pollinations.ai/prompt/gaul%20warrior%20mustache%20torc?width=200&height=200&nologo=true'
    },
    [FactionId.EGYPT]: { 
        military: 55, industry: 90, culture: 95, 
        unitName: 'Royal Guard', 
        unitDesc: 'Versatile infantry blending Hellenic discipline with ancient traditions.',
        unitImage: 'https://image.pollinations.ai/prompt/egyptian%20royal%20guard%20khopesh?width=200&height=200&nologo=true'
    },
    [FactionId.PARTHIA]: { 
        military: 85, industry: 60, culture: 60, 
        unitName: 'Cataphract', 
        unitDesc: 'Heavily armored cavalry. Slow but nearly impervious to standard arrows.',
        unitImage: 'https://image.pollinations.ai/prompt/parthian%20cataphract%20armored%20horse?width=200&height=200&nologo=true'
    },
    [FactionId.IBERIA]: { 
        military: 70, industry: 50, culture: 50, 
        unitName: 'Scutarii', 
        unitDesc: 'Agile infantry excellent at ambushes and fighting in rough terrain.',
        unitImage: 'https://image.pollinations.ai/prompt/iberian%20scutarii%20warrior?width=200&height=200&nologo=true'
    },
    [FactionId.BRITANNIA]: { 
        military: 65, industry: 30, culture: 55, 
        unitName: 'War Chariot', 
        unitDesc: 'Fast moving vehicles that disrupt infantry formations and cause fear.',
        unitImage: 'https://image.pollinations.ai/prompt/celtic%20chariot%20warrior?width=200&height=200&nologo=true'
    },
    [FactionId.GERMANIA]: { 
        military: 85, industry: 20, culture: 40, 
        unitName: 'Berserker', 
        unitDesc: 'Unstoppable shock infantry that ignores pain. High damage, low defense.',
        unitImage: 'https://image.pollinations.ai/prompt/germanic%20berserker%20bear%20skin?width=200&height=200&nologo=true'
    },
    [FactionId.REBELS]: { military: 0, industry: 0, culture: 0, unitName: 'Mob', unitDesc: 'Angry peasants.', unitImage: '' },
    [FactionId.NEUTRAL]: { military: 0, industry: 0, culture: 0, unitName: 'Militia', unitDesc: 'Local defenders.', unitImage: '' }
};

const MAP_BG_URL = "https://image.pollinations.ai/prompt/ancient%20papyrus%20map%20of%20europe%20mediterranean%20clean%20outline%20sepia%20worn%20edges%20high%20detail?width=1200&height=800&nologo=true";

// --- HELPER FUNCTIONS ---

const generateTerritoryPath = (id: string, cx: number, cy: number, radius: number): string => {
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points = 8;
  let d = '';
  
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const variance = Math.sin(seed + i * 132) * (radius * 0.3); 
    const r = radius + variance;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) d += `M ${x} ${y}`;
    else {
      const prevAngle = (Math.PI * 2 * (i - 1)) / points;
      const prevR = radius + Math.sin(seed + (i - 1) * 132) * (radius * 0.3);
      const cp1x = cx + Math.cos(prevAngle + 0.2) * (prevR + 10);
      const cp1y = cy + Math.sin(prevAngle + 0.2) * (prevR + 10);
      const cp2x = cx + Math.cos(angle - 0.2) * (r + 10);
      const cp2y = cy + Math.sin(angle - 0.2) * (r + 10);
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    }
  }
  d += ' Z';
  return d;
};

// --- COMPONENTS ---

const Tooltip = ({ children, text }: { children?: React.ReactNode, text: string }) => (
  <div className="group relative flex items-center justify-center">
    {children}
    <div className="absolute bottom-full mb-2 hidden group-hover:block w-max max-w-xs bg-black/90 text-stone-200 text-xs rounded p-2 border border-orange-900/50 shadow-xl z-50 pointer-events-none backdrop-blur-sm">
      {text}
    </div>
  </div>
);

const Button = ({ onClick, disabled, variant = 'primary', className = '', children }: any) => {
  const baseStyle = "font-serif font-bold py-2 px-4 rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs border";
  const variants = {
    primary: "bg-gradient-to-b from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 border-orange-500 text-orange-50",
    neutral: "bg-stone-800 hover:bg-stone-700 border-stone-600 text-stone-300",
    danger: "bg-red-900/80 hover:bg-red-800 border-red-700 text-red-100",
    success: "bg-emerald-900/80 hover:bg-emerald-800 border-emerald-700 text-emerald-100"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- MAIN APP ---

function App() {
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    year: 270,
    phase: Phase.MAIN_MENU,
    playerFactionId: null,
    factions: INITIAL_FACTIONS,
    provinces: INITIAL_PROVINCES,
    selectedProvinceId: null,
    moveSourceId: null,
    logs: [],
    activeBattle: null,
    loadingAI: false,
    modalMessage: null,
    isPaused: false,
    mapMode: MapMode.POLITICAL
  });

  const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [previewFactionId, setPreviewFactionId] = useState<FactionId | null>(null);
  
  const [showTechTree, setShowTechTree] = useState(false);
  const [provinceTab, setProvinceTab] = useState<'OVERVIEW' | 'ECONOMY' | 'MILITARY'>('OVERVIEW');
  const [menuTab, setMenuTab] = useState<'STATS' | 'UNITS' | 'LORE'>('STATS');
  const [techTab, setTechTab] = useState<TechCategory>(TechCategory.MILITARY);
  
  const [battleSpeed, setBattleSpeed] = useState<number | null>(null); 
  const [battleAnimState, setBattleAnimState] = useState<'idle' | 'clashing'>('idle');

  const mapRef = useRef<HTMLDivElement>(null);

  // --- MEMOIZED CALCULATIONS ---
  
  const provinceShapes = useMemo(() => {
    const shapes: Record<string, string> = {};
    INITIAL_PROVINCES.forEach(p => {
        shapes[p.id] = generateTerritoryPath(p.id, p.x, p.y, 40); 
    });
    return shapes;
  }, []);

  const mapContent = useMemo(() => {
    return (
        <g>
            {/* Connections */}
            {gameState.provinces.map(p => 
                p.neighbors.map(nId => {
                const n = gameState.provinces.find(prov => prov.id === nId);
                if (!n || p.id > nId) return null; 
                
                const isMovePath = gameState.moveSourceId && (
                    (gameState.moveSourceId === p.id && gameState.provinces.find(prov => prov.id === gameState.moveSourceId)?.neighbors.includes(n.id)) || 
                    (gameState.moveSourceId === n.id && gameState.provinces.find(prov => prov.id === gameState.moveSourceId)?.neighbors.includes(p.id))
                );

                return (
                    <path 
                        key={`${p.id}-${n.id}`} 
                        d={`M ${p.x} ${p.y} Q ${(p.x + n.x)/2} ${(p.y+n.y)/2 + 20} ${n.x} ${n.y}`}
                        stroke={isMovePath ? "#10b981" : "#000"} 
                        strokeWidth={isMovePath ? 3 : 1} 
                        strokeDasharray={isMovePath ? "none" : "4,4"}
                        opacity={isMovePath ? 0.8 : 0.3}
                        fill="none"
                        className={isMovePath ? "animate-pulse" : ""}
                    />
                );
                })
            )}

            {/* Provinces */}
            {gameState.provinces.map(p => {
                const owner = gameState.factions[p.ownerId];
                const isSelected = gameState.selectedProvinceId === p.id;
                const pathData = provinceShapes[p.id];

                let fillColor = owner.color;
                let fillOpacity = 0.6;
                let patternFill = '';
                let economyLabel = null;

                if (gameState.mapMode === MapMode.POLITICAL) {
                    fillColor = owner.color;
                    fillOpacity = p.ownerId === FactionId.NEUTRAL ? 0.3 : 0.6;
                } else if (gameState.mapMode === MapMode.TERRAIN) {
                    fillOpacity = 0.7;
                    if (p.terrain === TerrainType.FOREST) fillColor = '#166534';
                    else if (p.terrain === TerrainType.HILLS) fillColor = '#a16207';
                    else if (p.terrain === TerrainType.MOUNTAIN) fillColor = '#57534e';
                    else if (p.terrain === TerrainType.DESERT) fillColor = '#d97706';
                    else fillColor = '#65a30d'; 
                } else if (gameState.mapMode === MapMode.ECONOMY) {
                    const val = p.resourceValue;
                    let icon = "";
                    if (val >= 20) { fillColor = '#eab308'; icon = "💎"; } 
                    else if (val >= 12) { fillColor = '#ca8a04'; icon = "💰"; } 
                    else if (val >= 8) { fillColor = '#a16207'; icon = ""; } 
                    else { fillColor = '#78350f'; icon = "📉"; } 
                    fillOpacity = 0.7;

                    economyLabel = (
                        <g>
                           <rect x={p.x - 14} y={p.y - 20} width="28" height="14" rx="4" fill="rgba(0,0,0,0.6)" />
                           <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="bold" className="pointer-events-none">
                                {icon} {val}
                           </text>
                        </g>
                    );
                }

                if(p.terrain === TerrainType.FOREST) patternFill = 'url(#pat-forest)';
                if(p.terrain === TerrainType.MOUNTAIN) patternFill = 'url(#pat-mountain)';
                if(p.terrain === TerrainType.HILLS) patternFill = 'url(#pat-hills)';
                if(p.terrain === TerrainType.DESERT) patternFill = 'url(#pat-desert)';

                const isRelocationTarget = gameState.moveSourceId && (
                     (gameState.moveSourceId === p.id && false) || 
                     (gameState.provinces.find(prov => prov.id === gameState.moveSourceId)?.neighbors.includes(p.id) && p.ownerId === gameState.playerFactionId)
                );

                return (
                    <g 
                        key={p.id} 
                        onClick={(e) => { e.stopPropagation(); selectProvince(p.id); }} 
                        className="hover:opacity-90 transition-opacity group cursor-pointer"
                        onMouseEnter={() => setHoveredProvinceId(p.id)}
                        onMouseLeave={() => setHoveredProvinceId(null)}
                    >
                        <path 
                            d={pathData} 
                            fill={fillColor} 
                            stroke={isSelected ? '#fff' : '#1c1917'}
                            strokeWidth={isSelected ? 3 : 1}
                            strokeOpacity={isSelected ? 1 : 0.6}
                            fillOpacity={fillOpacity}
                            style={{ mixBlendMode: gameState.mapMode === MapMode.POLITICAL ? 'multiply' : 'normal' }} 
                            className="transition-all duration-300"
                        />
                        
                        {patternFill && (
                            <path d={pathData} fill={patternFill} stroke="none" pointerEvents="none" opacity="0.4" style={{ mixBlendMode: 'multiply' }} />
                        )}

                        {economyLabel}

                        {isSelected && (
                            <circle cx={p.x} cy={p.y} r={45} stroke="white" strokeWidth="2" strokeDasharray="5,5" fill="none" className="animate-spin-slow opacity-80 pointer-events-none" />
                        )}
                        {isRelocationTarget && (
                            <>
                            <circle cx={p.x} cy={p.y} r={40} stroke="#10b981" strokeWidth="3" fill="none" className="animate-pulse pointer-events-none" />
                            <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="16" className="animate-bounce pointer-events-none">⬇️</text>
                            </>
                        )}

                        {p.troops.length > 0 && gameState.mapMode !== MapMode.ECONOMY && (
                            <g className="transition-transform duration-200 hover:scale-125">
                            <circle cx={p.x} cy={p.y} r={12} fill="#b91c1c" stroke="#fff" strokeWidth="2" className="drop-shadow-lg shadow-black" />
                            <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="#7f1d1d" strokeWidth="1" />
                            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="900" style={{fontFamily: 'monospace'}} className="pointer-events-none select-none text-shadow-sm">{p.troops.length}</text>
                            </g>
                        )}
                        
                        <text 
                            x={p.x} 
                            y={p.y + 35} 
                            textAnchor="middle" 
                            fontSize="10" 
                            className="map-text pointer-events-none select-none uppercase tracking-widest"
                            style={{ opacity: gameState.mapMode === MapMode.ECONOMY ? 0.7 : 1 }}
                        >
                            {p.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
  }, [gameState.provinces, gameState.mapMode, gameState.selectedProvinceId, gameState.moveSourceId, provinceShapes]);

  // --- GAME LOGIC ---

  const addLog = (text: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [`[${prev.year} BC] ${text}`, ...prev.logs.slice(0, 49)]
    }));
  };

  const startGame = (factionId: FactionId) => {
    const shuffledTraits = [...ROGUELIKE_TRAITS].sort(() => 0.5 - Math.random());
    const pickedTraits = shuffledTraits.slice(0, 2);

    const newFactions = { ...INITIAL_FACTIONS };
    newFactions[factionId] = {
      ...newFactions[factionId],
      isPlayer: true,
      traits: pickedTraits
    };

    pickedTraits.forEach(trait => {
      if(trait.effectType === 'GOLD_MOD') newFactions[factionId].gold += 100;
    });

    setGameState({
      ...gameState,
      phase: Phase.CAMPAIGN,
      playerFactionId: factionId,
      factions: newFactions,
      logs: [`Welcome, leader of ${newFactions[factionId].name}.`],
      year: 270,
      turn: 1,
      isPaused: false
    });

    const capital = INITIAL_PROVINCES.find(p => p.ownerId === factionId);
    if (capital) {
      setTimeout(() => centerMapOn(capital.x, capital.y), 100);
    }
  };

  const centerMapOn = (x: number, y: number) => {
    if (!mapRef.current) return;
    const width = mapRef.current.clientWidth;
    const height = mapRef.current.clientHeight;
    setViewState({
      scale: 1.2,
      x: (width / 2) - (x * 1.2),
      y: (height / 2) - (y * 1.2)
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, viewState.scale + scaleAmount), 3);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'image' || (e.target as HTMLElement).id === 'map-bg' || (e.target as HTMLElement).classList.contains('clouds-overlay')) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setViewState(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const selectProvince = (id: string | null) => {
    if (gameState.phase !== Phase.CAMPAIGN) return;
    
    if (!id) {
        setGameState(prev => ({ ...prev, selectedProvinceId: null, moveSourceId: null }));
        return;
    }

    if (gameState.moveSourceId) {
        if (gameState.moveSourceId === id) {
            setGameState(prev => ({ ...prev, moveSourceId: null }));
            return;
        }
        
        const sourceProv = gameState.provinces.find(p => p.id === gameState.moveSourceId);
        const targetProv = gameState.provinces.find(p => p.id === id);

        if (sourceProv && targetProv) {
            if (sourceProv.neighbors.includes(targetProv.id) && targetProv.ownerId === gameState.playerFactionId) {
                const troopsToMove = [...sourceProv.troops];
                const newProvinces = gameState.provinces.map(p => {
                    if (p.id === sourceProv.id) return { ...p, troops: [] };
                    if (p.id === targetProv.id) return { ...p, troops: [...p.troops, ...troopsToMove] };
                    return p;
                });

                setGameState(prev => ({
                    ...prev,
                    provinces: newProvinces,
                    moveSourceId: null,
                    selectedProvinceId: targetProv.id,
                    logs: [`Army marched to ${targetProv.name}.`, ...prev.logs]
                }));
            } else {
                addLog("Invalid destination.");
            }
        }
        return;
    }
    setGameState(prev => ({ ...prev, selectedProvinceId: id }));
  };

  const startRelocation = () => {
      const provId = gameState.selectedProvinceId;
      if(!provId) return;
      const prov = gameState.provinces.find(p => p.id === provId);
      if(!prov || prov.troops.length === 0) return;
      setGameState(prev => ({ ...prev, moveSourceId: provId }));
  };

  const endTurn = () => {
    const nextTurn = gameState.turn + 1;
    const nextYear = gameState.year - 1; 
    
    const updatedFactions = { ...gameState.factions };
    const updatedProvinces = gameState.provinces.map(prov => {
      const owner = updatedFactions[prov.ownerId];
      if (owner && owner.id !== FactionId.NEUTRAL && owner.id !== FactionId.REBELS) {
        
        let goldMod = 1;
        let manpowerMod = 1;

        owner.traits.forEach(t => {
            if(t.effectType === 'GOLD_MOD') goldMod += t.value;
            if(t.effectType === 'MANPOWER_MOD') manpowerMod += t.value;
        });

        prov.buildings.forEach(bId => {
            const b = BUILDINGS[bId];
            if(b.effect.gold) goldMod += (b.effect.gold / 100); 
        });
        
        if (prov.activeDecreeId) {
            const d = DECREES[prov.activeDecreeId];
            owner.gold -= d.costPerTurn;
            if (prov.activeDecreeId === 'taxes') goldMod += 0.2;
            if (prov.activeDecreeId === 'levies') manpowerMod += 0.3;
        }

        const income = Math.floor(prov.resourceValue * goldMod);
        const manpower = Math.floor(prov.manpowerValue * manpowerMod);

        owner.gold += income;
        owner.manpower += manpower;
        
        if (prov.currentConstruction) {
            prov.currentConstruction.progress += 1;
            if (prov.currentConstruction.progress >= prov.currentConstruction.total) {
                addLog(`${prov.currentConstruction.name} finished in ${prov.name}`);
                prov.buildings.push(prov.currentConstruction.buildingId);
                prov.currentConstruction = undefined; 
            }
        }
      }
      return prov;
    });

    Object.keys(updatedFactions).forEach(fid => {
        const f = updatedFactions[fid as FactionId];
        if (!f.isPlayer && f.id !== FactionId.NEUTRAL && f.gold > 100) {
            f.gold -= 50;
            const aiProvs = updatedProvinces.filter(p => p.ownerId === fid);
            if (aiProvs.length > 0) {
                const target = aiProvs[Math.floor(Math.random() * aiProvs.length)];
                target.troops.push({
                    id: `unit_${Math.random()}`,
                    type: 'INFANTRY',
                    name: 'AI Infantry',
                    hp: 100,
                    maxHp: 100,
                    damage: 10,
                    ownerId: f.id
                });
            }
        }
    });

    setGameState(prev => ({
      ...prev,
      turn: nextTurn,
      year: nextYear,
      factions: updatedFactions,
      provinces: updatedProvinces,
      moveSourceId: null,
      logs: [`Year ${nextYear} BC.`, ...prev.logs]
    }));
  };

  const recruitUnit = (type: UnitType) => {
    if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
    const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
    if (provIndex === -1) return;

    const prov = gameState.provinces[provIndex];
    const player = gameState.factions[gameState.playerFactionId];
    const unitStats = UNIT_TYPES[type];

    if (player.gold >= unitStats.cost && player.manpower >= unitStats.manpower) {
        if(prov.troops.length >= 8) {
             addLog("Province garrison is full!");
             return;
        }

        const newUnit: Unit = {
            id: `u_${Date.now()}_${Math.random()}`,
            type: type,
            name: unitStats.name,
            hp: unitStats.hp,
            maxHp: unitStats.hp,
            damage: unitStats.damage,
            ownerId: player.id
        };
        const newFactions = { ...gameState.factions };
        newFactions[player.id].gold -= unitStats.cost;
        newFactions[player.id].manpower -= unitStats.manpower;

        const newProvinces = [...gameState.provinces];
        newProvinces[provIndex].troops.push(newUnit);

        setGameState(prev => ({
            ...prev,
            factions: newFactions,
            provinces: newProvinces,
            logs: [`Recruited ${unitStats.name} in ${prov.name}.`, ...prev.logs]
        }));
    } else {
        addLog("Not enough resources.");
    }
  };

  const startBuilding = (buildingId: string) => {
      if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
      const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
      const prov = gameState.provinces[provIndex];
      const player = gameState.factions[gameState.playerFactionId];
      const building = BUILDINGS[buildingId];

      if(prov.currentConstruction) {
          addLog("Already constructing something.");
          return;
      }
      if(prov.buildings.includes(buildingId)) {
          addLog("Building already exists.");
          return;
      }
      if(player.gold < building.cost) {
          addLog("Not enough gold.");
          return;
      }

      const newFactions = { ...gameState.factions };
      newFactions[player.id].gold -= building.cost;

      const newProvinces = [...gameState.provinces];
      newProvinces[provIndex].currentConstruction = {
          buildingId: buildingId,
          name: building.name,
          progress: 0,
          total: building.turnsToBuild
      };

      setGameState(prev => ({
          ...prev,
          factions: newFactions,
          provinces: newProvinces,
          logs: [`Started construction of ${building.name}.`, ...prev.logs]
      }));
  };

  const colonizeProvince = () => {
    if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
    const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
    if (provIndex === -1) return;
    const prov = gameState.provinces[provIndex];
    const player = gameState.factions[gameState.playerFactionId];
    if (player.gold >= 200 && prov.troops.length === 0 && prov.ownerId === FactionId.NEUTRAL) {
        const newFactions = { ...gameState.factions };
        newFactions[player.id].gold -= 200;
        const newProvinces = [...gameState.provinces];
        newProvinces[provIndex] = { ...prov, ownerId: player.id };
        setGameState(prev => ({ ...prev, factions: newFactions, provinces: newProvinces, logs: [`Colonized ${prov.name}.`, ...prev.logs] }));
    } else { addLog("Cannot colonize."); }
  };

  const declareWarAttack = () => {
      if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
      const targetProv = gameState.provinces.find(p => p.id === gameState.selectedProvinceId);
      if (!targetProv || targetProv.ownerId === gameState.playerFactionId) return;
      
      const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
      
      const validAttackers = ownedProvinces.filter(p => 
          p.neighbors.includes(targetProv.id) && p.troops.length > 0
      );

      if (validAttackers.length === 0) {
          setGameState(prev => ({...prev, modalMessage: { title: "Cannot Attack", body: "You have no armies in adjacent provinces to launch an invasion from." }}));
          return;
      }

      validAttackers.sort((a, b) => b.troops.length - a.troops.length);
      const attackingProv = validAttackers[0];
      
      const attackers = [...attackingProv.troops];
      const defenders = [...targetProv.troops];

      if (defenders.length === 0) {
          const newProvinces = gameState.provinces.map(p => {
              if (p.id === targetProv.id) return { ...p, ownerId: gameState.playerFactionId!, troops: attackers.slice(0, 1) };
              if (p.id === attackingProv.id) return { ...p, troops: attackers.slice(1) };
              return p;
          });
          setGameState(prev => ({ ...prev, provinces: newProvinces, logs: [`Captured ${targetProv.name}!`, ...prev.logs] }));
          return;
      }

      setGameState(prev => ({
          ...prev, phase: Phase.BATTLE,
          activeBattle: { 
              attackerId: prev.playerFactionId!, 
              defenderId: targetProv.ownerId, 
              provinceId: targetProv.id, 
              attackerUnits: attackers, 
              defenderUnits: defenders, 
              round: 0, 
              logs: ['Battle started!'], 
              winner: null 
          }
      }));
  };

  const triggerBattleRound = useCallback(() => {
    setBattleAnimState('clashing');
    setTimeout(() => {
        setGameState(prev => {
            if (!prev.activeBattle || prev.activeBattle.winner) return prev;
            const battle = { ...prev.activeBattle };
            
            const atkFront = battle.attackerUnits[0];
            const defFront = battle.defenderUnits[0];

            if (atkFront && defFront) {
                const dmg = atkFront.damage * (0.8 + Math.random() * 0.4);
                const defDmg = defFront.damage * (0.8 + Math.random() * 0.4);

                defFront.hp -= Math.floor(dmg);
                atkFront.hp -= Math.floor(defDmg);

                battle.logs = [`R${battle.round}: ${atkFront.name} deals ${Math.floor(dmg)}, takes ${Math.floor(defDmg)}`, ...battle.logs.slice(0, 5)];

                if (defFront.hp <= 0) battle.defenderUnits.shift();
                if (atkFront.hp <= 0) battle.attackerUnits.shift();
            }

            battle.round++;

            if (battle.defenderUnits.length === 0) battle.winner = battle.attackerId;
            else if (battle.attackerUnits.length === 0) battle.winner = battle.defenderId;
            if (battle.winner) setBattleSpeed(null);
            
            return { ...prev, activeBattle: battle };
        });
        setBattleAnimState('idle');
    }, 400);
  }, []);

  useEffect(() => {
    let interval: number;
    if (gameState.phase === Phase.BATTLE && battleSpeed !== null && !gameState.activeBattle?.winner) {
      interval = window.setInterval(triggerBattleRound, battleSpeed + 450);
    }
    return () => clearInterval(interval);
  }, [gameState.phase, battleSpeed, gameState.activeBattle?.winner, triggerBattleRound]);

  const endBattle = () => {
      if (!gameState.activeBattle || !gameState.activeBattle.winner) return;
      const winner = gameState.activeBattle.winner;
      const targetProvId = gameState.activeBattle.provinceId;
      const isPlayerWinner = winner === gameState.playerFactionId;
      
      const newProvinces = gameState.provinces.map(p => {
          if (p.id === targetProvId) {
              if (winner === gameState.activeBattle!.attackerId) return { ...p, ownerId: winner, troops: gameState.activeBattle!.attackerUnits };
              else return { ...p, troops: gameState.activeBattle!.defenderUnits };
          }
           const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
           const attackingProv = ownedProvinces.find(prov => prov.neighbors.includes(targetProvId));
           if (winner === gameState.activeBattle?.attackerId && attackingProv && p.id === attackingProv.id) return { ...p, troops: [] };
          return p;
      });
      setGameState(prev => ({
          ...prev, phase: Phase.CAMPAIGN, provinces: newProvinces, activeBattle: null,
          logs: [`Winner: ${gameState.factions[winner].name}`, ...prev.logs],
          modalMessage: { 
              title: isPlayerWinner ? "VICTORY" : "DEFEAT", 
              body: isPlayerWinner ? "The province has been secured. Glory to the Empire!" : "Your legions have been routed. Shame falls upon us.", 
              image: isPlayerWinner 
                  ? "https://image.pollinations.ai/prompt/roman%20legion%20triumph%20parade%20golden%20lighting%20victory?width=600&height=400&nologo=true" 
                  : "https://image.pollinations.ai/prompt/ancient%20battlefield%20defeat%20ruins%20fire%20smoke?width=600&height=400&nologo=true" 
          }
      }));
      setBattleSpeed(null);
  };
  
  const buyTech = (tech: Technology) => {
    if (!gameState.playerFactionId) return;
    const player = gameState.factions[gameState.playerFactionId];
    if (player.gold >= tech.cost) {
        const newFactions = { ...gameState.factions };
        newFactions[player.id].gold -= tech.cost;
        newFactions[player.id].unlockedTechs.push(tech.id);
        setGameState(prev => ({...prev, factions: newFactions}));
    }
  };

  // --- RENDERERS ---

  const renderMap = () => {
    return (
      <div 
        className="w-full h-full overflow-hidden bg-[#0c0a09] relative" 
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => selectProvince(null)}
      >
          {/* Atmosphere Layer */}
          <div className="absolute inset-0 pointer-events-none z-10 clouds-overlay"></div>
          <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-stone-900/30 via-transparent to-stone-900/30"></div>

          {/* SVG DEFS */}
          <svg className="absolute w-0 h-0">
             <defs>
                 <pattern id="pat-forest" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                     <text x="0" y="8" fontSize="8" fill="#14532d" opacity="0.6">🌲</text>
                 </pattern>
                 <pattern id="pat-mountain" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                     <path d="M6 1 L11 11 L1 11 Z" fill="#444" opacity="0.4" />
                 </pattern>
                 <pattern id="pat-hills" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="5" cy="5" r="3" fill="#78350f" opacity="0.3" />
                 </pattern>
                 <pattern id="pat-desert" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M1 5 Q5 1 9 5" stroke="#92400e" fill="none" opacity="0.3" />
                 </pattern>
             </defs>
          </svg>

          {/* Map Tooltip Layer */}
          {hoveredProvinceId && (() => {
             const p = gameState.provinces.find(prov => prov.id === hoveredProvinceId);
             if(!p) return null;
             // Calculate screen position
             const screenX = p.x * viewState.scale + viewState.x;
             const screenY = p.y * viewState.scale + viewState.y;
             const owner = gameState.factions[p.ownerId];
             
             return (
               <div 
                 className="absolute pointer-events-none z-50 bg-[#1c1917]/95 border border-stone-500 p-3 rounded-lg shadow-2xl backdrop-blur text-xs flex flex-col gap-1 w-48 animate-in fade-in duration-100" 
                 style={{ left: screenX + 25, top: screenY - 25 }}
               >
                 <div className="font-serif font-bold text-white text-lg leading-none">{p.name}</div>
                 <div className="text-orange-500 font-bold uppercase tracking-widest text-[10px] mb-1">{owner.name}</div>
                 
                 <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-stone-400 text-[10px] uppercase font-bold">
                   <span>Terrain</span> <span className="text-stone-200 text-right">{p.terrain}</span>
                   <span>Tax</span> <span className="text-stone-200 text-right">{p.resourceValue}</span>
                   <span>Manpower</span> <span className="text-stone-200 text-right">{p.manpowerValue}</span>
                 </div>

                 {p.troops.length > 0 && (
                   <div className="mt-2 pt-2 border-t border-stone-700 flex justify-between items-center">
                      <span className="text-red-400 font-bold">Garrison</span>
                      <span className="bg-red-900/50 px-2 rounded text-red-200 font-mono">{p.troops.length} Units</span>
                   </div>
                 )}
               </div>
             );
          })()}

          {/* Controls */}
          <div className="absolute top-24 left-4 z-20 flex flex-col gap-2">
            <button onClick={(e) => { e.stopPropagation(); setViewState(p => ({...p, scale: Math.min(p.scale + 0.2, 4)})) }} className="w-10 h-10 bg-black/50 border border-stone-600 rounded text-stone-200 shadow hover:bg-black/70 font-bold text-xl backdrop-blur">+</button>
            <button onClick={(e) => { e.stopPropagation(); setViewState(p => ({...p, scale: Math.max(p.scale - 0.2, 0.4)})) }} className="w-10 h-10 bg-black/50 border border-stone-600 rounded text-stone-200 shadow hover:bg-black/70 font-bold text-xl backdrop-blur">-</button>
            <div className="h-4"></div>
            {/* Map Mode Switcher */}
            <div className="flex flex-col gap-1 bg-black/60 p-2 rounded border border-stone-700 backdrop-blur">
                <button onClick={(e) => { e.stopPropagation(); setGameState(p => ({...p, mapMode: MapMode.POLITICAL}))}} className={`w-8 h-8 rounded flex items-center justify-center text-xs ${gameState.mapMode === MapMode.POLITICAL ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-400'}`} title="Political Map">👑</button>
                <button onClick={(e) => { e.stopPropagation(); setGameState(p => ({...p, mapMode: MapMode.TERRAIN}))}} className={`w-8 h-8 rounded flex items-center justify-center text-xs ${gameState.mapMode === MapMode.TERRAIN ? 'bg-green-600 text-white' : 'bg-stone-800 text-stone-400'}`} title="Terrain Map">🏔️</button>
                <button onClick={(e) => { e.stopPropagation(); setGameState(p => ({...p, mapMode: MapMode.ECONOMY}))}} className={`w-8 h-8 rounded flex items-center justify-center text-xs ${gameState.mapMode === MapMode.ECONOMY ? 'bg-yellow-600 text-white' : 'bg-stone-800 text-stone-400'}`} title="Economic Map">💰</button>
            </div>
          </div>

          <svg width="100%" height="100%" className={`cursor-move ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}>
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`} style={{ willChange: 'transform' }}>
              <image href={MAP_BG_URL} x="0" y="0" width="1200" height="800" opacity="0.6" id="map-bg" />
              {mapContent}
            </g>
          </svg>
      </div>
    );
  };

  const renderMainMenu = () => {
    // If no faction selected, show selection
    if (!previewFactionId) {
        return (
            <div className="min-h-screen bg-[#0f0e0e] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Dynamic 2D Loop Animation Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <img 
                        src="https://image.pollinations.ai/prompt/ancient%20roman%20forum%20animated%20style%202d%20digital%20art%20bustling%20market%20detailed%20atmospheric?width=1280&height=720&nologo=true" 
                        className="absolute inset-0 w-full h-full object-cover animate-ken-burns opacity-40" 
                        alt="Background"
                    />
                    <div className="fog-layer"></div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black"></div>
                
                <div className="absolute top-0 w-full p-8 flex justify-between items-center z-10">
                    <h1 className="text-5xl font-bold text-white tracking-[0.3em] font-serif text-shadow-gold border-b-2 border-orange-900/50 pb-4">IMPERIUM AETERNA</h1>
                </div>
                
                <div className="z-10 text-center mb-8">
                    <h2 className="text-xl text-orange-500 font-serif tracking-widest uppercase">Select your Empire</h2>
                </div>

                <div className="flex gap-8 overflow-x-auto w-full max-w-[90vw] px-8 py-12 snap-x no-scrollbar pb-16 z-10 items-center h-[60vh]">
                    {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS && f.id !== FactionId.NEUTRAL).map(f => (
                        <div key={f.id} onClick={() => setPreviewFactionId(f.id)} className="min-w-[300px] h-[450px] bg-[#1c1917] rounded-sm border-2 border-[#292524] overflow-hidden relative group cursor-pointer hover:border-orange-600 transition-all snap-center hover:-translate-y-4 duration-500 shadow-2xl hover:shadow-orange-900/50">
                            <div className="h-full relative">
                                <img src={f.images.leader} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100 grayscale group-hover:grayscale-0" alt={f.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                
                                <div className="absolute bottom-0 w-full p-6 flex flex-col items-center text-center">
                                    <h2 className="text-3xl font-serif text-white font-bold mb-1 drop-shadow-lg">{f.name}</h2>
                                    <p className="text-orange-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">{f.leaderName}</p>
                                    <div className="text-xs text-stone-400 italic opacity-0 group-hover:opacity-100 transition-opacity">Click to View</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Modal view "Egypt Style"
    const f = gameState.factions[previewFactionId];
    const stats = FACTION_STATS[previewFactionId];

    return (
      <div className="min-h-screen bg-[#0f0e0e] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 z-0"></div>
        
        {/* Top Navigation */}
        <div className="absolute top-0 w-full p-8 flex justify-between items-center z-20">
             <button onClick={() => setPreviewFactionId(null)} className="bg-[#1c1917] border border-[#444] w-12 h-12 flex items-center justify-center rounded text-2xl text-stone-400 hover:text-white hover:border-orange-500 transition-all">←</button>
             <h1 className="text-4xl text-[#fbbf24] font-serif font-bold tracking-[0.1em] text-shadow-gold">CHOOSE EMPIRE</h1>
             <button className="bg-[#1c1917] border border-[#444] w-12 h-12 flex items-center justify-center rounded text-2xl text-stone-400 hover:text-white">⚙️</button>
        </div>

        {/* Main Content Card */}
        <div className="z-10 flex flex-col md:flex-row gap-8 w-full max-w-6xl h-[70vh] items-center">
            
            {/* Left: Leader Card */}
            <div className="h-[600px] w-full md:w-[400px] relative border-4 border-[#fbbf24] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.2)] bg-black">
                 {/* Corner Ornaments */}
                 <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#fbbf24] z-20"></div>
                 <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#fbbf24] z-20"></div>
                 <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#fbbf24] z-20"></div>
                 <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#fbbf24] z-20"></div>
                 
                 <img src={f.images.leader} className="w-full h-full object-cover opacity-90" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                 
                 <div className="absolute bottom-10 w-full text-center">
                     <h2 className="text-5xl font-serif text-[#fef3c7] font-bold drop-shadow-lg mb-2">{f.name}</h2>
                     <div className="flex items-center justify-center gap-4">
                        <div className="h-[1px] w-12 bg-[#fbbf24]"></div>
                        <p className="text-[#fbbf24] text-lg uppercase tracking-[0.2em]">{f.leaderName}</p>
                        <div className="h-[1px] w-12 bg-[#fbbf24]"></div>
                     </div>
                 </div>
            </div>

            {/* Right: Info Panel */}
            <div className="flex-1 h-[600px] flex flex-col pt-8">
                 {/* Tabs (Visual only for now, could be interactive) */}
                 <div className="flex gap-12 border-b border-[#444] mb-8 pb-4 mx-4">
                     <span className="text-[#fbbf24] font-bold uppercase tracking-widest border-b-2 border-[#fbbf24] pb-4 px-2">Stats</span>
                     <span className="text-stone-500 font-bold uppercase tracking-widest hover:text-stone-300 cursor-pointer pb-4 px-2">Units</span>
                     <span className="text-stone-500 font-bold uppercase tracking-widest hover:text-stone-300 cursor-pointer pb-4 px-2">Lore</span>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="bg-[#1c1917] border border-[#fbbf24]/30 rounded-lg p-6 flex flex-col items-center text-center shadow-lg bg-gradient-to-b from-[#292524] to-[#1c1917]">
                         <span className="text-4xl mb-3 text-[#fbbf24]">⚔️</span>
                         <span className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Military</span>
                         <span className="text-3xl font-serif text-white">{stats?.military || 50}</span>
                     </div>
                     <div className="bg-[#1c1917] border border-[#fbbf24]/30 rounded-lg p-6 flex flex-col items-center text-center shadow-lg bg-gradient-to-b from-[#292524] to-[#1c1917]">
                         <span className="text-4xl mb-3 text-[#fbbf24]">🏭</span>
                         <span className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Industry</span>
                         <span className="text-3xl font-serif text-white">{stats?.industry || 50}</span>
                     </div>
                     <div className="bg-[#1c1917] border border-[#fbbf24]/30 rounded-lg p-6 flex flex-col items-center text-center shadow-lg bg-gradient-to-b from-[#292524] to-[#1c1917]">
                         <span className="text-4xl mb-3 text-[#fbbf24]">📦</span>
                         <span className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Culture</span>
                         <span className="text-3xl font-serif text-white">{stats?.culture || 50}</span>
                     </div>
                 </div>

                 {/* Unique Unit Section */}
                 <div className="bg-[#1c1917] border border-stone-700 rounded-lg p-1 flex mb-8 h-32 relative group overflow-hidden">
                     <div className="w-32 h-full shrink-0 relative">
                         <img src={stats?.unitImage || "https://image.pollinations.ai/prompt/roman%20gladius%20sword?width=200&height=200&nologo=true"} className="w-full h-full object-cover rounded-l" />
                         <div className="absolute inset-0 border border-[#fbbf24]/50 rounded-l"></div>
                     </div>
                     <div className="p-4 flex flex-col justify-center">
                         <h3 className="text-[#fef3c7] font-serif text-xl font-bold mb-1">{stats?.unitName || 'Legionary'}</h3>
                         <p className="text-stone-400 text-xs leading-relaxed">{stats?.unitDesc || 'Standard infantry unit.'}</p>
                     </div>
                 </div>

                 <div className="mt-auto flex justify-center">
                     <button 
                        onClick={() => startGame(previewFactionId!)} 
                        className="bg-gradient-to-b from-[#f59e0b] to-[#ea580c] w-full max-w-md py-4 rounded-lg border-t border-[#fcd34d] shadow-[0_4px_20px_rgba(234,88,12,0.4)] text-white font-bold text-xl uppercase tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-4"
                     >
                         <span>⚔️</span> Start Conquest
                     </button>
                 </div>
            </div>
        </div>
      </div>
    );
  };

  const renderProvincePanel = () => {
    if (!gameState.selectedProvinceId) return null;
    const p = gameState.provinces.find(prov => prov.id === gameState.selectedProvinceId);
    if (!p) return null;

    const owner = gameState.factions[p.ownerId];
    const isOwner = p.ownerId === gameState.playerFactionId;
    const isNeighbor = gameState.provinces
        .filter(prov => prov.ownerId === gameState.playerFactionId)
        .some(prov => prov.neighbors.includes(p.id));

    return (
        <div className="absolute top-28 left-4 w-96 max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#1c1917]/95 border border-[#444] rounded-lg shadow-2xl backdrop-blur-md animate-in slide-in-from-left-4 duration-300 custom-scrollbar z-30">
            {/* Header with Image Background */}
            <div className="h-32 relative group">
                 {/* Fallback image or procedural logic */}
                 <div className={`absolute inset-0 bg-gradient-to-b ${p.terrain === 'FOREST' ? 'from-green-900' : p.terrain === 'DESERT' ? 'from-amber-900' : 'from-stone-800'} to-[#1c1917] opacity-80`}></div>
                 <div className="absolute bottom-4 left-6 z-10">
                    <h2 className="text-3xl font-serif text-white font-bold drop-shadow-md">{p.name}</h2>
                    <span className="text-orange-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: owner.color}}></span>
                        {owner.name} Province
                    </span>
                 </div>
                 <button onClick={() => selectProvince(null)} className="absolute top-2 right-2 text-stone-400 hover:text-white w-8 h-8 flex items-center justify-center bg-black/50 rounded-full">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#333]">
                <button onClick={() => setProvinceTab('OVERVIEW')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${provinceTab === 'OVERVIEW' ? 'text-orange-500 border-b-2 border-orange-500 bg-white/5' : 'text-stone-500 hover:text-stone-300'}`}>Overview</button>
                <button onClick={() => setProvinceTab('ECONOMY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${provinceTab === 'ECONOMY' ? 'text-orange-500 border-b-2 border-orange-500 bg-white/5' : 'text-stone-500 hover:text-stone-300'}`}>Economy</button>
                <button onClick={() => setProvinceTab('MILITARY')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest ${provinceTab === 'MILITARY' ? 'text-orange-500 border-b-2 border-orange-500 bg-white/5' : 'text-stone-500 hover:text-stone-300'}`}>Military</button>
            </div>

            <div className="p-6 space-y-6">
                {provinceTab === 'OVERVIEW' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/40 p-3 rounded border border-stone-700">
                                <span className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Tax Income</span>
                                <span className="text-xl text-[#fbbf24] font-serif font-bold">+{p.resourceValue}</span>
                            </div>
                            <div className="bg-black/40 p-3 rounded border border-stone-700">
                                <span className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Manpower</span>
                                <span className="text-xl text-blue-400 font-serif font-bold">+{p.manpowerValue}</span>
                            </div>
                             <div className="bg-black/40 p-3 rounded border border-stone-700">
                                <span className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Terrain</span>
                                <span className="text-white font-serif">{TERRAIN_ICONS[p.terrain]} {p.terrain}</span>
                            </div>
                             <div className="bg-black/40 p-3 rounded border border-stone-700">
                                <span className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Defense</span>
                                <span className="text-white font-serif">+{p.defenseBonus * 10}%</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3 pt-4 border-t border-[#333]">
                            {!isOwner && isNeighbor && (
                                <Button onClick={declareWarAttack} variant="danger" className="w-full py-4 text-lg shadow-lg shadow-red-900/20">⚔️ Declare War</Button>
                            )}
                            {!isOwner && p.ownerId === FactionId.NEUTRAL && isNeighbor && (
                                <Button onClick={colonizeProvince} variant="success" className="w-full py-3">Colonize (200 Gold)</Button>
                            )}
                            {isOwner && (
                                <Button onClick={startRelocation} variant="neutral" className="w-full py-3 border-emerald-700 text-emerald-100 hover:bg-emerald-900">Move Army (Select Target)</Button>
                            )}
                        </div>
                    </>
                )}

                {provinceTab === 'ECONOMY' && isOwner && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">Construction</h4>
                            {p.currentConstruction ? (
                                <div className="bg-stone-800 p-4 rounded border border-stone-600">
                                    <div className="flex justify-between mb-2 text-sm">
                                        <span>Building {p.currentConstruction.name}...</span>
                                        <span className="text-orange-400">{p.currentConstruction.progress}/{p.currentConstruction.total} Turns</span>
                                    </div>
                                    <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500" style={{width: `${(p.currentConstruction.progress/p.currentConstruction.total)*100}%`}}></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.values(BUILDINGS).map((b: Building) => {
                                        const canAfford = gameState.factions[gameState.playerFactionId!].gold >= b.cost;
                                        const hasBuilt = p.buildings.includes(b.id);
                                        return (
                                            <button 
                                                key={b.id} 
                                                onClick={() => startBuilding(b.id)} 
                                                disabled={!canAfford || hasBuilt}
                                                className={`flex items-center gap-3 p-3 rounded border text-left transition-all ${hasBuilt ? 'bg-green-900/20 border-green-800 opacity-60' : 'bg-stone-800 border-stone-700 hover:border-orange-500'}`}
                                            >
                                                <div className="text-2xl">{b.icon}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-stone-200">{b.name}</div>
                                                    <div className="text-[10px] text-stone-500">{b.description}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-orange-400 font-bold text-xs">{b.cost}</div>
                                                    {hasBuilt && <div className="text-green-500 text-[10px]">Built</div>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                 {provinceTab === 'MILITARY' && (
                    <div className="space-y-4">
                        <div className="bg-stone-900/50 p-4 rounded border border-stone-700 min-h-[100px]">
                             <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-3 flex justify-between">
                                 <span>Garrison</span>
                                 <span>{p.troops.length}/8</span>
                             </h4>
                             <div className="space-y-2">
                                {p.troops.length === 0 && <span className="text-stone-600 text-sm italic text-center block py-4">No troops stationed here.</span>}
                                {p.troops.map((u, i) => (
                                    <div key={i} className="flex items-center justify-between bg-black/40 p-2 rounded border border-stone-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{UNIT_ICONS[u.type]}</span>
                                            <div>
                                                <div className="text-sm font-bold text-stone-300">{u.name}</div>
                                                <div className="text-[10px] text-stone-500">HP: {u.hp}/{u.maxHp} | DMG: {u.damage}</div>
                                            </div>
                                        </div>
                                        <div className="h-1 w-12 bg-red-900/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>

                        {isOwner && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {Object.keys(UNIT_TYPES).filter(k => k !== 'MILITIA').map((typeKey) => {
                                    const type = typeKey as UnitType;
                                    const u = UNIT_TYPES[type];
                                    const canAfford = gameState.factions[gameState.playerFactionId!].gold >= u.cost && gameState.factions[gameState.playerFactionId!].manpower >= u.manpower;
                                    return (
                                        <button 
                                            key={type} 
                                            onClick={() => recruitUnit(type)} 
                                            disabled={!canAfford}
                                            className="bg-stone-800 hover:bg-stone-700 border border-stone-600 p-2 rounded flex flex-col items-center gap-1 disabled:opacity-50"
                                        >
                                            <span className="text-2xl">{UNIT_ICONS[type]}</span>
                                            <span className="text-[10px] font-bold text-stone-300">{u.name}</span>
                                            <span className="text-[10px] text-orange-400">{u.cost} G / {u.manpower} MP</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
  };

  const renderBattleDashboard = () => {
      if (!gameState.activeBattle) return null;
      const battle = gameState.activeBattle;
      const attacker = gameState.factions[battle.attackerId];
      const defender = gameState.factions[battle.defenderId];
      const battleProv = gameState.provinces.find(p => p.id === battle.provinceId);

      return (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in duration-500">
            <div className="w-full max-w-5xl h-[80vh] bg-[#1c1917] border-2 border-orange-900/50 rounded-xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Battle Header */}
                <div className="h-24 bg-gradient-to-r from-red-900/40 via-black to-blue-900/40 border-b border-[#333] flex items-center justify-between px-12 shrink-0">
                    <div className="flex items-center gap-4">
                        <img src={attacker.images.leader} className="w-16 h-16 rounded-full border-2 border-red-500 object-cover" />
                        <div>
                             <div className="text-red-500 font-bold uppercase tracking-widest text-xs">Attacker</div>
                             <div className="text-2xl font-serif text-white">{attacker.name}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-3xl font-serif text-stone-500 font-bold">VS</div>
                        <div className="text-xs text-stone-600 uppercase tracking-widest">Battle of {battleProv?.name}</div>
                    </div>
                     <div className="flex items-center gap-4 text-right">
                        <div>
                             <div className="text-blue-500 font-bold uppercase tracking-widest text-xs">Defender</div>
                             <div className="text-2xl font-serif text-white">{defender.name}</div>
                        </div>
                        <img src={defender.images.leader} className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover" />
                    </div>
                </div>

                {/* Battlefield Visual */}
                <div className="flex-1 bg-[url('https://image.pollinations.ai/prompt/ancient%20battlefield%20panorama%20armies%20clashing%20dust%20cinematic?width=1024&height=512&nologo=true')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/60"></div>
                    
                    {/* Unit Cards */}
                    <div className="absolute inset-0 flex justify-between items-center px-20">
                        {/* Attacker Stack */}
                        <div className="w-64 space-y-2">
                             {battle.attackerUnits.slice(0, 5).map((u, i) => (
                                 <div key={u.id} className={`bg-red-900/80 border border-red-700 p-3 rounded flex items-center gap-3 transition-all duration-300 ${i === 0 ? 'scale-110 shadow-[0_0_20px_rgba(220,38,38,0.5)] z-10 translate-x-4' : 'opacity-60 grayscale'}`}>
                                     <span className="text-2xl">{UNIT_ICONS[u.type]}</span>
                                     <div className="flex-1">
                                         <div className="font-bold text-white text-sm">{u.name}</div>
                                         <div className="h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                                             <div className="h-full bg-red-500 transition-all duration-300" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {battle.attackerUnits.length > 5 && <div className="text-center text-red-400 font-bold">+{battle.attackerUnits.length - 5} Reserves</div>}
                        </div>

                        {/* Combat Animation Area */}
                        <div className="flex-1 flex justify-center items-center h-full relative">
                             {battleAnimState === 'clashing' && (
                                 <div className="absolute text-6xl animate-ping opacity-70">💥</div>
                             )}
                        </div>

                        {/* Defender Stack */}
                        <div className="w-64 space-y-2">
                             {battle.defenderUnits.slice(0, 5).map((u, i) => (
                                 <div key={u.id} className={`bg-blue-900/80 border border-blue-700 p-3 rounded flex items-center gap-3 flex-row-reverse text-right transition-all duration-300 ${i === 0 ? 'scale-110 shadow-[0_0_20px_rgba(37,99,235,0.5)] z-10 -translate-x-4' : 'opacity-60 grayscale'}`}>
                                     <span className="text-2xl">{UNIT_ICONS[u.type]}</span>
                                     <div className="flex-1">
                                         <div className="font-bold text-white text-sm">{u.name}</div>
                                         <div className="h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                                             <div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                              {battle.defenderUnits.length > 5 && <div className="text-center text-blue-400 font-bold">+{battle.defenderUnits.length - 5} Reserves</div>}
                        </div>
                    </div>
                </div>

                {/* Log & Controls */}
                <div className="h-48 bg-[#151515] border-t border-[#333] flex">
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-stone-400 space-y-1 custom-scrollbar">
                        {battle.logs.map((log, i) => (
                            <div key={i} className="border-l-2 border-stone-700 pl-2">{log}</div>
                        ))}
                    </div>
                    <div className="w-64 border-l border-[#333] p-6 flex flex-col gap-4 justify-center bg-[#1c1917]">
                        {!battle.winner ? (
                            <>
                                <button 
                                    onClick={() => setBattleSpeed(prev => prev === 200 ? null : 200)} 
                                    className={`py-3 rounded font-bold uppercase text-sm border transition-all ${battleSpeed ? 'bg-orange-600 text-white border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.5)] animate-pulse' : 'bg-stone-800 text-stone-400 border-stone-600 hover:text-white'}`}
                                >
                                    {battleSpeed ? 'Fighting...' : 'Start Round'}
                                </button>
                                <button onClick={() => triggerBattleRound()} className="py-3 rounded font-bold uppercase text-sm bg-stone-700 text-white hover:bg-stone-600">Manual Resolve</button>
                            </>
                        ) : (
                            <button onClick={endBattle} className="py-4 bg-green-700 text-white font-bold uppercase tracking-widest rounded shadow-lg hover:bg-green-600">View Results</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderTechTreeModal = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    const tree = TECH_TREES[player.group];

    return (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-full h-24 bg-[#1c1917] flex items-center justify-between px-8 border-b border-[#333]">
                <div className="flex items-center gap-6">
                     <button onClick={() => setShowTechTree(false)} className="text-stone-400 hover:text-white flex items-center gap-2 font-bold uppercase tracking-widest"><span>←</span> Return</button>
                     <h2 className="text-3xl font-serif text-white uppercase tracking-widest text-shadow-gold">Imperial Archives</h2>
                </div>
            </div>
             <div className="w-full max-w-6xl mt-8 px-4 flex gap-4">
                {[TechCategory.MILITARY, TechCategory.ECONOMIC, TechCategory.ADMIN].map(cat => (
                    <button key={cat} onClick={() => setTechTab(cat)} className={`flex-1 py-4 rounded font-bold uppercase text-sm tracking-widest transition-all border ${techTab === cat ? 'bg-orange-700 text-white border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-[#1c1917] text-stone-500 border-[#333] hover:bg-[#262626]'}`}>{cat}</button>
                ))}
            </div>
            <div className="w-full max-w-6xl mt-8 px-4 flex-1 overflow-y-auto pb-20 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {tree.filter(t => t.category === techTab).map(tech => {
                        const unlocked = player.unlockedTechs.includes(tech.id);
                        const canUnlock = !unlocked && (tech.prerequisiteId === null || player.unlockedTechs.includes(tech.prerequisiteId));
                        return (
                            <div key={tech.id} className={`bg-[#18181b] p-0 rounded-xl border-2 ${unlocked ? 'border-orange-500/50' : 'border-[#262626]'} relative group overflow-hidden shadow-2xl transition-transform hover:scale-[1.01]`}>
                                <div className="h-48 w-full relative">
                                    <img src={tech.image} className={`w-full h-full object-cover ${!unlocked ? 'grayscale opacity-30' : 'opacity-80'}`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] to-transparent"></div>
                                    <div className="absolute bottom-4 left-6">
                                        <h4 className={`text-2xl font-bold font-serif ${unlocked ? 'text-orange-400' : 'text-stone-300'}`}>{tech.name}</h4>
                                    </div>
                                    <div className="absolute top-4 right-4 text-3xl drop-shadow-lg">
                                        {unlocked ? '✅' : canUnlock ? '🔓' : '🔒'}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-stone-400 mb-6 h-12 leading-relaxed">{tech.description}</p>
                                    <div className="flex items-center justify-between border-t border-[#333] pt-6">
                                        <span className="text-orange-500 font-bold text-lg">{tech.cost} Gold</span>
                                        {!unlocked && canUnlock && <Button onClick={() => buyTech(tech)} className="py-2 px-6">Research</Button>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderPauseMenu = () => {
      if(!gameState.isPaused) return null;
      return (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
              <div className="w-80 flex flex-col gap-6 bg-[#1c1917] p-8 rounded-xl border border-[#444] shadow-2xl">
                  <h2 className="text-center text-white font-serif text-3xl border-b border-[#444] pb-4">PAUSED</h2>
                  <Button onClick={() => setGameState(p => ({...p, isPaused: false}))} className="py-4">Resume Campaign</Button>
                  <Button variant="neutral" onClick={() => setGameState(p => ({...p, phase: Phase.MAIN_MENU, isPaused: false, playerFactionId: null}))} className="py-4">Abandon to Menu</Button>
              </div>
          </div>
      );
  };

  // --- CONDITIONAL RETURN ---
  if (gameState.phase === Phase.MAIN_MENU) {
      return renderMainMenu();
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-stone-950 font-sans text-stone-200 select-none">
      {renderMap()}
      {gameState.playerFactionId && (
            <>
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black via-black/80 to-transparent flex items-center justify-between px-8 z-30 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4 mt-2">
                     <button onClick={() => setGameState(p => ({...p, isPaused: true}))} className="w-14 h-14 rounded-full bg-[#1c1917]/80 backdrop-blur border border-[#444] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-700 transition-all shadow-lg text-2xl">☰</button>
                     <div className="flex items-center gap-6 bg-[#1c1917]/80 backdrop-blur-md px-8 py-3 rounded-full border border-[#444] shadow-2xl">
                        <img src={gameState.factions[gameState.playerFactionId].images.leader} className="w-12 h-12 rounded-full border-2 border-orange-600 object-cover" alt="Leader" />
                        <div className="flex flex-col">
                            <span className="font-serif font-bold text-white tracking-wide text-xl leading-none text-shadow">{gameState.factions[gameState.playerFactionId].name}</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">{gameState.factions[gameState.playerFactionId].leaderName}</span>
                        </div>
                        <div className="w-px h-10 bg-[#444]"></div>
                        <div className="flex gap-8">
                            <span className="text-orange-400 font-bold text-xl flex items-center gap-2"><span className="text-2xl">☧</span> {gameState.factions[gameState.playerFactionId].gold}</span>
                            <span className="text-blue-400 font-bold text-xl flex items-center gap-2"><span className="text-2xl">👥</span> {gameState.factions[gameState.playerFactionId].manpower}</span>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-auto flex gap-4 mt-2">
                     {gameState.moveSourceId && <Button onClick={() => setGameState(p => ({...p, moveSourceId: null}))} variant="danger" className="py-4 px-8 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse font-bold text-sm">Cancel March</Button>}
                     <button onClick={() => setShowTechTree(true)} className="w-14 h-14 rounded-full bg-[#1c1917]/80 backdrop-blur border border-[#444] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-700 transition-all shadow-lg text-2xl" title="Technology">⚡</button>
                     <button onClick={endTurn} className="w-14 h-14 rounded-full bg-orange-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(194,65,12,0.6)] hover:bg-orange-600 transition-transform hover:scale-110 border-2 border-orange-500 font-bold text-2xl" title="End Turn">➤</button>
                </div>
            </div>
            {renderProvincePanel()}
            </>
      )}
      {showTechTree && renderTechTreeModal()} 
      {gameState.modalMessage && (
            <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8 animate-in fade-in duration-500 backdrop-blur-sm">
                <div className="max-w-xl w-full bg-[#1c1917] border-2 border-orange-900/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-center">
                    {gameState.modalMessage.image && (
                        <div className="h-56 w-full relative">
                            <img src={gameState.modalMessage.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent"></div>
                        </div>
                    )}
                    <div className="p-10">
                        <h2 className="text-4xl font-serif text-orange-500 font-bold mb-4 tracking-widest text-shadow-gold">{gameState.modalMessage.title}</h2>
                        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-orange-900 to-transparent mx-auto mb-6"></div>
                        <p className="text-stone-300 mb-10 text-lg font-serif leading-relaxed">{gameState.modalMessage.body}</p>
                        <Button onClick={() => setGameState(prev => ({...prev, modalMessage: null}))} className="w-full py-4 text-lg">Accept Destiny</Button>
                    </div>
                </div>
            </div>
      )}
      {renderPauseMenu()}
      {gameState.phase === Phase.BATTLE && renderBattleDashboard()}
    </div>
  );
}

export default App;