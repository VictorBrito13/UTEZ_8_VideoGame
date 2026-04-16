import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap, Activity, Heart, Shield, ArrowUp, Star } from "lucide-react";
import apiClient from "../../../api/apiClient";
import { BattleEndOverlay } from "../components/BattleEndOverlay";
import { useBattleChannel } from "../hooks/useBattleChannel";
import { useBattleChatChannel } from "../hooks/useBattleChatChannel";
import type { BattleState, ChatMessage, InventoryItem, PlayerData } from "../types";

export const BattlePage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [myId, setMyId] = useState<number | null>(null);
  const [, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isAttacking, setIsAttacking] = useState<string | null>(null);
  const [isHit, setIsHit] = useState<string | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{
    target: "p1" | "p2";
    amount: number;
  } | null>(null);
  const [useItemVfx, setUseItemVfx] = useState<{
    target: "p1" | "p2";
    type: string;
  } | null>(null);
  const [selectingReviveTarget, setSelectingReviveTarget] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 10));
  };

  const handleChatMessage = useCallback(
    (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    },
    []
  );

  const handleChatStatus = useCallback((message: string) => {
    setChatStatus(message);
  }, []);


  // Fetch my profile and inventory
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, invRes] = await Promise.all([
          apiClient.get("/api/profile/me/"),
          apiClient.get("/api/inventory/"),
        ]);
        const userObj = Array.isArray(profileRes.data)
          ? profileRes.data[0]
          : profileRes.data;
        setMyId(userObj.user_id);

        const invData = Array.isArray(invRes.data)
          ? invRes.data[0]
          : invRes.data;
        setInventory(invData?.items || []);
      } catch (err) {
        console.error("Error fetching battle data", err);
      }
    };
    fetchData();
  }, []);

  useBattleChannel({
    battleId,
    myId,
    setBattleState,
    setWinnerId,
    setInventory,
    addLog,
    setIsAttacking,
    setIsHit,
    setFloatingDamage,
    setUseItemVfx,
    wsRef,
  });

  const { connected: chatConnected, sendMessage: sendChatMessage } =
    useBattleChatChannel({
      battleId,
      onMessage: handleChatMessage,
      onSystemMessage: handleChatStatus,
    });

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
        if (
          window.confirm(
            "¿Estás seguro de que quieres abandonar la batalla? Se contará como una derrota.",
          )
        ) {
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
    if (battleState?.status === "matched" && isPlayer1) {
      const timer = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({ type: "battle.start" }));
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [battleState?.status, isPlayer1]);

  const handleAttack = () => {
    wsRef.current?.send(
      JSON.stringify({ type: "battle.action", action: "attack" }),
    );
  };

  const handleSwap = (creatureId: number) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "battle.action",
        action: "swap",
        data: { creature_id: creatureId },
      }),
    );
  };

  const handleUseItem = (itemId: number, forceTargetId?: number) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    if (item.object.effect_type === "REVIVE" && !forceTargetId) {
      const fainted = me.team.filter((c) => c.hp === 0);
      if (fainted.length === 0) {
        addLog("No tienes criaturas debilitadas para revivir.");
        return;
      }
      if (fainted.length === 1) {
        // Auto-select the only fainted creature
        handleUseItem(itemId, fainted[0].id);
        return;
      }
      // Start selection mode
      setSelectingReviveTarget(itemId);
      addLog("Selecciona a qué criatura regresar al combate.");
      return;
    }

    const payload: any = { item_id: itemId };
    if (forceTargetId) payload.target_id = forceTargetId;

    wsRef.current?.send(
      JSON.stringify({
        type: "battle.action",
        action: "use_item",
        data: payload,
      }),
    );
    
    setSelectingReviveTarget(null);
  };

  const handleSurrender = () => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres abandonar la partida? Esto contará como una derrota.",
      )
    ) {
      navigate("/");
    }
  };

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const sent = sendChatMessage(trimmed);
    if (sent) {
      setChatInput("");
    } else {
      addLog("System: Unable to send chat message.");
    }
  };

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Early return check - AFTER all hooks
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
  const resolvedWinnerId = winnerId ?? battleState.winner_id ?? null;

  const getActive = (p: PlayerData | undefined) => {
    if (!p) return null;
    const creature = p.team.find((c) => c.id === p.active_creature_id);
    if (!creature && p.team.length > 0) return p.team[0];
    return creature;
  };
  const oppActive = getActive(opponent);
  const meActive = getActive(me);

  const getVfxIcon = (type: string) => {
    switch (type) {
      case "HEAL":
      case "REVIVE": return <Heart className="text-red-500 w-24 h-24 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]" />;
      case "BUFF_ATK": return <Swords className="text-orange-500 w-24 h-24 drop-shadow-[0_0_20px_rgba(249,115,22,0.9)]" />;
      case "BUFF_DEF": return <Shield className="text-blue-500 w-24 h-24 drop-shadow-[0_0_20px_rgba(59,130,246,0.9)]" />;
      case "BUFF_SPEED": return <Zap className="text-yellow-400 w-24 h-24 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" />;
      case "EQUIP": return <ArrowUp className="text-purple-500 w-24 h-24 drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]" />;
      default: return <Star className="text-white w-24 h-24 drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]" />;
    }
  };


  return (
    <div className="h-screen bg-neutral-950 text-white font-sans relative flex flex-col overflow-hidden">
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
              <div className="text-[11px] font-black text-emerald-400 tracking-[0.2em] uppercase">
                Your Turn
              </div>
            </div>
          )}
          <button
            onClick={handleSurrender}
            className="text-[11px] uppercase font-black text-red-500/60 hover:text-red-500 transition-all flex items-center gap-2 group"
          >
            <Swords
              size={16}
              className="group-hover:rotate-12 transition-transform"
            />
            Surrender
          </button>
        </div>
      </div>

      {/* Arena Viewport */}
      <div className="flex-1 min-h-0 w-full px-3 md:px-8 lg:px-12 relative flex flex-col justify-center gap-3 md:gap-4 py-3 md:py-6 overflow-hidden">
        {/* Opponent Area */}
        <div className="flex justify-end pr-10">
          <div className="flex items-center gap-12">
            {/* Opponent Status Box */}
            <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-5 border border-white/10 w-64 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1 h-full bg-red-500/50" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-red-400 uppercase tracking-[0.2em]">
                  {opponent.username}
                </span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                </div>
              </div>
              <div className="mb-4 flex justify-between items-end">
                <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">
                  {oppActive?.name || "No Creature"}
                </h2>
                <span className="text-[10px] font-black text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                  Lvl. {oppActive?.level || 0}
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((oppActive?.hp || 0) / (oppActive?.max_hp || 1)) * 100}%`,
                    }}
                    className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-1 rounded-full ${i < opponent.team.filter((c) => c.hp > 0).length ? "bg-red-500" : "bg-neutral-800"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 font-black">
                    {oppActive?.hp || 0} / {oppActive?.max_hp || 0} HP
                  </span>
                </div>
                {oppActive?.buffs && (
                  <div className="flex gap-1.5 mt-2 justify-end">
                    {oppActive.buffs.atk > 1 && <Swords className="w-3.5 h-3.5 text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.8)]" />}
                    {oppActive.buffs.def > 1 && <Shield className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                    {oppActive.buffs.has_choice && <Star className="w-3.5 h-3.5 text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]" />}
                    {oppActive.buffs.has_focus && <Activity className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />}
                    {oppActive.buffs.has_oran && <Heart className="w-3.5 h-3.5 text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" />}
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Sprites */}
            <div className="relative flex items-center gap-6">
              <div className="relative w-48 h-48 flex items-end justify-center">
                <AnimatePresence>
                  {isAttacking === (isPlayer1 ? "p2" : "p1") && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 2, opacity: 1 }}
                      exit={{ scale: 2.5, opacity: 0 }}
                      className="absolute inset-0 z-20 flex items-center justify-center"
                    >
                      <Zap className="text-yellow-400 w-24 h-24 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" />
                    </motion.div>
                  )}
                  {floatingDamage?.target === (isPlayer1 ? "p2" : "p1") && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -80, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className="absolute top-0 z-30 font-black text-3xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    >
                      -{floatingDamage.amount}
                    </motion.div>
                  )}
                  {useItemVfx?.target === (isPlayer1 ? "p2" : "p1") && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1.5, opacity: 1, y: -40 }}
                      exit={{ scale: 2, opacity: 0, y: -80 }}
                      className="absolute inset-0 z-20 flex items-center justify-center"
                    >
                      {getVfxIcon(useItemVfx.type)}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.img
                  animate={
                    isHit === (isPlayer1 ? "p2" : "p1")
                      ? {
                          x: [-10, 10, -10, 10, 0],
                          filter: "sepia(1) saturate(10)", // Simplified to avoid distortion error
                          scale: [1, 1.05, 1],
                        }
                      : isAttacking === (isPlayer1 ? "p2" : "p1")
                        ? { x: -80 }
                        : { 
                            y: [0, -5, 0], 
                            filter: (oppActive?.buffs?.atk || 1) > 1.4 ? "drop-shadow(0 0 15px rgba(251,146,60,0.8))" : "none",
                            scale: (oppActive?.buffs?.atk || 1) > 1.4 ? [1, 1.05, 1] : 1
                          }
                  }
                  transition={{
                    y: { repeat: Infinity, duration: 4 },
                    x: { duration: 0.2 },
                  }}
                  src={oppActive?.sprite || ""}
                  className="w-full h-full object-contain z-10"
                />
              </div>
              <img
                src={opponent.trainer_sprite}
                className="w-40 h-40 object-contain opacity-80"
              />
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-white/5 rounded-[100%] blur-[120px] pointer-events-none" />

        {/* My Area */}
        <div className="flex justify-start pl-10">
          <div className="flex items-center gap-12">
            {/* My Sprites */}
            <div className="relative flex items-center gap-6">
              <img
                src={me.trainer_sprite}
                className="w-40 h-40 object-contain transform scale-x-[-1]"
              />
              <div className="relative w-48 h-48 flex items-end justify-center">
                <AnimatePresence>
                  {floatingDamage?.target === (isPlayer1 ? "p1" : "p2") && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -80, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className="absolute top-0 z-30 font-black text-3xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    >
                      -{floatingDamage.amount}
                    </motion.div>
                  )}
                  {useItemVfx?.target === (isPlayer1 ? "p1" : "p2") && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1.5, opacity: 1, y: -40 }}
                      exit={{ scale: 2, opacity: 0, y: -80 }}
                      className="absolute inset-0 z-20 flex items-center justify-center"
                    >
                      {getVfxIcon(useItemVfx.type)}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.img
                  animate={
                    isHit === (isPlayer1 ? "p1" : "p2")
                      ? {
                          x: [-10, 10, -10, 10, 0],
                          filter: "sepia(1) saturate(10)",
                          scale: [1, 1.05, 1],
                        }
                      : isAttacking === (isPlayer1 ? "p1" : "p2")
                        ? { x: 80 }
                        : { 
                            y: [0, -5, 0], 
                            filter: (meActive?.buffs?.atk || 1) > 1.4 ? "drop-shadow(0 0 15px rgba(251,146,60,0.8))" : "none",
                            scale: (meActive?.buffs?.atk || 1) > 1.4 ? [1, 1.05, 1] : 1
                          }
                  }
                  transition={{
                    y: { repeat: Infinity, duration: 3.5, delay: 0.5 },
                    x: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                  src={meActive?.sprite || ""}
                  className="w-full h-full object-contain z-10"
                />
              </div>
            </div>

            {/* My Status Box */}
            <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-5 border border-white/10 w-64 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">
                  {me.username} (YOU)
                </span>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                </div>
              </div>
              <div className="mb-4 flex justify-between items-end">
                <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">
                  {meActive?.name || "No Creature"}
                </h2>
                <span className="text-[10px] font-black text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest">
                  Lvl. {meActive?.level || 0}
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((meActive?.hp || 0) / (meActive?.max_hp || 1)) * 100}%`,
                    }}
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-1 rounded-full ${i < me.team.filter((c) => c.hp > 0).length ? "bg-blue-500" : "bg-neutral-800"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 font-black">
                    {meActive?.hp || 0} / {meActive?.max_hp || 0} HP
                  </span>
                </div>
                {meActive?.buffs && (
                  <div className="flex gap-1.5 mt-2">
                    {meActive.buffs.atk > 1 && <Swords className="w-3.5 h-3.5 text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.8)]" />}
                    {meActive.buffs.def > 1 && <Shield className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />}
                    {meActive.buffs.has_choice && <Star className="w-3.5 h-3.5 text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]" />}
                    {meActive.buffs.has_focus && <Activity className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />}
                    {meActive.buffs.has_oran && <Heart className="w-3.5 h-3.5 text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel (LARGE CENTERED BALANCE) */}
      <div className="bg-neutral-950/90 border-t border-white/5 px-3 md:px-6 lg:px-10 py-2 md:py-3 relative z-10 flex flex-wrap lg:flex-nowrap items-stretch lg:items-end justify-center gap-3 md:gap-4 lg:gap-6 backdrop-blur-lg shrink-0 overflow-hidden">
        {/* Battle Chat */}
        <div className="bg-black/50 rounded-xl p-3 border border-white/10 h-[24vh] min-h-[150px] max-h-[240px] lg:h-[220px] lg:max-h-[220px] w-full lg:w-[24%] shadow-inner flex flex-col">
          <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-white/5 pb-1">
            Chat de Combate
          </div>
          <div
            ref={chatListRef}
            className="flex-1 min-h-0 overflow-y-auto bg-neutral-900/70 rounded-xl p-2 mt-2 space-y-1.5 border border-white/10"
          >
            {chatMessages.length > 0 ? (
              chatMessages.map((message, index) => (
                <div key={message.id || `chat-${index}`} className="text-xs leading-snug">
                  <span className="font-bold text-white">
                    {message.senderId === myId ? "Tú" : message.senderName}:
                  </span>{" "}
                  <span className="text-neutral-300">{message.text}</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-neutral-500">No hay mensajes aún.</p>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-xl border border-white/10 bg-neutral-950/90 px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || !chatConnected}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                chatInput.trim() && chatConnected
                  ? "bg-cyan-500 text-neutral-950 hover:bg-cyan-400"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              Enviar
            </button>
          </div>
          {chatStatus && (
            <div className="mt-2 text-[10px] text-neutral-500">{chatStatus}</div>
          )}
        </div>

        {/* Tactical Items */}
        <div className="bg-neutral-900/40 rounded-xl p-3 md:p-4 border border-white/10 h-[18vh] min-h-[110px] max-h-[180px] lg:h-[180px] lg:max-h-[180px] w-full lg:w-[33%] flex flex-col shadow-inner">
          <div className="text-[10px] font-black text-neutral-500 mb-2 uppercase tracking-widest text-center border-b border-white/5 pb-1">
            Recursos Tácticos
          </div>
          <div className="flex-1 overflow-y-auto pt-2">
            <div className="grid grid-cols-4 gap-2">
              {inventory.map((item, index) => (
                <button
                  key={item.id || `tactical-${index}`}
                  onClick={() => handleUseItem(item.id)}
                  disabled={!myTurn || selectingReviveTarget !== null}
                  className="group flex flex-col items-center justify-center p-2 bg-neutral-800/80 rounded-lg border border-white/5 hover:border-cyan-500 transition-all disabled:opacity-30 relative"
                >
                  <span className="text-xs font-black text-cyan-400">
                    x{item.quantity}
                  </span>
                  <span className="text-[8px] font-bold text-neutral-500 uppercase truncate w-full text-center">
                    {item.object.name}
                  </span>
                  {selectingReviveTarget === item.id && (
                     <div className="absolute inset-0 ring-2 ring-emerald-500 rounded-lg animate-pulse pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bench (Horizontal) */}
        <div className="flex gap-2 shrink-0 w-full lg:w-auto overflow-x-auto pb-1 max-w-full">
          {me.team.map((c, index) => (
            <button
              key={c.id || `bench-${index}`}
              onClick={() => {
                if (selectingReviveTarget) {
                   if (c.hp === 0) handleUseItem(selectingReviveTarget, c.id);
                } else {
                   handleSwap(c.id);
                }
              }}
              disabled={!myTurn || (!selectingReviveTarget && (c.hp === 0 || c.id === me.active_creature_id)) || (selectingReviveTarget !== null && c.hp > 0)}
              className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-neutral-900/80 border-2 ${c.id === me.active_creature_id ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : (selectingReviveTarget && c.hp === 0 ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse" : "border-white/10")} hover:border-white transition-all overflow-hidden p-2 ${c.hp === 0 && !selectingReviveTarget ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-105"}`}
            >
              <img
                src={c.sprite}
                className="w-full h-full object-contain mb-2"
              />
              <div className="absolute top-1 left-2 text-[10px] font-black uppercase text-white/40">
                {c.name}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-neutral-800">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(c.hp / c.max_hp) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Attack Button */}
        <div className="h-auto lg:h-32 flex items-center justify-center shrink-0 w-full lg:w-auto">
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
              <Activity size={20} className={myTurn ? "animate-pulse" : ""} />
              <span className="text-[9px]">Attack</span>
            </button>
          )}
        </div>
      </div>

      <BattleEndOverlay
        show={battleState.status === "finished" && resolvedWinnerId !== null}
        won={resolvedWinnerId === myId}
        onReturn={() => navigate("/")}
      />
    </div>
  );
};
