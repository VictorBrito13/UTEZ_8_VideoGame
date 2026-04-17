import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

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
      <h2 className="text-xl font-black italic tracking-widest text-neutral-500 mb-6 uppercase">
        Active_Squad
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 bg-neutral-900/50 border border-white/5 rounded-2xl hover:bg-neutral-900 transition-colors"
          >
            <div className="w-12 h-12 bg-neutral-800 rounded-lg p-1">
              <img
                src={member.user_creature.sprite}
                alt={member.user_creature.creature_name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate">
                {member.user_creature.creature_name}
              </h4>
              <div className="mt-1 flex items-center gap-2">
                <Heart size={10} className="text-red-500" />
                <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
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
