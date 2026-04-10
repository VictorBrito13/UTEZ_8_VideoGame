import React from "react";
import { motion } from "framer-motion";

export const Pokeball: React.FC = () => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{
        scale: [0, 1.1, 1, 1, 1.5],
        rotate: [-180, 10, 0, 0, 0],
        opacity: [0, 1, 1, 1, 0],
        filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(20px)"],
      }}
      transition={{
        duration: 2.5,
        ease: "easeInOut",
        times: [0, 0.2, 0.28, 0.34, 1],
      }}
      className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
    >
      <motion.div
        animate={{
          filter: [
            "drop-shadow(0 0 15px rgba(255, 31, 31, 0.6))",
            "drop-shadow(0 0 30px rgba(255, 31, 31, 0.8))",
            "drop-shadow(0 0 15px rgba(255, 31, 31, 0.6))",
          ],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-32 h-32 md:w-48 md:h-48 relative"
      >
        <div className="w-full h-full bg-[linear-gradient(to_bottom,#FF1F1F_45%,#050A14_45%,#050A14_55%,#FFFFFF_55%)] rounded-full border-8 border-[#050A14] relative shadow-[0_0_0_4px_#222a3d]">
          {/* Central Button */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-white border-8 border-[#050A14] rounded-full shadow-[0_0_0_4px_#222a3d] z-10" />
        </div>
        {/* Decorative pixel dots */}
        <div className="absolute -top-4 -left-4 w-4 h-4 bg-[#FF1F1F] shadow-[2px_2px_0_rgba(0,0,0,0.5)]" />
        <div className="absolute -bottom-4 -right-4 w-4 h-4 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.5)]" />
      </motion.div>
    </motion.div>
  );
};
