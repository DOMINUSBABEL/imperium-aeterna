import React, { useState, useEffect, useRef } from 'react';
import { 
  GameState, Phase, FactionId, Faction, Province, Unit, BattleState, 
  TechCategory, Technology, RoguelikeTrait
} from './types';
import { INITIAL_FACTIONS, INITIAL_PROVINCES, TECH_TREES, ROGUELIKE_TRAITS } from './constants';

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
    logs: [],
    activeBattle: null,
    loadingAI: false,
    modalMessage: null,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- ACTIONS ---

  const addLog = (text: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [`[${prev.year} BC] ${text}`, ...prev.logs.slice(0, 49)]
    }));
  };

  const startGame = (factionId: FactionId) => {
    // Roguelike Init: Assign random traits to player
    const shuffledTraits = [...ROGUELIKE_TRAITS].sort(() => 0.5 - Math.random());
    const pickedTraits = shuffledTraits.slice(0, 2); // Pick 2 random traits

    const newFactions = { ...INITIAL_FACTIONS };
    newFactions[factionId] = {
      ...newFactions[factionId],
      isPlayer: true,
      traits: pickedTraits
    };

    // Apply trait effects immediately if needed (mostly passive though)
    pickedTraits.forEach(trait => {
      if(trait.effectType === 'GOLD_MOD') newFactions[factionId].gold += 100; // Bonus starting gold
    });

    setGameState({
      ...gameState,
      phase: Phase.CAMPAIGN,
      playerFactionId: factionId,
      factions: newFactions,
      logs: [`Welcome, leader of ${newFactions[factionId].name}.`, `Fate has bestowed upon you: ${pickedTraits.map(t => t.name).join(', ')}`],
      year: 270,
      turn: 1
    });
  };

  const selectProvince = (id: string) => {
    if (gameState.phase !== Phase.CAMPAIGN) return;
    setGameState(prev => ({ ...prev, selectedProvinceId: id }));
  };

  const endTurn = () => {
    const nextTurn = gameState.turn + 1;
    const nextYear = gameState.year - 1; // BC goes down
    
    // 1. Economy & Manpower
    const updatedFactions = { ...gameState.factions };
    const updatedProvinces = gameState.provinces.map(prov => {
      const owner = updatedFactions[prov.ownerId];
      if (owner) {
        // Trait Modifiers
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

        // Rebellion Logic
        if (prov.hasRebellionRisk && Math.random() < 0.1) {
             // addLog(`Rebellion erupts in ${prov.name}!`); // Log handled outside map to avoid state loop issues if tricky
             // Actually safe to add log in next state update
             return { ...prov, ownerId: FactionId.REBELS, hasRebellionRisk: false };
        }
      }
      return prov;
    });

    // 2. AI Turn (Simplified)
    // AI recruits troops randomly if it has money
    Object.keys(updatedFactions).forEach(fid => {
        const f = updatedFactions[fid as FactionId];
        if (!f.isPlayer && f.gold > 100) {
            f.gold -= 50;
            // Find a random province
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
      logs: [`Year ${nextYear} BC began.`, ...prev.logs]
    }));
  };

  const recruitUnit = () => {
    if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
    const provIndex = gameState.provinces.findIndex(p => p.id === gameState.selectedProvinceId);
    if (provIndex === -1) return;

    const prov = gameState.provinces[provIndex];
    const player = gameState.factions[gameState.playerFactionId];

    if (prov.ownerId !== player.id) {
        alert("Can only recruit in your own provinces.");
        return;
    }

    if (player.gold >= 50 && player.manpower >= 100) {
        const newUnit: Unit = {
            id: `u_${Date.now()}`,
            type: 'INFANTRY',
            hp: 100,
            maxHp: 100,
            damage: 15, // Base damage
            ownerId: player.id
        };

        // Tech Bonuses & Trait Bonuses
        if (player.unlockedTechs.includes('r_m1')) newUnit.damage += 2; // Manipular
        if (player.unlockedTechs.includes('b_m1')) newUnit.damage += 3; // Blood Oath
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
    } else {
        alert("Not enough resources (50 Gold, 100 Manpower required).");
    }
  };

  const declareWarAttack = () => {
      if (!gameState.selectedProvinceId || !gameState.playerFactionId) return;
      const targetProv = gameState.provinces.find(p => p.id === gameState.selectedProvinceId);
      if (!targetProv || targetProv.ownerId === gameState.playerFactionId) return;

      // Check adjacency
      const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
      const isNeighbor = ownedProvinces.some(p => p.neighbors.includes(targetProv.id));
      
      if (!isNeighbor) {
          alert("Can only attack neighboring provinces!");
          return;
      }

      // Gather attackers from a neighbor
      const attackingProv = ownedProvinces.find(p => p.neighbors.includes(targetProv.id));
      if (!attackingProv || attackingProv.troops.length === 0) {
          alert("You need troops in a neighboring province to attack.");
          return;
      }

      const attackers = [...attackingProv.troops];
      const defenders = [...targetProv.troops];

      // If no defenders, instant win
      if (defenders.length === 0) {
          const newProvinces = gameState.provinces.map(p => {
              if (p.id === targetProv.id) return { ...p, ownerId: gameState.playerFactionId!, troops: attackers.slice(0, 1) }; // Move 1 unit in
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

      // Start Battle
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

  const resolveBattleRound = () => {
    if (!gameState.activeBattle) return;
    
    const battle = { ...gameState.activeBattle };
    const attacker = gameState.factions[battle.attackerId];
    
    // Attacker hits Defender
    const dmg = battle.attackerUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);
    
    // Tech & Trait modifiers
    let atkMod = 1;
    attacker.traits.forEach(t => { if(t.effectType === 'COMBAT_MOD') atkMod *= t.value; });
    
    // Defender hits Attacker
    const defDmg = battle.defenderUnits.reduce((acc, u) => acc + u.damage, 0) * (0.8 + Math.random() * 0.4);

    // Distribute damage (simple stack wipe logic for MVP)
    if (battle.defenderUnits.length > 0) {
        battle.defenderUnits[0].hp -= Math.floor(dmg * atkMod);
        if (battle.defenderUnits[0].hp <= 0) battle.defenderUnits.shift();
    }
    if (battle.attackerUnits.length > 0) {
        battle.attackerUnits[0].hp -= Math.floor(defDmg);
        if (battle.attackerUnits[0].hp <= 0) battle.attackerUnits.shift();
    }

    battle.round++;
    battle.logs.unshift(`Round ${battle.round}: Atk dealt ${Math.floor(dmg * atkMod)} dmg, Def dealt ${Math.floor(defDmg)} dmg.`);

    // Check win condition
    if (battle.defenderUnits.length === 0) {
        battle.winner = battle.attackerId;
        battle.logs.unshift("Attacker Won!");
    } else if (battle.attackerUnits.length === 0) {
        battle.winner = battle.defenderId;
        battle.logs.unshift("Defender Won!");
    }

    setGameState(prev => ({ ...prev, activeBattle: battle }));
  };

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
          // Remove troops from origin province if attacker moved them
          // (Simplified: in a real game we'd handle moving troops out of origin properly)
           const ownedProvinces = gameState.provinces.filter(p => p.ownerId === gameState.playerFactionId);
           const attackingProv = ownedProvinces.find(prov => prov.neighbors.includes(targetProvId));

           if (winner === gameState.activeBattle?.attackerId && attackingProv && p.id === attackingProv.id) {
               // They moved to the new province (all of them for this simplified version)
               return { ...p, troops: [] };
           }

          return p;
      });

      setGameState(prev => ({
          ...prev,
          phase: Phase.CAMPAIGN,
          provinces: newProvinces,
          activeBattle: null,
          logs: [`Battle for province finished. Winner: ${gameState.factions[winner].name}`, ...prev.logs]
      }));
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
    } else {
        alert("Not enough gold!");
    }
  };

  // --- RENDER HELPERS ---

  const renderMap = () => {
    return (
      <div className="w-full h-full overflow-auto bg-[#0c0a09] border border-stone-800 rounded relative" ref={scrollRef}>
          <svg width="1000" height="600" className="bg-[#0c0a09] select-none touch-manipulation">
            {/* Connections */}
            {gameState.provinces.map(p => 
              p.neighbors.map(nId => {
                const n = gameState.provinces.find(prov => prov.id === nId);
                if (!n) return null;
                return (
                  <line 
                    key={`${p.id}-${n.id}`} 
                    x1={p.x} y1={p.y} x2={n.x} y2={n.y} 
                    stroke="#44403c" strokeWidth="2" opacity="0.5" 
                  />
                );
              })
            )}
            
            {/* Provinces */}
            {gameState.provinces.map(p => {
              const owner = gameState.factions[p.ownerId];
              const isSelected = gameState.selectedProvinceId === p.id;
              const isPlayerOwned = p.ownerId === gameState.playerFactionId;
              
              return (
                <g key={p.id} onClick={() => selectProvince(p.id)} className="cursor-pointer transition-opacity hover:opacity-80">
                  <circle 
                    cx={p.x} cy={p.y} r={isSelected ? 25 : 18} 
                    fill={owner.color} 
                    stroke={isSelected ? '#fbbf24' : (isPlayerOwned ? '#fff' : '#000')} 
                    strokeWidth={isSelected ? 4 : (isPlayerOwned ? 2 : 1)}
                  />
                  {/* Unit Indicator */}
                  {p.troops.length > 0 && (
                     <rect x={p.x - 6} y={p.y - 6} width="12" height="12" fill="black" stroke="white" strokeWidth="1" />
                  )}
                  <text 
                    x={p.x} y={p.y + 35} 
                    textAnchor="middle" 
                    fill="#e7e5e4" 
                    fontSize="12" 
                    className="pointer-events-none font-bold drop-shadow-md select-none"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
          </svg>
      </div>
    );
  };

  const renderTechTree = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    const tree = TECH_TREES[player.group];

    return (
        <div className="fixed inset-0 bg-stone-900/95 z-50 overflow-auto p-4 flex flex-col items-center">
            <div className="w-full max-w-5xl">
                <div className="flex justify-between items-center mb-8 sticky top-0 bg-stone-900/95 py-4 border-b border-stone-700">
                    <h2 className="text-3xl font-serif text-amber-500">Research: {player.group}</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-amber-300 font-bold">{player.gold} Gold</span>
                        <button onClick={() => setGameState(p => ({...p, phase: Phase.CAMPAIGN}))} className="px-6 py-2 bg-stone-700 rounded hover:bg-stone-600 text-white font-bold">
                            Close
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
                    {[TechCategory.MILITARY, TechCategory.ECONOMIC, TechCategory.ADMIN].map(cat => (
                        <div key={cat} className="bg-stone-800 p-4 rounded-lg border border-stone-600 shadow-xl">
                            <h3 className="text-xl font-serif font-bold mb-6 text-center border-b border-stone-600 pb-2 text-stone-300">{cat}</h3>
                            <div className="space-y-6">
                                {tree.filter(t => t.category === cat).map(tech => {
                                    const unlocked = player.unlockedTechs.includes(tech.id);
                                    const canUnlock = !unlocked && (tech.prerequisiteId === null || player.unlockedTechs.includes(tech.prerequisiteId));
                                    return (
                                        <div key={tech.id} className={`p-4 rounded-lg border-2 transition-all ${
                                            unlocked ? 'bg-emerald-900/30 border-emerald-700' : 
                                            canUnlock ? 'bg-stone-900 border-amber-800' : 'bg-stone-900/50 border-stone-700 opacity-60'
                                        }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-lg text-amber-100">{tech.name}</div>
                                                {unlocked && <span className="text-emerald-500 text-lg">✓</span>}
                                            </div>
                                            <div className="text-sm text-stone-400 mb-4 h-10 leading-tight">{tech.description}</div>
                                            {!unlocked && (
                                                <button 
                                                    disabled={!canUnlock || player.gold < tech.cost}
                                                    onClick={() => buyTech(tech)}
                                                    className={`w-full py-2 rounded font-bold text-sm transition-colors ${
                                                        canUnlock && player.gold >= tech.cost 
                                                        ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-lg' 
                                                        : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {canUnlock ? `Research (${tech.cost}g)` : (tech.prerequisiteId ? 'Locked (Req. Previous)' : 'Locked')}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderBattle = () => {
    if (!gameState.activeBattle) return null;
    const active = gameState.activeBattle;
    
    return (
        <div className="flex flex-col h-screen bg-stone-900 text-stone-200">
            {/* Battle Header */}
            <div className="bg-stone-800 p-4 border-b border-amber-900 flex justify-between items-center shadow-md">
              <h2 className="text-lg md:text-2xl font-serif text-red-500">Battle for {gameState.provinces.find(p => p.id === active.provinceId)?.name}</h2>
              <div className="text-xl font-bold">Round {active.round}</div>
            </div>

            {/* Main Battle Area */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
                
                {/* Visual Representation */}
                <div className="flex-1 bg-stone-950 relative border border-stone-700 rounded-lg flex flex-col justify-center items-center overflow-auto">
                    
                    <div className="flex flex-col md:flex-row justify-around w-full items-center z-10 p-4 gap-8">
                        {/* Attacker Column */}
                        <div className="flex flex-col gap-2 items-center w-full md:w-1/3">
                            <h3 className="text-blue-400 font-bold mb-4 text-xl">{gameState.factions[active.attackerId].name}</h3>
                            <div className="flex flex-col gap-1 w-full max-h-60 overflow-y-auto pr-2">
                              {active.attackerUnits.map((u, i) => (
                                  <div key={i} className="w-full h-8 bg-blue-900/30 border border-blue-500 flex items-center justify-between px-2 text-xs relative">
                                      <span className="z-10">{u.type}</span>
                                      <div className="absolute inset-0 bg-blue-500/20" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                      <span className="z-10 font-mono">{u.hp}HP</span>
                                  </div>
                              ))}
                            </div>
                            <div className="text-xs text-stone-500 mt-2">Units: {active.attackerUnits.length}</div>
                        </div>

                        {/* VS Badge */}
                        <div className="text-4xl font-serif text-red-600 font-bold animate-pulse">VS</div>

                        {/* Defender Column */}
                        <div className="flex flex-col gap-2 items-center w-full md:w-1/3">
                            <h3 className="text-red-400 font-bold mb-4 text-xl">{gameState.factions[active.defenderId].name}</h3>
                            <div className="flex flex-col gap-1 w-full max-h-60 overflow-y-auto pr-2">
                              {active.defenderUnits.map((u, i) => (
                                  <div key={i} className="w-full h-8 bg-red-900/30 border border-red-500 flex items-center justify-between px-2 text-xs relative">
                                      <span className="z-10">{u.type}</span>
                                      <div className="absolute inset-0 bg-red-500/20" style={{width: `${(u.hp/u.maxHp)*100}%`}}></div>
                                      <span className="z-10 font-mono">{u.hp}HP</span>
                                  </div>
                              ))}
                            </div>
                            <div className="text-xs text-stone-500 mt-2">Units: {active.defenderUnits.length}</div>
                        </div>
                    </div>
                </div>

                {/* Log & Controls */}
                <div className="h-40 bg-stone-800 rounded border border-stone-600 flex flex-col md:flex-row">
                    <div className="flex-1 p-2 overflow-y-auto text-sm font-mono border-b md:border-b-0 md:border-r border-stone-600">
                        {active.logs.map((l, i) => <div key={i} className="mb-1 text-stone-300">&gt; {l}</div>)}
                    </div>
                    <div className="p-4 flex items-center justify-center bg-stone-900 w-full md:w-64">
                        {!active.winner ? (
                            <button onClick={resolveBattleRound} className="w-full h-full bg-red-700 hover:bg-red-600 text-white font-serif text-xl rounded shadow-lg transition-transform active:scale-95">
                                Fight Round
                            </button>
                        ) : (
                            <button onClick={endBattle} className="w-full h-full bg-green-700 hover:bg-green-600 text-white font-serif text-xl rounded shadow-lg transition-transform active:scale-95">
                                Return to Map
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderCampaign = () => {
    if (!gameState.playerFactionId) return null;
    const player = gameState.factions[gameState.playerFactionId];
    const selectedProv = gameState.selectedProvinceId ? gameState.provinces.find(p => p.id === gameState.selectedProvinceId) : null;

    return (
        <div className="flex flex-col h-screen bg-stone-900 overflow-hidden">
            
            {/* Top Bar */}
            <div className="h-14 bg-stone-800 border-b border-amber-900 flex items-center justify-between px-4 shadow-lg shrink-0">
                <div className="flex items-center gap-4">
                    <span className="font-serif text-xl text-amber-500 hidden md:inline">{player.name}</span>
                    <span className="font-serif text-xl text-amber-500 md:hidden">{player.name.substring(0,3)}</span>
                    <div className="h-6 w-px bg-stone-600 mx-2"></div>
                    <div className="flex gap-4 text-sm font-bold text-stone-300">
                        <span className="text-amber-300">💰 {player.gold}</span>
                        <span className="text-blue-300">👥 {player.manpower}</span>
                        <span className="text-purple-300">⚖️ {player.stability}%</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                     <button 
                        onClick={() => setGameState(p => ({...p, phase: Phase.TECH_TREE}))}
                        className="bg-purple-900 hover:bg-purple-800 text-purple-200 px-3 py-1 rounded font-serif shadow border border-purple-700 text-sm"
                    >
                        Tech
                    </button>
                    <span className="text-stone-400 font-serif hidden md:inline">{gameState.year} BC</span>
                    <button 
                        onClick={endTurn}
                        className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-1 rounded font-serif shadow border border-amber-500"
                    >
                        End Turn
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Map Area */}
                <div className="flex-1 bg-stone-950 overflow-hidden flex flex-col relative">
                    {renderMap()}
                    
                    {/* Log Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none flex flex-col justify-end p-4">
                        <div className="h-24 overflow-y-auto mask-image-b pointer-events-auto">
                            {gameState.logs.map((log, i) => (
                                <div key={i} className="text-xs text-stone-300 drop-shadow-md text-shadow">{log}</div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Panel (Bottom on Mobile, Right on Desktop) */}
                <div className="h-64 md:h-full md:w-80 bg-stone-800 border-t md:border-t-0 md:border-l border-amber-900 flex flex-col shadow-xl shrink-0">
                    
                    {/* Tabs / Info Header */}
                    <div className="bg-stone-900 p-2 text-center font-serif text-amber-500 border-b border-stone-700">
                        {selectedProv ? selectedProv.name : "Empire Overview"}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {selectedProv ? (
                            <>
                                <div className="space-y-2 text-sm text-stone-300">
                                    <div className="flex justify-between">
                                        <span>Owner:</span>
                                        <span style={{color: gameState.factions[selectedProv.ownerId].color}} className="font-bold">
                                            {gameState.factions[selectedProv.ownerId].name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between"><span>Income:</span> <span className="text-amber-300">+{selectedProv.resourceValue}</span></div>
                                    <div className="flex justify-between"><span>Manpower:</span> <span className="text-blue-300">+{selectedProv.manpowerValue}</span></div>
                                    <div className="flex justify-between"><span>Defense:</span> <span>{selectedProv.defenseBonus * 10}%</span></div>
                                    
                                    <div className="border-t border-stone-700 pt-2 mt-2">
                                        <div className="mb-2 font-bold">Garrison ({selectedProv.troops.length}):</div>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                            {selectedProv.troops.length === 0 && <span className="text-stone-500 italic">Empty</span>}
                                            {selectedProv.troops.map((u, i) => (
                                                <div key={i} className="text-xs bg-stone-700 px-2 py-1 rounded flex justify-between">
                                                    <span>{u.type}</span>
                                                    <span>{u.hp}HP</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 grid grid-cols-1 gap-2">
                                    {selectedProv.ownerId === player.id ? (
                                        <button 
                                            onClick={recruitUnit}
                                            className="w-full py-2 bg-green-800 hover:bg-green-700 text-white rounded font-serif text-sm border border-green-600"
                                        >
                                            Recruit Infantry (50g, 100m)
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={declareWarAttack}
                                            className="w-full py-2 bg-red-800 hover:bg-red-700 text-white rounded font-serif text-sm border border-red-600"
                                        >
                                            Attack Province
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-stone-500 mt-10">
                                <p>Select a province on the map to view details.</p>
                                <p className="mt-4 text-xs">Current Traits:</p>
                                <ul className="text-xs text-amber-200 mt-2">
                                  {player.traits.map(t => <li key={t.id}>- {t.name} ({t.description})</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // --- MAIN RENDER ---

  if (gameState.phase === Phase.MAIN_MENU) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1566373733362-7f24523c7b74?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-blend-overlay bg-opacity-90">
        <div className="max-w-4xl w-full bg-stone-900/90 p-8 rounded border-2 border-amber-800 shadow-2xl backdrop-blur-sm">
          <h1 className="text-4xl md:text-6xl text-center font-serif text-amber-500 mb-2">Imperium Aeterna</h1>
          <p className="text-center text-stone-400 mb-8 italic">Choose your destiny. Rewrite history.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.values(gameState.factions) as Faction[]).filter(f => f.id !== FactionId.REBELS).map(f => (
              <button
                key={f.id}
                onClick={() => startGame(f.id)}
                className="p-4 border border-stone-700 rounded hover:border-amber-500 hover:bg-stone-800 transition-all text-left group"
              >
                <div className="font-serif text-xl font-bold mb-1 group-hover:text-amber-400" style={{color: f.color}}>{f.name}</div>
                <div className="text-xs text-stone-500 mb-2">{f.group}</div>
                <div className="text-sm text-stone-300">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {gameState.phase === Phase.TECH_TREE && renderTechTree()}
      {gameState.phase === Phase.BATTLE && renderBattle()}
      {(gameState.phase === Phase.CAMPAIGN || gameState.phase === Phase.TECH_TREE) && renderCampaign()}
    </div>
  );
}

export default App;