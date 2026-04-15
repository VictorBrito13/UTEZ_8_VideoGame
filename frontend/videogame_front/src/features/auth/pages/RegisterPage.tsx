import React from "react";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, Check, Swords } from "lucide-react";
import { useRegister } from "../hooks/useRegister";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { motion } from "framer-motion";

const HERO_AVATARS = [
  {
    id: 1,
    name: "RED_HERO",
    url: "https://play.pokemonshowdown.com/sprites/trainers/red.png",
  },
  {
    id: 2,
    name: "BLUE_RIVAL",
    url: "https://play.pokemonshowdown.com/sprites/trainers/blue.png",
  },
  {
    id: 3,
    name: "DAWN",
    url: "https://play.pokemonshowdown.com/sprites/trainers/dawn.png",
  },
  {
    id: 4,
    name: "ETHAN_SOUL",
    url: "https://play.pokemonshowdown.com/sprites/trainers/ethan.png",
  },
  {
    id: 5,
    name: "LYRA_HEART",
    url: "https://play.pokemonshowdown.com/sprites/trainers/lyra.png",
  },
  {
    id: 6,
    name: "BRENDAN_RUBY",
    url: "https://play.pokemonshowdown.com/sprites/trainers/brendan.png",
  },
  {
    id: 7,
    name: "MAY_SAPPHIRE",
    url: "https://play.pokemonshowdown.com/sprites/trainers/may.png",
  },
  {
    id: 8,
    name: "SILVER",
    url: "https://play.pokemonshowdown.com/sprites/trainers/silver.png",
  },
];

const RegisterPage: React.FC = () => {
  const { formData, error, loading, handleChange, handleRegister, setAvatar } =
    useRegister();

  const isFormValid =
    formData.username &&
    formData.email &&
    formData.password &&
    formData.trainer_sprite;

  return (
    <Container variant="page" className="min-h-screen py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Container
          variant="card"
          className="p-10 border border-white/10 bg-neutral-900/50 backdrop-blur-3xl rounded-[3rem] shadow-2xl relative overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="text-center mb-10">
            <div className="bg-cyan-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
              <UserPlus className="h-10 w-10 text-cyan-400" />
            </div>
            <Heading
              level={1}
              className="text-5xl font-black italic tracking-tighter uppercase"
            >
              DEEPLOY_IDENTITY
            </Heading>
            <Text
              variant="secondary"
              className="mt-2 text-neutral-500 font-bold uppercase tracking-widest text-[10px]"
            >
              FORGE YOUR ACCOUNT // SELECT BATTLE_HERO
            </Text>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-semibold text-center leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-10">
            {/* HERO SELECTION GRID */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Swords size={14} className="text-cyan-400" />
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.4em]">
                  Choose_Battle_Hero_Avatar
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {HERO_AVATARS.map((hero) => {
                  const isSelected = formData.trainer_sprite === hero.url;
                  return (
                    <motion.div
                      key={hero.id}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAvatar(hero.url)}
                      className={`relative aspect-square rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-neutral-950/50 ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
                          : "border-white/5 hover:border-white/20"
                      }`}
                    >
                      <img
                        src={hero.url}
                        alt={hero.name}
                        className={`w-16 h-16 object-contain render-pixelated ${isSelected ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "opacity-40 hover:opacity-100 transition-opacity"}`}
                      />

                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center justify-center">
                          <div className="bg-cyan-500 p-0.5 rounded-full shadow-lg">
                            <Check size={10} className="text-black" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`absolute bottom-0 left-0 right-0 py-1 text-center bg-black/50 overflow-hidden transition-all ${isSelected ? "translate-y-0" : "translate-y-full"}`}
                      >
                        <span className="text-[7px] font-black uppercase text-white tracking-widest">
                          {hero.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* FORM INPUTS */}
            <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative md:col-span-2">
                <User className="absolute left-4 top-4 h-5 w-5 text-neutral-600" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-950 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-neutral-700 font-bold text-sm"
                  placeholder="USERNAME"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-neutral-600" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-950 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-neutral-700 font-bold text-sm"
                  placeholder="EMAIL_ADDR"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-neutral-600" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-950 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-neutral-700 font-bold text-sm"
                  placeholder="PASSWORD"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full py-5 px-6 rounded-2xl shadow-2xl text-sm font-black uppercase tracking-widest transition-all ${
                isFormValid
                  ? "bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-[1.02] active:scale-95"
                  : "bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5"
              }`}
            >
              {loading ? (
                "Forging Account..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Check size={18} /> INITIALIZE_HERO
                </span>
              )}
            </button>
          </form>

          <Text
            variant="secondary"
            className="text-center mt-10 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-600"
          >
            Already have a hero?{" "}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-400/20"
            >
              Access_Terminal
            </Link>
          </Text>
        </Container>
      </motion.div>
    </Container>
  );
};

export default RegisterPage;
