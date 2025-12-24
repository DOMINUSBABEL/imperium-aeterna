import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, Phase, FactionId, Faction, Province, Unit, BattleState, 
  TechCategory, Technology, RoguelikeTrait
} from './types';
import { INITIAL_FACTIONS, INITIAL_PROVINCES, TECH_TREES, ROGUELIKE_TRAITS } from './constants';

// --- UTILITY COMPONENTS ---

const Tooltip = ({ children, text }: { children?: React.ReactNode, text: string }) => (
  <div className="group relative flex items-center">
    {children}
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-xs bg-stone-900 text-stone-200 text-xs rounded p-2 border border-orange-700 shadow-xl z-50">
      {text}
    </div>
  </div>
);

// New modern button style
const Button = ({ onClick, disabled, variant = 'primary', className = '', children }: any) => {
  const baseStyle = "font-serif font-bold py-3 px-6 rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm";
  const variants = {
    primary: "bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-orange-900/20", // Orange
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
  });

  // UI State
  const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTechTree, setShowTechTree] = useState(false);
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
      turn: 1
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
      scale: 1.2,
      x: width / 2 - x * 1.2,
      y: height / 2 - y * 1.2
    });
  };

  // --- MAP CONTROLS ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, viewState.scale + scaleAmount), 3);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
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

  const selectProvince = (id: string) => {
    if (gameState.phase !== Phase.CAMPAIGN) return;

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
      if (owner) {
        let goldMod = 1;
        let manpowerMod = 1;
        owner.traits.forEach(t => {
            if(t.effectType === 'GOLD_MOD') goldMod += t.value;
            if(t.effectType === 'MANPOWER_MOD') manpowerMod += t.value;
        });

        const income = Math.floor(prov.resourceValue * goldMod);
        const manpower = Math.floor(prov.manpowerValue * manpowerMod);

        owner.gold += income;
        owner.manpower += manpower;
        
        // Construction Progress
        if (prov.currentConstruction) {
            prov.currentConstruction.progress += 1;
            if (prov.currentConstruction.progress >= prov.currentConstruction.total) {
                addLog(`${prov.currentConstruction.name} finished in ${prov.name}`);
                prov.currentConstruction = undefined; // Clear
            }
        }

        if (prov.hasRebellionRisk && Math.random() < 0.1) {
             return { ...prov, ownerId: FactionId.REBELS, hasRebellionRisk: false };
        }
      }
      return prov;
    });

    Object.keys(updatedFactions).forEach(fid => {
        const f = updatedFactions[fid as FactionId];
        if (!f.isPlayer && f.gold > 100) {
            f.gold -= 50;
            const aiProvs = updatedProvinces.filter(p => p.ownerId === fid);
            if (aiProvs.length > 0) {
                const target = aiProvs[Math.floor(Math.random() * aiProvs.length)];
                target.troops.push({
                    id: `unit_${Math.random()}`,
                    type: 'INFANTRY',
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

  const recruitUnit = () => {
    if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
    const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
    if (provIndex === -1) return;

    const prov = gameState.provinces[provIndex];
    const player = gameState.factions[gameState.playerFactionId];

    if (player.gold >= 50 && player.manpower >= 100) {
        const newUnit: Unit = {
            id: `u_${Date.now()}`,
            type: 'INFANTRY',
            hp: 100,
            maxHp: 100,
            damage: 15,
            ownerId: player.id
        };
        // Tech & Traits logic omitted for brevity
        const newFactions = { ...gameState.factions };
        newFactions[player.id].gold -= 50;
        newFactions[player.id].manpower -= 100;

        const newProvinces = [...gameState.provinces];
        newProvinces[provIndex].troops.push(newUnit);

        setGameState(prev => ({
            ...prev,
            factions: newFactions,
            provinces: newProvinces,
            logs: [`Recruited Infantry.`, ...prev.logs]
        }));
    }
  };

  const declareWarAttack = () => {
      if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
      const targetProv = gameState.provinces.find(p => p.id === gameState.selectedProvinceId);
      if (!targetProv || targetProv.ownerId === gameState.playerFactionId) return;

      const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
      const attackingProv = ownedProvinces.find(p => p.neighbors.includes(targetProv.id));
      
      if (!attackingProv || attackingProv.troops.length === 0) {
          addLog("No nearby troops to attack.");
          return;
      }

      const attackers = [...attackingProv.troops];
      const defenders = [...targetProv.troops];

      if (defenders.length === 0) {
          const newProvinces = gameState.provinces.map(p => {
              if (p.id === targetProv.id) return { ...p, ownerId: gameState.playerFactionId!, troops: attackers.slice(0, 1) };
              if (p.id === attackingProv.id) return { ...p, troops: attackers.slice(1) };
              return p;
          });
          setGameState(prev => ({
              ...prev,
              provinces: newProvinces,
              logs: [`Captured ${targetProv.name}!`, ...prev.logs]
          }));
          return;
      }

      setGameState(prev => ({
          ...prev,
          phase: Phase.BATTLE,
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

  // --- BATTLE LOGIC ---

  const triggerBattleRound = useCallback(() => {
    setBattleAnimState('clashing');
    setTimeout(() => {
        setGameState(prev => {
            if (!prev.activeBattle || prev.activeBattle.winner) return prev;
            const battle = { ...prev.activeBattle };
            const attacker = prev.factions[battle.attackerId];
            
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

      const newProvinces = gameState.provinces.map(p => {
          if (p.id === targetProvId) {
              if (winner === gameState.activeBattle!.attackerId) {
                  return { ...p, ownerId: winner, troops: gameState.activeBattle!.attackerUnits };
              } else {
                  return { ...p, troops: gameState.activeBattle!.defenderUnits };
              }
          }
           const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
           const attackingProv = ownedProvinces.find(prov => prov.neighbors.includes(targetProvId));

           if (winner === gameState.activeBattle?.attackerId && attackingProv && p.id === attackingProv.id) {
               return { ...p, troops: [] };
           }
          return p;
      });

      setGameState(prev => ({
          ...prev,
          phase: Phase.CAMPAIGN,
          provinces: newProvinces,
          activeBattle: null,
          logs: [`Winner: ${gameState.factions[winner].name}`, ...prev.logs]
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
      >
          {/* Map Controls */}
          <div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
            <button onClick={() => setViewState(p => ({...p, scale: Math.min(p.scale + 0.2, 3)}))} className="w-10 h-10 bg-stone-900 border border-stone-700 rounded text-stone-200 shadow hover:bg-stone-800 font-bold text-xl">+</button>
            <button onClick={() => setViewState(p => ({...p, scale: Math.max(p.scale - 0.2, 0.5)}))} className="w-10 h-10 bg-stone-900 border border-stone-700 rounded text-stone-200 shadow hover:bg-stone-800 font-bold text-xl">-</button>
          </div>

          <svg width="100%" height="100%" className="cursor-move">
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
              {gameState.provinces.map(p => 
                p.neighbors.map(nId => {
                  const n = gameState.provinces.find(prov => prov.id === nId);
                  if (!n || p.id > nId) return null; 
                  const isOwnedPath = p.ownerId === n.ownerId && p.ownerId === gameState.playerFactionId;
                  return (
                    <line key={`${p.id}-${n.id}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} 
                      stroke={isOwnedPath ? '#ea580c' : '#44403c'} 
                      strokeWidth={isOwnedPath ? "3" : "1"} 
                      strokeDasharray={isOwnedPath ? "" : "5,5"} opacity="0.6" 
                    />
                  );
                })
              )}
              
              {gameState.provinces.map(p => {
                const owner = gameState.factions[p.ownerId];
                const isSelected = gameState.selectedProvinceId === p.id;
                let isRelocationTarget = false;
                if (gameState.moveSourceId) {
                    const source = gameState.provinces.find(prov => prov.id === gameState.moveSourceId);
                    if (source && source.neighbors.includes(p.id) && p.ownerId === gameState.playerFactionId) {
                        isRelocationTarget = true;
                    }
                }
                const opacity = gameState.moveSourceId && !isRelocationTarget && gameState.moveSourceId !== p.id ? 0.3 : 1;
                
                return (
                  <g key={p.id} onClick={(e) => { e.stopPropagation(); selectProvince(p.id); }} style={{ opacity }}>
                    {isSelected && <circle cx={p.x} cy={p.y} r={35} fill="#ea580c" opacity="0.2" className="animate-pulse"/>}
                    {isRelocationTarget && <circle cx={p.x} cy={p.y} r={30} stroke="#10b981" strokeWidth="3" fill="none" className="animate-pulse"/>}
                    
                    <circle cx={p.x} cy={p.y} r={18} fill={owner.color} stroke={isSelected ? '#ea580c' : '#1c1917'} strokeWidth={isSelected ? 3 : 2} className="shadow-xl" />
                    
                    {p.troops.length > 0 && (
                       <text x={p.x} y={p.y + 4} textAnchor="middle" fill={owner.textColor} fontSize="12" fontWeight="bold">⚔️</text>
                    )}
                    <text x={p.x} y={p.y + 35} textAnchor="middle" fill="#d6d3d1" fontSize="12" className={`pointer-events-none font-bold select-none text-shadow ${isSelected ? 'text-orange-400' : ''}`}>{p.name}</text>
                  </g>
                );
              })}
            </g>
          </svg>
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
                     <button onClick={() => setShowTechTree(false)} className="text-stone-400 hover:text-white">←</button>
                     <h2 className="text-xl font-serif text-white uppercase tracking-widest">Imperial Archives</h2>
                </div>
                <div className="bg-[#2d2d2d] px-4 py-1 rounded-full text-sm text-orange-500 font-bold">
                    4,250 RP
                </div>
            </div>

            {/* Active Tech (Hero) */}
            <div className="w-full max-w-4xl mt-6 px-4">
                <div className="bg-[#262626] rounded-xl border border-[#404040] p-4 flex items-center gap-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-orange-900/50 text-orange-200 text-xs px-2 py-1 font-bold">ACTIVE</div>
                    <img src="https://images.unsplash.com/photo-1590625326543-b41464303d8d?q=80&w=400&auto=format&fit=crop" className="w-24 h-24 rounded-lg object-cover" alt="tech" />
                    <div className="flex-1">
                        <h3 className="text-2xl font-serif text-white">Iron Working</h3>
                        <p className="text-stone-400 text-sm mt-1">Allows creation of Swordsman units.</p>
                        <div className="mt-4 flex items-center gap-4 text-sm text-stone-300">
                            <span>⏳ 4 Turns Left</span>
                        </div>
                    </div>
                    <Button variant="primary">Speed Up</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="w-full max-w-4xl mt-6 px-4 flex gap-4">
                {[TechCategory.MILITARY, TechCategory.ECONOMIC, TechCategory.ADMIN].map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setTechTab(cat)}
                        className={`flex-1 py-3 rounded-full font-bold uppercase text-sm tracking-wider transition-all ${
                            techTab === cat ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-900/40' : 'bg-[#262626] text-stone-500 hover:bg-[#333]'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="w-full max-w-4xl mt-6 px-4 flex-1 overflow-y-auto pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tree.filter(t => t.category === techTab).map(tech => {
                        const unlocked = player.unlockedTechs.includes(tech.id);
                        const canUnlock = !unlocked && (tech.prerequisiteId === null || player.unlockedTechs.includes(tech.prerequisiteId));
                        
                        return (
                            <div key={tech.id} className={`bg-[#1e1e1e] p-4 rounded-lg border ${unlocked ? 'border-orange-500/50' : 'border-[#333]'} flex gap-4 relative group`}>
                                <div className={`w-16 h-16 rounded bg-[#111] flex items-center justify-center text-2xl border border-[#333] ${!unlocked && !canUnlock ? 'opacity-30' : ''}`}>
                                    {unlocked ? '✓' : canUnlock ? '🔓' : '🔒'}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-lg font-bold ${unlocked ? 'text-orange-400' : 'text-stone-200'}`}>{tech.name}</h4>
                                    <p className="text-xs text-stone-500 mt-1">{tech.description}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-orange-600 text-xs font-bold">{tech.cost} RP</span>
                                    </div>
                                </div>
                                {!unlocked && canUnlock && (
                                    <div className="absolute bottom-4 right-4">
                                         <button onClick={() => buyTech(tech)} className="bg-[#2d2d2d] hover:bg-orange-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">+</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full p-4 bg-[#1a1a1a] border-t border-[#333] flex justify-center">
                 <Button className="w-full max-w-md">Queue New Technology</Button>
            </div>
        </div>
    );
  };

  const renderBattleModal = () => {
    if (!gameState.activeBattle) return null;
    const active = gameState.activeBattle;
    
    // Animation Styles
    const atkAnim = battleAnimState === 'clashing' ? 'translate-x-12 scale-105' : 'translate-x-0';
    const defAnim = battleAnimState === 'clashing' ? '-translate-x-12 scale-105' : '-translate-x-0';

    return (
        <div className="absolute inset-0 z-40 bg-black/95 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-[#1c1917] border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
                {/* Header */}
                <div className="h-20 bg-[#151515] flex items-center justify-between px-8 border-b border-[#333]">
                     <h3 className="text-red-500 font-bold text-xl uppercase tracking-widest">Battle in Progress</h3>
                     <div className="text-stone-500 font-mono">Round {active.round}</div>
                </div>

                {/* Visuals */}
                <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1533613220915-609f661a6fe1?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    <div className="relative z-10 h-full flex items-center justify-around">
                         {/* Attacker */}
                         <div className={`text-center transition-transform duration-300 ${atkAnim}`}>
                             <div className="w-24 h-24 bg-blue-900 rounded-full border-4 border-blue-500 mx-auto flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(59,130,246,0.5)]">⚔️</div>
                             <div className="text-2xl font-serif text-white">{gameState.factions[active.attackerId].name}</div>
                             <div className="text-blue-400 font-bold mt-1">{active.attackerUnits.length} Legions</div>
                         </div>
                         <div className="text-4xl font-bold text-orange-600 font-serif italic">VS</div>
                         {/* Defender */}
                         <div className={`text-center transition-transform duration-300 ${defAnim}`}>
                             <div className="w-24 h-24 bg-red-900 rounded-full border-4 border-red-500 mx-auto flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(239,68,68,0.5)]">🛡️</div>
                             <div className="text-2xl font-serif text-white">{gameState.factions[active.defenderId].name}</div>
                             <div className="text-red-400 font-bold mt-1">{active.defenderUnits.length} Legions</div>
                         </div>
                    </div>
                </div>

                {/* Controls */}
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
    const selectedProv = gameState.selectedProvinceId ? gameState.provinces.find(p => p.id === gameState.selectedProvinceId) : null;

    return (
        <>
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-6 z-30 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4 bg-[#1c1917]/90 backdrop-blur-md px-6 py-2 rounded-full border border-[#333] shadow-2xl mt-4">
                    <img src={player.images.leader} className="w-8 h-8 rounded-full border border-orange-500 object-cover" alt="Leader" />
                    <span className="font-serif font-bold text-white tracking-wide">{player.name}</span>
                    <div className="w-px h-4 bg-[#444]"></div>
                    <span className="text-orange-400 font-bold">☧ {player.gold}</span>
                    <span className="text-blue-400 font-bold">👥 {player.manpower}</span>
                </div>

                <div className="pointer-events-auto flex gap-2 mt-4">
                     {gameState.moveSourceId && <Button onClick={() => setGameState(p => ({...p, moveSourceId: null}))} variant="danger" className="py-2 px-4 text-xs">Cancel Move</Button>}
                     <button onClick={() => setShowTechTree(true)} className="w-10 h-10 rounded-full bg-[#1c1917] border border-[#333] text-stone-300 hover:text-white flex items-center justify-center hover:bg-orange-600 transition-colors">⚡</button>
                     <button onClick={endTurn} className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-900/50 hover:bg-orange-500 transition-colors">➤</button>
                </div>
            </div>

            {/* Province Floating Card (Bottom) */}
            {selectedProv && (
                <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-[#1c1917] border border-[#333] rounded-xl shadow-2xl z-30 animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col">
                    {/* Header Image */}
                    <div className="h-32 bg-stone-800 relative">
                        <img src="https://images.unsplash.com/photo-1544979183-2d58546b53a0?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="city" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] to-transparent"></div>
                        <div className="absolute bottom-4 left-4 flex items-end gap-3">
                             <div className="w-12 h-12 rounded-full border-2 border-orange-500 bg-black flex items-center justify-center overflow-hidden">
                                <img src={gameState.factions[selectedProv.ownerId].images.leader} className="w-full h-full object-cover" />
                             </div>
                             <div>
                                 <div className="text-xs text-orange-500 font-bold uppercase tracking-wider">Governor</div>
                                 <div className="text-white font-serif text-lg leading-none">{gameState.factions[selectedProv.ownerId].leaderName}</div>
                             </div>
                             <div className="ml-auto mb-1">
                                 <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 text-xs rounded uppercase font-bold">Stable</span>
                             </div>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-1 p-4 border-b border-[#333]">
                        <div className="text-center">
                            <div className="text-blue-400 text-lg">👥</div>
                            <div className="text-white font-bold">{selectedProv.manpowerValue * 100}</div>
                            <div className="text-[10px] text-stone-500 uppercase">+2.5%</div>
                        </div>
                        <div className="text-center border-x border-[#333]">
                            <div className="text-orange-400 text-lg">☧</div>
                            <div className="text-white font-bold">+{selectedProv.resourceValue}</div>
                            <div className="text-[10px] text-stone-500 uppercase">+10%</div>
                        </div>
                        <div className="text-center">
                            <div className="text-emerald-400 text-lg">☺</div>
                            <div className="text-white font-bold">95%</div>
                            <div className="text-[10px] text-stone-500 uppercase">+5%</div>
                        </div>
                    </div>

                    {/* Queue */}
                    <div className="p-4 border-b border-[#333]">
                        <div className="flex justify-between text-xs text-stone-400 mb-2 uppercase font-bold">
                            <span>Construction</span>
                            <span className="text-orange-500 cursor-pointer">View Queue</span>
                        </div>
                        <div className="bg-[#262626] p-3 rounded-lg border border-[#333] flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#333] rounded flex items-center justify-center text-xl">🏛️</div>
                            <div className="flex-1">
                                <div className="text-white text-sm font-bold flex justify-between">
                                    {selectedProv.currentConstruction?.name || "Grand Temple"}
                                    <span className="text-orange-500 text-xs">2 Turns</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#111] rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-orange-600 w-2/3"></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 text-center">
                            <button className="text-stone-500 text-xs hover:text-white transition-colors flex items-center justify-center gap-1 w-full border border-dashed border-[#333] py-2 rounded">
                                <span>+</span> Add to queue
                            </button>
                        </div>
                    </div>

                    {/* Garrison */}
                    <div className="p-4 flex-1 overflow-y-auto">
                        <div className="flex justify-between text-xs text-stone-400 mb-2 uppercase font-bold">
                             <span>City Garrison</span>
                             <span>{selectedProv.troops.length}/5</span>
                        </div>
                        <div className="flex gap-2">
                            {selectedProv.troops.length === 0 && <span className="text-stone-600 text-xs italic p-2">Empty</span>}
                            {selectedProv.troops.map((u, i) => (
                                <div key={i} className="w-16 h-20 bg-[#262626] rounded-lg border border-[#333] flex flex-col items-center justify-center gap-1">
                                    <div className="w-8 h-8 rounded-full bg-[#111] border border-stone-600 flex items-center justify-center text-xs">🛡️</div>
                                    <div className="text-[10px] text-white font-bold">Legion</div>
                                    <div className="w-10 h-1 bg-black rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-[#151515] p-2 flex justify-around">
                        {selectedProv.ownerId === player.id ? (
                            <>
                                <button onClick={recruitUnit} className="flex flex-col items-center gap-1 text-stone-400 hover:text-orange-500 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#262626] flex items-center justify-center text-xl">⚔️</div>
                                    <span className="text-[10px] font-bold uppercase">Recruit</span>
                                </button>
                                <button onClick={startRelocation} className="flex flex-col items-center gap-1 text-stone-400 hover:text-orange-500 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#262626] flex items-center justify-center text-xl">⚑</div>
                                    <span className="text-[10px] font-bold uppercase">Move</span>
                                </button>
                                <button className="flex flex-col items-center gap-1 text-stone-400 hover:text-orange-500 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#262626] flex items-center justify-center text-xl">⚒️</div>
                                    <span className="text-[10px] font-bold uppercase">Build</span>
                                </button>
                            </>
                        ) : (
                             <button onClick={declareWarAttack} className="w-full bg-red-900/20 border border-red-900 text-red-500 py-3 rounded uppercase font-bold text-sm hover:bg-red-900/40">Attack Province</button>
                        )}
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
        {/* Navbar */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
            <button className="w-10 h-10 rounded-full bg-[#1c1917] text-white flex items-center justify-center">←</button>
            <h1 className="text-xl font-bold text-white tracking-widest">CHOOSE EMPIRE</h1>
            <button className="w-10 h-10 rounded-full bg-[#1c1917] text-white flex items-center justify-center">⚙</button>
        </div>

        {/* Carousel / Cards */}
        <div className="flex gap-6 overflow-x-auto w-full max-w-6xl px-4 py-8 snap-x">
            {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS).map(f => (
                <div key={f.id} onClick={() => startGame(f.id)} className="min-w-[300px] md:min-w-[350px] bg-[#1c1917] rounded-3xl border border-[#333] overflow-hidden relative group cursor-pointer hover:border-orange-500 transition-all snap-center">
                    {/* Hero Image */}
                    <div className="h-96 relative">
                        <img src={f.images.leader} className="w-full h-full object-cover" alt={f.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h2 className="text-4xl font-serif text-white font-bold">{f.name}</h2>
                            <p className="text-orange-500 font-bold uppercase tracking-wider text-sm">{f.leaderName}</p>
                        </div>
                    </div>

                    {/* Stats Tabs */}
                    <div className="flex border-b border-[#333]">
                        <div className="flex-1 py-3 text-center text-orange-500 font-bold text-sm border-b-2 border-orange-500">STATS</div>
                        <div className="flex-1 py-3 text-center text-stone-500 font-bold text-sm">UNITS</div>
                        <div className="flex-1 py-3 text-center text-stone-500 font-bold text-sm">LORE</div>
                    </div>

                    {/* Stats Body */}
                    <div className="p-6 grid grid-cols-3 gap-4">
                        <div className="bg-[#262626] p-3 rounded-xl border border-[#333]">
                            <div className="text-orange-500 mb-1 text-lg">⚔️</div>
                            <div className="text-stone-400 text-[10px] font-bold uppercase">Military</div>
                            <div className="text-white font-bold text-xl">+15%</div>
                        </div>
                        <div className="bg-[#262626] p-3 rounded-xl border border-[#333]">
                            <div className="text-orange-500 mb-1 text-lg">⚒️</div>
                            <div className="text-stone-400 text-[10px] font-bold uppercase">Industry</div>
                            <div className="text-white font-bold text-xl">+10%</div>
                        </div>
                        <div className="bg-[#262626] p-3 rounded-xl border border-[#333]">
                            <div className="text-orange-500 mb-1 text-lg">🏛️</div>
                            <div className="text-stone-400 text-[10px] font-bold uppercase">Culture</div>
                            <div className="text-white font-bold text-xl">+5%</div>
                        </div>
                    </div>
                    
                    {/* Unique Unit Preview */}
                    <div className="px-6 pb-6">
                        <div className="bg-gradient-to-r from-orange-900/20 to-transparent p-4 rounded-xl border-l-4 border-orange-500 flex items-center gap-4">
                            <img src={f.images.leader} className="w-12 h-12 rounded-lg object-cover grayscale opacity-70" />
                            <div>
                                <div className="text-white font-bold">Unique Unit</div>
                                <div className="text-stone-400 text-xs">Elite heavy infantry</div>
                            </div>
                        </div>
                    </div>

                    {/* Button */}
                    <div className="p-6 pt-0">
                         <button className="w-full py-4 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-orange-900/30 transition-all flex items-center justify-center gap-2">
                             Start Conquest <span>⚔️</span>
                         </button>
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
      {gameState.phase === Phase.BATTLE && renderBattleModal()}
    </div>
  );
}

export default App;