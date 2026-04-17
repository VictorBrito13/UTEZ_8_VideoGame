import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, User as UserIcon } from "lucide-react";
import apiClient from "../../../api/apiClient";

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
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/1.png",
  },
  {
    id: 2,
    name: "Blue",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/2.png",
  },
  {
    id: 3,
    name: "Leaf",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/10.png",
  },
  {
    id: 4,
    name: "Ethan",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/3.png",
  },
  {
    id: 5,
    name: "Kris",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/5.png",
  },
  {
    id: 6,
    name: "Lyra",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/12.png",
  },
  {
    id: 7,
    name: "Brendan",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/7.png",
  },
  {
    id: 8,
    name: "May",
    url: "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/13.png",
  },
];

export const AvatarSelector = ({
  isOpen,
  onClose,
  currentAvatar,
  onAvatarSelect,
}: AvatarSelectorProps) => {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (url: string) => {
    setLoading(true);
    try {
      await apiClient.patch("/api/profile/update_profile/", {
        trainer_sprite: url,
      });
      onAvatarSelect(url);
      onClose();
    } catch {
      // Selection modal stays open; user can retry.
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
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
            className="relative bg-neutral-950 border border-white/10 rounded-[3rem] p-8 max-w-2xl w-full shadow-2xl overflow-hidden"
          >
            {/* Neon Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">
                  Identity_Terminal
                </h2>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
                  Select_Trainer_Avatar // Pixel_Sync
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-neutral-900 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={20} />
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
                    className={`relative aspect-square rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-neutral-900/50 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        : "border-white/5 hover:border-white/20"
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className={`w-32 h-32 object-contain filter ${isSelected ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""}`}
                    />

                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <div className="bg-emerald-500 p-1 rounded-full shadow-lg">
                          <Check size={14} className="text-black" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-tighter">
                        {avatar.name}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4 text-neutral-600">
              <UserIcon size={16} />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                {loading
                  ? "Sychronizing Neural Identity..."
                  : "Biometric Link Ready // Zone_Alpha"}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
