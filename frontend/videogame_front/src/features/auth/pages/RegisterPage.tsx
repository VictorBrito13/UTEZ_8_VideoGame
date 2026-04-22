import React from "react";
import { Link } from "react-router-dom";
import { useRegister } from "../hooks/useRegister";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { motion } from "framer-motion";

/** Must match `VALID_TRAINER_SPRITES` on the backend (user_profile.serializers). */
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

  const passwordValidation = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const isFormValid =
    formData.username &&
    formData.email &&
    isPasswordValid &&
    formData.trainer_sprite;

  return (
    <Container variant="page">
      <Container variant="card">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)", backgroundSize: "100% 4px" }}></div>
        
        <header className="flex flex-col items-center pb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-primary shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
            <Heading level={1}>
              POKÉDEX ARCHIVE
            </Heading>
            <div className="w-8 h-8 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
          </div>
          <div className="w-full flex items-center justify-between">
            <Heading level={2}>ENLIST NEW TRAINER</Heading>
            <div className="font-headline text-[10px] text-primary font-bold opacity-80">STATION_001_REG</div>
          </div>
          <div className="h-1 w-full bg-[#2d3449] mt-3 relative">
            <div className="absolute left-0 top-0 h-full w-1/4 bg-primary shadow-[2px_0_4px_rgba(255,31,31,0.5)]"></div>
          </div>
        </header>

        {error ? (
          <Text variant="error">
            {typeof error === "string" ? error : "Registration failed."}
          </Text>
        ) : null}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* HERO SELECTION GRID */}
          <div className="space-y-4">
            <label className="font-headline text-[10px] uppercase tracking-[0.2em] text-outline font-bold block ml-1">Select Avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {HERO_AVATARS.map((hero) => {
                const isSelected = formData.trainer_sprite === hero.url;
                return (
                  <div
                    key={hero.id}
                    onClick={() => setAvatar(hero.url)}
                    className={`relative aspect-square border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden bg-[#0B1326] ${
                      isSelected
                        ? "border-primary shadow-[inset_2px_2px_4px_rgba(255,31,31,0.2)]"
                        : "border-[#2d3449] hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={hero.url}
                      alt={hero.name}
                      className={`w-12 h-12 object-contain image-rendering-pixelated ${isSelected ? "" : "opacity-50 grayscale"}`}
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1">
                        <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* FORM INPUTS */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                placeholder="TRAINER NAME"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                placeholder="EMAIL_ADDR"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm py-4 pl-12 pr-4 text-sm font-headline tracking-widest focus:ring-0 focus:border-primary placeholder:text-outline/40 text-on-surface transition-all shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"
                placeholder="PASSWORD"
              />
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-4 bg-[#0B1326] border-2 border-[#2d3449] grid grid-cols-2 gap-2 text-[8px] font-headline tracking-widest uppercase">
              {[
                { key: "length", label: "8+ CHARS" },
                { key: "upper", label: "UPPERCASE" },
                { key: "lower", label: "LOWERCASE" },
                { key: "number", label: "NUMBER" },
                { key: "special", label: "SYMBOL" },
              ].map((req) => (
                <div key={req.key} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[10px] ${passwordValidation[req.key as keyof typeof passwordValidation] ? "text-primary" : "text-outline"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {passwordValidation[req.key as keyof typeof passwordValidation] ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={`${passwordValidation[req.key as keyof typeof passwordValidation] ? "text-on-surface" : "text-outline"}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full group relative overflow-hidden bg-primary text-on-primary font-headline font-black py-5 rounded-sm uppercase tracking-[0.3em] beveled-button hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">{loading ? "FORGING ACCOUNT..." : "INITIALIZE HERO"}</span>
            <span className="material-symbols-outlined relative z-10 text-xl group-hover:rotate-180 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>catching_pokemon</span>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider">
            Already have a hero?{" "}
            <Link
              to="/login"
              className="text-primary font-bold font-headline uppercase tracking-widest ml-1 hover:text-white transition-colors underline decoration-2 underline-offset-4"
            >
              Access_Terminal
            </Link>
          </p>
        </div>
      </Container>
    </Container>
  );
};

export default RegisterPage;
