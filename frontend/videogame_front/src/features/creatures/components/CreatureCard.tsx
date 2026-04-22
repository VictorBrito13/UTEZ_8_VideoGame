import { motion } from "framer-motion";

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

export const CreatureCard = ({ creature, index }: CreatureCardProps) => {
  const primaryType = (creature.type_1_name || "NORMAL").toUpperCase().trim();
  const colorBg = typeColors[primaryType] || "bg-gray-400";

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
        y: -5,
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      className="relative group perspective-1000 w-full h-full"
    >
      <div className="relative bg-[#0B1326] border-2 border-[#2d3449] rounded-sm overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] hover:border-primary transition-colors h-full flex flex-col">
        {/* Header with ID and Name */}
        <div className={`h-20 ${colorBg} border-b-2 border-[#0B1326] p-4 flex justify-between items-start text-black shadow-[inset_0px_-4px_0px_rgba(0,0,0,0.2)]`}>
          <div>
            <span className="text-[10px] font-headline font-black uppercase tracking-widest opacity-80 block">
              NO. {(creature.pokedex_id || 0).toString().padStart(3, "0")}
            </span>
            <h3 className="text-xl font-headline font-black tracking-widest uppercase">
              {creature.name}
            </h3>
          </div>
          <div className="flex gap-1 flex-col items-end">
            {creature.type_1_name && (
              <span className="px-2 py-0.5 bg-black/20 border border-black/30 text-[9px] font-headline font-black uppercase tracking-widest shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                {creature.type_1_name}
              </span>
            )}
            {creature.type_2_name && (
              <span className="px-2 py-0.5 bg-black/20 border border-black/30 text-[9px] font-headline font-black uppercase tracking-widest shadow-[2px_2px_0_rgba(0,0,0,0.2)] mt-1">
                {creature.type_2_name}
              </span>
            )}
          </div>
        </div>

        {/* Sprite Container */}
        <div className="relative -mt-8 flex justify-center h-28 items-center z-10">
          <div className="w-20 h-20 bg-black/20 rounded-full absolute bottom-2 blur-md"></div>
          <motion.img
            src={creature.front_sprite}
            alt={creature.name}
            className="w-24 h-24 object-contain image-rendering-pixelated drop-shadow-[4px_4px_0_rgba(0,0,0,0.3)] z-10"
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
        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-outline mt-auto bg-surface-container-low border-t-2 border-[#2d3449]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-headline font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> HP</span>
              <span className="text-white">{creature.hp}</span>
            </div>
            <div className="h-2 border border-[#2d3449] bg-[#0B1326] w-full p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (creature.hp / 200) * 100)}%` }}
                className="h-full bg-error"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-headline font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span> ATK</span>
              <span className="text-white">{creature.attack}</span>
            </div>
            <div className="h-2 border border-[#2d3449] bg-[#0B1326] w-full p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (creature.attack / 200) * 100)}%` }}
                className="h-full bg-orange-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-headline font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] text-blue-500" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span> DEF</span>
              <span className="text-white">{creature.defense}</span>
            </div>
            <div className="h-2 border border-[#2d3449] bg-[#0B1326] w-full p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (creature.defense / 200) * 100)}%` }}
                className="h-full bg-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-headline font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span> SPD</span>
              <span className="text-white">{creature.speed}</span>
            </div>
            <div className="h-2 border border-[#2d3449] bg-[#0B1326] w-full p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (creature.speed / 200) * 100)}%` }}
                className="h-full bg-yellow-400"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
