import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";

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
          className="bg-neutral-900 border border-white/10 p-12 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-center gap-8 max-w-md w-full text-center"
        >
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center ${
              won
                ? "bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                : "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
            }`}
          >
            <Activity size={48} className="text-white" />
          </div>

          <div>
            <h2
              className={`text-5xl font-black italic tracking-tighter uppercase mb-2 ${
                won ? "text-emerald-400" : "text-red-500"
              }`}
            >
              {won ? "You won" : "You lost"}
            </h2>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">
              {won
                ? "You dominated the battle arena."
                : "Better luck next time."}
            </p>
          </div>

          <div className="w-full h-px bg-white/5" />

          <button
            type="button"
            onClick={onReturn}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-colors shadow-lg"
          >
            Back to menu
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
