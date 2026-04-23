import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../../api/apiClient";
import { encryptJson } from "../../../common/utils/payloadCrypto";
import { BattleEndOverlay } from "../components/BattleEndOverlay";
import { useBattleChannel } from "../hooks/useBattleChannel";
import { useBattleChatChannel } from "../hooks/useBattleChatChannel";
import type {
  BattleState,
  ChatMessage,
  InventoryItem,
  PlayerData,
} from "../types";
import { ElementalVfx } from "../components/ElementalVfx";

const typeColors: Record<string, string> = {
  FIRE: "bg-orange-500",
  WATER: "bg-blue-500",
  GRASS: "bg-green-500",
  ELECTRIC: "bg-yellow-400",
  NORMAL: "bg-gray-400",
  FLYING: "bg-indigo-400",
  POISON: "bg-purple-500",
  GROUND: "bg-amber-600",
  ROCK: "bg-stone-500",
  BUG: "bg-lime-500",
  GHOST: "bg-violet-700",
  STEEL: "bg-slate-400",
  PSYCHIC: "bg-pink-400",
  ICE: "bg-cyan-300",
  DRAGON: "bg-indigo-600",
  DARK: "bg-gray-700",
  FAIRY: "bg-rose-400",
};

const typeIcons: Record<string, string> = {
  FIRE: "local_fire_department",
  WATER: "water_drop",
  GRASS: "eco",
  ELECTRIC: "bolt",
  ICE: "ac_unit",
  POISON: "coronavirus",
  ROCK: "terrain",
  GROUND: "terrain",
  FLYING: "air",
  PSYCHIC: "visibility",
  BUG: "bug_report",
  GHOST: "cruelty_free",
  DRAGON: "local_fire_department",
  DARK: "dark_mode",
  FAIRY: "auto_awesome",
  STEEL: "hardware",
  FIGHTING: "sports_martial_arts",
  NORMAL: "star",
};

