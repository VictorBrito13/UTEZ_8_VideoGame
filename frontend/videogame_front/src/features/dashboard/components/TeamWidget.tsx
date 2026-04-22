import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { motion } from "framer-motion";

interface TeamMember {
  id: number;
  user_creature: {
    creature_name: string;
    sprite: string;
    current_hp: number;
  };
}

export const TeamWidget = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await apiClient.get("/api/team/");
        setTeam(response.data);
      } catch {
        // Squad widget stays empty on failure.
      }
    };
    fetchTeam();
  }, []);

  if (team.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-[14px] font-headline font-black tracking-widest text-outline mb-6 uppercase flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
        ACTIVE_SQUAD
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 bg-[#0B1326] border-2 border-[#2d3449] rounded-sm hover:border-primary transition-colors shadow-[4px_4px_0_rgba(0,0,0,0.5)] group"
          >
            <div className="w-12 h-12 bg-surface-container-low border border-[#2d3449] rounded-sm p-1 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
              <img
                src={member.user_creature.sprite}
                alt={member.user_creature.creature_name}
                className="w-full h-full object-contain image-rendering-pixelated group-hover:-translate-y-1 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-headline font-black text-white uppercase truncate">
                {member.user_creature.creature_name}
              </h4>
              <div className="mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[10px] text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <div className="h-1.5 flex-1 bg-surface-container-low border border-[#2d3449] rounded-sm overflow-hidden p-[1px]">
                  <div
                    className="h-full bg-error"
                    style={{
                      width: `${Math.min(100, member.user_creature.current_hp)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
