import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { motion } from "framer-motion";
import { TeamWidget } from "../components/TeamWidget";
import apiClient from "../../../api/apiClient";

const TRAINER_AVATARS = [
  { id: 1, name: "RED", url: "https://play.pokemonshowdown.com/sprites/trainers/red.png" },
  { id: 2, name: "BLUE", url: "https://play.pokemonshowdown.com/sprites/trainers/blue.png" },
  { id: 3, name: "DAWN", url: "https://play.pokemonshowdown.com/sprites/trainers/dawn.png" },
  { id: 4, name: "ETHAN", url: "https://play.pokemonshowdown.com/sprites/trainers/ethan.png" },
  { id: 5, name: "LYRA", url: "https://play.pokemonshowdown.com/sprites/trainers/lyra.png" },
  { id: 6, name: "BRENDAN", url: "https://play.pokemonshowdown.com/sprites/trainers/brendan.png" },
  { id: 7, name: "MAY", url: "https://play.pokemonshowdown.com/sprites/trainers/may.png" },
  { id: 8, name: "SILVER", url: "https://play.pokemonshowdown.com/sprites/trainers/silver.png" },
];

const navItems = [
  {
    title: "Leaderboard",
    desc: "Global ELO rankings",
    icon: "leaderboard",
    path: "/leaderboard",
    color: "from-secondary-container to-secondary",
  },
  {
    title: "Pokedex",
    desc: "Species archive and stats",
    icon: "menu_book",
    path: "/pokedex",
    color: "from-primary-container to-primary",
  },
  {
    title: "Inventory",
    desc: "Heal and buff items",
    icon: "backpack",
    path: "/inventory",
    color: "from-tertiary-container to-tertiary",
  },
];

