import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  GameState, Phase, FactionId, Faction, Province, Unit, BattleState, 
  TechCategory, Technology, RoguelikeTrait, UnitType, TerrainType, MapMode
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
    primary: "bg-orange-700 hover:bg-orange-600 border-orange-500 text-orange-50",
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
  
  const [showTechTree, setShowTechTree] = useState(false);
  const [provinceTab, setProvinceTab] = useState<'OVERVIEW' | 'ECONOMY' | 'MILITARY'>('OVERVIEW');
  const [techTab, setTechTab] = useState<TechCategory>(TechCategory.MILITARY);
  
  const [battleSpeed, setBattleSpeed] = useState<number | null>(null); 
  const [battleAnimState, setBattleAnimState] = useState<'idle' | 'clashing'>('idle');

  const mapRef = useRef<HTMLDivElement>(null);

  const provinceShapes = useMemo(() => {
    const shapes: Record<string, string> = {};
    INITIAL_PROVINCES.forEach(p => {
        shapes[p.id] = generateTerritoryPath(p.id, p.x, p.y, 40); // Larger radius
    });
    return shapes;
  }, []);

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

  const toggleDecree = (decreeId: string) => {
      if (!gameState.selectedProvinceId) return;
      const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
      const newProvinces = [...gameState.provinces];
      
      if (newProvinces[provIndex].activeDecreeId === decreeId) {
          newProvinces[provIndex].activeDecreeId = null; 
      } else {
          newProvinces[provIndex].activeDecreeId = decreeId; 
      }

      setGameState(prev => ({...prev, provinces: newProvinces}));
  };

  const disbandUnit = (unitIndex: number) => {
     if (!gameState.selectedProvinceId) return;
     const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
     const prov = gameState.provinces[provIndex];
     
     const unit = prov.troops[unitIndex];
     const manpowerRefund = Math.floor(UNIT_TYPES[unit.type].manpower * 0.5);
     
     const newProvinces = [...gameState.provinces];
     newProvinces[provIndex].troops = prov.troops.filter((_, i) => i !== unitIndex);

     const newFactions = {...gameState.factions};
     if(gameState.playerFactionId) {
         newFactions[gameState.playerFactionId].manpower += manpowerRefund;
     }

     setGameState(prev => ({
         ...prev,
         provinces: newProvinces,
         factions: newFactions,
         logs: [`Disbanded ${unit.name}, recovered ${manpowerRefund} manpower.`, ...prev.logs]
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
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
              
              {/* Real Map Background */}
              <image href={MAP_BG_URL} x="0" y="0" width="1200" height="800" opacity="0.6" id="map-bg" />
              
              {/* Connections (Trade Routes) */}
              {gameState.provinces.map(p => 
                p.neighbors.map(nId => {
                  const n = gameState.provinces.find(prov => prov.id === nId);
                  if (!n || p.id > nId) return null; 
                  return (
                    <path 
                        key={`${p.id}-${n.id}`} 
                        d={`M ${p.x} ${p.y} Q ${(p.x + n.x)/2} ${(p.y+n.y)/2 + 20} ${n.x} ${n.y}`}
                        stroke="#000" 
                        strokeWidth="1" 
                        strokeDasharray="4,4" 
                        opacity="0.3"
                        fill="none"
                    />
                  );
                })
              )}

              {/* Provinces */}
              {gameState.provinces.map(p => {
                const owner = gameState.factions[p.ownerId];
                const isSelected = gameState.selectedProvinceId === p.id;
                
                // Relocation Target Logic
                let isRelocationTarget = false;
                if (gameState.moveSourceId) {
                    const source = gameState.provinces.find(prov => prov.id === gameState.moveSourceId);
                    if (source && source.neighbors.includes(p.id) && p.ownerId === gameState.playerFactionId) isRelocationTarget = true;
                }

                const pathData = provinceShapes[p.id];

                // Determine Fill based on Map Mode
                let fillColor = owner.color;
                let fillOpacity = 0.6;
                let patternFill = '';

                if (gameState.mapMode === MapMode.POLITICAL) {
                    fillColor = owner.color;
                    fillOpacity = p.ownerId === FactionId.NEUTRAL ? 0.2 : 0.6;
                } else if (gameState.mapMode === MapMode.TERRAIN) {
                    fillOpacity = 0.7;
                    if (p.terrain === TerrainType.FOREST) fillColor = '#166534';
                    else if (p.terrain === TerrainType.HILLS) fillColor = '#a16207';
                    else if (p.terrain === TerrainType.MOUNTAIN) fillColor = '#57534e';
                    else if (p.terrain === TerrainType.DESERT) fillColor = '#d97706';
                    else fillColor = '#65a30d'; // Plains
                } else if (gameState.mapMode === MapMode.ECONOMY) {
                    const value = p.resourceValue;
                    // Heatmap logic
                    const intensity = Math.min(value * 5, 255);
                    fillColor = `rgb(255, ${255 - intensity}, 0)`;
                    fillOpacity = 0.5;
                }

                // Terrain Overlay always visible slightly
                if(p.terrain === TerrainType.FOREST) patternFill = 'url(#pat-forest)';
                if(p.terrain === TerrainType.MOUNTAIN) patternFill = 'url(#pat-mountain)';
                if(p.terrain === TerrainType.HILLS) patternFill = 'url(#pat-hills)';
                if(p.terrain === TerrainType.DESERT) patternFill = 'url(#pat-desert)';

                return (
                  <g key={p.id} onClick={(e) => { e.stopPropagation(); selectProvince(p.id); }} className="hover:opacity-90 transition-opacity group">
                    {/* The Territory Blob */}
                    <path 
                        d={pathData} 
                        fill={fillColor} 
                        stroke={isSelected ? '#fff' : '#000'}
                        strokeWidth={isSelected ? 4 : 1}
                        strokeOpacity={isSelected ? 1 : 0.3}
                        fillOpacity={fillOpacity}
                        className="transition-all duration-300 drop-shadow-md"
                    />
                    
                    {/* Pattern Overlay */}
                    {patternFill && (
                        <path d={pathData} fill={patternFill} stroke="none" pointerEvents="none" opacity="0.3" />
                    )}

                    {/* Selection Rings */}
                    {isSelected && (
                        <circle cx={p.x} cy={p.y} r={45} stroke="white" strokeWidth="2" strokeDasharray="5,5" fill="none" className="animate-spin-slow opacity-80" />
                    )}
                    {isRelocationTarget && (
                        <>
                         <circle cx={p.x} cy={p.y} r={40} stroke="#10b981" strokeWidth="3" fill="none" className="animate-pulse" />
                         <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="16" className="animate-bounce">⬇️</text>
                        </>
                    )}

                    {/* ARMY BADGE - Dynamic Visuals */}
                    {p.troops.length > 0 ? (
                        <g className="transition-transform duration-200 hover:scale-125 cursor-pointer">
                           {/* Shield / Badge Shape */}
                           <circle cx={p.x} cy={p.y} r={12} fill="#b91c1c" stroke="#fff" strokeWidth="2" className="drop-shadow-lg shadow-black" />
                           <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="#7f1d1d" strokeWidth="1" />
                           
                           {/* Unit Count */}
                           <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="900" style={{fontFamily: 'monospace'}} className="pointer-events-none select-none text-shadow-sm">{p.troops.length}</text>
                        </g>
                    ) : (
                        <circle cx={p.x} cy={p.y} r={3} fill="#000" opacity="0.3" pointerEvents="none" />
                    )}
                    
                    {/* PROVINCE NAME - High Readability */}
                    <text 
                        x={p.x} 
                        y={p.y + 35} 
                        textAnchor="middle" 
                        fontSize="10" 
                        className="map-text pointer-events-none select-none uppercase tracking-widest"
                    >
                        {p.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
      </div>
    );
  };

  const renderProvincePanel = () => {
      if (!gameState.selectedProvinceId) return null;
      const p = gameState.provinces.find(prov => prov.id === gameState.selectedProvinceId);
      if (!p) return null;
      const owner = gameState.factions[p.ownerId];
      const isPlayer = p.ownerId === gameState.playerFactionId;

      return (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-[#1c1917]/90 backdrop-blur-md border border-[#444] rounded-xl shadow-2xl z-30 animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="h-28 bg-stone-800 relative shrink-0">
                <img src={owner.images.background || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"} className="w-full h-full object-cover opacity-60 mask-image-b" alt="city" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent"></div>
                <button onClick={() => selectProvince(null)} className="absolute top-2 right-2 text-white hover:text-red-500 font-bold bg-black/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
                <div className="absolute bottom-4 left-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-2xl border border-stone-600 backdrop-blur">{TERRAIN_ICONS[p.terrain]}</div>
                            <div>
                                <div className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-0.5">{owner.name} Province</div>
                                <div className="text-white font-serif text-3xl leading-none tracking-wide text-shadow">{p.name}</div>
                            </div>
                        </div>
                </div>
            </div>

            <div className="flex border-b border-[#333] bg-[#000]/30">
                {(['OVERVIEW', 'ECONOMY', 'MILITARY'] as const).map(tab => (
                    <button key={tab} onClick={() => setProvinceTab(tab)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${provinceTab === tab ? 'text-orange-500 border-b-2 border-orange-500 bg-white/5' : 'text-stone-500 hover:text-stone-300'}`}>{tab}</button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {provinceTab === 'OVERVIEW' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#262626]/50 p-4 rounded-lg border border-[#333] text-center backdrop-blur-sm hover:border-orange-900/50 transition-colors">
                                <div className="text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1">Base Tax</div>
                                <div className="text-2xl text-orange-400 font-serif font-bold">{p.resourceValue}</div>
                            </div>
                            <div className="bg-[#262626]/50 p-4 rounded-lg border border-[#333] text-center backdrop-blur-sm hover:border-blue-900/50 transition-colors">
                                <div className="text-stone-400 text-[10px] uppercase font-bold tracking-wider mb-1">Manpower</div>
                                <div className="text-2xl text-blue-400 font-serif font-bold">{p.manpowerValue}</div>
                            </div>
                        </div>
                         <div>
                            <div className="text-xs text-stone-500 uppercase font-bold mb-3 flex justify-between items-center">
                                <span>Garrison</span>
                                <span className="bg-[#333] px-2 py-0.5 rounded text-[10px] text-white">{p.troops.length}/8</span>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[3rem] bg-black/20 p-2 rounded-lg border border-[#333] border-dashed">
                                {p.troops.length === 0 && <span className="text-stone-600 text-xs italic m-auto">No garrison stationed.</span>}
                                {p.troops.map((u, i) => (
                                    <Tooltip key={i} text={`${u.name} (${u.hp} HP)`}>
                                        <div className="w-9 h-9 bg-stone-800/80 rounded flex items-center justify-center text-lg border border-stone-600 cursor-help shadow hover:scale-110 transition-transform">{UNIT_ICONS[u.type]}</div>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2">
                            {isPlayer ? (
                                <Button onClick={startRelocation} className="w-full py-3 text-sm shadow-orange-900/20">Movement Orders</Button>
                            ) : (
                                p.ownerId === FactionId.NEUTRAL && p.troops.length === 0 ? (
                                    <Button onClick={colonizeProvince} variant="success" className="w-full py-3">Colonize (200g)</Button>
                                ) : (
                                    <Button onClick={declareWarAttack} variant="danger" className="w-full py-3">Declare War</Button>
                                )
                            )}
                        </div>
                    </div>
                )}
                {/* Economy and Military tabs omitted for brevity but logic exists in previous implementation */}
                {provinceTab === 'ECONOMY' && (
                     <div className="space-y-3">
                         {isPlayer && Object.values(BUILDINGS).filter(b => !p.buildings.includes(b.id)).map(b => (
                            <button key={b.id} onClick={() => startBuilding(b.id)} disabled={gameState.factions[p.ownerId].gold < b.cost} className="w-full flex justify-between bg-[#111]/50 p-3 rounded border border-[#333] hover:bg-[#222] group transition-all disabled:opacity-50">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{b.icon}</span>
                                    <div className="text-left"><div className="text-xs font-bold text-stone-200 group-hover:text-white">{b.name}</div><div className="text-[9px] text-stone-500">{b.description}</div></div>
                                </div>
                                <div className="text-orange-500 text-xs font-bold bg-orange-900/20 px-2 py-1 rounded border border-orange-900/30 h-fit">{b.cost}g</div>
                            </button>
                         ))}
                     </div>
                )}
                {provinceTab === 'MILITARY' && (
                     <div className="space-y-3">
                         {isPlayer && (['INFANTRY', 'ARCHER', 'CAVALRY'] as UnitType[]).map(type => (
                             <button key={type} onClick={() => recruitUnit(type)} className="w-full flex justify-between bg-[#111]/50 p-3 rounded border border-[#333] hover:bg-[#222] group transition-all">
                                 <div className="flex items-center gap-3">
                                     <span className="text-2xl">{UNIT_ICONS[type]}</span>
                                     <div className="text-left"><div className="text-xs font-bold text-stone-200">{UNIT_TYPES[type].name}</div><div className="text-[9px] text-stone-500 flex gap-2"><span>⚔️ {UNIT_TYPES[type].damage}</span></div></div>
                                 </div>
                                 <div className="text-right"><div className="text-orange-500 text-xs font-bold">{UNIT_TYPES[type].cost}g</div></div>
                             </button>
                         ))}
                     </div>
                )}
            </div>
        </div>
      );
  };

  const renderBattleDashboard = () => {
    if (!gameState.activeBattle) return null;
    const active = gameState.activeBattle;
    const attacker = gameState.factions[active.attackerId];
    const defender = gameState.factions[active.defenderId];
    const province = gameState.provinces.find(p => p.id === active.provinceId);
    
    // Stats
    const atkTotalHp = active.attackerUnits.reduce((a, b) => a + b.hp, 0);
    const atkMaxHp = active.attackerUnits.reduce((a, b) => a + b.maxHp, 0);
    const defTotalHp = active.defenderUnits.reduce((a, b) => a + b.hp, 0);
    const defMaxHp = active.defenderUnits.reduce((a, b) => a + b.maxHp, 0);

    // Formations
    const atkFrontline = active.attackerUnits.slice(0, 4);
    const atkReserves = active.attackerUnits.slice(4);
    const defFrontline = active.defenderUnits.slice(0, 4);
    const defReserves = active.defenderUnits.slice(4);

    return (
        <div className="absolute inset-0 z-40 bg-[#0c0a09] flex flex-col animate-in fade-in duration-300">
             {/* Battle Header */}
             <div className="h-20 border-b border-[#333] bg-[#1c1917] flex items-center justify-between px-8 shadow-xl z-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="text-stone-500 text-xs uppercase tracking-widest font-bold">Battle of</div>
                    <div className="text-3xl font-serif text-white text-shadow">{province?.name}</div>
                    <div className="px-3 py-1 bg-[#333]/80 backdrop-blur rounded text-xs text-stone-300 flex items-center gap-2 border border-[#444] ml-4">
                        <span className="text-lg">{province ? TERRAIN_ICONS[province.terrain] : ''}</span>
                        <span className="uppercase font-bold tracking-wider">{province?.terrain}</span>
                    </div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="text-center bg-black/40 px-4 py-2 rounded border border-white/10">
                        <div className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">Round</div>
                        <div className="text-2xl font-mono text-white">{active.round}</div>
                    </div>
                </div>
             </div>

             {/* Main Dashboard */}
             <div className="flex-1 flex overflow-hidden">
                {/* LEFT: ATTACKER */}
                <div className="w-[30%] bg-[#111] border-r border-[#222] flex flex-col relative">
                    <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>
                    <div className="p-6 border-b border-[#222] bg-[#151515] relative">
                        <div className="flex items-center gap-4 mb-4">
                             <img src={attacker.images.leader} className="w-16 h-16 rounded-lg border-2 border-blue-600 object-cover shadow-lg" />
                             <div>
                                 <div className="text-blue-500 font-bold uppercase text-xs tracking-widest mb-1">Attacker</div>
                                 <div className="text-2xl font-serif text-white leading-none">{attacker.name}</div>
                                 <div className="text-stone-500 text-xs mt-1">{attacker.leaderName}</div>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between text-xs text-stone-400 font-bold uppercase"><span>Strength</span> <span>{Math.floor((atkTotalHp/atkMaxHp)*100)}%</span></div>
                             <div className="w-full h-2 bg-[#000] rounded-full overflow-hidden border border-[#333]">
                                  <div className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{width: `${(atkTotalHp/atkMaxHp)*100}%`}}></div>
                             </div>
                        </div>
                    </div>
                    
                    {/* Reserves List */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="text-xs text-stone-600 uppercase font-bold mb-3 border-b border-[#333] pb-1">Reserves ({atkReserves.length})</div>
                        <div className="grid grid-cols-1 gap-2">
                            {atkReserves.map(u => (
                                <div key={u.id} className="bg-[#1c1917]/80 p-2 rounded border border-[#333] flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="text-lg grayscale">{UNIT_ICONS[u.type]}</div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-stone-400">{u.name}</div>
                                        <div className="w-full h-1 bg-black rounded mt-1"><div className="h-full bg-green-900" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER: BATTLEFIELD */}
                <div className="flex-1 bg-stone-900 relative flex flex-col">
                     {/* Background Image */}
                     <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale"></div>
                     <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a09] via-transparent to-[#0c0a09]"></div>

                     {/* Frontlines Container */}
                     <div className="relative z-10 flex-1 flex items-center justify-center px-12 gap-8">
                         
                         {/* Attacker Frontline (Left) */}
                         <div className="flex flex-col gap-4 items-end">
                             {atkFrontline.map((u, i) => (
                                 <div key={u.id} className={`w-64 h-20 bg-[#1c1917]/90 backdrop-blur border-l-4 border-blue-600 rounded-r shadow-2xl flex items-center p-3 gap-4 transition-transform ${i===0 && battleAnimState === 'clashing' ? 'translate-x-12 scale-105' : ''} ${i===0 ? 'ring-2 ring-blue-500/30' : ''}`}>
                                     <div className="w-12 h-12 bg-blue-900/20 rounded flex items-center justify-center text-2xl border border-blue-900/50">{UNIT_ICONS[u.type]}</div>
                                     <div className="flex-1">
                                         <div className="text-sm font-bold text-white">{u.name}</div>
                                         <div className="flex justify-between text-xs text-stone-400 mt-1">
                                             <span>HP: {u.hp}/{u.maxHp}</span>
                                             <span className="text-red-400 font-mono">DMG: {u.damage}</span>
                                         </div>
                                         <div className="w-full h-1.5 bg-black rounded-full mt-2 overflow-hidden">
                                             <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {atkFrontline.length === 0 && <div className="text-stone-500 font-bold italic text-center w-64 bg-black/50 p-2 rounded">Frontline Collapsed</div>}
                         </div>

                         {/* VS Marker */}
                         <div className="w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                         {/* Defender Frontline (Right) */}
                         <div className="flex flex-col gap-4 items-start">
                             {defFrontline.map((u, i) => (
                                 <div key={u.id} className={`w-64 h-20 bg-[#1c1917]/90 backdrop-blur border-r-4 border-red-600 rounded-l shadow-2xl flex flex-row-reverse items-center p-3 gap-4 transition-transform ${i===0 && battleAnimState === 'clashing' ? '-translate-x-12 scale-105' : ''} ${i===0 ? 'ring-2 ring-red-500/30' : ''}`}>
                                     <div className="w-12 h-12 bg-red-900/20 rounded flex items-center justify-center text-2xl border border-red-900/50">{UNIT_ICONS[u.type]}</div>
                                     <div className="flex-1 text-right">
                                         <div className="text-sm font-bold text-white">{u.name}</div>
                                         <div className="flex justify-between text-xs text-stone-400 mt-1 flex-row-reverse">
                                             <span>HP: {u.hp}/{u.maxHp}</span>
                                             <span className="text-red-400 font-mono">DMG: {u.damage}</span>
                                         </div>
                                         <div className="w-full h-1.5 bg-black rounded-full mt-2 overflow-hidden flex justify-end">
                                             <div className="h-full bg-gradient-to-l from-green-600 to-green-400" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {defFrontline.length === 0 && <div className="text-stone-500 font-bold italic text-center w-64 bg-black/50 p-2 rounded">Frontline Collapsed</div>}
                         </div>

                     </div>

                     {/* Controls Bar */}
                     <div className="h-24 bg-[#111] border-t border-[#333] relative z-20 flex items-center justify-center gap-6">
                          {!active.winner ? (
                             <>
                                <Button onClick={triggerBattleRound} disabled={battleSpeed !== null} className="w-48 py-4 text-sm bg-gradient-to-r from-orange-800 to-orange-600">⚔️ Engage Round</Button>
                                <Button variant="neutral" onClick={() => setBattleSpeed(800)} className="w-48 py-4 text-sm">▶ Auto Resolve</Button>
                             </>
                          ) : (
                             <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom duration-500">
                                 <div className="text-xl font-bold text-orange-500 uppercase tracking-widest">{gameState.factions[active.winner].name} Victory</div>
                                 <Button onClick={endBattle} className="w-64 py-3">View Results</Button>
                             </div>
                          )}
                     </div>
                </div>

                {/* RIGHT: DEFENDER */}
                <div className="w-[30%] bg-[#111] border-l border-[#222] flex flex-col relative">
                    <div className="absolute inset-0 bg-red-900/10 pointer-events-none"></div>
                    <div className="p-6 border-b border-[#222] bg-[#151515] relative text-right">
                        <div className="flex items-center gap-4 mb-4 flex-row-reverse">
                             <img src={defender.images.leader} className="w-16 h-16 rounded-lg border-2 border-red-600 object-cover shadow-lg" />
                             <div>
                                 <div className="text-red-500 font-bold uppercase text-xs tracking-widest mb-1">Defender</div>
                                 <div className="text-2xl font-serif text-white leading-none">{defender.name}</div>
                                 <div className="text-stone-500 text-xs mt-1">{defender.leaderName}</div>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between text-xs text-stone-400 font-bold uppercase flex-row-reverse"><span>Strength</span> <span>{Math.floor((defTotalHp/defMaxHp)*100)}%</span></div>
                             <div className="w-full h-2 bg-[#000] rounded-full overflow-hidden border border-[#333] flex justify-end">
                                  <div className="h-full bg-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{width: `${(defTotalHp/defMaxHp)*100}%`}}></div>
                             </div>
                        </div>
                    </div>
                     {/* Reserves List */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="text-xs text-stone-600 uppercase font-bold mb-3 border-b border-[#333] pb-1 text-right">Reserves ({defReserves.length})</div>
                        <div className="grid grid-cols-1 gap-2">
                            {defReserves.map(u => (
                                <div key={u.id} className="bg-[#1c1917]/80 p-2 rounded border border-[#333] flex items-center gap-3 opacity-60 flex-row-reverse hover:opacity-100 transition-opacity">
                                    <div className="text-lg grayscale">{UNIT_ICONS[u.type]}</div>
                                    <div className="flex-1 text-right">
                                        <div className="text-xs font-bold text-stone-400">{u.name}</div>
                                        <div className="w-full h-1 bg-black rounded mt-1 flex justify-end"><div className="h-full bg-green-900" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
             
             {/* Battle Log */}
             <div className="h-32 bg-black border-t border-[#333] p-4 font-mono text-xs overflow-y-auto custom-scrollbar">
                 {active.logs.map((log, i) => (
                     <div key={i} className="text-stone-400 mb-1 border-b border-[#222] pb-1 last:border-0 flex gap-4">
                         <span className="text-orange-900 w-8">[{i+1}]</span>
                         <span>{log}</span>
                     </div>
                 ))}
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
                  <Button variant="neutral" onClick={() => setGameState(p => ({...p, phase: Phase.MAIN_MENU, isPaused: false}))} className="py-4">Abandon to Menu</Button>
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

  const renderHUD = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    return (
        <>
            {/* Top Bar - Glassmorphism */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black via-black/80 to-transparent flex items-center justify-between px-8 z-30 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4 mt-2">
                     <button onClick={() => setGameState(p => ({...p, isPaused: true}))} className="w-14 h-14 rounded-full bg-[#1c1917]/80 backdrop-blur border border-[#444] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-700 transition-all shadow-lg text-2xl">☰</button>
                     <div className="flex items-center gap-6 bg-[#1c1917]/80 backdrop-blur-md px-8 py-3 rounded-full border border-[#444] shadow-2xl">
                        <img src={player.images.leader} className="w-12 h-12 rounded-full border-2 border-orange-600 object-cover" alt="Leader" />
                        <div className="flex flex-col">
                            <span className="font-serif font-bold text-white tracking-wide text-xl leading-none text-shadow">{player.name}</span>
                            <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">{player.leaderName}</span>
                        </div>
                        <div className="w-px h-10 bg-[#444]"></div>
                        <div className="flex gap-8">
                            <span className="text-orange-400 font-bold text-xl flex items-center gap-2"><span className="text-2xl">☧</span> {player.gold}</span>
                            <span className="text-blue-400 font-bold text-xl flex items-center gap-2"><span className="text-2xl">👥</span> {player.manpower}</span>
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

            {/* Modal Overlay (Victory/Defeat) */}
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
        </>
    );
  }

  // --- MAIN RENDER ---

  if (gameState.phase === Phase.MAIN_MENU) {
    return (
      <div className="min-h-screen bg-[#0f0e0e] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Video/Image placeholder */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black"></div>
        <div className="absolute inset-0 clouds-overlay"></div>

        <div className="absolute top-0 w-full p-8 flex justify-between items-center z-10">
            <h1 className="text-5xl font-bold text-white tracking-[0.3em] font-serif text-shadow-gold border-b-2 border-orange-900/50 pb-4">IMPERIUM AETERNA</h1>
        </div>
        <div className="flex gap-8 overflow-x-auto w-full max-w-[90vw] px-8 py-12 snap-x no-scrollbar pb-16 z-10 items-center h-[75vh]">
            {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS && f.id !== FactionId.NEUTRAL).map(f => (
                <div key={f.id} onClick={() => startGame(f.id)} className="min-w-[400px] h-[600px] bg-[#1c1917] rounded-sm border-4 border-[#292524] overflow-hidden relative group cursor-pointer hover:border-orange-600 transition-all snap-center hover:-translate-y-4 duration-500 shadow-2xl">
                    <div className="h-full relative">
                        <img src={f.images.leader} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100" alt={f.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                        
                        <div className="absolute bottom-0 w-full p-8 flex flex-col items-center text-center">
                            <h2 className="text-6xl font-serif text-white font-bold mb-2 drop-shadow-lg">{f.name}</h2>
                            <p className="text-orange-500 font-bold uppercase tracking-[0.2em] text-sm mb-6">{f.leaderName}</p>
                            
                            <div className="grid grid-cols-3 gap-4 w-full mb-8 border-t border-white/10 pt-4">
                                <div><div className="text-2xl">⚔️</div><div className="text-[10px] uppercase text-stone-400 mt-1">Militancy</div></div>
                                <div><div className="text-2xl">🏛️</div><div className="text-[10px] uppercase text-stone-400 mt-1">Culture</div></div>
                                <div><div className="text-2xl">☧</div><div className="text-[10px] uppercase text-stone-400 mt-1">Wealth</div></div>
                            </div>

                            <button className="w-full py-5 bg-orange-700 group-hover:bg-orange-600 text-white font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 text-sm">
                                <span>Select Empire</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-stone-950 font-sans text-stone-200 select-none">
      {renderMap()}
      {renderHUD()}
      {showTechTree && renderTechTreeModal()}
      {renderPauseMenu()}
      {gameState.phase === Phase.BATTLE && renderBattleDashboard()}
    </div>
  );
}

export default App;