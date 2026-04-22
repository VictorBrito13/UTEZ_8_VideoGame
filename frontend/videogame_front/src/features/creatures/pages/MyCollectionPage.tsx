import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { SquadBar } from "../components/SquadBar";
import { BackButton } from "../../../common/ui/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
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
        apiClient.get("/api/team/"),
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
    } catch {
      // Collection stays empty on failure; user can retry by refreshing.
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
          "TACTICAL LIMIT REACHED. ONLY 3 CREATURES PER SQUAD.",
          "error",
        );
        return;
      }
      setDraftTeam((prev) => [...prev, creature]);
    }
  };

  const handleSaveSuccess = () => {
    setOriginalTeamIds(draftTeam.map((m) => m.id));
    showMessage("BATTLE SQUAD CONFIRMED AND SYNCHRONIZED.", "success");
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const isModified =
    JSON.stringify([...originalTeamIds].sort((a, b) => a - b)) !==
    JSON.stringify([...draftTeam.map((m) => m.id)].sort((a, b) => a - b));

  return (
    <Container variant="page" className="flex-col min-h-screen pt-24 pb-12">
      <div className="px-4 max-w-6xl mx-auto w-full mb-6">
        <BackButton />
      </div>
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

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mx-auto px-4 relative z-10"
      >
        <div className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="material-symbols-outlined text-tertiary text-4xl shadow-[2px_2px_0_rgba(0,0,0,0.5)]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
              <Heading level={1} className="terminal-glow text-tertiary">
                MY_COLLECTION
              </Heading>
            </div>
            <Text variant="secondary">
              MANAGE YOUR TRAINED CREATURES AND ACTIVE BATTLE TEAM.
            </Text>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border-2 border-[#2d3449] rounded-sm shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span className="text-sm font-headline font-black uppercase tracking-widest text-outline">
              DRAFT: {draftTeam.length}/3
            </span>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-sm border-2 flex items-center gap-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)] ${
                message.type === "success"
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-error/10 border-error text-error"
              }`}
            >
              {message.type === "success" ? (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              )}
              <p className="font-headline font-bold uppercase tracking-widest text-sm">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="material-symbols-outlined animate-spin text-tertiary text-6xl">autorenew</span>
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
                  className={`group bg-[#0B1326] border-2 ${isInTeam ? "border-primary shadow-[8px_8px_0_rgba(0,0,0,0.5)]" : "border-[#2d3449] shadow-[4px_4px_0_rgba(0,0,0,0.5)]"} rounded-sm p-4 transition-all hover:bg-surface-container-low hover:-translate-y-1`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-surface-container-low border-2 border-[#2d3449] rounded-sm flex items-center justify-center p-2 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                      <img
                        src={uc.sprite}
                        alt={uc.creature_name}
                        className="w-full h-full object-contain image-rendering-pixelated drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-headline font-black text-white uppercase tracking-wider">
                          {uc.creature_name}
                        </h3>
                        <span className="text-[10px] font-headline font-black text-outline bg-surface-container-low px-1 rounded-sm border border-[#2d3449]">
                          LVL {uc.level}
                        </span>
                      </div>

                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] uppercase font-headline font-black text-outline mb-1">
                          <span>INTEGRITY</span>
                          <span>{uc.current_hp} HP</span>
                        </div>
                        <div className="h-2 bg-surface-container-low border-2 border-[#2d3449] rounded-sm overflow-hidden p-[1px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, uc.current_hp)}%`,
                            }}
                            className={`h-full ${uc.current_hp < 30 ? "bg-error" : "bg-primary"}`}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTeam(uc)}
                        className={`mt-4 w-full py-2 rounded-sm text-xs font-headline font-black uppercase tracking-widest transition-all border-2 beveled-button ${
                          isInTeam
                            ? "bg-error border-error text-white hover:bg-error/80"
                            : "bg-surface-container-low border-[#2d3449] text-outline hover:border-primary hover:text-primary hover:bg-primary/10"
                        }`}
                      >
                        {isInTeam ? "REMOVE FROM SQUAD" : "ADD TO SQUAD"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && creatures.length === 0 && (
          <div className="text-center py-20 bg-surface-container-low border-2 border-[#2d3449] rounded-sm shadow-[8px_8px_0_rgba(0,0,0,0.5)]">
            <span className="material-symbols-outlined text-outline text-6xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>sentiment_dissatisfied</span>
            <Text className="text-outline font-headline font-bold uppercase tracking-widest text-sm">
              YOUR COLLECTION IS EMPTY. ADVANCE IN THE GAME TO CAPTURE CREATURES.
            </Text>
          </div>
        )}
      </motion.div>
    </Container>
  );
};

export default MyCollectionPage;
