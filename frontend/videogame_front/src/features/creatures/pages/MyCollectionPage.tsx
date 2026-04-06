import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { SquadBar } from "../components/SquadBar";
import { BackButton } from "../../../common/ui/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Star, ShieldAlert } from "lucide-react";
import { Text } from "../../../common/ui/Text";

interface UserCreature {
  id: number;
  creature_id: number;
  creature_name: string;
  sprite: string;
  level: number;
  current_hp: number;
  is_in_team?: boolean;
}

export const MyCollectionPage = () => {
  const [creatures, setCreatures] = useState<UserCreature[]>([]);
  const [originalTeamIds, setOriginalTeamIds] = useState<number[]>([]);
  const [draftTeam, setDraftTeam] = useState<UserCreature[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchData = async () => {
    try {
      const [creaturesRes, teamRes] = await Promise.all([
        apiClient.get("/api/creatures/my-creatures/"),
        apiClient.get("/api/team/team/"),
      ]);

      setCreatures(creaturesRes.data);
      const teamMembers = teamRes.data.map((tc: any) => ({
        id: tc.user_creature.id,
        creature_name: tc.user_creature.creature_name,
        sprite: tc.user_creature.sprite,
        current_hp: tc.user_creature.current_hp,
      }));

      setDraftTeam(teamMembers);
      setOriginalTeamIds(teamMembers.map((m: any) => m.id));
    } catch (error) {
      console.error("Error fetching collection:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleTeam = (creature: UserCreature) => {
    const isInDraft = draftTeam.some((m) => m.id === creature.id);

    if (isInDraft) {
      setDraftTeam((prev) => prev.filter((m) => m.id !== creature.id));
    } else {
      if (draftTeam.length >= 3) {
        showMessage(
          "Tactical limit reached. Only 3 creatures per squad.",
          "error",
        );
        return;
      }
      setDraftTeam((prev) => [...prev, creature]);
    }
  };

  const handleSaveSuccess = () => {
    setOriginalTeamIds(draftTeam.map((m) => m.id));
    showMessage("Battle Squad confirmed and synchronized.", "success");
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const isModified =
    JSON.stringify([...originalTeamIds].sort()) !==
    JSON.stringify([...draftTeam.map((m) => m.id)].sort());

  return (
    <div className="min-h-screen bg-black text-white">
      <BackButton />
      {!loading && (
        <SquadBar
          draftTeam={draftTeam.map((d) => ({
            id: d.id,
            creature_name: d.creature_name,
            sprite: d.sprite,
            current_hp: d.current_hp,
          }))}
          isModified={isModified}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">
                MY_COLLECTION
              </h1>
              <p className="text-neutral-500 mt-2 font-medium">
                Manage your trained creatures and active battle team.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl">
              <Users size={18} className="text-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Draft: {draftTeam.length}/3
              </span>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-red-500/10 border-red-500/50 text-red-400"
                }`}
              >
                {message.type === "success" ? (
                  <Star size={18} />
                ) : (
                  <ShieldAlert size={18} />
                )}
                <p className="font-bold">{message.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creatures.map((uc, index) => {
                const isInTeam = draftTeam.some((m) => m.id === uc.id);
                return (
                  <motion.div
                    key={uc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group bg-neutral-900/50 border ${isInTeam ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-white/5"} rounded-2xl p-4 transition-all hover:bg-neutral-900 hover:border-white/20`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-neutral-800 rounded-xl flex items-center justify-center p-2">
                        <img
                          src={uc.sprite}
                          alt={uc.creature_name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold">
                            {uc.creature_name}
                          </h3>
                          <span className="text-xs font-mono text-neutral-500 italic">
                            LVL {uc.level}
                          </span>
                        </div>

                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] uppercase font-black text-neutral-500 mb-1">
                            <span>Integrity</span>
                            <span>{uc.current_hp} HP</span>
                          </div>
                          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, uc.current_hp)}%`,
                              }}
                              className={`h-full ${uc.current_hp < 30 ? "bg-red-500" : "bg-emerald-500"}`}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleTeam(uc)}
                          className={`mt-4 w-full py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${
                            isInTeam
                              ? "bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20"
                              : "bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20"
                          }`}
                        >
                          {isInTeam ? "Remove" : "Select"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!loading && creatures.length === 0 && (
            <div className="text-center py-20 bg-neutral-900/20 border border-white/5 rounded-3xl">
              <Text className="text-neutral-500">
                Your collection is empty. Advance in the game to capture
                creatures.
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
