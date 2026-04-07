import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap, Activity } from "lucide-react";
import apiClient from "../../../api/apiClient";
import { BASE_URL } from "../../../common/utils/url";

interface CreatureData {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  sprite: string;
}

interface PlayerData {
  id: number;
  username: string;
  team: CreatureData[];
  active_creature_id: number | null;
  trainer_sprite: string;
}

interface InventoryItem {
  id: number;
  quantity: number;
  object: {
    id: number;
    name: string;
    description: string;
    rarity: string;
    vfx_type: string;
    effect_value: number;
  };
}

interface BattleState {
  battle_id: number;
  status: "waiting" | "matched" | "playing" | "finished";
  current_turn: number | null;
  turn_number: number;
  player1: PlayerData;
  player2: PlayerData;
}

export const BattlePage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [myId, setMyId] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isAttacking, setIsAttacking] = useState<string | null>(null);
  const [isHit, setIsHit] = useState<string | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{ target: 'p1' | 'p2', amount: number } | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  // Fetch my profile and inventory
  useEffect(() => {
    const fetchData = async () => {
        try {
            const [profileRes, invRes] = await Promise.all([
                apiClient.get("/api/profile/me/"),
                apiClient.get("/api/inventory/")
            ]);
            const userObj = Array.isArray(profileRes.data) ? profileRes.data[0] : profileRes.data;
            setMyId(userObj.user_id);
            
            const invData = Array.isArray(invRes.data) ? invRes.data[0] : invRes.data;
            setInventory(invData.items || []);
        } catch (err) {
            console.error("Error fetching battle data", err);
        }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!battleId) return;
    const token = localStorage.getItem("access_token") || "";
    const wsUrl = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
    
    const ws = new WebSocket(`${wsUrl}/ws/battle/${battleId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog("System: Connected to Battle Arena.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Battle event:", data);

        switch (data.type) {
          case "battle_state":
            setBattleState(data);
            break;
            
          case "battle_started":
            setBattleState(prev => prev ? {...prev, status: "playing", current_turn: data.first_turn} : prev);
            addLog("System: The battle has started!");
            break;

          case "turn_changed":
            setBattleState(prev => prev ? {...prev, current_turn: data.next_player_id, turn_number: data.turn_number} : prev);
            break;

          case "battle_action":
            if (data.action === "attack") {
              const damage = data.data.damage;
              const attackerId = data.player_id;
              
              setBattleState(current => {
                 if (!current) return current;
                 const isAttackerP1 = attackerId === current.player1.id;
                 const attackerTag = isAttackerP1 ? 'p1' : 'p2';
                 const victimTag = isAttackerP1 ? 'p2' : 'p1';
                 
                 // 1. Iniciamos el ataque (Lunge)
                 setIsAttacking(attackerTag);
                 
                 // 2. Fase de Impacto (Shake + Red Flash + Color Damage)
                 setTimeout(() => {
                    setIsHit(victimTag);
                    setFloatingDamage({ target: victimTag, amount: damage });
                 }, 450);

                 // 3. Resolución (Volver a posición + Update HP)
                 setTimeout(() => {
                    setIsAttacking(null);
                    setIsHit(null);
                    setFloatingDamage(null);
                    
                    setBattleState(prev => {
                      if (!prev) return prev;
                      const isAtkP1 = data.player_id === prev.player1.id;
                      // Clone the whole state to avoid mutation issues
                      const newState = JSON.parse(JSON.stringify(prev)) as BattleState;
                      const target = isAtkP1 ? newState.player2 : newState.player1;
                      const defActiveId = data.data.defender_active_id;
                      
                      const creatureToUpdate = target.team.find(c => c.id === defActiveId);
                      if (creatureToUpdate) {
                         creatureToUpdate.hp = Math.max(0, creatureToUpdate.hp - damage);
                      }
                      return newState;
                    });
                    addLog(`${data.player_id === myId ? 'Tú' : 'Oponente'} atacaste! Daño: ${damage}`);
                 }, 1000);

                 return current;
              });
            } else if (data.action === "swap") {
                const targetId = data.data.creature_id;
                setBattleState(prev => {
                   if (!prev) return prev;
                   const newState = JSON.parse(JSON.stringify(prev)) as BattleState;
                   const isP1 = data.player_id === newState.player1.id;
                   if (isP1) {
                      newState.player1.active_creature_id = targetId;
                   } else {
                      newState.player2.active_creature_id = targetId;
                   }
                   return newState;
                });
            } else if (data.action === "use_item") {
                const { item_name, heal_amount, new_hp, creature_id } = data.data;
                addLog(`${data.player_id === myId ? 'Tú' : 'Oponente'} usó ${item_name}! (+${heal_amount} HP)`);
                
                setBattleState(prev => {
                  if (!prev) return prev;
                  const newState = JSON.parse(JSON.stringify(prev)) as BattleState;
                  const isP1 = data.player_id === newState.player1.id;
                  const p = isP1 ? newState.player1 : newState.player2;
                  const creature = p.team.find(c => c.id === creature_id);
                  if (creature) creature.hp = new_hp;
                  return newState;
                });

                if (data.player_id === myId) {
                   setInventory(prev => prev.map(item => {
                      if (item.id === data.data.item_id) {
                         return { ...item, quantity: item.quantity - 1 };
                      }
                      return item;
                   }).filter(item => item.quantity > 0));
                }
            }
            break;

          case "battle_abandoned":
            setBattleState(prev => prev ? {...prev, status: "finished"} : prev);
            setWinnerId(data.winner_id);
            addLog(`System: ${data.winner_username} wins! Reason: ${data.reason}`);
            break;

          case "error":
            addLog(`Error: ${data.message}`);
            break;
        }
      } catch (err) {
        console.error("Parse error", err);
      }
    };

    ws.onerror = () => {
      addLog("System: Lost connection to the arena.");
    };

    return () => {
      ws.close();
    };
  }, [battleId, navigate, myId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (battleState?.status === "playing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    
    const handlePopState = () => {
      if (battleState?.status === "playing") {
        window.history.pushState(null, "", window.location.pathname);
        if (window.confirm("¿Estás seguro de que quieres abandonar la batalla? Se contará como una derrota.")) {
          navigate("/");
        }
      }
    };

    if (battleState?.status === "playing") {
        window.history.pushState(null, "", window.location.pathname);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
    };
  }, [battleState?.status, navigate]);

  const isPlayer1 = myId === battleState?.player1.id;

  useEffect(() => {
    if (battleState?.status === 'matched' && isPlayer1) {
      const timer = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({ type: "battle.start" }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [battleState?.status, isPlayer1]);

  const handleAttack = () => {
    wsRef.current?.send(JSON.stringify({ type: "battle.action", action: "attack" }));
  };

  const handleSwap = (creatureId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "battle.action", action: "swap", data: { creature_id: creatureId } }));
  };

  const handleUseItem = (itemId: number) => {
    wsRef.current?.send(JSON.stringify({ type: "battle.action", action: "use_item", data: { item_id: itemId } }));
  };

  const handleSurrender = () => {
    if (window.confirm("¿Estás seguro de que quieres abandonar la partida? Esto contará como una derrota.")) {
      navigate('/');
    }
  };

  if (!battleState || !myId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold uppercase tracking-widest">
        Initializing Arena...
      </div>
    );
  }

  const me = isPlayer1 ? battleState.player1 : battleState.player2;
  const opponent = isPlayer1 ? battleState.player2 : battleState.player1;
  const myTurn = battleState.current_turn === myId;

  const getActive = (p: PlayerData | undefined) => {
    if (!p) return null;
    const creature = p.team.find(c => c.id === p.active_creature_id);
    if (!creature && p.team.length > 0) return p.team[0]; // Fallback to first if ID is weird
    return creature;
  };
  const oppActive = getActive(opponent);
  const meActive = getActive(me);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans relative flex flex-col overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />

      {/* Header (MINIMALIST) */}
      <div className="bg-black/20 border-b border-white/5 px-6 py-1 flex justify-between items-center backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-[10px] font-black italic tracking-[0.3em] text-neutral-500 uppercase">
            BATTLE_ARENA
          </h1>
          <div className="h-3 w-px bg-white/10" />
          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">
            {battleState.status} | T_{battleState.turn_number}
          </p>
        </div>
        <div className="flex items-center gap-8">
            {myTurn && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <div className="text-[11px] font-black text-emerald-400 tracking-[0.2em] uppercase">Your Turn</div>
              </div>
            )}
            <button 
              onClick={handleSurrender}
              className="text-[11px] uppercase font-black text-red-500/60 hover:text-red-500 transition-all flex items-center gap-2 group"
            >
              <Swords size={16} className="group-hover:rotate-12 transition-transform" />
              Surrender
            </button>
        </div>
      </div>

      {/* Arena Viewport */}
      <div className="flex-1 w-full px-4 md:px-12 relative flex flex-col justify-center gap-4 py-8">
        {/* Opponent Area */}
        <div className="flex justify-end pr-10">
          <div className="flex items-center gap-12">
            {/* Opponent Status Box */}
            <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-5 border border-white/10 w-64 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1 h-full bg-red-500/50" />
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">{opponent.username}</span>
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                    </div>
                </div>
                <div className="mb-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">{oppActive?.name || 'No Creature'}</h2>
                </div>
                <div className="space-y-2.5">
                    <div className="h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(oppActive?.hp || 0) / (oppActive?.max_hp || 1) * 100}%` }}
                            className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                        />
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-3 h-1 rounded-full ${i < opponent.team.filter(c => c.hp > 0).length ? 'bg-red-500' : 'bg-neutral-800'}`} />
                            ))}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 font-black">{oppActive?.hp || 0} / {oppActive?.max_hp || 0} HP</span>
                    </div>
                </div>
            </div>
            
            {/* Opponent Sprites */}
            <div className="relative flex items-center gap-6">
              <div className="relative w-48 h-48 flex items-end justify-center">
                <AnimatePresence>
                  {isAttacking === (isPlayer1 ? 'p2' : 'p1') && (
                    <motion.div 
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: 2, opacity: 1 }}
                       exit={{ scale: 2.5, opacity: 0 }}
                       className="absolute inset-0 z-20 flex items-center justify-center"
                    >
                       <Zap className="text-yellow-400 w-24 h-24 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" />
                    </motion.div>
                  )}
                  {floatingDamage?.target === (isPlayer1 ? 'p2' : 'p1') && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -80, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className="absolute top-0 z-30 font-black text-3xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    >
                      -{floatingDamage.amount}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.img 
                  animate={
                    isHit === (isPlayer1 ? 'p2' : 'p1')
                      ? { 
                          x: [-10, 10, -10, 10, 0],
                          filter: 'sepia(1) saturate(10)', // Simplified to avoid distortion error
                          scale: [1, 1.05, 1]
                        }
                      : isAttacking === (isPlayer1 ? 'p2' : 'p1')
                      ? { x: -80 }
                      : { y: [0, -5, 0], filter: 'sepia(0) saturate(1)' }
                  }
                  transition={{ 
                    y: { repeat: Infinity, duration: 4 },
                    x: { duration: 0.2 }
                  }}
                  src={oppActive?.sprite || ''} 
                  className="w-full h-full object-contain z-10" 
                />
              </div>
              <img src={opponent.trainer_sprite} className="w-40 h-40 object-contain opacity-80" />
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-white/5 rounded-[100%] blur-[120px] pointer-events-none" />

        {/* My Area */}
        <div className="flex justify-start pl-10">
          <div className="flex items-center gap-12">
            {/* My Sprites */}
            <div className="relative flex items-center gap-6">
              <img src={me.trainer_sprite} className="w-40 h-40 object-contain transform scale-x-[-1]" />
              <div className="relative w-48 h-48 flex items-end justify-center">
                 <AnimatePresence>
                    {floatingDamage?.target === (isPlayer1 ? 'p1' : 'p2') && (
                      <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -80, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        className="absolute top-0 z-30 font-black text-3xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                      >
                        -{floatingDamage.amount}
                      </motion.div>
                    )}
                 </AnimatePresence>
                 <motion.img 
                    animate={
                      isHit === (isPlayer1 ? 'p1' : 'p2')
                        ? { 
                            x: [-10, 10, -10, 10, 0], 
                            filter: 'sepia(1) saturate(10)',
                            scale: [1, 1.05, 1]
                          }
                        : isAttacking === (isPlayer1 ? 'p1' : 'p2')
                        ? { x: 80 }
                        : { y: [0, -5, 0], filter: 'sepia(0) saturate(1)' }
                    }
                    transition={{ 
                      y: { repeat: Infinity, duration: 3.5, delay: 0.5 },
                      x: { type: "spring", stiffness: 300, damping: 20 }
                    }}
                    src={meActive?.sprite || ''} 
                    className="w-full h-full object-contain z-10" 
                  />
              </div>
            </div>

            {/* My Status Box */}
            <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-5 border border-white/10 w-64 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">{me.username} (YOU)</span>
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                    </div>
                </div>
                <div className="mb-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">{meActive?.name || 'No Creature'}</h2>
                </div>
                <div className="space-y-2.5">
                    <div className="h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(meActive?.hp || 0) / (meActive?.max_hp || 1) * 100}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                        />
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-3 h-1 rounded-full ${i < me.team.filter(c => c.hp > 0).length ? 'bg-blue-500' : 'bg-neutral-800'}`} />
                            ))}
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 font-black">{meActive?.hp || 0} / {meActive?.max_hp || 0} HP</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel (LARGE CENTERED BALANCE) */}
      <div className="bg-neutral-950/90 border-t border-white/5 px-10 py-5 relative z-10 flex items-center justify-center gap-8 backdrop-blur-lg">
        {/* Battle Logs */}
        <div className="bg-black/50 rounded-xl p-4 border border-white/10 h-32 w-[30%] shrink-0 overflow-y-auto shadow-inner">
          <div className="text-[10px] font-black text-neutral-500 mb-2 uppercase tracking-widest border-b border-white/5 pb-1">Logs de Combate</div>
          {logs.map((log, i) => (
            <p key={i} className="text-xs font-mono text-neutral-400 mb-1 leading-tight">{log}</p>
          ))}
        </div>

        {/* Tactical Items */}
        <div className="bg-neutral-900/40 rounded-xl p-4 border border-white/10 h-32 w-[35%] shrink-0 flex flex-col shadow-inner">
          <div className="text-[10px] font-black text-neutral-500 mb-2 uppercase tracking-widest text-center border-b border-white/5 pb-1">Recursos Tácticos</div>
          <div className="flex-1 overflow-y-auto pt-2">
             <div className="grid grid-cols-4 gap-2">
                {inventory.map(item => (
                   <button
                     key={item.id}
                     onClick={() => handleUseItem(item.id)}
                     disabled={!myTurn || meActive?.hp === 0}
                     className="group flex flex-col items-center justify-center p-2 bg-neutral-800/80 rounded-lg border border-white/5 hover:border-cyan-500 transition-all disabled:opacity-30"
                   >
                      <span className="text-xs font-black text-cyan-400">x{item.quantity}</span>
                      <span className="text-[8px] font-bold text-neutral-500 uppercase truncate w-full text-center">{item.object.name}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>

        {/* Bench (Horizontal) */}
        <div className="flex gap-2 shrink-0">
          {me.team.map(c => (
            <button 
                key={c.id} 
                onClick={() => handleSwap(c.id)}
                disabled={!myTurn || c.hp === 0 || c.id === me.active_creature_id}
                className={`relative w-24 h-24 rounded-2xl bg-neutral-900/80 border-2 ${c.id === me.active_creature_id ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-white/10'} hover:border-white transition-all overflow-hidden p-2 ${c.hp === 0 ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <img src={c.sprite} className="w-full h-full object-contain mb-2" />
                <div className="absolute top-1 left-2 text-[10px] font-black uppercase text-white/40">{c.name}</div>
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-neutral-800">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{width:`${(c.hp/c.max_hp)*100}%`}} />
                </div>
            </button>
          ))}
        </div>

        {/* Attack Button */}
        <div className="h-32 flex items-center shrink-0">
          {battleState.status === "playing" && (
            <button 
                onClick={handleAttack}
                disabled={!myTurn || meActive?.hp === 0}
                className={`w-32 h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl font-black uppercase tracking-widest transition-all ${
                myTurn && meActive?.hp !== 0
                    ? "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20" 
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5 opacity-50"
                }`}
            >
                <Activity size={20} className={myTurn ? 'animate-pulse' : ''} />
                <span className="text-[9px]">Attack</span>
            </button>
          )}

          {battleState.status === "finished" && (
             <button 
                onClick={() => navigate('/')}
                className="w-40 h-20 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg flex flex-col items-center justify-center gap-1"
             >
                <span className="text-sm">{winnerId === myId ? "¡GANASTE!" : "DERROTA"}</span>
                <span className="text-[8px] opacity-60 uppercase">Finalizar Combate</span>
             </button>
          )}
        </div>
      </div>
    </div>
  );
};
