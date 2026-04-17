import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, Sparkles, X, Swords } from "lucide-react";
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
  FIRE: "from-orange-500 to-red-600",
  WATER: "from-blue-400 to-blue-600",
  GRASS: "from-green-500 to-green-700",
  ELECTRIC: "from-yellow-300 to-yellow-500",
  NORMAL: "from-gray-400 to-gray-500",
  FLYING: "from-indigo-300 to-indigo-500",
  POISON: "from-purple-400 to-purple-600",
  GROUND: "from-amber-600 to-amber-800",
  ROCK: "from-stone-500 to-stone-700",
  BUG: "from-lime-500 to-lime-700",
  GHOST: "from-violet-700 to-purple-900",
  STEEL: "from-slate-400 to-slate-600",
  PSYCHIC: "from-pink-400 to-pink-600",
  ICE: "from-cyan-200 to-cyan-400",
  DRAGON: "from-indigo-600 to-violet-800",
  DARK: "from-gray-700 to-black",
  FAIRY: "from-rose-300 to-rose-500",
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
            type_1: tc.user_creature.type_1_name, // Make sure this is in the response
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
        creature_ids_encrypted: encryptCreatureIds(ids),
      });
      onSaveSuccess();
    } catch {
      // Save failure: UI already reflects local state.
    } finally {
      setSaving(false);
    }
  };

  let buttonIcon = <Swords size={16} />;
  if (saving) buttonIcon = <Loader2 size={16} className="animate-spin" />;
  else if (activeTeam.length === 3) buttonIcon = <Save size={16} />;

  let buttonText = `[ ${activeTeam.length}/3 ] Required`;
  if (saving) buttonText = "Synchronizing...";
  else if (activeTeam.length === 3) buttonText = "Confirm_Changes";

  return (
    <div className="w-full mb-16 py-12 bg-neutral-950/40 border-y border-white/5 rounded-[3rem]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
              <Swords size={24} className="text-red-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">
                Active_Battle_Squad
              </h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
                Zone_Alpha Deployment
              </p>
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
                className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all shadow-xl ${
                  activeTeam.length === 3
                    ? "bg-white text-black hover:bg-emerald-500 hover:shadow-emerald-500/20 shadow-white/10"
                    : "bg-red-500/20 text-red-500 border border-red-500/30 cursor-not-allowed opacity-80"
                }`}
              >
                {buttonIcon}
                {buttonText}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Deck Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-center">
          {[0, 1, 2].map((index) => {
            const member = activeTeam[index];
            const primaryType = (member?.type_1 || "NORMAL").toUpperCase();
            const colorGradient =
              typeColors[primaryType] || "from-neutral-800 to-neutral-900";

            return (
              <AnimatePresence mode="wait" key={index}>
                {member ? (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    className="relative aspect-[3/4] bg-neutral-900 rounded-[2rem] border border-white/10 overflow-hidden group shadow-2xl"
                  >
                    {/* Background Type Glow */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${colorGradient} opacity-20 group-hover:opacity-40 transition-opacity`}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-8">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="w-48 h-48 md:w-56 md:h-56 mb-6 pointer-events-none"
                      >
                        <img
                          src={member.sprite}
                          alt={member.creature_name}
                          className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                        />
                      </motion.div>

                      <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase text-center block w-full truncate">
                        {member.creature_name}
                      </h3>
                      <div className="mt-4 w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden opacity-50">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${member.current_hp}%` }}
                        />
                      </div>
                    </div>

                    {/* Hover Overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300 pointer-events-none group-hover:pointer-events-auto"
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRemoveMember?.(member.id)}
                        className="p-6 bg-white text-red-600 rounded-full shadow-2xl"
                      >
                        <X size={32} strokeWidth={3} />
                      </motion.button>
                      <span className="mt-4 text-xs font-black uppercase tracking-widest text-white">
                        Remove_From_Squad
                      </span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty-${index}`}
                    className="relative aspect-[3/4] bg-neutral-900/30 border border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center group overflow-hidden"
                  >
                    <div className="w-32 h-32 bg-white/5 rounded-full blur-3xl absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative opacity-10 grayscale group-hover:opacity-20 transition-all duration-500">
                      <Swords size={80} strokeWidth={1} />
                    </div>
                    <span className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-neutral-700 group-hover:text-neutral-500 transition-colors">
                      Slot_Empty
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
            className="mt-12 flex justify-center items-center gap-4 py-3 px-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 w-fit mx-auto"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic">
              Squad_Synchronized_Zone_Alpha
            </span>
            <Sparkles size={12} className="text-emerald-500" />
          </motion.div>
        )}
      </div>
    </div>
  );
};