export const BattlePage = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [myId, setMyId] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  // Use logs silently to avoid unused var warning if necessary, or simply declare it
  console.debug("Battle logs:", logs.length);
  const wsRef = useRef<WebSocket | null>(null);
  const battleStateRef = useRef<BattleState | null>(null);
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
  const [selectingReviveTarget, setSelectingReviveTarget] = useState<
    number | null
  >(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedMoveId, setSelectedMoveId] = useState<number | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [showConfirm, setShowConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 10));
  };

  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  // Fetch my profile and inventory
  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  useBattleChannel({
    battleId,
    myId,
    setBattleState,
    battleStateRef,
    setWinnerId,
    setInventory,
    addLog,
    setIsAttacking,
    setIsHit,
    setFloatingDamage,
    setUseItemVfx,
    wsRef,
  });

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
      } catch {
        // Non-fatal: battle UI continues without prefetched profile/inventory.
      }
    };
    fetchData();
  }, []);

  const { connected: chatConnected, sendMessage: sendChatMessage } =
    useBattleChatChannel({
      battleId,
      onMessage: handleChatMessage,
    });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (battleState?.status === "playing") {
        e.preventDefault();
      }
    };

    const handlePopState = () => {
      if (battleState?.status === "playing") {
        globalThis.history.pushState(null, "", globalThis.location.pathname);
        setShowConfirm({
          isOpen: true,
          title: "LEAVE BATTLE",
          message: "Are you sure you want to leave the battle? This will count as a defeat.",
          onConfirm: () => navigate("/"),
        });
      }
    };

    if (battleState?.status === "playing") {
      globalThis.history.pushState(null, "", globalThis.location.pathname);
    }

    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    globalThis.addEventListener("popstate", handlePopState);

    return () => {
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
      globalThis.removeEventListener("popstate", handlePopState);
    };
  }, [battleState?.status, navigate]);

  const isPlayer1 = myId !== null && battleState?.player1?.id === myId;
  const me = battleState ? (isPlayer1 ? battleState.player1 : battleState.player2) : null;
  const opponent = battleState ? (isPlayer1 ? battleState.player2 : battleState.player1) : null;
  const myTurn = battleState?.current_turn === myId;
  const resolvedWinnerId = winnerId ?? battleState?.winner_id ?? null;

  useEffect(() => {
    if (battleState?.status === "matched" && isPlayer1) {
      const timer = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({ type: "battle.start" }));
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [battleState?.status, isPlayer1]);

  const handleAttack = async () => {
    if (selectedMoveId === null) {
      addLog("System: Selecciona un movimiento primero antes de atacar.");
      return;
    }

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog("System: La conexión aún no está lista. Vuelve a intentarlo en un momento.");
      return;
    }

    const dataPayload = { move_id: selectedMoveId };
    const data_encrypted = await encryptJson(dataPayload);

    ws.send(
      JSON.stringify({
        type: "battle.action",
        action: "attack",
        data: dataPayload,
        data_encrypted,
      }),
    );
    setSelectedMoveId(null);
  };

  const handleSwap = async (creatureId: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog("System: La conexión aún no está lista. Vuelve a intentarlo en un momento.");
      return;
    }

    const dataPayload = { creature_id: creatureId };
    const data_encrypted = await encryptJson(dataPayload);
    ws.send(
      JSON.stringify({
        type: "battle.action",
        action: "swap",
        data: dataPayload,
        data_encrypted,
      }),
    );
  };

  const handleUseItem = async (itemId: number, forceTargetId?: number) => {
    if (!me) return;
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
        await handleUseItem(itemId, fainted[0].id);
        return;
      }
      // Start selection mode
      setSelectingReviveTarget(itemId);
      addLog("Selecciona a qué criatura regresar al combate.");
      return;
    }

    const payload: Record<string, number> = { item_id: itemId };
    if (forceTargetId) payload.target_id = forceTargetId;

    const data_encrypted = await encryptJson(payload);
    wsRef.current?.send(
      JSON.stringify({
        type: "battle.action",
        action: "use_item",
        data_encrypted,
      }),
    );

    setSelectingReviveTarget(null);
  };

  const handleSurrender = () => {
    setShowConfirm({
      isOpen: true,
      title: "SURRENDER",
      message: "Are you sure you want to surrender? This will count as a defeat.",
      onConfirm: () => navigate("/"),
    });
  };

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const sent = await sendChatMessage(trimmed);
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
  const getActive = (p: PlayerData | null | undefined) => {
    if (!p) return null;
    const creature = p.team.find((c) => c.id === p.active_creature_id);
    if (!creature && p.team.length > 0) return p.team[0];
    return creature;
  };
  const oppActive = getActive(opponent);
  const meActive = getActive(me);

  useEffect(() => {
    if (meActive?.id !== undefined) {
      setSelectedMoveId(null);
    }
  }, [meActive?.id]);

  if (!battleState || !myId || !me || !opponent) {
    return (
      <div className="min-h-screen bg-[#0B1326] flex items-center justify-center font-headline text-error font-bold uppercase tracking-widest terminal-glow">
        INITIALIZING ARENA...
      </div>
    );
  }

  const getAttackerType = () => {
    const myTag = isPlayer1 ? "p1" : "p2";
    const oppTag = isPlayer1 ? "p2" : "p1";
    
    if (isAttacking === myTag || isHit === oppTag) {
      return meActive?.type_1_name || "NORMAL";
    }
    if (isAttacking === oppTag || isHit === myTag) {
      return oppActive?.type_1_name || "NORMAL";
    }
    return "NORMAL";
  };

  const getVfxIcon = (type: string) => {
    switch (type) {
      case "HEAL":
      case "REVIVE":
        return (
          <span className="material-symbols-outlined text-error text-[96px] drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
        );
      case "BUFF_ATK":
        return (
          <span className="material-symbols-outlined text-primary text-[96px] drop-shadow-[0_0_20px_rgba(249,115,22,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
        );
      case "BUFF_DEF":
        return (
          <span className="material-symbols-outlined text-secondary text-[96px] drop-shadow-[0_0_20px_rgba(59,130,246,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        );
      case "BUFF_SPEED":
        return (
          <span className="material-symbols-outlined text-tertiary text-[96px] drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
        );
      case "EQUIP":
        return (
          <span className="material-symbols-outlined text-purple-500 text-[96px] drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
        );
      default:
        return (
          <span className="material-symbols-outlined text-white text-[96px] drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        );
    }
  };

  const getOpponentAnimation = () => {
    const targetTag = isPlayer1 ? "p2" : "p1";
    if (isHit === targetTag) {
      return {
        x: [-25, 25, -20, 20, -10, 10, 0],
        filter: [
          "brightness(1) sepia(0)", 
          "brightness(3) sepia(1) hue-rotate(-50deg) saturate(5)", 
          "brightness(1) sepia(0)"
        ],
        scale: [1, 1.1, 0.9, 1],
      };
    }
    if (isAttacking === targetTag) {
      return { 
        x: [0, 40, -180, 0], 
        y: [0, -40, 20, 0],
        scale: [1, 1.05, 1.2, 1],
        rotate: [0, 15, -10, 0]
      };
    }
    const hasAtkBuff = (oppActive?.buffs?.atk || 1) > 1.4;
    return {
      y: [0, -5, 0],
      filter: hasAtkBuff
        ? "drop-shadow(0 0 15px rgba(251,146,60,0.8))"
        : "none",
      scale: hasAtkBuff ? [1, 1.05, 1] : 1,
    };
  };

  const getMyAnimation = () => {
    const targetTag = isPlayer1 ? "p1" : "p2";
    if (isHit === targetTag) {
      return {
        x: [-25, 25, -20, 20, -10, 10, 0],
        filter: [
          "brightness(1) sepia(0)", 
          "brightness(3) sepia(1) hue-rotate(-50deg) saturate(5)", 
          "brightness(1) sepia(0)"
        ],
        scale: [1, 1.1, 0.9, 1],
      };
    }
    if (isAttacking === targetTag) {
      return { 
        x: [0, -40, 180, 0], 
        y: [0, -40, 20, 0],
        scale: [1, 1.05, 1.2, 1],
        rotate: [0, -15, 10, 0]
      };
    }
    const hasAtkBuff = (meActive?.buffs?.atk || 1) > 1.4;
    return {
      y: [0, -5, 0],
      filter: hasAtkBuff
        ? "drop-shadow(0 0 15px rgba(251,146,60,0.8))"
        : "none",
      scale: hasAtkBuff ? [1, 1.05, 1] : 1,
    };
  };


  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a1a] text-white font-sans flex flex-col overflow-hidden select-none">
      {/* Dynamic Background Image (baseball field night) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/src/assets/battle_bg.png')",
          imageRendering: "pixelated"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Header Info Cards */}
      <div className="absolute top-6 left-6 right-6 flex justify-between z-20 pointer-events-none">
        
        {/* Player 1 (Me) Top Left Status */}
        <div className="bg-[#0B1326]/80 backdrop-blur-sm rounded-xl p-3 shadow-2xl flex items-center gap-3 border-2 border-[#1E293B] w-[320px] pointer-events-auto relative">
          <div className="w-14 h-14 bg-slate-800 rounded-full border-2 border-slate-600 shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
            <img src={me.trainer_sprite} alt="Me" className="w-12 h-12 object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <span className="font-black text-slate-100 text-lg uppercase tracking-tight leading-none drop-shadow-md">{meActive?.name || "???"}</span>
              <div className="flex gap-1">
                {meActive?.type_1_name && (
                  <span title={meActive.type_1_name} className={`${typeColors[meActive.type_1_name.toUpperCase()] || 'bg-slate-500'} text-white p-1 rounded shadow-sm flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {typeIcons[meActive.type_1_name.toUpperCase()] || 'star'}
                    </span>
                  </span>
                )}
                {meActive?.type_2_name && (
                  <span title={meActive.type_2_name} className={`${typeColors[meActive.type_2_name.toUpperCase()] || 'bg-slate-500'} text-white p-1 rounded shadow-sm flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {typeIcons[meActive.type_2_name.toUpperCase()] || 'star'}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span>HP {meActive?.hp || 0} / {meActive?.max_hp || 1}</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((meActive?.hp || 0) / (meActive?.max_hp || 1)) * 100}%` }}
                className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              />
            </div>
            <div className="flex gap-1 mt-1.5 items-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`my-ball-${i}`} className={`w-3 h-3 rounded-full border border-black/50 ${i < me.team.filter((c) => c.hp > 0).length ? 'bg-red-500' : 'bg-slate-700'}`} />
              ))}
              {meActive?.buffs && (
                <div className="flex gap-1 ml-auto">
                  {meActive.buffs.atk > 1 && <span className="material-symbols-outlined text-red-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>}
                  {meActive.buffs.def > 1 && <span className="material-symbols-outlined text-blue-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player 2 (Opponent) Top Right Status */}
        <div className="bg-[#0B1326]/80 backdrop-blur-sm rounded-xl p-3 shadow-2xl flex items-center gap-3 border-2 border-[#1E293B] w-[320px] pointer-events-auto relative">
          <div className="flex-1 text-right">
            <div className="flex justify-between items-end mb-1 flex-row-reverse">
              <span className="font-black text-slate-100 text-lg uppercase tracking-tight leading-none drop-shadow-md">{oppActive?.name || "???"}</span>
              <div className="flex gap-1 flex-row-reverse">
                {oppActive?.type_1_name && (
                  <span title={oppActive.type_1_name} className={`${typeColors[oppActive.type_1_name.toUpperCase()] || 'bg-slate-500'} text-white p-1 rounded shadow-sm flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {typeIcons[oppActive.type_1_name.toUpperCase()] || 'star'}
                    </span>
                  </span>
                )}
                {oppActive?.type_2_name && (
                  <span title={oppActive.type_2_name} className={`${typeColors[oppActive.type_2_name.toUpperCase()] || 'bg-slate-500'} text-white p-1 rounded shadow-sm flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {typeIcons[oppActive.type_2_name.toUpperCase()] || 'star'}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1 flex-row-reverse">
              <span>HP {oppActive?.hp || 0} / {oppActive?.max_hp || 1}</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 transform rotate-180">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((oppActive?.hp || 0) / (oppActive?.max_hp || 1)) * 100}%` }}
                className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
              />
            </div>
            <div className="flex gap-1 mt-1.5 flex-row-reverse items-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`opp-ball-${i}`} className={`w-3 h-3 rounded-full border border-black/50 ${i < opponent.team.filter((c) => c.hp > 0).length ? 'bg-red-500' : 'bg-slate-700'}`} />
              ))}
               {oppActive?.buffs && (
                <div className="flex gap-1 ml-auto flex-row-reverse">
                  {oppActive.buffs.atk > 1 && <span className="material-symbols-outlined text-red-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>}
                  {oppActive.buffs.def > 1 && <span className="material-symbols-outlined text-blue-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>}
                </div>
              )}
            </div>
          </div>
          <div className="w-14 h-14 bg-slate-800 rounded-full border-2 border-slate-600 shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
            <img src={opponent.trainer_sprite} alt="Opponent" className="w-12 h-12 object-contain" />
          </div>
        </div>
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-row items-center gap-4 z-20 pointer-events-none">
         {myTurn && (
          <div className="bg-yellow-500/90 text-black font-black uppercase px-6 py-1.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-yellow-300 animate-pulse text-sm tracking-widest backdrop-blur-sm pointer-events-auto">
            YOUR TURN
          </div>
        )}
        <button
          onClick={handleSurrender}
          className="bg-red-900/80 text-red-200 font-bold uppercase px-4 py-1.5 rounded-full shadow-lg border border-red-700/50 text-xs hover:bg-red-800 transition-colors flex items-center gap-1 backdrop-blur-sm pointer-events-auto"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
          Surrender
        </button>
      </div>

      {/* 3D Arena Field */}
      <div className="flex-1 relative perspective-1000">
        
        {/* Opponent Trainer (Next to Pokemon) */}
        <div className="absolute top-[48%] left-[70%] -translate-x-1/2 -translate-y-1/2 z-0 scale-[1.0] opacity-90 drop-shadow-xl transition-all duration-500">
           <img src={opponent.trainer_sprite} className="w-48 h-48 object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>

        {/* Opponent Pokemon (Pitcher's Mound - Center) */}
        <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
             <AnimatePresence>
                {isAttacking === (isPlayer1 ? "p2" : "p1") && (
                  <ElementalVfx type={getAttackerType()} phase="CHARGE" direction="DOWN" />
                )}
                {isHit === (isPlayer1 ? "p2" : "p1") && (
                  <ElementalVfx type={getAttackerType()} phase="IMPACT" />
                )}
                {floatingDamage?.target === (isPlayer1 ? "p2" : "p1") && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -80, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 2 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 font-black text-4xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,1)] stroke-white stroke-2"
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
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/40 rounded-[100%] blur-sm pointer-events-none" />
              <motion.img
                animate={getOpponentAnimation()}
                transition={{ y: { repeat: Infinity, duration: 4 }, x: { duration: 0.2 } }}
                src={oppActive?.sprite || ""}
                alt={oppActive?.name || "Opponent"}
                className="w-56 h-56 object-contain z-10 relative drop-shadow-2xl"
                style={{ imageRendering: 'pixelated' }}
              />
          </div>
        </div>

        {/* My Trainer (Next to Pokemon) */}
        <div className="absolute bottom-[12%] left-[25%] -translate-x-1/2 z-20 scale-[1.8] origin-bottom drop-shadow-2xl opacity-100 transform scale-x-[-1] transition-all duration-500">
           <img src={me.trainer_sprite} className="w-64 h-64 object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>

        {/* My Pokemon (Home Plate - Center) */}
        <div className="absolute bottom-[12%] left-[50%] -translate-x-1/2 z-30 scale-125 origin-bottom">
           <div className="relative">
              <AnimatePresence>
                {isAttacking === (isPlayer1 ? "p1" : "p2") && (
                  <ElementalVfx type={getAttackerType()} phase="CHARGE" direction="UP" />
                )}
                {isHit === (isPlayer1 ? "p1" : "p2") && (
                  <ElementalVfx type={getAttackerType()} phase="IMPACT" />
                )}
                {floatingDamage?.target === (isPlayer1 ? "p1" : "p2") && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -80, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 2 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 font-black text-4xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,1)]"
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
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-12 bg-black/50 rounded-[100%] blur-md pointer-events-none" />
              <motion.img
                animate={getMyAnimation()}
                transition={{ y: { repeat: Infinity, duration: 3.5, delay: 0.5 }, x: { type: "spring", stiffness: 300, damping: 20 } }}
                src={meActive?.back_sprite || meActive?.sprite || ""}
                alt={meActive?.name || "Me"}
                className="w-64 h-64 object-contain z-10 relative transform scale-x-[-1] drop-shadow-2xl"
                style={{ imageRendering: 'pixelated' }}
              />
           </div>
        </div>
      </div>

      {/* UI Overlay Bottom */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-40 pointer-events-none">
        
        {/* Battle Chat */}
        <div className="w-[320px] bg-[#0B1326]/90 backdrop-blur-md border-2 border-[#1E293B] rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
          <div className="bg-[#1E293B]/80 px-3 py-2 flex items-center gap-2 border-b border-[#334155]">
            <span className="material-symbols-outlined text-blue-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            <span className="font-bold text-slate-200 text-xs uppercase tracking-wide">BATTLE CHAT</span>
          </div>
          <div ref={chatListRef} className="h-32 overflow-y-auto p-2 space-y-1 text-xs">
             {chatMessages.length > 0 ? (
              chatMessages.map((message, index) => (
                <div key={message.id || `chat-${index}`} className="leading-tight">
                  <span className="font-bold text-blue-300">
                    {message.senderId === myId ? "You" : message.senderName}:
                  </span>{" "}
                  <span className="text-slate-300">{message.text}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-center mt-4">No messages yet</p>
            )}
          </div>
          <div className="p-2 border-t border-[#334155] bg-[#0B1326] flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendChat(); } }}
              placeholder="TYPE MESSAGE..."
              className="flex-1 bg-slate-800 rounded-full px-3 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 border border-slate-700"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || !chatConnected}
              className="text-blue-400 disabled:text-slate-600 hover:text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>

        {/* Right Controls - Layout: Tactical | Party | Attack */}
        <div className="flex gap-4 items-end pointer-events-auto">
          
          {/* Tactical Items Scrollable Box */}
          <div className="bg-[#0B1326]/90 backdrop-blur-md border-2 border-[#1E293B] rounded-xl shadow-2xl p-3 flex flex-col h-[150px] w-[240px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1 border-b border-[#1E293B] pb-1">
               <span className="material-symbols-outlined text-[12px]">card_giftcard</span> TACTICAL ITEMS
            </span>
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {inventory.map((item, index) => (
                <button
                  key={item.id || `tactical-${index}`}
                  onClick={() => void handleUseItem(item.id)}
                  disabled={!myTurn || selectingReviveTarget !== null}
                  className="flex flex-col items-center justify-center bg-slate-800/80 border border-slate-700 rounded-lg p-1.5 hover:bg-slate-700 hover:border-slate-500 transition-colors disabled:opacity-50 shadow-sm relative h-[60px]"
                >
                  <span className="absolute top-0.5 right-1 text-[8px] font-bold text-slate-400">x{item.quantity}</span>
                  <img src={item.object.sprite} alt={item.object.name} className="w-6 h-6 object-contain image-rendering-pixelated mb-1" />
                  <span className="text-[7px] font-bold text-slate-300 uppercase truncate w-full text-center px-1">{item.object.name}</span>
                </button>
              ))}
              {inventory.length === 0 && (
                <p className="text-slate-500 text-[10px] text-center italic col-span-2 mt-4">Empty</p>
              )}
            </div>
          </div>

          {/* Party Team */}
          <div className="bg-[#0B1326]/90 backdrop-blur-md border-2 border-[#1E293B] rounded-xl shadow-2xl p-3 flex flex-col h-[150px] justify-center items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">PARTY TEAM</span>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {me.team.map((c, index) => (
                   <button
                    key={c.id || `bench-${index}`}
                    onClick={() => {
                      if (selectingReviveTarget) {
                        if (c.hp === 0) void handleUseItem(selectingReviveTarget, c.id);
                      } else {
                        void handleSwap(c.id);
                      }
                    }}
                    disabled={!myTurn || (!selectingReviveTarget && (c.hp === 0 || c.id === me.active_creature_id)) || (selectingReviveTarget !== null && c.hp > 0)}
                    className={`w-14 h-14 rounded-full border-2 overflow-hidden flex items-center justify-center transition-transform ${c.id === me.active_creature_id ? 'border-green-500 bg-green-900/50 scale-110 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-slate-600 bg-slate-800 hover:border-blue-400 hover:scale-105'} ${c.hp === 0 && !selectingReviveTarget ? 'opacity-40 grayscale' : ''} ${selectingReviveTarget && c.hp === 0 ? 'border-yellow-400 ring-2 ring-yellow-400 animate-pulse' : ''}`}
                  >
                    <img src={c.sprite} className="w-12 h-12 object-contain image-rendering-pixelated" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Attack Button (Pokeball Style) */}
          <div className="flex items-center h-[150px] gap-3">
            <div className="flex flex-col gap-2 w-[260px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">MOVES</span>
              <div className="grid grid-cols-2 gap-2">
                {(meActive?.moves && meActive.moves.length > 0 ? meActive.moves : Array.from({ length: 4 }, (_, index) => ({
                  id: `placeholder-${index}`,
                  name: "No move",
                  base_power: 0,
                  move_type_name: null,
                  damage_multiplier: 1,
                  effect: "",
                  effect_probability: 0,
                  vfx_type: "",
                } as const))).map((move) => {
                  const isRealMove = typeof move.id === "number";
                  const isSelected = selectedMoveId === move.id;

                  return (
                    <button
                      key={move.id}
                      type="button"
                      onClick={() => isRealMove && setSelectedMoveId(move.id as number)}
                      disabled={!myTurn || meActive?.hp === 0 || !isRealMove}
                      className={`text-left p-2 rounded-xl border transition-colors ${
                        isSelected
                          ? "border-yellow-400 bg-yellow-500/20 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400"
                      } ${!myTurn || meActive?.hp === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="font-semibold text-xs uppercase truncate">{move.name}</div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-slate-400">{move.base_power > 0 ? `${move.base_power} power` : "No move"}</span>
                        {move.move_type_name && (
                          <span className="text-[8px] uppercase tracking-[.2em] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {move.move_type_name}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center h-full">
              {battleState.status === "playing" && (
                <button
                  onClick={handleAttack}
                  disabled={!myTurn || meActive?.hp === 0}
                  className={`relative w-28 h-28 rounded-full shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 border-[6px] ${
                    myTurn && meActive?.hp !== 0
                      ? "border-black hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-red-500/30"
                      : "border-slate-800 grayscale opacity-60 cursor-not-allowed"
                  }`}
                >
                  {/* Red Top Half */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-red-500 to-red-600" />
                  {/* White Bottom Half */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-200 to-white" />
                  {/* Black Center Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-3 bg-black -translate-y-1/2" />
                  {/* Center Button */}
                  <div className={`relative z-10 w-12 h-12 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-inner ${myTurn ? "animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]" : ""}`}>
                    <span className={`w-6 h-6 rounded-full border border-gray-300 ${myTurn ? "bg-red-500" : "bg-gray-200"}`} />
                  </div>
                  {/* Attack Text Overlay */}
                  <span className={`absolute bottom-3 font-black text-xs tracking-widest uppercase z-20 drop-shadow-md ${myTurn ? "text-slate-800" : "text-slate-500"}`}>
                    ATTACK
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <BattleEndOverlay
        show={battleState.status === "finished" && resolvedWinnerId !== null}
        won={resolvedWinnerId === myId}
        onReturn={() => navigate("/")}
      />
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowConfirm(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0B1326] border-2 border-[#1E293B] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="bg-[#1E293B] px-6 py-4 border-b border-[#334155] flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                </div>
                <h3 className="font-black text-slate-100 tracking-wider uppercase">{showConfirm.title}</h3>
              </div>
              
              <div className="p-8">
                <p className="text-slate-300 text-lg leading-relaxed text-center font-medium">
                  {showConfirm.message}
                </p>
              </div>

              <div className="p-6 bg-[#0B1326]/50 border-t border-[#1E293B] flex gap-4">
                <button
                  onClick={() => setShowConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-6 py-3 rounded-xl border-2 border-[#334155] text-slate-400 font-bold hover:bg-slate-800 hover:text-slate-200 transition-all uppercase tracking-widest text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(prev => ({ ...prev, isOpen: false }));
                    showConfirm.onConfirm();
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-black hover:from-red-500 hover:to-orange-500 shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition-all uppercase tracking-widest text-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
