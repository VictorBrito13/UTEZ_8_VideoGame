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
import { Zap } from "lucide-react";

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
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 10));
  };

  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  const handleChatStatus = useCallback((message: string) => {
    setChatStatus(message);
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
      onSystemMessage: handleChatStatus,
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
        if (
          globalThis.confirm(
            "¿Estás seguro de que quieres abandonar la batalla? Se contará como una derrota.",
          )
        ) {
          navigate("/");
        }
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

  const handleSwap = async (creatureId: number) => {
    const data_encrypted = await encryptJson({ creature_id: creatureId });
    wsRef.current?.send(
      JSON.stringify({
        type: "battle.action",
        action: "swap",
        data_encrypted,
      }),
    );
  };

  const handleUseItem = async (itemId: number, forceTargetId?: number) => {
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
    if (
      globalThis.confirm(
        "¿Estás seguro de que quieres abandonar la partida? Esto contará como una derrota.",
      )
    ) {
      navigate("/");
    }
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
  if (!battleState || !myId) {
    return (
      <div className="min-h-screen bg-[#0B1326] flex items-center justify-center font-headline text-error font-bold uppercase tracking-widest terminal-glow">
        INITIALIZING ARENA...
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
        x: [-10, 10, -10, 10, 0],
        filter: "sepia(1) saturate(10)",
        scale: [1, 1.05, 1],
      };
    }
    if (isAttacking === targetTag) {
      return { x: -80 };
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
        x: [-10, 10, -10, 10, 0],
        filter: "sepia(1) saturate(10)",
        scale: [1, 1.05, 1],
      };
    }
    if (isAttacking === targetTag) {
      return { x: 80 };
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

  const getBenchButtonBorder = (c: any) => {
    if (c.id === me.active_creature_id)
      return "border-tertiary shadow-[0_0_20px_rgba(245,158,11,0.3)]";
    if (selectingReviveTarget && c.hp === 0)
      return "border-primary shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse";
    return "border-[#2d3449]";
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1326] text-white font-sans flex flex-col overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none" />

      {/* Header (MINIMALIST) */}
      <div className="bg-black/20 border-b border-white/5 px-6 py-1 flex justify-between items-center backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-[10px] font-black italic tracking-[0.3em] text-neutral-500 uppercase">
            BATTLE_ARENA
          </h1>
          <div className="h-4 w-px bg-[#2d3449]" />
          <p className="text-[10px] text-tertiary font-headline font-bold uppercase tracking-widest">
            {battleState.status} | T_{battleState.turn_number}
          </p>
        </div>
        <div className="flex items-center gap-8">
          {myTurn && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary animate-ping" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
              <div className="text-[12px] font-headline font-black text-primary tracking-[0.2em] uppercase terminal-glow">
                YOUR TURN
              </div>
            </div>
          )}
          <button
            onClick={handleSurrender}
            className="text-[10px] uppercase font-headline font-black text-error/80 hover:text-error transition-all flex items-center gap-2 group px-3 py-1 border-2 border-transparent hover:border-error beveled-button"
          >
            <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
            SURRENDER
          </button>
        </div>
      </div>

      {/* Arena Viewport */}
      <div className="flex-1 min-h-0 w-full px-3 md:px-8 lg:px-12 relative flex flex-col justify-center gap-3 md:gap-4 py-3 md:py-6 overflow-hidden">
        {/* Opponent Area */}
        <div className="flex justify-end pr-10">
          <div className="flex items-center gap-12">
            {/* Opponent Status Box */}
            <div className="bg-[#0B1326] rounded-sm p-4 border-2 border-[#2d3449] w-64 shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-error" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-headline font-black text-error uppercase tracking-[0.2em] terminal-glow">
                  {opponent.username}
                </span>
                <span className="material-symbols-outlined text-error text-xs animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div className="mb-4 flex justify-between items-end">
                <h2 className="text-lg font-headline font-black text-white uppercase tracking-tighter leading-none">
                  {oppActive?.name || "NO CREATURE"}
                </h2>
                <span className="text-[9px] font-headline font-black text-outline bg-surface-container-low px-2 py-0.5 rounded-sm border-2 border-[#2d3449] uppercase tracking-widest">
                  LVL {oppActive?.level || 0}
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-3 bg-surface-container-low border-2 border-[#2d3449] rounded-sm overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((oppActive?.hp || 0) / (oppActive?.max_hp || 1)) * 100}%`,
                    }}
                    className="h-full bg-error"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={["opp_bar_1", "opp_bar_2", "opp_bar_3"][i]}
                        className={`w-3 h-1 rounded-sm ${i < opponent.team.filter((c) => c.hp > 0).length ? "bg-error" : "bg-outline"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-headline text-outline font-black">
                    {oppActive?.hp || 0} / {oppActive?.max_hp || 0} HP
                  </span>
                </div>
                {oppActive?.buffs && (
                  <div className="flex gap-1.5 mt-2 justify-end">
                    {oppActive.buffs.atk > 1 && (
                      <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
                    )}
                    {oppActive.buffs.def > 1 && (
                      <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    )}
                    {oppActive.buffs.has_choice && (
                      <span className="material-symbols-outlined text-purple-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    )}
                    {oppActive.buffs.has_focus && (
                      <span className="material-symbols-outlined text-tertiary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    )}
                    {oppActive.buffs.has_oran && (
                      <span className="material-symbols-outlined text-error text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    )}
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
                  animate={getOpponentAnimation()}
                  transition={{
                    y: { repeat: Infinity, duration: 4 },
                    x: { duration: 0.2 },
                  }}
                  src={oppActive?.sprite || ""}
                  alt={oppActive?.name || "Opponent Active Creature"}
                  className="w-full h-full object-contain z-10"
                />
              </div>
              <img
                src={opponent.trainer_sprite}
                alt={opponent.username}
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
                alt={me.username}
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
                  animate={getMyAnimation()}
                  transition={{
                    y: { repeat: Infinity, duration: 3.5, delay: 0.5 },
                    x: { type: "spring", stiffness: 300, damping: 20 },
                  }}
                  src={meActive?.sprite || ""}
                  alt={meActive?.name || "My Active Creature"}
                  className="w-full h-full object-contain z-10"
                />
              </div>
            </div>

            {/* My Status Box */}
            <div className="bg-[#0B1326] rounded-sm p-4 border-2 border-[#2d3449] w-64 shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-secondary" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-headline font-black text-secondary uppercase tracking-[0.2em] terminal-glow pl-2">
                  {me.username} (YOU)
                </span>
                <span className="material-symbols-outlined text-secondary text-xs animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="mb-4 flex justify-between items-end">
                <h2 className="text-lg font-headline font-black text-white uppercase tracking-tighter leading-none pl-2">
                  {meActive?.name || "NO CREATURE"}
                </h2>
                <span className="text-[9px] font-headline font-black text-outline bg-surface-container-low px-2 py-0.5 rounded-sm border-2 border-[#2d3449] uppercase tracking-widest">
                  LVL {meActive?.level || 0}
                </span>
              </div>
              <div className="space-y-2.5 pl-2">
                <div className="h-3 bg-surface-container-low border-2 border-[#2d3449] rounded-sm overflow-hidden p-[2px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((meActive?.hp || 0) / (meActive?.max_hp || 1)) * 100}%`,
                    }}
                    className="h-full bg-secondary"
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={["my_bar_1", "my_bar_2", "my_bar_3"][i]}
                        className={`w-3 h-1 rounded-sm ${i < me.team.filter((c) => c.hp > 0).length ? "bg-secondary" : "bg-outline"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-headline text-outline font-black">
                    {meActive?.hp || 0} / {meActive?.max_hp || 0} HP
                  </span>
                </div>
                {meActive?.buffs && (
                  <div className="flex gap-1.5 mt-2">
                    {meActive.buffs.atk > 1 && (
                      <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
                    )}
                    {meActive.buffs.def > 1 && (
                      <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    )}
                    {meActive.buffs.has_choice && (
                      <span className="material-symbols-outlined text-purple-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    )}
                    {meActive.buffs.has_focus && (
                      <span className="material-symbols-outlined text-tertiary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    )}
                    {meActive.buffs.has_oran && (
                      <span className="material-symbols-outlined text-error text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel (LARGE CENTERED BALANCE) */}
      <div className="bg-surface-container-low border-t-2 border-[#2d3449] px-3 md:px-6 lg:px-10 py-4 relative z-10 flex flex-wrap lg:flex-nowrap items-stretch justify-center gap-4 lg:gap-6 shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.5)]">
        {/* Battle Chat */}
        <div className="bg-[#0B1326] rounded-sm p-3 border-2 border-[#2d3449] h-[24vh] min-h-[150px] max-h-[240px] lg:h-[220px] lg:max-h-[220px] w-full lg:w-[24%] shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] flex flex-col">
          <div className="text-[10px] font-headline font-black text-outline uppercase tracking-widest border-b-2 border-[#2d3449] pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span> BATTLE CHAT
          </div>
          <div
            ref={chatListRef}
            className="flex-1 min-h-0 overflow-y-auto mt-2 space-y-2 pr-2"
          >
            {chatMessages.length > 0 ? (
              chatMessages.map((message, index) => (
                <div
                  key={message.id || `chat-${index}`}
                  className="text-[10px] leading-snug font-headline font-bold uppercase tracking-widest"
                >
                  <span className="text-tertiary">
                    {message.senderId === myId ? "YOU" : message.senderName}:
                  </span>{" "}
                  <span className="text-white">{message.text}</span>
                </div>
              ))
            ) : (
              <p className="text-[9px] font-headline font-bold uppercase text-outline mt-2">
                NO MESSAGES YET.
              </p>
            )}
          </div>

          <div className="mt-2 flex gap-2 border-t-2 border-[#2d3449] pt-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="TYPE MESSAGE..."
              className="flex-1 rounded-sm border-2 border-[#2d3449] bg-surface-container-low px-2 py-1 text-[10px] font-headline font-bold uppercase text-white outline-none focus:border-tertiary"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || !chatConnected}
              className={`rounded-sm px-3 py-1 text-[10px] font-headline font-black uppercase tracking-widest border-2 transition-all ${
                chatInput.trim() && chatConnected
                  ? "bg-tertiary border-tertiary text-on-tertiary hover:bg-tertiary/80 beveled-button"
                  : "bg-surface-container-low border-[#2d3449] text-outline cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
          {chatStatus && (
            <div className="mt-1 text-[8px] font-headline font-bold uppercase text-outline">
              {chatStatus}
            </div>
          )}
        </div>

        {/* Tactical Items */}
        <div className="bg-[#0B1326] rounded-sm p-3 border-2 border-[#2d3449] h-[18vh] min-h-[110px] max-h-[180px] lg:h-[180px] lg:max-h-[180px] w-full lg:w-[33%] flex flex-col shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
          <div className="text-[10px] font-headline font-black text-outline uppercase tracking-widest border-b-2 border-[#2d3449] pb-2 flex items-center gap-2 justify-center">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>backpack</span> TACTICAL ITEMS
          </div>
          <div className="flex-1 overflow-y-auto pt-2">
            <div className="grid grid-cols-4 gap-2">
              {inventory.map((item, index) => (
                <button
                  key={item.id || `tactical-${index}`}
                  onClick={() => void handleUseItem(item.id)}
                  disabled={!myTurn || selectingReviveTarget !== null}
                  className="group flex flex-col items-center justify-center p-2 bg-surface-container-low rounded-sm border-2 border-[#2d3449] hover:border-tertiary hover:bg-tertiary/10 transition-all disabled:opacity-30 relative beveled-button gap-1"
                >
                  <span className="absolute top-1 left-1 text-[10px] font-headline font-black text-tertiary">
                    x{item.quantity}
                  </span>
                  
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    {item.object.sprite ? (
                      <img src={item.object.sprite} alt={item.object.name} className="w-8 h-8 object-contain image-rendering-pixelated group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="scale-50 opacity-80 group-hover:opacity-100 group-hover:scale-75 transition-all flex items-center justify-center">
                         {getVfxIcon(item.object.vfx_type)}
                      </div>
                    )}
                  </div>

                  <span className="text-[8px] font-headline font-bold text-outline uppercase truncate w-full text-center group-hover:text-white transition-colors">
                    {item.object.name}
                  </span>
                  {selectingReviveTarget === item.id && (
                    <div className="absolute inset-0 ring-2 ring-primary rounded-sm animate-pulse pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bench (Horizontal) */}
        <div className="flex gap-3 shrink-0 w-full lg:w-auto overflow-x-auto pb-2 max-w-full items-center">
          {me.team.map((c, index) => (
            <button
              key={c.id || `bench-${index}`}
              onClick={() => {
                if (selectingReviveTarget) {
                  if (c.hp === 0)
                    void handleUseItem(selectingReviveTarget, c.id);
                } else {
                  void handleSwap(c.id);
                }
              }}
              disabled={
                !myTurn ||
                (!selectingReviveTarget &&
                  (c.hp === 0 || c.id === me.active_creature_id)) ||
                (selectingReviveTarget !== null && c.hp > 0)
              }
              className={`relative w-20 h-20 lg:w-24 lg:h-24 rounded-sm bg-[#0B1326] border-4 ${getBenchButtonBorder(c)} hover:border-white transition-all overflow-hidden p-2 beveled-button shadow-[4px_4px_0_rgba(0,0,0,0.5)] ${c.hp === 0 && !selectingReviveTarget ? "opacity-30 grayscale cursor-not-allowed" : "hover:-translate-y-1"}`}
            >
              <img
                src={c.sprite}
                alt={c.name}
                className="w-full h-full object-contain mb-2 image-rendering-pixelated"
              />
              <div className="absolute top-1 left-2 text-[8px] font-headline font-black uppercase text-outline bg-surface-container-low px-1 rounded-sm border border-[#2d3449]">
                {c.name}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-2 bg-surface-container-low border-t-2 border-[#2d3449]">
                <div
                  className="h-full bg-secondary transition-all duration-500"
                  style={{ width: `${(c.hp / c.max_hp) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Attack Button */}
        <div className="h-auto lg:h-[180px] flex items-center justify-center shrink-0 w-full lg:w-auto">
          {battleState.status === "playing" && (
            <button
              onClick={handleAttack}
              disabled={!myTurn || meActive?.hp === 0}
              className={`w-32 lg:w-40 h-20 lg:h-24 flex flex-col items-center justify-center gap-2 rounded-sm font-headline font-black uppercase tracking-widest transition-all border-2 ${
                myTurn && meActive?.hp !== 0
                  ? "bg-primary border-primary text-on-primary hover:bg-primary/90 shadow-[8px_8px_0_rgba(0,0,0,0.5)] beveled-button hover:-translate-y-1"
                  : "bg-surface-container-low border-[#2d3449] text-outline cursor-not-allowed shadow-[4px_4px_0_rgba(0,0,0,0.5)] opacity-80"
              }`}
            >
              <span className={`material-symbols-outlined text-[32px] ${myTurn ? "animate-pulse" : ""}`} style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
              <span className="text-sm">ATTACK</span>
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
