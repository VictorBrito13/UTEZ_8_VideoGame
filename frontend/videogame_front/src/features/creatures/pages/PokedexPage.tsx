import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { CreatureCard } from "../components/CreatureCard";
import { SquadBar } from "../components/SquadBar";
import { BackButton } from "../../../common/ui/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, ShieldAlert } from "lucide-react";

interface Creature {
  id: number;
  name: string;
  pokedex_id: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  type_1_name: string;
  type_2_name?: string;
  front_sprite: string;
}

export const PokedexPage = () => {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [originalTeamIds, setOriginalTeamIds] = useState<number[]>([]);
  const [draftTeam, setDraftTeam] = useState<Creature[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchData = async () => {
    try {
      const [creaturesRes, teamRes] = await Promise.all([
        apiClient.get("/api/creatures/pokedex/"),
        apiClient.get("/api/team/"),
      ]);

      const allCreatures = Array.isArray(creaturesRes.data)
        ? creaturesRes.data
        : creaturesRes.data.results || [];
      setCreatures(allCreatures);

      const teamMembers = teamRes.data.map((tc: any) => ({
        id: tc.user_creature.creature_id, // Map to base creature ID
        name: tc.user_creature.creature_name,
        sprite: tc.user_creature.sprite,
        current_hp: tc.user_creature.current_hp,
      }));

      // Need to find the original full creature objects for the draft
      const initialDraft = teamMembers
        .map((m: any) => allCreatures.find((c: any) => c.id === m.id))
        .filter(Boolean);

      setDraftTeam(initialDraft);
      setOriginalTeamIds(initialDraft.map((m: any) => m.id));
      setLoadError(null);
    } catch {
      setLoadError(
        "Could not load species or your squad. Please refresh or try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleSelect = (creature: Creature) => {
    const isInDraft = draftTeam.some((m) => m.id === creature.id);
    if (isInDraft) {
      setDraftTeam((prev) => prev.filter((m) => m.id !== creature.id));
    } else {
      if (draftTeam.length >= 3) {
        showMessage(
          "Strategy capacity reached (3/3). Remove a creature to add this one.",
          "error",
        );
        return;
      }
      setDraftTeam((prev) => [...prev, creature]);
    }
  };

  const handleSaveSuccess = () => {
    setOriginalTeamIds(draftTeam.map((m) => m.id));
    showMessage(
      "Battle Squad deployed and saved to Pokedex records.",
      "success",
    );
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredCreatures = creatures.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.pokedex_id?.toString().includes(search),
  );

  const isModified =
    JSON.stringify([...originalTeamIds].sort((a, b) => a - b)) !==
    JSON.stringify([...draftTeam.map((m) => m.id)].sort((a, b) => a - b));

  return (
    <div className="min-h-screen bg-black text-white">
      <BackButton />

      <div className="pt-24 px-6 pb-20">
        <div className="w-full px-4 md:px-12">
          <div className="mb-12">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-700">
              BATTLE_POKEDEX
            </h1>
            <p className="text-sm text-neutral-500 mt-2 font-bold uppercase tracking-widest">
              Accessing Global Species Database // Deck_Builder_Mode
            </p>
          </div>

          {loadError && !loading && (
            <div className="mb-8 p-5 rounded-[2rem] border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-medium flex items-center gap-3">
              <ShieldAlert size={20} />
              {loadError}
            </div>
          )}

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-8 p-5 rounded-[2rem] border flex items-center gap-4 ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-red-500/10 border-red-500/50 text-red-400"
                }`}
              >
                {message.type === "success" ? (
                  <Star size={20} />
                ) : (
                  <ShieldAlert size={20} />
                )}
                <p className="font-black text-sm uppercase tracking-tighter">
                  {message.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && !loadError && (
            <SquadBar
              draftTeam={draftTeam.map((d) => ({
                id: d.id,
                creature_name: d.name,
                sprite: d.front_sprite,
                current_hp: d.hp,
                type_1: d.type_1_name,
              }))}
              isModified={isModified}
              onSaveSuccess={handleSaveSuccess}
              onRemoveMember={(id) =>
                setDraftTeam((prev) => prev.filter((m) => m.id !== id))
              }
            />
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="relative group flex-1 max-w-md">
              <div className="absolute inset-0 bg-white/5 rounded-2xl blur group-focus-within:bg-blue-500/20 transition-all"></div>
              <div className="relative flex items-center bg-neutral-900 border border-white/5 rounded-2xl px-6 py-4">
                <Search size={20} className="text-neutral-500 mr-3" />
                <input
                  type="text"
                  placeholder="FILTER_SPECIES..."
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:text-neutral-700 font-bold tracking-widest"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">
              Double_Click_To_Set_Squad
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="w-16 h-16 border-4 border-white/5 border-t-white rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && !loadError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredCreatures.map((creature, index) => {
                const isSelected = draftTeam.some((m) => m.id === creature.id);
                return (
                  <motion.div
                    key={creature.id}
                    className="relative group cursor-pointer"
                    onDoubleClick={() => handleToggleSelect(creature)}
                  >
                    <CreatureCard creature={creature} index={index} />

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2"
                        >
                          <div className="p-2 bg-emerald-500 text-black rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                            <Star size={18} fill="currentColor" />
                          </div>
                          <span className="text-[9px] font-black bg-black/80 px-2 py-1 rounded border border-emerald-500/30 text-emerald-500 uppercase tracking-tighter backdrop-blur-md">
                            Squad_Active
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