function TrainerAvatarGrid({ profile, loadingAvatar, handleSelectAvatar }: Readonly<{ profile: any, loadingAvatar: boolean, handleSelectAvatar: (url: string) => void }>) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
      {TRAINER_AVATARS.map((avatar) => {
        const isSelected = profile?.trainer_sprite === avatar.url;
        return (
          <motion.div
            key={avatar.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            role="button"
            tabIndex={0}
            onClick={() => handleSelectAvatar(avatar.url)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectAvatar(avatar.url); }}
            className={`relative aspect-square border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-[#0B1326] ${
              isSelected
                ? "border-primary shadow-[inset_2px_2px_4px_rgba(255,31,31,0.2)]"
                : "border-[#2d3449] hover:border-primary/50"
            }`}
          >
            <img
              src={avatar.url}
              alt={avatar.name}
              className={`w-12 h-12 object-contain image-rendering-pixelated ${isSelected ? "drop-shadow-[0_0_8px_rgba(255,31,31,0.6)]" : "opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all"}`}
            />
            {isSelected && (
              <div className="absolute top-1 right-1">
                <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
            )}
            {loadingAvatar && isSelected && (
              <div className="absolute flex items-center justify-center inset-0 bg-black/80 backdrop-blur-sm z-10">
                <span className="material-symbols-outlined animate-spin text-primary">autorenew</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function DashboardNavigation() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {navItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -5 }}
        >
          <Link to={item.path} className="group block h-full">
            <div
              className={`h-full p-6 bg-surface-container-low border-2 border-[#2d3449] beveled-button relative overflow-hidden transition-all hover:border-primary`}
            >
              <div className="relative z-10 flex items-center gap-6">
                <div className="bg-[#0B1326] w-12 h-12 rounded-sm flex items-center justify-center border-2 border-[#2d3449] group-hover:scale-110 transition-transform shrink-0 shadow-lg">
                  <span className="material-symbols-outlined text-primary text-2xl group-hover:text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {item.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-black tracking-widest uppercase text-white group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-headline text-[9px] text-on-surface-variant font-bold uppercase tracking-widest">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

const DashboardPage: React.FC = () => {
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get("/api/profile/me/");
        setProfile(response.data);
        setProfileError(null);
      } catch {
        setProfileError(
          "Could not load your profile. Try refreshing the page.",
        );
      }
    };
    if (token) fetchProfile();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleSelectAvatar = async (url: string) => {
    setLoadingAvatar(true);
    setAvatarError(null);
    try {
      await apiClient.patch("/api/profile/update_profile/", {
        trainer_sprite: url,
      });
      setProfile((prev: any) => ({ ...prev, trainer_sprite: url }));
    } catch {
      setAvatarError(
        "Could not update your avatar. Check your connection and try again.",
      );
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setLoadingAvatar(true);
        await apiClient.patch("/api/profile/update_profile/", {
          foto_base64: base64String,
        });
        setProfile((prev: any) => ({ ...prev, foto_base64: base64String }));
      } catch (error) {
        console.error("Error updating profile photo", error);
        setAvatarError("No se pudo actualizar la foto de perfil.");
      } finally {
        setLoadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Container variant="page" className="flex-col min-h-screen pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mx-auto px-4"
      >
        {profileError && (
          <div className="mb-6 rounded-sm border-2 border-on-error bg-error-container/80 px-4 py-3 text-sm text-on-error-container font-headline tracking-widest uppercase">
            {profileError}
          </div>
        )}
        {avatarError && (
          <div className="mb-6 rounded-sm border-2 border-on-error bg-error-container/80 px-4 py-3 text-sm text-on-error-container font-headline tracking-widest uppercase">
            {avatarError}
          </div>
        )}
        
        {/* ROW 1: PROFILE HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-surface-container-low beveled-border p-6 md:p-8 mb-8 shadow-[24px_24px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)", backgroundSize: "100% 4px" }}></div>
          
          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            {/* Profile Photo */}
            <div className="relative shrink-0">
              <button 
                type="button"
                className="relative group cursor-pointer bg-transparent border-none p-0 appearance-none text-left block"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-[#0B1326] border-4 border-[#2d3449] rounded-sm flex items-center justify-center overflow-hidden relative shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)] group-hover:border-primary transition-all">
                  {profile?.foto_base64 ? (
                    <img
                      src={profile.foto_base64}
                      alt="Profile"
                      className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-outline group-hover:opacity-50 transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  )}
                </div>

                {/* Camera Icon Overlay */}
                <div className="absolute bottom-[-8px] right-[-8px] bg-[#0B1326] border-2 border-[#2d3449] p-1.5 rounded-sm shadow-lg group-hover:scale-110 group-hover:bg-primary transition-all z-20">
                  <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                </div>
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* User Info & Stats */}
            <div>
              <Heading
                level={2}
                className="text-3xl font-black tracking-widest uppercase text-white mb-2 terminal-glow"
              >
                {profile?.username || "TRAINER_UNKNOWN"}
              </Heading>
              <div className="flex items-center gap-4 text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                <span className="flex items-center gap-1.5 text-primary bg-primary/10 px-3 py-1 border border-primary/20 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  Elo: {profile?.elo || 1000} Pts
                </span>
                <span className="flex items-center gap-1.5 text-secondary bg-secondary/10 px-3 py-1 border border-secondary/20 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                  Wins: {profile?.wins || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-6 md:mt-0 relative z-10 w-full md:w-auto">
            {/* BIG BATTLE BUTTON */}
            <button
              type="button"
              onClick={() => navigate("/matchmaking")}
              className="w-full md:w-auto group relative overflow-hidden bg-primary text-on-primary font-headline font-black py-4 px-8 rounded-sm uppercase tracking-[0.3em] beveled-button hover:translate-y-[-2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-3"
            >
              <span className="relative z-10 text-shadow-sm">START BATTLE</span>
              <span className="material-symbols-outlined relative z-10 text-xl group-hover:rotate-12 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>sports_esports</span>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10"></div>
            </button>

            {/* Disconnect */}
            <button
              onClick={handleLogout}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-[#0B1326] border-2 border-[#2d3449] hover:bg-[#171f33] transition-all text-primary font-headline font-bold text-xs uppercase tracking-widest relative z-10 beveled-button"
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
              DISCONNECT
            </button>
          </div>
        </div>

        {/* ROW 2: COMBAT HERO SELECTOR */}
        <div className="bg-surface-container-low beveled-border p-6 md:p-8 mb-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-6 pl-2">
            <Heading
              level={2}
            >
              ACTIVE BATTLE HERO
            </Heading>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Current Active Hero */}
            <div className="bg-[#0B1326] border-2 border-[#2d3449] p-6 flex flex-col items-center justify-center min-w-[200px] h-[200px] relative overflow-hidden shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6)]">
              {profile?.trainer_sprite ? (
                <motion.img
                  animate={{ y: [-5, 5, -5] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  src={profile.trainer_sprite}
                  alt="Battle Avatar"
                  className="w-32 h-32 object-contain image-rendering-pixelated drop-shadow-[0_0_15px_rgba(255,31,31,0.6)]"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-outline animate-pulse">
                  <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_cancel</span>
                </div>
              )}
              <span className="absolute bottom-4 text-[9px] font-headline font-black uppercase tracking-[0.3em] text-primary bg-black/80 border border-primary/50 px-4 py-1">
                ACTIVE HERO
              </span>
            </div>

            {/* Selection Grid */}
            <div className="flex-1 w-full">
              <Text
                variant="secondary"
                className="mb-4 block"
              >
                SELECT YOUR AVATAR
              </Text>
              <TrainerAvatarGrid profile={profile} loadingAvatar={loadingAvatar} handleSelectAvatar={handleSelectAvatar} />
            </div>
          </div>
        </div>

        {/* ROW 3: NAVIGATION ITEMS */}
        <DashboardNavigation />

        <TeamWidget />
      </motion.div>
    </Container>
  );
};

export default DashboardPage;
