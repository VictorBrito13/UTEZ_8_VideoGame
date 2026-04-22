import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onAvatarSelect: (url: string) => void;
}

const TRAINER_AVATARS = [
  {
    id: 1,
    name: "Red",  
    url: "https://play.pokemonshowdown.com/sprites/trainers/red.png",
  },
  {
    id: 2,
    name: "Blue",
    url: "https://play.pokemonshowdown.com/sprites/trainers/blue.png",
  },
  {
    id: 3,
    name: "Dawn",
    url: "https://play.pokemonshowdown.com/sprites/trainers/dawn.png",
  },
  {
    id: 4,
    name: "Ethan",
    url: "https://play.pokemonshowdown.com/sprites/trainers/ethan.png",
  },
  {
    id: 5,
    name: "Lyra",
    url: "https://play.pokemonshowdown.com/sprites/trainers/lyra.png",
  },
  {
    id: 6,
    name: "Brendan",
    url: "https://play.pokemonshowdown.com/sprites/trainers/brendan.png",
  },
  {
    id: 7,
    name: "May",
    url: "https://play.pokemonshowdown.com/sprites/trainers/may.png",
  },
  {
    id: 8,
    name: "Silver",
    url: "https://play.pokemonshowdown.com/sprites/trainers/silver.png",
  },
];

export const AvatarSelector = ({
  isOpen,
  onClose,
  currentAvatar,
  onAvatarSelect,
}: AvatarSelectorProps) => {
  const [loading, ] = useState(false);

  const handleSelect = (url: string) => {
    onAvatarSelect(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#0B1326] border-2 border-[#2d3449] rounded-sm p-8 max-w-2xl w-full shadow-[8px_8px_0_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="flex justify-between items-start mb-8 border-b-2 border-[#2d3449] pb-4">
              <div>
                <h2 className="text-3xl font-headline font-black tracking-widest text-primary uppercase terminal-glow flex items-center gap-2">
                  <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                  IDENTITY_TERMINAL
                </h2>
                <p className="text-xs text-outline font-headline font-bold uppercase tracking-widest mt-1">
                  SELECT_TRAINER_AVATAR // PIXEL_SYNC
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 bg-surface-container-low border-2 border-[#2d3449] text-outline hover:text-error hover:border-error hover:bg-error/10 transition-colors rounded-sm shadow-[2px_2px_0_rgba(0,0,0,0.5)]"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {TRAINER_AVATARS.map((avatar) => {
                const isSelected = currentAvatar === avatar.url;
                return (
                  <motion.div
                    key={avatar.id}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(avatar.url)}
                    className={`relative aspect-square rounded-sm border-2 transition-all cursor-pointer flex flex-col items-center justify-center bg-surface-container-low shadow-[4px_4px_0_rgba(0,0,0,0.5)] overflow-hidden beveled-button ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-[#2d3449] hover:border-white/40"
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className={`w-24 h-24 object-contain image-rendering-pixelated mb-4 ${isSelected ? "drop-shadow-[2px_2px_0_rgba(16,185,129,0.8)]" : ""}`}
                    />

                    {isSelected && (
                      <div className="absolute inset-0 ring-4 ring-inset ring-primary pointer-events-none" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-[#0B1326] border-t-2 border-[#2d3449] text-center py-1">
                      <span className={`text-[10px] font-headline font-black uppercase tracking-widest ${isSelected ? "text-primary" : "text-outline"}`}>
                        {avatar.name}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 pt-4 flex items-center gap-2 text-outline">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest">
                {loading
                  ? "SYNCHRONIZING NEURAL IDENTITY..."
                  : "BIOMETRIC LINK READY // ZONE_ALPHA"}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
