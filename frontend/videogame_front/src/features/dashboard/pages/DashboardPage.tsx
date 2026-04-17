import React, { useState, useEffect } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { motion } from "framer-motion";
import {
  BookOpen,
  Package,
  LogOut,
  Swords,
  User as UserIcon,
  Trophy,
  Camera,
} from "lucide-react";
import { TeamWidget } from "../components/TeamWidget";
import apiClient from "../../../api/apiClient";

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

const navItems = [
  {
    title: "Leaderboard",
    desc: "Global ELO rankings",
    icon: <Trophy className="text-amber-400" />,
    path: "/leaderboard",
    color: "from-amber-500/20 to-yellow-500/20",
  },
  {
    title: "Pokedex",
    desc: "Species archive and stats",
    icon: <BookOpen className="text-blue-400" />,
    path: "/pokedex",
    color: "from-blue-500/20 to-indigo-500/20",
  },
  {
    title: "Inventory",
    desc: "Heal and buff items",
    icon: <Package className="text-amber-400" />,
    path: "/inventory",
    color: "from-amber-500/20 to-orange-500/20",
  },
];

function TrainerAvatarGrid({ profile, loadingAvatar, handleSelectAvatar }: Readonly<{ profile: any, loadingAvatar: boolean, handleSelectAvatar: (url: string) => void }>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
            className={`relative aspect-square rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-neutral-950 ${
              isSelected
                ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                : "border-white/5 hover:border-white/20"
            }`}
          >
            <img
              src={avatar.url}
              alt={avatar.name}
              className={`w-28 h-28 object-contain render-pixelated mb-2 ${isSelected ? "drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" : "opacity-30 hover:opacity-100 transition-opacity"}`}
            />
            <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">
              {avatar.name}
            </span>

            {loadingAvatar && isSelected && (
              <div className="absolute flex items-center justify-center inset-0 bg-black/80 backdrop-blur-sm z-10">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
              className={`h-full p-8 bg-neutral-950 border border-white/5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden transition-all group-hover:border-white/20 shadow-xl`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`}
              ></div>
              <div className="relative z-10 flex items-center gap-6">
                <div className="bg-neutral-900 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shrink-0 shadow-lg">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-1 tracking-tighter uppercase italic">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest text-[9px]">
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
        className="w-full px-4 md:px-12"
      >
        {profileError && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {profileError}
          </div>
        )}
        {avatarError && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {avatarError}
          </div>
        )}
        {/* ROW 1: PROFILE HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-950 border border-white/10 rounded-[2rem] p-6 mb-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            {/* Profile Photo */}
            <div className="relative shrink-0">
              <button 
                type="button"
                className="relative group cursor-pointer bg-transparent border-none p-0 appearance-none text-left block"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-neutral-900 border-2 border-white/10 rounded-full flex items-center justify-center overflow-hidden relative shadow-lg group-hover:border-white/30 transition-all">
                  {profile?.foto_base64 ? (
                    <img
                      src={profile.foto_base64}
                      alt="Profile"
                      className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
                    />
                  ) : (
                    <UserIcon size={32} className="text-neutral-700 group-hover:opacity-50 transition-opacity" />
                  )}
                </div>

                {/* Camera Icon Overlay */}
                <div className="absolute bottom-0 right-0 bg-neutral-800 border border-white/20 p-1.5 rounded-full shadow-lg group-hover:scale-110 group-hover:bg-cyan-500 transition-all z-20">
                  <Camera size={14} className="text-white" />
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
              <Text
                variant="secondary"
                className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-1 block"
              >
                Core_Identity
              </Text>
              <Heading
                level={2}
                className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2"
              >
                {profile?.username || "Pilot_Unknown"}
              </Heading>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <span className="flex items-center gap-1.5 text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                  <Swords size={12} /> Elo: {profile?.elo || 1000} Pts
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                  <Trophy size={12} /> Wins: {profile?.wins || 0}
                </span>
              </div>
            </div>
          </div>

          {/* BIG BATTLE BUTTON */}
          <div className="flex-1 flex justify-center items-center mt-6 md:mt-0 relative z-10 w-full md:w-auto">
            <button
              type="button"
              onClick={() => navigate("/matchmaking")}
              className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl border-b-4 border-red-800 hover:translate-y-[2px] hover:border-b-2 active:border-b-0 hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all font-black uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 group"
            >
              <Swords
                size={20}
                className="group-hover:rotate-12 transition-transform"
              />
              <span className="text-base text-shadow-sm">Start battle</span>
            </button>
          </div>

          {/* Disconnect */}
          <button
            onClick={handleLogout}
            className="mt-6 md:mt-0 w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-black transition-all text-red-400 font-black text-xs uppercase tracking-widest relative z-10"
          >
            <LogOut size={16} /> Disconnect
          </button>
        </div>

        {/* ROW 2: COMBAT HERO SELECTOR */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4 pl-2">
            <Swords size={20} className="text-cyan-400" />
            <Heading
              level={3}
              className="text-2xl font-black uppercase italic tracking-tighter text-white"
            >
              Battle_Identity
            </Heading>
          </div>

          <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-6 md:p-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Current Active Hero */}
              <div className="bg-neutral-950 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-center min-w-[220px] h-[220px] relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-[80px] -z-10" />
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
                    className="w-32 h-32 object-contain render-pixelated drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-neutral-700 animate-pulse">
                    <UserIcon size={48} />
                  </div>
                )}
                <span className="absolute bottom-4 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 bg-black/60 px-4 py-1 rounded-full backdrop-blur-md">
                  Active_Hero
                </span>
              </div>

              {/* Selection Grid */}
              <div className="flex-1 w-full">
                <Text
                  variant="secondary"
                  className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4 block"
                >
                  SELECT YOUR BIOMETRIC SYNCHRONIZATION
                </Text>
                <TrainerAvatarGrid profile={profile} loadingAvatar={loadingAvatar} handleSelectAvatar={handleSelectAvatar} />
              </div>
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
