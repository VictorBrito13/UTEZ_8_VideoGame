import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { encryptCreatureIds } from "../../../common/utils/teamPayloadCipher";

interface SquadMember {
  id: number;
  creature_name: string;
  sprite: string;
  current_hp: number;
  type_1?: string;
}

interface SquadBarProps {
  draftTeam?: SquadMember[];
  onSaveSuccess?: () => void;
  onRemoveMember?: (id: number) => void;
  isModified?: boolean;
}

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

export const SquadBar = ({
  draftTeam: propsDraft,
  onSaveSuccess,
  onRemoveMember,
  isModified = false,
}: SquadBarProps) => {
  const [internalTeam, setInternalTeam] = useState<SquadMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!propsDraft) {
      const fetchTeam = async () => {
        try {
          const response = await apiClient.get("/api/team/");
          const teamMembers = response.data.map((tc: any) => ({
            id: tc.user_creature.creature_id,
            creature_name: tc.user_creature.creature_name,
            sprite: tc.user_creature.sprite,
            current_hp: tc.user_creature.current_hp,
            type_1: tc.user_creature.type_1_name, 
          }));
          setInternalTeam(teamMembers);
        } catch {
          // Draft squad stays empty on fetch failure.
        }
      };
      fetchTeam();
    }
  }, [propsDraft]);

  const activeTeam = propsDraft || internalTeam;

  const handleSaveTeam = async () => {
    if (!onSaveSuccess) return;
    setSaving(true);
    try {
      const ids = activeTeam.map((m) => m.id);
      await apiClient.post("/api/team/set_team/", {
        creature_ids_encrypted: await encryptCreatureIds(ids),
      });
      onSaveSuccess();
    } catch {
      // Save failure: UI already reflects local state.
    } finally {
      setSaving(false);
    }
  };

  let buttonIcon = "swords";
  if (saving) buttonIcon = "autorenew";
  else if (activeTeam.length === 3) buttonIcon = "save";

  let buttonText = `[ ${activeTeam.length}/3 ] REQUIRED`;
  if (saving) buttonText = "SYNCHRONIZING...";
  else if (activeTeam.length === 3) buttonText = "CONFIRM CHANGES";

  return (
    <div className="w-full mb-16 py-12 bg-surface-container-low border-2 border-[#2d3449] beveled-border shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10 border-b-2 border-[#2d3449] pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-error-container/20 rounded-sm border-2 border-on-error">
              <span className="material-symbols-outlined text-error text-3xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
            </div>
            <div>
              <h2 className="text-2xl font-headline font-black tracking-widest text-white uppercase terminal-glow">
                ACTIVE BATTLE TEAM
              </h2>
            </div>
          </div>

          <AnimatePresence>
            {isModified && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                onClick={handleSaveTeam}
                disabled={saving || activeTeam.length !== 3}
                className={`group relative flex items-center gap-3 px-8 py-4 beveled-button font-headline font-black text-xs uppercase tracking-[0.2em] transition-all ${
                  activeTeam.length === 3
                    ? "bg-tertiary text-on-tertiary shadow-[8px_8px_0_rgba(0,0,0,0.5)] hover:translate-y-[-2px] active:translate-y-[2px]"
                    : "bg-error-container text-on-error-container cursor-not-allowed opacity-80"
                }`}
              >
                <span className={`material-symbols-outlined ${saving ? 'animate-spin' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>{buttonIcon}</span>
                {buttonText}
                {activeTeam.length === 3 && <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 pointer-events-none"></div>}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Deck Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-center">
          {[0, 1, 2].map((index) => {
            const member = activeTeam[index];
            const primaryType = (member?.type_1 || "NORMAL").toUpperCase();
            const colorBg = typeColors[primaryType] || "bg-neutral-800";

            return (
              <AnimatePresence mode="wait" key={index}>
                {member ? (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    className="relative aspect-[3/4] bg-[#0B1326] border-4 border-[#2d3449] rounded-sm overflow-hidden group shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]"
                  >
                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-8 z-10">
                      <div className="absolute inset-0 top-1/2 bottom-0 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                      
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="w-40 h-40 md:w-48 md:h-48 mb-6 pointer-events-none relative z-10"
                      >
                        <div className={`w-32 h-32 ${colorBg} opacity-20 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-2xl z-0`}></div>
                        <img
                          src={member.sprite}
                          alt={member.creature_name}
                          className="w-full h-full object-contain image-rendering-pixelated drop-shadow-[4px_4px_0_rgba(0,0,0,0.6)] relative z-10"
                        />
                      </motion.div>

                      <div className="relative z-10 w-full">
                        <h3 className="text-xl font-headline font-black tracking-widest text-white uppercase text-center block w-full truncate mb-2">
                          {member.creature_name}
                        </h3>
                        <div className="w-full p-1 bg-[#0B1326] border-2 border-[#2d3449]">
                          <div
                            className="h-2 bg-primary"
                            style={{ width: `${member.current_hp}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-headline font-bold uppercase tracking-widest text-outline text-center block mt-2">
                          HP {member.current_hp}%
                        </span>
                      </div>
                    </div>

                    {/* Hover Overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-error/90 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-20"
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRemoveMember?.(member.id)}
                        className="w-16 h-16 bg-[#0B1326] border-4 border-on-error text-white rounded-sm shadow-[8px_8px_0_rgba(0,0,0,0.5)] flex justify-center items-center"
                      >
                        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
                      </motion.button>
                      <span className="mt-4 text-[10px] font-headline font-black uppercase tracking-widest text-white px-4 py-1 bg-black/50 border border-white/20">
                        REMOVE FROM SQUAD
                      </span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${index}`}
                    className="relative aspect-[3/4] bg-[#0B1326]/50 border-4 border-dashed border-[#2d3449] rounded-sm flex flex-col items-center justify-center group overflow-hidden"
                  >
                    <div className="relative opacity-20 grayscale group-hover:opacity-40 group-hover:text-primary transition-all duration-500">
                      <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
                    </div>
                    <span className="mt-6 text-[10px] font-headline font-black uppercase tracking-[0.4em] text-outline group-hover:text-primary transition-colors">
                      SLOT EMPTY
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Sync Status Footer */}
        {!isModified && activeTeam.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex justify-center items-center gap-4 py-3 px-6 bg-tertiary-container border-2 border-tertiary w-fit mx-auto shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
          >
            <div className="w-2 h-2 bg-on-tertiary-container rounded-full animate-ping" />
            <span className="text-[10px] font-headline font-black uppercase tracking-widest text-on-tertiary-container">
              SQUAD SYNCHRONIZED
            </span>

          </motion.div>
        )}
      </div>
    </div>
  );
};
