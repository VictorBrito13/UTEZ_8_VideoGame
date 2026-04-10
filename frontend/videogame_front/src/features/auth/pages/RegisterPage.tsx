import React from "react";
import { Link } from "react-router-dom";
import { User, Mail, Lock, Check, Swords, Orbit } from "lucide-react";
import { useRegister } from "../hooks/useRegister";
import { motion } from "framer-motion";
import { Pokeball } from "../components/Pokeball";

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
    <div className="min-h-screen bg-[#050A14] text-[#e5e2e3] font-body flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pixel-grid opacity-30 pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#FF1F1F]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#B7C4FF]/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Cinematic Entrance: Pokeball */}
      <Pokeball />

      {/* Watermark Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
      >
        <div className="w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,31,31,0.1)_0%,transparent_70%)] relative">
          <div className="w-full h-full bg-[linear-gradient(to_bottom,#2d3449_45%,transparent_45%,transparent_55%,#2d3449_55%)] rounded-full border-8 border-[#2d3449] grayscale opacity-10 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] border-8 border-[#2d3449] rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Main Container */}
      <motion.main
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 2.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl bg-[#0B1326]/10 backdrop-blur-md beveled-border shadow-[24px_24px_0px_0px_rgba(0,0,0,0.5)] flex flex-col my-8"
      >
        {/* Scanline effect */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            background:
              "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)",
            backgroundSize: "100% 4px",
          }}
        ></div>

        <header className="p-8 pb-0 flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-[#FF1F1F] shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
            <h1 className="font-headline text-3xl font-black uppercase tracking-tighter text-white">
              POKÉDEX ARCHIVE
            </h1>
            <div className="w-8 h-8 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
          </div>
          <div className="w-full flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold uppercase tracking-[0.2em] text-[#e5e2e3] terminal-glow">
              ENLIST TRAINER
            </h2>
            <div className="font-headline text-[10px] text-[#FF1F1F] font-bold opacity-80 uppercase">
              DEEPLOY_IDENTITY
            </div>
          </div>
          <div className="h-1 w-full bg-[#2d3449] mt-3 relative">
            <div className="absolute left-0 top-0 h-full w-1/4 bg-[#FF1F1F] shadow-[2px_0_4px_rgba(255,31,31,0.5)]"></div>
          </div>
        </header>

        <section className="p-8 md:p-10">
          {error && (
            <div className="mb-8 p-4 bg-red-900/20 border-2 border-red-500/50 text-red-500 font-headline text-xs tracking-widest uppercase">
              SYSTEM ERROR: {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-10">
            {/* HERO SELECTION GRID */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Swords size={14} className="text-[#FF1F1F]" />
                <span className="text-[10px] font-black text-[#4e5770] uppercase tracking-[0.4em]">
                  Choose_Battle_Hero_Avatar
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {HERO_AVATARS.map((hero) => {
                  const isSelected = formData.trainer_sprite === hero.url;
                  return (
                    <motion.div
                      key={hero.id}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAvatar(hero.url)}
                      className={`relative aspect-square border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-[#0B1326]/50 beveled-button ${
                        isSelected
                          ? "border-[#FF1F1F] bg-[#FF1F1F]/10 shadow-[0_0_25px_rgba(255,31,31,0.2)]"
                          : "border-[#2d3449] hover:border-[#4e5770]"
                      }`}
                    >
                      <img
                        src={hero.url}
                        alt={hero.name}
                        className={`w-16 h-16 object-contain render-pixelated ${isSelected ? "drop-shadow-[0_0_8px_rgba(255,31,31,0.5)]" : "opacity-40 hover:opacity-100 transition-opacity"}`}
                      />

                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center justify-center">
                          <div className="bg-[#FF1F1F] p-0.5 rounded-sm shadow-sm">
                            <Check size={10} className="text-white" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`absolute bottom-0 left-0 right-0 py-1 text-center bg-[#050A14]/80 overflow-hidden transition-all ${isSelected ? "translate-y-0" : "translate-y-full"}`}
                      >
                        <span className="text-[7px] font-black uppercase text-white tracking-widest font-headline">
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
              <div className="space-y-2 md:col-span-2">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#4e5770] font-bold block ml-1">
                  Archive Identity
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="text-[#FF1F1F] w-5 h-5" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-[#FF1F1F] placeholder:text-[#4e5770]/40 text-[#e5e2e3] transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                    placeholder="USERNAME"
                  />
                </div>
              </div>

              <div className="space-y-2 ">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#4e5770] font-bold block ml-1">
                  Relay Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-[#FF1F1F] w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-[#FF1F1F] placeholder:text-[#4e5770]/40 text-[#e5e2e3] transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                    placeholder="EMAIL_ADDR"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#4e5770] font-bold block ml-1">
                  Access Key
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-[#FF1F1F] w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-[#FF1F1F] placeholder:text-[#4e5770]/40 text-[#e5e2e3] transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                    placeholder="PASSWORD"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full group relative overflow-hidden bg-[#FF1F1F] text-white font-headline font-black py-5 rounded-sm uppercase tracking-[0.3em] beveled-button hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="relative z-10">
                {loading ? "INITIALIZING..." : "FORGE ACCOUNT"}
              </span>
              <Orbit className="relative z-10 w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
            </button>
          </form>

          <footer className="mt-10 pt-8 border-t-2 border-[#2d3449] text-center">
            <p className="font-body text-xs text-[#9ca3af] uppercase tracking-wider">
              Already have a hero?{" "}
              <Link
                to="/login"
                className="text-[#FF1F1F] font-bold font-headline uppercase tracking-widest ml-1 hover:text-white transition-colors underline decoration-2 underline-offset-4"
              >
                Access Terminal
              </Link>
            </p>
          </footer>
        </section>
      </motion.main>

      {/* Floating UI Decorations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="fixed top-8 left-8 hidden lg:flex flex-col gap-4"
      >
        <div className="w-4 h-4 bg-[#FF1F1F] shadow-[4px_4px_0_rgba(0,0,0,0.5)] animate-pulse"></div>
        <div className="w-4 h-4 bg-white shadow-[4px_4px_0_rgba(0,0,0,0.5)]"></div>
        <div className="w-4 h-4 bg-[#B7C4FF] shadow-[4px_4px_0_rgba(0,0,0,0.5)] opacity-50"></div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
