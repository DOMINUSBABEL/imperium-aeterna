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
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-xs bg-stone-900 text-stone-200 text-xs rounded p-2 border border-amber-700 shadow-xl z-50">
      {text}
    </div>
  </div>
);

const Button = ({ onClick, disabled, variant = 'primary', className = '', children }: any) => {
  const baseStyle = "font-serif font-bold py-2 px-4 rounded shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-b from-red-800 to-red-900 border border-red-600 text-red-50 hover:from-red-700 hover:to-red-800",
    gold: "bg-gradient-to-b from-amber-600 to-amber-700 border border-amber-400 text-white hover:from-amber-500 hover:to-amber-600",
    neutral: "bg-stone-700 border border-stone-500 text-stone-200 hover:bg-stone-600",
    danger: "bg-red-950 border border-red-800 text-red-500 hover:bg-red-900",
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
  const [battleSpeed, setBattleSpeed] = useState<number | null>(null); // null = paused, number = ms delay
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
    // Roguelike Init
    const shuffledTraits = [...ROGUELIKE_TRAITS].sort(() => 0.5 - Math.random());
    const pickedTraits = shuffledTraits.slice(0, 2);

    const newFactions = { ...INITIAL_FACTIONS };
    newFactions[factionId] = {
      ...newFactions[factionId],
      isPlayer: true,
      traits: pickedTraits
    };

    // Apply trait effects
    pickedTraits.forEach(trait => {
      if(trait.effectType === 'GOLD_MOD') newFactions[factionId].gold += 100;
    });

    setGameState({
      ...gameState,
      phase: Phase.CAMPAIGN,
      playerFactionId: factionId,
      factions: newFactions,
      logs: [`Welcome, leader of ${newFactions[factionId].name}.`, `Fate has bestowed: ${pickedTraits.map(t => t.name).join(', ')}`],
      year: 270,
      turn: 1
    });

    // Center map on capital (approximate logic)
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

    // Handle Relocation Selection
    if (gameState.moveSourceId) {
        if (gameState.moveSourceId === id) {
            // Clicked self, cancel
            setGameState(prev => ({ ...prev, moveSourceId: null }));
            return;
        }
        
        const sourceProv = gameState.provinces.find(p => p.id === gameState.moveSourceId);
        const targetProv = gameState.provinces.find(p => p.id === id);

        if (sourceProv && targetProv) {
            // Logic: Must be neighbor AND owned by player
            if (sourceProv.neighbors.includes(targetProv.id) && targetProv.ownerId === gameState.playerFactionId) {
                // Execute Move
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
                    selectedProvinceId: targetProv.id, // Follow troops
                    logs: [`Army marched from ${sourceProv.name} to ${targetProv.name}.`, ...prev.logs]
                }));
            } else {
                addLog("Invalid destination. Must be a neighboring province you own.");
            }
        }
        return;
    }

    // Normal Selection
    setGameState(prev => ({ ...prev, selectedProvinceId: id }));
  };

  const startRelocation = () => {
      const provId = gameState.selectedProvinceId;
      if(!provId) return;
      
      const prov = gameState.provinces.find(p => p.id === provId);
      if(!prov || prov.troops.length === 0) {
          addLog("No troops to move.");
          return;
      }

      setGameState(prev => ({ ...prev, moveSourceId: provId }));
  };

  const endTurn = () => {
    const nextTurn = gameState.turn + 1;
    const nextYear = gameState.year - 1; 
    
    // 1. Economy & Manpower
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

        if (prov.hasRebellionRisk && Math.random() < 0.1) {
             return { ...prov, ownerId: FactionId.REBELS, hasRebellionRisk: false };
        }
      }
      return prov;
    });

    // 2. AI Turn (Simplified)
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
      moveSourceId: null, // Cancel any moves
      logs: [`Year ${nextYear} BC began.`, ...prev.logs]
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

        // Tech & Traits
        if (player.unlockedTechs.includes('r_m1')) newUnit.damage += 2; 
        if (player.unlockedTechs.includes('b_m1')) newUnit.damage += 3;
        player.traits.forEach(t => {
            if(t.effectType === 'COMBAT_MOD' && t.value > 1) newUnit.damage = Math.floor(newUnit.damage * t.value);
        });

        const newFactions = { ...gameState.factions };
        newFactions[player.id].gold -= 50;
        newFactions[player.id].manpower -= 100;

        const newProvinces = [...gameState.provinces];
        newProvinces[provIndex].troops.push(newUnit);

        setGameState(prev => ({
            ...prev,
            factions: newFactions,
            provinces: newProvinces,
            logs: [`Recruited Infantry in ${prov.name}.`, ...prev.logs]
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
          addLog("Cannot attack: No troops in neighboring provinces.");
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
              logs: [`Captured ${targetProv.name} unopposed!`, ...prev.logs]
          }));
          return;
      }

      // Enter Battle Mode
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

  // --- BATTLE LOGIC & ANIMATION ---

  const triggerBattleRound = useCallback(() => {
    // 1. Trigger Animation
    setBattleAnimState('clashing');

    // 2. Resolve Logic after delay
    setTimeout(() => {
        setGameState(prev => {
            if (!prev.activeBattle || prev.activeBattle.winner) return prev;
            
            const battle = { ...prev.activeBattle };
            const attacker = prev.factions[battle.attackerId];
            
            // Damage Calc
            const dmg = battle.attackerUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);
            let atkMod = 1;
            attacker.traits.forEach(t => { if(t.effectType === 'COMBAT_MOD') atkMod *= t.value; });
            const finalAtkDmg = Math.floor(dmg * atkMod);

            const defDmg = battle.defenderUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);
            const finalDefDmg = Math.floor(defDmg);

            // Apply Damage
            if (battle.defenderUnits.length > 0) {
                battle.defenderUnits[0].hp -= finalAtkDmg;
                if (battle.defenderUnits[0].hp <= 0) battle.defenderUnits.shift();
            }
            if (battle.attackerUnits.length > 0) {
                battle.attackerUnits[0].hp -= finalDefDmg;
                if (battle.attackerUnits[0].hp <= 0) battle.attackerUnits.shift();
            }

            battle.round++;
            battle.logs = [`R${battle.round}: -${finalAtkDmg} vs -${finalDefDmg} HP`, ...battle.logs.slice(0, 5)];

            if (battle.defenderUnits.length === 0) battle.winner = battle.attackerId;
            else if (battle.attackerUnits.length === 0) battle.winner = battle.defenderId;

            // Auto-pause if ended
            if (battle.winner) setBattleSpeed(null);

            return { ...prev, activeBattle: battle };
        });

        // 3. Reset Animation
        setBattleAnimState('idle');
    }, 400); // 400ms matches CSS transition
  }, []);

  // Battle Loop
  useEffect(() => {
    let interval: number;
    if (gameState.phase === Phase.BATTLE && battleSpeed !== null && !gameState.activeBattle?.winner) {
      interval = window.setInterval(triggerBattleRound, battleSpeed + 450); // Add extra time for animation
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
          logs: [`Battle finished. Winner: ${gameState.factions[winner].name}`, ...prev.logs]
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
        
        setGameState(prev => ({
            ...prev,
            factions: newFactions,
            logs: [`Researched ${tech.name}.`, ...prev.logs]
        }));
    }
  };

  // --- RENDERERS ---

  const renderMap = () => {
    return (
      <div 
        className="w-full h-full overflow-hidden bg-[#0c0a09] relative bg-stone-pattern" 
        ref={mapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button onClick={() => setViewState(p => ({...p, scale: Math.min(p.scale + 0.2, 3)}))} className="w-10 h-10 bg-stone-800 border border-stone-600 rounded text-stone-200 shadow hover:bg-stone-700">+</button>
            <button onClick={() => setViewState(p => ({...p, scale: Math.max(p.scale - 0.2, 0.5)}))} className="w-10 h-10 bg-stone-800 border border-stone-600 rounded text-stone-200 shadow hover:bg-stone-700">-</button>
          </div>

          <svg 
            width="100%" height="100%" 
            className="cursor-move"
          >
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
              
              {/* Connections */}
              {gameState.provinces.map(p => 
                p.neighbors.map(nId => {
                  const n = gameState.provinces.find(prov => prov.id === nId);
                  if (!n || p.id > nId) return null; // Draw once per pair
                  
                  const isOwnedPath = p.ownerId === n.ownerId && p.ownerId === gameState.playerFactionId;
                  
                  return (
                    <line 
                      key={`${p.id}-${n.id}`} 
                      x1={p.x} y1={p.y} x2={n.x} y2={n.y} 
                      stroke={isOwnedPath ? '#d97706' : '#44403c'} 
                      strokeWidth={isOwnedPath ? "3" : "1"} 
                      strokeDasharray={isOwnedPath ? "" : "5,5"}
                      opacity="0.6" 
                      className="transition-all duration-500"
                    />
                  );
                })
              )}
              
              {/* Provinces */}
              {gameState.provinces.map(p => {
                const owner = gameState.factions[p.ownerId];
                const isSelected = gameState.selectedProvinceId === p.id;
                const isPlayerOwned = p.ownerId === gameState.playerFactionId;
                
                // Relocation Logic
                let isRelocationTarget = false;
                if (gameState.moveSourceId) {
                    const source = gameState.provinces.find(prov => prov.id === gameState.moveSourceId);
                    if (source && source.neighbors.includes(p.id) && p.ownerId === gameState.playerFactionId) {
                        isRelocationTarget = true;
                    }
                }

                // Opacity logic for relocation mode
                const opacity = gameState.moveSourceId && !isRelocationTarget && gameState.moveSourceId !== p.id ? 0.4 : 1;
                
                return (
                  <g 
                    key={p.id} 
                    onClick={(e) => { e.stopPropagation(); selectProvince(p.id); }} 
                    className="transition-all duration-300 cursor-pointer hover:opacity-100"
                    style={{ opacity }}
                  >
                    {/* Glow for selection or target */}
                    {isSelected && <circle cx={p.x} cy={p.y} r={35} fill="url(#gold-gradient)" opacity="0.3" className="animate-pulse"/>}
                    {isRelocationTarget && <circle cx={p.x} cy={p.y} r={30} stroke="#10b981" strokeWidth="3" fill="none" className="animate-pulse"/>}
                    
                    {/* Province Node */}
                    <circle 
                      cx={p.x} cy={p.y} r={isPlayerOwned ? 20 : 16} 
                      fill={owner.color} 
                      stroke={isSelected ? '#fbbf24' : (isPlayerOwned ? '#fff' : '#1c1917')} 
                      strokeWidth={isSelected ? 3 : 2}
                      className="shadow-xl"
                    />
                    
                    {/* Icon based on Troops */}
                    {p.troops.length > 0 && (
                       <text x={p.x} y={p.y + 4} textAnchor="middle" fill={owner.textColor} fontSize="12" fontWeight="bold">⚔️</text>
                    )}

                    <text 
                      x={p.x} y={p.y + 35} 
                      textAnchor="middle" 
                      fill="#e7e5e4" 
                      fontSize="12" 
                      className={`pointer-events-none font-bold select-none text-shadow transition-all ${isSelected ? 'text-amber-400 text-sm' : ''}`}
                    >
                      {p.name}
                    </text>
                  </g>
                );
              })}
            </g>
            <defs>
              <radialGradient id="gold-gradient">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
          </svg>
      </div>
    );
  };

  const renderTechTreeModal = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    const tree = TECH_TREES[player.group];

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 transition-all animate-in fade-in duration-300">
            <div className="bg-stone-900 border-2 border-amber-700 w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl rounded-lg overflow-hidden">
                <div className="p-4 bg-stone-950 border-b border-amber-900 flex justify-between items-center">
                    <h2 className="text-2xl text-amber-500 font-serif">Imperial Research</h2>
                    <Button onClick={() => setShowTechTree(false)} variant="neutral">Close</Button>
                </div>
                
                <div className="flex-1 overflow-auto p-6 bg-parchment">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[TechCategory.MILITARY, TechCategory.ECONOMIC, TechCategory.ADMIN].map(cat => (
                        <div key={cat} className="flex flex-col gap-4">
                            <h3 className="text-center font-bold text-stone-800 border-b-2 border-stone-400 pb-2 mb-2 font-serif tracking-widest">{cat}</h3>
                            {tree.filter(t => t.category === cat).map(tech => {
                                const unlocked = player.unlockedTechs.includes(tech.id);
                                const canUnlock = !unlocked && (tech.prerequisiteId === null || player.unlockedTechs.includes(tech.prerequisiteId));
                                return (
                                    <div key={tech.id} className={`p-4 rounded border shadow-sm relative overflow-hidden group transition-all ${
                                        unlocked ? 'bg-emerald-100 border-emerald-500' : 
                                        canUnlock ? 'bg-white border-amber-600 hover:shadow-md' : 'bg-stone-300 border-stone-400 opacity-70 grayscale'
                                    }`}>
                                        <div className="font-bold text-stone-900 flex justify-between">
                                            {tech.name}
                                            {unlocked && <span className="text-emerald-700">✓</span>}
                                        </div>
                                        <div className="text-xs text-stone-600 my-2 italic">{tech.description}</div>
                                        {!unlocked && (
                                            <button 
                                                disabled={!canUnlock || player.gold < tech.cost}
                                                onClick={() => buyTech(tech)}
                                                className={`w-full py-1 text-xs font-bold rounded mt-2 ${
                                                    canUnlock && player.gold >= tech.cost ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-stone-400 text-stone-600 cursor-not-allowed'
                                                }`}
                                            >
                                                {canUnlock ? `Research (${tech.cost}g)` : 'Locked'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderBattleModal = () => {
    if (!gameState.activeBattle) return null;
    const active = gameState.activeBattle;
    const attacker = gameState.factions[active.attackerId];
    const defender = gameState.factions[active.defenderId];
    
    // Animation Styles
    const atkAnim = battleAnimState === 'clashing' ? 'translate-x-12 scale-105' : 'translate-x-0';
    const defAnim = battleAnimState === 'clashing' ? '-translate-x-12 scale-105' : '-translate-x-0';

    return (
        <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-stone-900 border-2 border-red-900 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[80vh]">
                
                {/* Header */}
                <div className="h-16 bg-red-950 flex items-center justify-between px-6 border-b border-red-800">
                    <div className="text-xl font-serif font-bold text-stone-200">{attacker.name}</div>
                    <div className="text-2xl font-serif text-amber-500 font-bold">VS</div>
                    <div className="text-xl font-serif font-bold text-stone-200">{defender.name}</div>
                </div>

                {/* Battlefield */}
                <div className="flex-1 bg-[url('https://images.unsplash.com/photo-1553531087-b25a0b9a68a3?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px]"></div>
                    
                    <div className="relative z-10 h-full flex flex-row items-center justify-between px-10 gap-10">
                        {/* Left Army (Attacker) */}
                        <div className={`flex-1 h-full flex flex-col justify-center gap-2 transition-transform duration-300 ease-in-out ${atkAnim}`}>
                             {active.attackerUnits.map((u, i) => (
                                <div key={i} className="bg-blue-900/60 border-l-4 border-blue-500 p-2 text-xs text-blue-100 relative overflow-hidden transition-all duration-300 shadow-md backdrop-blur-sm" style={{opacity: u.hp > 0 ? 1 : 0.2}}>
                                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                    <div className="flex justify-between relative z-10">
                                        <span>{u.type}</span>
                                        <span>{u.hp} HP</span>
                                    </div>
                                </div>
                             ))}
                        </div>

                        {/* Center Info */}
                        <div className="w-64 flex flex-col items-center gap-4 z-20">
                            <div className="bg-black/50 p-4 rounded text-center border border-stone-600 w-full h-40 overflow-hidden text-xs font-mono text-stone-400">
                                {active.logs.map((l,i) => <div key={i}>{l}</div>)}
                            </div>
                            
                            {!active.winner ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <Button onClick={triggerBattleRound} disabled={battleSpeed !== null || battleAnimState !== 'idle'}>Step</Button>
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="neutral" onClick={() => setBattleSpeed(null)} disabled={battleSpeed === null} className="flex-1">❚❚</Button>
                                        <Button variant="neutral" onClick={() => setBattleSpeed(1000)} disabled={battleSpeed === 1000} className="flex-1">▶</Button>
                                        <Button variant="neutral" onClick={() => setBattleSpeed(200)} disabled={battleSpeed === 200} className="flex-1">▶▶</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button onClick={endBattle} variant="gold" className="w-full animate-pulse">Victory! Return</Button>
                            )}
                        </div>

                        {/* Right Army (Defender) */}
                         <div className={`flex-1 h-full flex flex-col justify-center gap-2 items-end transition-transform duration-300 ease-in-out ${defAnim}`}>
                             {active.defenderUnits.map((u, i) => (
                                <div key={i} className="bg-red-900/60 border-r-4 border-red-500 p-2 text-xs text-red-100 relative overflow-hidden w-full text-right transition-all duration-300 shadow-md backdrop-blur-sm" style={{opacity: u.hp > 0 ? 1 : 0.2}}>
                                    <div className="absolute bottom-0 right-0 h-1 bg-red-500 transition-all duration-300" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                    <div className="flex justify-between relative z-10">
                                        <span>{u.hp} HP</span>
                                        <span>{u.type}</span>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
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
            <div className="absolute top-0 left-0 right-0 h-16 bg-stone-900 border-b-2 border-amber-700 shadow-xl flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-serif text-amber-500 drop-shadow-md hidden md:block">{player.name}</h1>
                    <div className="flex gap-4 bg-stone-800 px-4 py-1 rounded border border-stone-600">
                        <Tooltip text="Gold is used for recruiting and buildings">
                            <div className="flex items-center gap-2 text-amber-300 font-bold">
                                <span>◎</span> <span>{player.gold}</span>
                            </div>
                        </Tooltip>
                        <div className="w-px bg-stone-600"></div>
                        <Tooltip text="Manpower is required to train units">
                            <div className="flex items-center gap-2 text-blue-300 font-bold">
                                <span>👥</span> <span>{player.manpower}</span>
                            </div>
                        </Tooltip>
                        <div className="w-px bg-stone-600"></div>
                        <Tooltip text="Stability affects revolt risk">
                            <div className="flex items-center gap-2 text-purple-300 font-bold">
                                <span>⚖</span> <span>{player.stability}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>

                <div className="text-xl font-serif text-stone-400 font-bold tracking-widest">{gameState.year} B.C.</div>

                <div className="flex items-center gap-2">
                    {gameState.moveSourceId && (
                         <Button onClick={() => setGameState(p => ({...p, moveSourceId: null}))} variant="neutral" className="animate-pulse border-red-500 text-red-300">
                             Cancel Move
                         </Button>
                    )}
                    <Button onClick={() => setShowTechTree(true)} variant="neutral">Technology</Button>
                    <Button onClick={endTurn} variant="gold">End Turn</Button>
                </div>
            </div>

            {/* Side Panel (Contextual) */}
            <div className={`absolute top-20 right-4 bottom-4 w-96 bg-parchment rounded-lg shadow-2xl border-2 border-stone-600 z-20 flex flex-col transition-transform duration-300 transform ${selectedProv ? 'translate-x-0' : 'translate-x-[120%]'}`}>
                {selectedProv && (
                    <>
                        <div className="bg-stone-800 p-4 text-center border-b-2 border-amber-700">
                             <h2 className="text-xl font-serif text-amber-100">{selectedProv.name}</h2>
                             <div className="text-xs text-stone-400 uppercase tracking-widest mt-1">Province</div>
                        </div>
                        
                        <div className="p-6 text-stone-800 space-y-4 overflow-y-auto flex-1 font-serif">
                            <div className="flex justify-between items-center border-b border-stone-400 pb-2">
                                <span>Owner</span>
                                <span className="font-bold" style={{color: gameState.factions[selectedProv.ownerId].color}}>
                                    {gameState.factions[selectedProv.ownerId].name}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-stone-200/50 p-2 rounded text-center">
                                    <div className="text-xs text-stone-500">Income</div>
                                    <div className="font-bold text-lg text-amber-700">+{selectedProv.resourceValue}</div>
                                </div>
                                <div className="bg-stone-200/50 p-2 rounded text-center">
                                    <div className="text-xs text-stone-500">Manpower</div>
                                    <div className="font-bold text-lg text-blue-800">+{selectedProv.manpowerValue}</div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <h3 className="font-bold mb-2 border-b border-stone-400">Garrison</h3>
                                <div className="space-y-2">
                                    {selectedProv.troops.length === 0 && <div className="text-stone-500 italic text-sm">No troops stationed here.</div>}
                                    {selectedProv.troops.map((u, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm bg-white/60 p-2 rounded shadow-sm">
                                            <span>{u.type}</span>
                                            <div className="h-2 w-16 bg-stone-300 rounded overflow-hidden">
                                                <div className="h-full bg-green-600" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-stone-300 border-t border-stone-400 flex flex-col gap-2">
                            {selectedProv.ownerId === player.id ? (
                                <>
                                    <Button onClick={recruitUnit} className="w-full">Recruit Legion (50g, 100m)</Button>
                                    <Button 
                                        onClick={startRelocation} 
                                        variant="success" 
                                        className="w-full"
                                        disabled={selectedProv.troops.length === 0}
                                    >
                                        Relocate Army
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={declareWarAttack} variant="danger" className="w-full">Declare War & Attack</Button>
                            )}
                            <Button variant="neutral" onClick={() => setGameState(p => ({...p, selectedProvinceId: null}))} className="w-full text-xs">Close Panel</Button>
                        </div>
                    </>
                )}
            </div>

            {/* Event Log (Toast style) */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 w-80 pointer-events-none">
                {gameState.logs.slice(0, 3).map((log, i) => (
                    <div key={i} className="bg-black/80 text-stone-200 p-2 rounded border-l-4 border-amber-500 text-sm shadow-lg animate-in slide-in-from-left fade-in duration-500">
                        {log}
                    </div>
                ))}
            </div>
        </>
    );
  }

  // --- MAIN RENDER ---

  if (gameState.phase === Phase.MAIN_MENU) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1566373733362-7f24523c7b74?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-blend-overlay bg-opacity-90">
        <div className="max-w-4xl w-full bg-stone-900/90 p-8 rounded border-2 border-amber-800 shadow-2xl backdrop-blur-sm">
          <h1 className="text-5xl md:text-7xl text-center font-serif text-amber-500 mb-2 text-shadow-gold">IMPERIUM AETERNA</h1>
          <p className="text-center text-stone-400 mb-12 italic font-serif text-lg">"Fortune favors the bold."</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS).map(f => (
              <button
                key={f.id}
                onClick={() => startGame(f.id)}
                className="relative overflow-hidden p-6 border border-stone-700 rounded bg-stone-800 hover:border-amber-500 hover:bg-stone-700 transition-all text-left group shadow-lg hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl font-serif select-none" style={{color: f.color}}>{f.name[0]}</div>
                <div className="font-serif text-xl font-bold mb-2 group-hover:text-amber-400" style={{color: f.color}}>{f.name}</div>
                <div className="text-xs text-stone-500 mb-3 uppercase tracking-wider font-bold">{f.group}</div>
                <div className="text-sm text-stone-300 leading-relaxed font-serif">{f.desc}</div>
              </button>
            ))}
          </div>
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