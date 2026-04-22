import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { CreatureCard } from "../components/CreatureCard";
import { SquadBar } from "../components/SquadBar";
import { BackButton } from "../../../common/ui/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";

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
    <Container variant="page" className="flex-col min-h-screen pt-24 pb-12">
      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-8 flex flex-col md:flex-row items-center gap-6">
          <BackButton />
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-6 h-6 bg-primary shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
              <Heading level={1}>
                BATTLE POKEDEX
              </Heading>
            </div>
            <Text variant="secondary">
              Accessing Global Species Database // Deck_Builder_Mode
            </Text>
          </div>
        </div>

        {loadError && !loading && (
          <div className="mb-8 rounded-sm border-2 border-on-error bg-error-container/80 px-4 py-3 text-sm text-on-error-container font-headline tracking-widest uppercase flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            {loadError}
          </div>
        )}

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-8 p-4 rounded-sm border-2 flex items-center gap-4 font-headline tracking-widest uppercase text-[10px] shadow-[4px_4px_0_rgba(0,0,0,0.5)] ${
                message.type === "success"
                  ? "bg-tertiary-container border-tertiary text-on-tertiary-container"
                  : "bg-error-container border-on-error text-on-error-container"
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {message.type === "success" ? "star" : "error"}
              </span>
              <p className="font-black">
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-surface-container-low beveled-border p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)]">
          <div className="relative group flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
            </div>
            <input
              type="text"
              placeholder="FILTER SPECIES..."
              className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] uppercase"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-[10px] font-headline font-black text-outline uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>mouse</span>
            DOUBLE CLICK TO SET SQUAD
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <span className="material-symbols-outlined animate-spin text-primary text-6xl">autorenew</span>
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
                        className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2"
                      >
                        <div className="p-2 bg-tertiary border-2 border-[#0B1326] text-black shadow-[4px_4px_0_rgba(0,0,0,0.5)] flex items-center justify-center">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        </div>
                        <span className="text-[9px] font-headline font-black bg-black border border-tertiary px-2 py-1 text-tertiary uppercase tracking-tighter">
                          SQUAD_ACTIVE
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
    </Container>
  );
};
