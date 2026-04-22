import { motion } from "framer-motion";

const TYPE_COLORS: Record<string, string> = {
  FIRE: "#ea580c", // orange-600
  WATER: "#3b82f6", // blue-500
  GRASS: "#22c55e", // green-500
  ELECTRIC: "#facc15", // yellow-400
  ICE: "#67e8f9", // cyan-300
  POISON: "#a855f7", // purple-500
  ROCK: "#78350f", // amber-900
  GROUND: "#b45309", // amber-700
  FLYING: "#7dd3fc", // sky-300
  PSYCHIC: "#f472b6", // pink-400
  BUG: "#a3e635", // lime-400
  GHOST: "#6d28d9", // violet-700
  DRAGON: "#4f46e5", // indigo-600
  DARK: "#1e293b", // slate-800
  FAIRY: "#fb7185", // rose-400
  STEEL: "#94a3b8", // slate-400
  FIGHTING: "#dc2626", // red-600
  NORMAL: "#d1d5db", // gray-300
};

// ==========================================
// CHARGE EFFECTS (When attacking) - SMALLER & FASTER
// ==========================================

const FireCharge = () => (
  <motion.div
    initial={{ scale: 0.5, opacity: 0, y: 20 }}
    animate={{ scale: [1, 1.2, 1.5], opacity: [0, 1, 0], y: -40 }}
    transition={{ duration: 0.45 }}
    className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-orange-500 z-30 blur-xl pointer-events-none"
  />
);

const WaterCharge = () => (
  <motion.div
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 2, opacity: 0 }}
    transition={{ duration: 0.45 }}
    className="absolute inset-0 m-auto w-24 h-24 rounded-full border-[8px] border-blue-400 z-30 pointer-events-none"
    style={{ filter: "drop-shadow(0 0 10px #3b82f6)" }}
  />
);

const ElectricCharge = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
    animate={{ scale: 1.5, opacity: [1, 0, 1, 0], rotate: 180 }}
    transition={{ duration: 0.45 }}
    className="absolute inset-0 m-auto w-32 h-32 z-30 pointer-events-none flex items-center justify-center"
  >
    <div className="w-full h-full border-[8px] border-dashed border-yellow-400 rounded-full drop-shadow-[0_0_15px_#facc15]" />
  </motion.div>
);

const GenericCharge = ({ color }: { color: string }) => (
  <motion.div
    initial={{ scale: 1, opacity: 0 }}
    animate={{ scale: [1, 0.5, 0], opacity: [0, 1, 0] }}
    transition={{ duration: 0.45 }}
    className="absolute inset-0 m-auto w-32 h-32 rounded-full border-[8px] z-30 pointer-events-none"
    style={{ borderColor: color, filter: `drop-shadow(0 0 15px ${color}) blur(2px)` }}
  />
);

// ==========================================
// IMPACT EFFECTS (When hit) - FEWER PARTICLES, SHORTER
// ==========================================

const FireImpact = () => {
  const particles = Array.from({ length: 8 });
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute w-24 h-24 rounded-full bg-red-600 blur-[15px]"
      />
      {particles.map((_, i) => {
        const x = (Math.random() - 0.5) * 150;
        const y = -50 - Math.random() * 120;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: Math.random() * 1.5 + 0.5, opacity: 1 }}
            animate={{ x, y, scale: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute w-8 h-8 rounded-full bg-orange-400 blur-[2px]"
            style={{ filter: "drop-shadow(0 0 10px #ea580c)" }}
          />
        );
      })}
    </div>
  );
};

const WaterImpact = () => {
  const particles = Array.from({ length: 10 });
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute w-24 h-24 rounded-full bg-blue-300 blur-xl"
      />
      {particles.map((_, i) => {
        const x = (Math.random() - 0.5) * 180;
        const y = 40 + Math.random() * 120;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: -40, scale: 1, opacity: 1 }}
            animate={{ x, y, scale: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
            className="absolute w-4 h-10 bg-cyan-200 rounded-full"
            style={{ 
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", 
              filter: "drop-shadow(0 0 8px #3b82f6)" 
            }}
          />
        );
      })}
    </div>
  );
};

const ElectricImpact = () => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 0, 1, 0, 1, 0], scale: [1, 1.2, 1, 1.5, 1, 2] }}
        transition={{ duration: 0.45 }}
        className="absolute w-[200px] h-[200px] bg-yellow-200 rounded-full blur-[20px]"
      />
      <svg className="absolute w-[200px] h-[200px] overflow-visible" viewBox="0 0 100 100">
        <motion.polyline
          points="50,0 35,40 65,40 40,100"
          fill="none"
          stroke="#fef08a"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ filter: "drop-shadow(0 0 10px #facc15)" }}
        />
      </svg>
      <svg className="absolute w-[200px] h-[200px] overflow-visible rotate-90 scale-x-[-1]" viewBox="0 0 100 100">
        <motion.polyline
          points="50,10 30,50 70,50 40,90"
          fill="none"
          stroke="#facc15"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ filter: "drop-shadow(0 0 10px #ca8a04)" }}
        />
      </svg>
    </div>
  );
};

const GrassImpact = () => {
  const particles = Array.from({ length: 8 });
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute w-24 h-24 rounded-full bg-green-400 blur-2xl"
      />
      {particles.map((_, i) => {
        const x = (Math.random() - 0.5) * 150;
        const y = (Math.random() - 0.5) * 150;
        const rot = Math.random() * 360;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0.6, opacity: 1, rotate: rot }}
            animate={{ x, y, scale: 1.5, opacity: 0, rotate: rot + 180 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute w-8 h-4 bg-lime-400"
            style={{ 
              borderRadius: "0 100% 0 100%", // Leaf shape
              filter: "drop-shadow(0 0 10px #22c55e)" 
            }}
          />
        );
      })}
    </div>
  );
};

const GenericImpact = ({ color }: { color: string }) => {
  const particles = Array.from({ length: 8 });
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 1 }}
        animate={{ scale: 3.5, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute w-32 h-32 rounded-full blur-xl"
        style={{ backgroundColor: color }}
      />
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 50;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x, y, scale: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute w-6 h-6 rounded-full"
            style={{ backgroundColor: color, filter: `drop-shadow(0 0 10px ${color})` }}
          />
        );
      })}
    </div>
  );
};

export const ElementalVfx = ({
  type,
  phase,
  direction,
}: {
  type: string;
  phase: "CHARGE" | "IMPACT";
  direction?: "UP" | "DOWN";
}) => {
  const t = type.toUpperCase();
  const color = TYPE_COLORS[t] || TYPE_COLORS.NORMAL;

  if (phase === "CHARGE") {
    const travelDistance = direction === "UP" ? "-40vh" : "40vh";
    
    let ChargeComponent = <GenericCharge color={color} />;
    if (t === "FIRE") ChargeComponent = <FireCharge />;
    else if (t === "WATER" || t === "ICE") ChargeComponent = <WaterCharge />;
    else if (t === "ELECTRIC") ChargeComponent = <ElectricCharge />;

    return (
      <motion.div
        initial={{ y: 0, scale: 0.8, opacity: 1 }}
        animate={{ y: travelDistance, scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeIn" }}
        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
      >
        {ChargeComponent}
      </motion.div>
    );
  }

  // IMPACT
  switch (t) {
    case "FIRE":
    case "DRAGON":
      return <FireImpact />;
    case "WATER":
    case "ICE":
      return <WaterImpact />;
    case "ELECTRIC":
      return <ElectricImpact />;
    case "GRASS":
    case "BUG":
      return <GrassImpact />;
    default:
      return <GenericImpact color={color} />;
  }
};
