import React from "react";
import { Link } from "react-router-dom";
import { User, Lock, Orbit } from "lucide-react";
import { motion } from "framer-motion";
import { useLogin } from "../hooks/useLogin";
import { Pokeball } from "../components/Pokeball";

const LoginPage: React.FC = () => {
  const { formData, error, loading, handleChange, handleLogin } = useLogin();

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
            {/* Central Button for Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] border-8 border-[#2d3449] rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Main Auth Container */}
      <motion.main
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 2.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg bg-[#0B1326]/10 backdrop-blur-md beveled-border shadow-[24px_24px_0px_0px_rgba(0,0,0,0.5)] flex flex-col"
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

        <header className="p-8 pb-0 flex flex-col items-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-[#FF1F1F] shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
            <h1 className="font-headline text-3xl font-black uppercase tracking-tighter text-white">
              POKÉDEX ARCHIVE
            </h1>
            <div className="w-8 h-8 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
          </div>
          <div className="w-full flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold uppercase tracking-[0.2em] text-[#e5e2e3] terminal-glow">
              TRAINER LOGIN
            </h2>
            <div className="font-headline text-[10px] text-[#FF1F1F] font-bold opacity-80">
              STATION_001_AUTH
            </div>
          </div>
          <div className="h-1 w-full bg-[#2d3449] mt-3 relative">
            <div className="absolute left-0 top-0 h-full w-1/4 bg-[#FF1F1F] shadow-[2px_0_4px_rgba(255,31,31,0.5)]"></div>
          </div>
        </header>

        <section className="p-8 md:p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border-2 border-red-500/50 text-red-500 font-headline text-xs tracking-widest uppercase">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
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
                  placeholder="TRAINER NAME"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#4e5770] font-bold block ml-1">
                  Access Key
                </label>
                <Link
                  className="text-[9px] uppercase tracking-widest text-[#FF1F1F] hover:text-white transition-colors font-bold"
                  to="#"
                >
                  Lost Key?
                </Link>
              </div>
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Login Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full group relative overflow-hidden bg-[#FF1F1F] text-white font-headline font-black py-5 rounded-sm uppercase tracking-[0.3em] beveled-button hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? "AUTHENTICATING..." : "ENTER ARCHIVE"}
              </span>
              <Orbit className="relative z-10 w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
            </button>
          </form>

          <div className="mt-8 text-center border-t-2 border-[#2d3449] pt-8">
            <p className="font-body text-xs text-[#9ca3af] uppercase tracking-wider">
              No credentials?
              <Link
                className="text-[#FF1F1F] font-bold font-headline uppercase tracking-widest ml-1 hover:text-white transition-colors underline decoration-2 underline-offset-4"
                to="/register"
              >
                Enlist Now
              </Link>
            </p>
          </div>
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

export default LoginPage;
