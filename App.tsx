import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Phase, FactionId, Faction, Province, Unit, BattleState, 
  TechCategory, Technology, RoguelikeTrait, UnitType
} from './types';
import { INITIAL_FACTIONS, INITIAL_PROVINCES, TECH_TREES, ROGUELIKE_TRAITS, BUILDINGS, DECREES, UNIT_TYPES } from './constants';

// --- UTILITY COMPONENTS ---

const Tooltip = ({ children, text }: { children?: React.ReactNode, text: string }) => (
  <div className="group relative flex items-center">
    {children}
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-xs bg-stone-900 text-stone-200 text-xs rounded p-2 border border-orange-700 shadow-xl z-50 pointer-events-none">
      {text}
    </div>
  </div>
);

const Button = ({ onClick, disabled, variant = 'primary', className = '', children }: any) => {
  const baseStyle = "font-serif font-bold py-3 px-6 rounded-lg shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm";
  const variants = {
    primary: "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-orange-900/20",
    neutral: "bg-[#2d2d2d] border border-[#404040] text-stone-300 hover:bg-[#404040]",
    danger: "bg-red-900 border border-red-700 text-red-100 hover:bg-red-800",
    success: "bg-emerald-800 border border-emerald-600 text-emerald-50 hover:bg-emerald-700"
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
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    year: 270, // BC
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
    isPaused: false
  });

  const [viewState, setViewState] = useState({ scale: 0.8, x: -100, y: -50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // UI Panels
  const [showTechTree, setShowTechTree] = useState(false);
  const [provinceTab, setProvinceTab] = useState<'OVERVIEW' | 'ECONOMY' | 'MILITARY'>('OVERVIEW');
  
  const [techTab, setTechTab] = useState<TechCategory>(TechCategory.MILITARY);
  const [battleSpeed, setBattleSpeed] = useState<number | null>(null); 
  const [battleAnimState, setBattleAnimState] = useState<'idle' | 'clashing'>('idle');

  const mapRef = useRef<HTMLDivElement>(null);

  // --- ACTIONS ---

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
      centerMapOn(capital.x, capital.y);
    }
  };

  const centerMapOn = (x: number, y: number) => {
    if (!mapRef.current) return;
    const width = mapRef.current.clientWidth;
    const height = mapRef.current.clientHeight;
    setViewState({
      scale: 1.5,
      x: (width / 2) - (x * 1.5),
      y: (height / 2) - (y * 1.5)
    });
  };

  // --- MAP CONTROLS ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.4, viewState.scale + scaleAmount), 4);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if map is clicked (not UI)
    if((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect') {
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

  // --- GAMEPLAY LOGIC ---

  const selectProvince = (id: string | null) => {
    if (gameState.phase !== Phase.CAMPAIGN) return;
    
    // Deselect if null passed or click background logic handled elsewhere
    if (!id) {
        setGameState(prev => ({ ...prev, selectedProvinceId: null, moveSourceId: null }));
        return;
    }

    if (gameState.moveSourceId) {
        // ... Move logic ...
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
        
        // --- PROVINCE INCOME CALC ---
        let goldMod = 1;
        let manpowerMod = 1;
        let stabilityMod = 0;

        // Traits
        owner.traits.forEach(t => {
            if(t.effectType === 'GOLD_MOD') goldMod += t.value;
            if(t.effectType === 'MANPOWER_MOD') manpowerMod += t.value;
        });

        // Buildings
        prov.buildings.forEach(bId => {
            const b = BUILDINGS[bId];
            if(b.effect.gold) goldMod += (b.effect.gold / 100); // simplified logic: flat gold treated as % or raw add
            // For this version let's say buildings add flat value to base, then multiply
        });
        
        // Decrees
        if (prov.activeDecreeId) {
            const d = DECREES[prov.activeDecreeId];
            owner.gold -= d.costPerTurn; // Cost
            // Apply Effects simplified
            if (prov.activeDecreeId === 'taxes') goldMod += 0.2;
            if (prov.activeDecreeId === 'levies') manpowerMod += 0.3;
        }

        const income = Math.floor(prov.resourceValue * goldMod);
        const manpower = Math.floor(prov.manpowerValue * manpowerMod);

        owner.gold += income;
        owner.manpower += manpower;
        
        // Construction Progress
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

    // Simple AI Recruitment
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
          newProvinces[provIndex].activeDecreeId = null; // Disable
      } else {
          newProvinces[provIndex].activeDecreeId = decreeId; // Enable
      }

      setGameState(prev => ({...prev, provinces: newProvinces}));
  };

  const disbandUnit = (unitIndex: number) => {
     if (!gameState.selectedProvinceId) return;
     const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
     const prov = gameState.provinces[provIndex];
     
     // Refund some manpower
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

  // ... (Colonize, Attack, Battle Logic - same as before but simplified for brevity in this response unless changes needed)
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
      const attackingProv = ownedProvinces.find(p => p.neighbors.includes(targetProv.id));
      if (!attackingProv || attackingProv.troops.length === 0) { addLog("No nearby troops."); return; }
      
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
          activeBattle: { attackerId: prev.playerFactionId!, defenderId: targetProv.ownerId, provinceId: targetProv.id, attackerUnits: attackers, defenderUnits: defenders, round: 0, logs: ['Battle started!'], winner: null }
      }));
  };

  const triggerBattleRound = useCallback(() => {
    setBattleAnimState('clashing');
    setTimeout(() => {
        setGameState(prev => {
            if (!prev.activeBattle || prev.activeBattle.winner) return prev;
            const battle = { ...prev.activeBattle };
            
            const dmg = battle.attackerUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);
            const defDmg = battle.defenderUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);

            if (battle.defenderUnits.length > 0) {
                battle.defenderUnits[0].hp -= Math.floor(dmg);
                if (battle.defenderUnits[0].hp <= 0) battle.defenderUnits.shift();
            }
            if (battle.attackerUnits.length > 0) {
                battle.attackerUnits[0].hp -= Math.floor(defDmg);
                if (battle.attackerUnits[0].hp <= 0) battle.attackerUnits.shift();
            }
            battle.round++;
            battle.logs = [`R${battle.round}: -${Math.floor(dmg)} vs -${Math.floor(defDmg)}`, ...battle.logs.slice(0, 5)];

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
          modalMessage: { title: isPlayerWinner ? "VICTORY" : "DEFEAT", body: isPlayerWinner ? "Secured." : "Defeated.", image: isPlayerWinner ? "https://image.pollinations.ai/prompt/roman%20legion%20triumph%20parade%20golden%20lighting%20victory?width=600&height=400&nologo=true" : "https://image.pollinations.ai/prompt/ancient%20battlefield%20defeat%20ruins%20fire%20smoke?width=600&height=400&nologo=true" }
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
        className="w-full h-full overflow-hidden bg-[#1c1917] relative bg-stone-pattern" 
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => selectProvince(null)} // Background click deselects
      >
          {/* Controls */}
          <div className="absolute top-24 left-4 z-10 flex flex-col gap-2">
            <button onClick={(e) => { e.stopPropagation(); setViewState(p => ({...p, scale: Math.min(p.scale + 0.2, 4)})) }} className="w-10 h-10 bg-stone-900 border border-stone-700 rounded text-stone-200 shadow hover:bg-stone-800 font-bold text-xl">+</button>
            <button onClick={(e) => { e.stopPropagation(); setViewState(p => ({...p, scale: Math.max(p.scale - 0.2, 0.4)})) }} className="w-10 h-10 bg-stone-900 border border-stone-700 rounded text-stone-200 shadow hover:bg-stone-800 font-bold text-xl">-</button>
          </div>

          <svg width="100%" height="100%" className={`cursor-move ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}>
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
              {gameState.provinces.map(p => 
                p.neighbors.map(nId => {
                  const n = gameState.provinces.find(prov => prov.id === nId);
                  if (!n || p.id > nId) return null; 
                  const isOwnedPath = p.ownerId === n.ownerId && p.ownerId === gameState.playerFactionId;
                  return (
                    <line key={`${p.id}-${n.id}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke={isOwnedPath ? '#ea580c' : '#44403c'} strokeWidth={isOwnedPath ? "3" : "1"} strokeDasharray={isOwnedPath ? "" : "5,5"} opacity="0.6" />
                  );
                })
              )}
              {gameState.provinces.map(p => {
                const owner = gameState.factions[p.ownerId];
                const isSelected = gameState.selectedProvinceId === p.id;
                let isRelocationTarget = false;
                if (gameState.moveSourceId) {
                    const source = gameState.provinces.find(prov => prov.id === gameState.moveSourceId);
                    if (source && source.neighbors.includes(p.id) && p.ownerId === gameState.playerFactionId) isRelocationTarget = true;
                }
                const opacity = gameState.moveSourceId && !isRelocationTarget && gameState.moveSourceId !== p.id ? 0.3 : 1;
                const isNeutral = p.ownerId === FactionId.NEUTRAL;
                
                return (
                  <g key={p.id} onClick={(e) => { e.stopPropagation(); selectProvince(p.id); }} style={{ opacity }}>
                    {isSelected && <circle cx={p.x} cy={p.y} r={35} fill={isNeutral ? '#fff' : '#ea580c'} opacity="0.2" className="animate-pulse"/>}
                    {isRelocationTarget && <circle cx={p.x} cy={p.y} r={30} stroke="#10b981" strokeWidth="3" fill="none" className="animate-pulse"/>}
                    <circle cx={p.x} cy={p.y} r={16} fill={owner.color} stroke={isSelected ? '#ea580c' : '#1c1917'} strokeWidth={isSelected ? 3 : 2} className="shadow-xl" />
                    {p.troops.length > 0 && (
                       <text x={p.x} y={p.y + 4} textAnchor="middle" fill={owner.textColor} fontSize="12" fontWeight="bold">⚔️</text>
                    )}
                    <text x={p.x} y={p.y + 35} textAnchor="middle" fill="#a8a29e" fontSize="10" className={`pointer-events-none font-bold select-none text-shadow ${isSelected ? 'text-white' : ''}`}>{p.name}</text>
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
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-[#1c1917] border border-[#333] rounded-xl shadow-2xl z-30 animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="h-24 bg-stone-800 relative shrink-0">
                <img src={owner.images.background || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop"} className="w-full h-full object-cover opacity-50" alt="city" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent"></div>
                <div className="absolute top-2 right-2">
                     <button onClick={() => selectProvince(null)} className="text-white hover:text-red-500 font-bold bg-black/50 rounded-full w-8 h-8">✕</button>
                </div>
                <div className="absolute bottom-4 left-4">
                        <div className="text-xs text-orange-500 font-bold uppercase tracking-wider">{owner.name} Province</div>
                        <div className="text-white font-serif text-2xl leading-none">{p.name}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#333] bg-[#262626]">
                {(['OVERVIEW', 'ECONOMY', 'MILITARY'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setProvinceTab(tab)}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${provinceTab === tab ? 'text-orange-500 border-b-2 border-orange-500 bg-[#333]' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#1c1917]">
                
                {/* OVERVIEW TAB */}
                {provinceTab === 'OVERVIEW' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#262626] p-3 rounded border border-[#333] text-center">
                                <div className="text-stone-400 text-xs uppercase">Base Tax</div>
                                <div className="text-xl text-orange-400 font-bold">{p.resourceValue}</div>
                            </div>
                            <div className="bg-[#262626] p-3 rounded border border-[#333] text-center">
                                <div className="text-stone-400 text-xs uppercase">Manpower</div>
                                <div className="text-xl text-blue-400 font-bold">{p.manpowerValue}</div>
                            </div>
                        </div>

                        {/* Garrison Preview */}
                         <div>
                            <div className="text-xs text-stone-500 uppercase font-bold mb-2">Garrison ({p.troops.length})</div>
                            <div className="flex flex-wrap gap-2">
                                {p.troops.length === 0 && <span className="text-stone-600 text-xs italic">No garrison.</span>}
                                {p.troops.map((u, i) => (
                                    <div key={i} className="w-8 h-8 bg-[#333] rounded flex items-center justify-center text-xs" title={u.name}>🛡️</div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2">
                            {isPlayer ? (
                                <Button onClick={startRelocation} className="w-full py-2 text-xs">Relocate Army</Button>
                            ) : (
                                p.ownerId === FactionId.NEUTRAL && p.troops.length === 0 ? (
                                    <Button onClick={colonizeProvince} variant="success" className="w-full py-2 text-xs">Colonize (200g)</Button>
                                ) : (
                                    <Button onClick={declareWarAttack} variant="danger" className="w-full py-2 text-xs">Attack</Button>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* ECONOMY TAB */}
                {provinceTab === 'ECONOMY' && (
                    <div className="space-y-6">
                        {/* Buildings */}
                        <div>
                            <div className="text-xs text-stone-500 uppercase font-bold mb-2">Buildings</div>
                            <div className="space-y-2">
                                {p.buildings.map(bId => (
                                    <div key={bId} className="flex items-center gap-3 bg-[#262626] p-2 rounded border border-green-900/50">
                                        <div className="text-xl">{BUILDINGS[bId].icon}</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">{BUILDINGS[bId].name}</div>
                                        </div>
                                        <div className="text-green-500 text-xs">Active</div>
                                    </div>
                                ))}
                                {p.currentConstruction && (
                                    <div className="flex items-center gap-3 bg-[#262626] p-2 rounded border border-orange-900/50">
                                        <div className="text-xl">🏗️</div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">{p.currentConstruction.name}</div>
                                            <div className="w-full h-1 bg-black rounded mt-1"><div className="h-full bg-orange-500" style={{width: `${(p.currentConstruction.progress/p.currentConstruction.total)*100}%`}}></div></div>
                                        </div>
                                        <div className="text-orange-500 text-xs">{p.currentConstruction.total - p.currentConstruction.progress}t</div>
                                    </div>
                                )}
                            </div>
                            
                            {isPlayer && !p.currentConstruction && (
                                <div className="mt-4 grid grid-cols-1 gap-2">
                                    {Object.values(BUILDINGS).filter(b => !p.buildings.includes(b.id)).map(b => (
                                        <button key={b.id} onClick={() => startBuilding(b.id)} disabled={gameState.factions[p.ownerId].gold < b.cost} className="flex items-center justify-between bg-[#111] hover:bg-[#222] p-2 rounded border border-[#333] group disabled:opacity-50">
                                            <div className="flex items-center gap-2">
                                                <span>{b.icon}</span>
                                                <div className="text-left">
                                                    <div className="text-xs font-bold text-stone-300 group-hover:text-white">{b.name}</div>
                                                    <div className="text-[9px] text-stone-500">{b.description}</div>
                                                </div>
                                            </div>
                                            <span className="text-orange-500 text-xs font-bold">{b.cost}g</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Decrees */}
                        {isPlayer && (
                            <div>
                                <div className="text-xs text-stone-500 uppercase font-bold mb-2">Decrees</div>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.values(DECREES).map(d => (
                                        <button key={d.id} onClick={() => toggleDecree(d.id)} className={`flex items-center justify-between p-2 rounded border transition-colors ${p.activeDecreeId === d.id ? 'bg-orange-900/20 border-orange-500' : 'bg-[#111] border-[#333] hover:bg-[#222]'}`}>
                                            <div className="text-left">
                                                <div className={`text-xs font-bold ${p.activeDecreeId === d.id ? 'text-orange-400' : 'text-stone-300'}`}>{d.name}</div>
                                                <div className="text-[9px] text-stone-500">{d.description}</div>
                                            </div>
                                            <div className={`w-4 h-4 rounded-full border ${p.activeDecreeId === d.id ? 'bg-orange-500 border-orange-500' : 'border-stone-600'}`}></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MILITARY TAB */}
                {provinceTab === 'MILITARY' && (
                    <div className="space-y-6">
                         {/* Existing Units */}
                        <div>
                            <div className="text-xs text-stone-500 uppercase font-bold mb-2">Regiments</div>
                            <div className="space-y-2">
                                {p.troops.map((u, i) => (
                                    <div key={u.id} className="flex justify-between items-center bg-[#262626] p-2 rounded border border-[#333]">
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg">🛡️</div>
                                            <div>
                                                <div className="text-xs font-bold text-white">{u.name}</div>
                                                <div className="text-[9px] text-stone-400">{u.hp}/{u.maxHp} HP</div>
                                            </div>
                                        </div>
                                        {isPlayer && <button onClick={() => disbandUnit(i)} className="text-[10px] text-red-500 hover:text-red-400 border border-red-900 px-2 py-1 rounded">Disband</button>}
                                    </div>
                                ))}
                                {p.troops.length === 0 && <div className="text-stone-600 text-xs italic text-center p-4">No units stationed here.</div>}
                            </div>
                        </div>

                        {/* Recruitment */}
                        {isPlayer && (
                            <div>
                                <div className="text-xs text-stone-500 uppercase font-bold mb-2">Recruitment</div>
                                <div className="grid grid-cols-1 gap-2">
                                    {(['INFANTRY', 'ARCHER', 'CAVALRY'] as UnitType[]).map(type => {
                                        const stats = UNIT_TYPES[type];
                                        const canAfford = owner.gold >= stats.cost && owner.manpower >= stats.manpower;
                                        return (
                                            <button key={type} onClick={() => recruitUnit(type)} disabled={!canAfford} className="flex items-center justify-between bg-[#111] hover:bg-[#222] p-2 rounded border border-[#333] group disabled:opacity-50 text-left">
                                                <div>
                                                    <div className="text-xs font-bold text-stone-300 group-hover:text-white">{stats.name}</div>
                                                    <div className="text-[9px] text-stone-500 flex gap-2">
                                                        <span>⚔️ {stats.damage}</span>
                                                        <span>♥ {stats.hp}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-orange-500 text-xs font-bold">{stats.cost}g</div>
                                                    <div className="text-blue-500 text-[9px] font-bold">{stats.manpower} mp</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
      );
  };

  // --- RENDERING MODALS ---

  const renderPauseMenu = () => {
      if(!gameState.isPaused) return null;
      return (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center animate-in fade-in duration-200">
              <div className="w-64 flex flex-col gap-4">
                  <h2 className="text-center text-white font-serif text-2xl mb-4">PAUSED</h2>
                  <Button onClick={() => setGameState(p => ({...p, isPaused: false}))}>Resume</Button>
                  <Button variant="neutral" onClick={() => setGameState(p => ({...p, phase: Phase.MAIN_MENU, isPaused: false}))}>Exit to Menu</Button>
              </div>
          </div>
      );
  };

  const renderTechTreeModal = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    const tree = TECH_TREES[player.group];

    return (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center animate-in fade-in duration-300">
            {/* Header */}
            <div className="w-full h-16 bg-[#1a1a1a] flex items-center justify-between px-6 border-b border-[#333]">
                <div className="flex items-center gap-4">
                     <button onClick={() => setShowTechTree(false)} className="text-stone-400 hover:text-white flex items-center gap-2"><span>←</span> Back</button>
                     <h2 className="text-xl font-serif text-white uppercase tracking-widest">Imperial Archives</h2>
                </div>
            </div>
            {/* Grid Content ... (Same as before but simplified for length) */}
             <div className="w-full max-w-4xl mt-6 px-4 flex gap-4">
                {[TechCategory.MILITARY, TechCategory.ECONOMIC, TechCategory.ADMIN].map(cat => (
                    <button key={cat} onClick={() => setTechTab(cat)} className={`flex-1 py-3 rounded-full font-bold uppercase text-sm tracking-wider transition-all ${techTab === cat ? 'bg-[#ea580c] text-white' : 'bg-[#262626] text-stone-500'}`}>{cat}</button>
                ))}
            </div>
            <div className="w-full max-w-4xl mt-6 px-4 flex-1 overflow-y-auto pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tree.filter(t => t.category === techTab).map(tech => {
                        const unlocked = player.unlockedTechs.includes(tech.id);
                        const canUnlock = !unlocked && (tech.prerequisiteId === null || player.unlockedTechs.includes(tech.prerequisiteId));
                        return (
                            <div key={tech.id} className={`bg-[#1e1e1e] p-4 rounded-lg border ${unlocked ? 'border-orange-500/50' : 'border-[#333]'} relative group`}>
                                <div className="flex justify-between items-start">
                                    <h4 className={`text-lg font-bold ${unlocked ? 'text-orange-400' : 'text-stone-200'}`}>{tech.name}</h4>
                                    <div className={`text-xl ${unlocked ? 'text-green-500' : 'text-stone-600'}`}>{unlocked ? '✓' : canUnlock ? '🔓' : '🔒'}</div>
                                </div>
                                <p className="text-xs text-stone-500 mt-1">{tech.description}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-orange-600 text-xs font-bold">{tech.cost} Gold</span>
                                    {!unlocked && canUnlock && <Button onClick={() => buyTech(tech)} variant="primary" className="py-1 px-3 text-xs">Research</Button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderBattleModal = () => {
    if (!gameState.activeBattle) return null;
    const active = gameState.activeBattle;
    // ... Animation logic same ...
    const atkAnim = battleAnimState === 'clashing' ? 'translate-x-12 scale-105' : 'translate-x-0';
    const defAnim = battleAnimState === 'clashing' ? '-translate-x-12 scale-105' : '-translate-x-0';

    return (
        <div className="absolute inset-0 z-40 bg-black/95 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-[#1c1917] border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
                <div className="h-20 bg-[#151515] flex items-center justify-between px-8 border-b border-[#333]">
                     <h3 className="text-red-500 font-bold text-xl uppercase tracking-widest">Battle in Progress</h3>
                     <div className="text-stone-500 font-mono">Round {active.round}</div>
                </div>
                <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1533613220915-609f661a6fe1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    <div className="relative z-10 h-full flex items-center justify-around">
                         <div className={`text-center transition-transform duration-300 ${atkAnim}`}>
                             <div className="w-24 h-24 bg-blue-900 rounded-full border-4 border-blue-500 mx-auto flex items-center justify-center text-3xl mb-4">⚔️</div>
                             <div className="text-2xl font-serif text-white">{gameState.factions[active.attackerId].name}</div>
                             <div className="text-blue-400 font-bold mt-1">{active.attackerUnits.length} Regiments</div>
                         </div>
                         <div className="text-4xl font-bold text-orange-600 font-serif italic">VS</div>
                         <div className={`text-center transition-transform duration-300 ${defAnim}`}>
                             <div className="w-24 h-24 bg-red-900 rounded-full border-4 border-red-500 mx-auto flex items-center justify-center text-3xl mb-4">🛡️</div>
                             <div className="text-2xl font-serif text-white">{gameState.factions[active.defenderId].name}</div>
                             <div className="text-red-400 font-bold mt-1">{active.defenderUnits.length} Regiments</div>
                         </div>
                    </div>
                </div>
                <div className="p-6 bg-[#151515] border-t border-[#333] flex flex-col items-center gap-4">
                     <div className="h-8 overflow-hidden text-stone-400 text-sm">{active.logs[0]}</div>
                     {!active.winner ? (
                        <div className="flex gap-4">
                             <Button onClick={triggerBattleRound} disabled={battleSpeed !== null}>Step</Button>
                             <Button variant="neutral" onClick={() => setBattleSpeed(1000)}>Auto</Button>
                        </div>
                     ) : (
                        <Button onClick={endBattle} className="w-64 animate-pulse">Victory Secured</Button>
                     )}
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
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-6 z-30 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4 mt-4">
                     <button onClick={() => setGameState(p => ({...p, isPaused: true}))} className="w-10 h-10 rounded-full bg-[#1c1917] border border-[#333] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-600 transition-colors">☰</button>
                     <div className="flex items-center gap-4 bg-[#1c1917]/90 backdrop-blur-md px-6 py-2 rounded-full border border-[#333] shadow-2xl">
                        <img src={player.images.leader} className="w-8 h-8 rounded-full border border-orange-500 object-cover" alt="Leader" />
                        <span className="font-serif font-bold text-white tracking-wide">{player.name}</span>
                        <div className="w-px h-4 bg-[#444]"></div>
                        <span className="text-orange-400 font-bold">☧ {player.gold}</span>
                        <span className="text-blue-400 font-bold">👥 {player.manpower}</span>
                    </div>
                </div>

                <div className="pointer-events-auto flex gap-2 mt-4">
                     {gameState.moveSourceId && <Button onClick={() => setGameState(p => ({...p, moveSourceId: null}))} variant="danger" className="py-2 px-4 text-xs">Cancel Move</Button>}
                     <button onClick={() => setShowTechTree(true)} className="w-10 h-10 rounded-full bg-[#1c1917] border border-[#333] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-600 transition-colors">⚡</button>
                     <button onClick={endTurn} className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-900/50 hover:bg-orange-500 transition-colors">➤</button>
                </div>
            </div>

            {renderProvincePanel()}

            {/* Modal Overlay (Victory/Defeat) */}
            {gameState.modalMessage && (
                <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="max-w-xl w-full bg-[#1c1917] border border-orange-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-center">
                        {gameState.modalMessage.image && (
                            <div className="h-48 w-full relative">
                                <img src={gameState.modalMessage.image} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent"></div>
                            </div>
                        )}
                        <div className="p-8">
                            <h2 className="text-3xl font-serif text-orange-500 font-bold mb-4">{gameState.modalMessage.title}</h2>
                            <p className="text-stone-300 mb-8">{gameState.modalMessage.body}</p>
                            <Button onClick={() => setGameState(prev => ({...prev, modalMessage: null}))}>Continue</Button>
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
      <div className="min-h-screen bg-[#0f0e0e] flex flex-col items-center justify-center p-4">
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
            <h1 className="text-2xl font-bold text-white tracking-widest font-serif">IMPERIUM AETERNA</h1>
        </div>
        <div className="flex gap-6 overflow-x-auto w-full max-w-6xl px-4 py-8 snap-x no-scrollbar pb-12">
            {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS && f.id !== FactionId.NEUTRAL).map(f => (
                <div key={f.id} onClick={() => startGame(f.id)} className="min-w-[300px] md:min-w-[350px] bg-[#1c1917] rounded-3xl border border-[#333] overflow-hidden relative group cursor-pointer hover:border-orange-500 transition-all snap-center hover:scale-[1.02] duration-300">
                    <div className="h-96 relative">
                        <img src={f.images.leader} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={f.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h2 className="text-4xl font-serif text-white font-bold">{f.name}</h2>
                            <p className="text-orange-500 font-bold uppercase tracking-wider text-sm">{f.leaderName}</p>
                        </div>
                    </div>
                    <div className="p-6">
                         <button className="w-full py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-orange-900/30 transition-all flex items-center justify-center gap-2">Start Conquest <span>⚔️</span></button>
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
      {gameState.phase === Phase.BATTLE && renderBattleModal()}
    </div>
  );
}

export default App;