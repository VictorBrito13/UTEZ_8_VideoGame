import { motion, AnimatePresence } from "framer-motion";

type BattleEndOverlayProps = {
  show: boolean;
  won: boolean;
  onReturn: () => void;
};

export const BattleEndOverlay = ({
  show,
  won,
  onReturn,
}: BattleEndOverlayProps) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-[#0B1326] border-2 border-[#2d3449] p-12 rounded-sm shadow-[8px_8px_0_rgba(0,0,0,0.5)] flex flex-col items-center gap-8 max-w-md w-full text-center relative overflow-hidden"
        >
          <div className={`absolute top-0 left-0 w-full h-2 ${won ? "bg-primary" : "bg-error"}`} />
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
              won
                ? "bg-surface-container-low border-primary shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                : "bg-surface-container-low border-error shadow-[0_0_40px_rgba(239,68,68,0.4)]"
            }`}
          >
            <span className={`material-symbols-outlined text-[48px] ${won ? "text-primary" : "text-error"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {won ? "emoji_events" : "sentiment_dissatisfied"}
            </span>
          </div>

          <div>
            <h2
              className={`text-5xl font-headline font-black uppercase mb-2 terminal-glow ${
                won ? "text-primary" : "text-error"
              }`}
            >
              {won ? "YOU WON" : "YOU LOST"}
            </h2>
            <p className="text-outline font-headline font-bold uppercase tracking-widest text-xs">
              {won
                ? "YOU DOMINATED THE BATTLE ARENA."
                : "BETTER LUCK NEXT TIME."}
            </p>
          </div>

          <div className="w-full h-[2px] bg-[#2d3449]" />

          <button
            type="button"
            onClick={onReturn}
            className={`w-full py-4 font-headline font-black uppercase tracking-widest border-2 transition-all shadow-[4px_4px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 beveled-button ${
              won ? "bg-primary border-primary text-on-primary hover:bg-primary/80" : "bg-error border-error text-white hover:bg-error/80"
            }`}
          >
            BACK TO MENU
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
