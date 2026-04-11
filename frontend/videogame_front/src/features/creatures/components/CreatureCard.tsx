import { motion } from "framer-motion";
import { Shield, Sword, Zap, Heart } from "lucide-react";

interface CreatureCardProps {
  creature: {
    name: string;
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    type_1_name?: string;
    type_2_name?: string;
    front_sprite: string;
    pokedex_id: number;
  };
  index: number;
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

export const CreatureCard = ({ creature, index }: CreatureCardProps) => {
  const primaryType = (creature.type_1_name || "NORMAL").toUpperCase().trim();
  const colorGradient = typeColors[primaryType] || "from-gray-400 to-gray-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        type: "spring",
        stiffness: 100,
      }}
      whileHover={{
        y: -10,
        scale: 1.05,
        rotateY: 5,
        transition: { duration: 0.2 },
      }}
      className="relative group perspective-1000"
    >
      {/* Glow Effect on Hover */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r ${colorGradient} rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200`}
      ></div>

      <div className="relative bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Header with ID and Name */}
        <div
          className={`h-24 bg-gradient-to-br ${colorGradient} p-4 flex justify-between items-start text-white`}
        >
          <div>
            <span className="text-xs font-bold opacity-75">
              #{(creature.pokedex_id || 0).toString().padStart(3, "0")}
            </span>
            <h3 className="text-xl font-bold tracking-tight">
              {creature.name}
            </h3>
          </div>
          <div className="flex gap-1">
            {creature.type_1_name && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase">
                {creature.type_1_name}
              </span>
            )}
            {creature.type_2_name && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase">
                {creature.type_2_name}
              </span>
            )}
          </div>
        </div>

        {/* Sprite Container */}
        <div className="relative -mt-12 flex justify-center h-32 items-center">
          <motion.img
            src={creature.front_sprite}
            alt={creature.name}
            className="w-24 h-24 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_20px_20px_rgba(255,255,255,0.2)]"
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 text-neutral-400">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-red-500" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                <span>HP</span>
                <span>{creature.hp}</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creature.hp / 200) * 100}%` }}
                  className="h-full bg-red-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sword size={14} className="text-orange-500" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                <span>ATK</span>
                <span>{creature.attack}</span>
              </div>
              <div
                className={`h-1 bg-neutral-800 rounded-full overflow-hidden`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creature.attack / 200) * 100}%` }}
                  className="h-full bg-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-500" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                <span>DEF</span>
                <span>{creature.defense}</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creature.defense / 200) * 100}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-500" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                <span>SPD</span>
                <span>{creature.speed}</span>
              </div>
              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(creature.speed / 200) * 100}%` }}
                  className="h-full bg-yellow-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Glow */}
        <div
          className={`h-1 w-full bg-gradient-to-r ${colorGradient} opacity-30`}
        ></div>
      </div>
    </motion.div>
  );
};
