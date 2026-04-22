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
          <div className={`absolute top-0 left-0 w-full h-2 ${won ? "bg-emerald-500" : "bg-red-600"}`} />
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
              won
                ? "bg-slate-900 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                : "bg-slate-900 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.4)]"
            }`}
          >
            <span className={`material-symbols-outlined text-[48px] ${won ? "text-yellow-400" : "text-red-600"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {won ? "emoji_events" : "sentiment_dissatisfied"}
            </span>
          </div>

          <div>
            <h2
              className={`text-5xl font-black uppercase mb-2 ${
                won ? "text-emerald-500" : "text-red-600"
              }`}
            >
              {won ? "YOU WON" : "YOU LOST"}
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
              {won
                ? "YOU DOMINATED THE BATTLE ARENA."
                : "BETTER LUCK NEXT TIME."}
            </p>
          </div>

          <div className="w-full h-[2px] bg-[#1E293B]" />

          <button
            type="button"
            onClick={onReturn}
            className={`w-full py-4 font-black uppercase tracking-widest border-b-4 rounded-xl transition-all shadow-xl hover:-translate-y-1 ${
              won 
                ? "bg-emerald-600 border-emerald-800 text-white hover:bg-emerald-500 shadow-emerald-900/20" 
                : "bg-red-600 border-red-800 text-white hover:bg-red-500 shadow-red-900/20"
            }`}
          >
            BACK TO MENU
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
