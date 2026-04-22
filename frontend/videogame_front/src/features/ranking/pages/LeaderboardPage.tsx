import React from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { BackButton } from "../../../common/ui/BackButton";
import { useLeaderboard } from "../hooks/useLeaderboard";

const LeaderboardPage: React.FC = () => {
  const token = localStorage.getItem("access_token");
  const { entries, loading, error } = useLeaderboard(100);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container variant="page" className="flex-col min-h-screen pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mx-auto px-4 relative z-10"
      >
        <div className="mb-8 flex flex-col md:flex-row items-center gap-6">
          <BackButton />
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="material-symbols-outlined text-tertiary text-4xl shadow-[2px_2px_0_rgba(0,0,0,0.5)]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              <Heading level={1} className="terminal-glow text-tertiary">
                LEADERBOARD
              </Heading>
            </div>
            <Text variant="secondary">
              TOP PLAYERS BY ELO (HIGHEST FIRST).
            </Text>
          </div>
        </div>

        <div className="bg-surface-container-low beveled-border shadow-[12px_12px_0_rgba(0,0,0,0.5)] overflow-hidden">
          {loading && (
            <div className="flex justify-center py-20">
              <span className="material-symbols-outlined animate-spin text-tertiary text-6xl">autorenew</span>
            </div>
          )}

          {error && !loading && (
            <p className="p-8 text-center font-headline font-bold uppercase tracking-widest text-error">
              {error}
            </p>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-outline text-6xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>search_off</span>
              <p className="text-outline font-headline font-bold uppercase tracking-widest text-sm">
                NO RANKINGS YET.
              </p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b-2 border-[#2d3449] bg-[#0B1326] text-[10px] font-headline font-black uppercase tracking-widest text-outline shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                    <th className="px-6 py-4 w-16">#</th>
                    <th className="px-6 py-4">PLAYER</th>
                    <th className="px-6 py-4 text-right text-tertiary">ELO</th>
                    <th className="px-6 py-4 text-right text-primary">W</th>
                    <th className="px-6 py-4 text-right text-error">L</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row, index) => {
                    const rank = index + 1;
                    
                    let medalClass = "text-outline";
                    let medalIcon = "";
                    if (rank === 1) { medalClass = "text-tertiary"; medalIcon = "military_tech"; }
                    else if (rank === 2) { medalClass = "text-slate-300"; medalIcon = "military_tech"; }
                    else if (rank === 3) { medalClass = "text-amber-700"; medalIcon = "military_tech"; }

                    let avatarContent = <div className="text-on-surface font-headline font-black text-xs uppercase">{row.username.charAt(0)}</div>;
                    if (row.fotoBase64) {
                      avatarContent = <img src={row.fotoBase64} alt={row.username} className="h-full w-full object-cover" />;
                    } else if (row.trainerSprite) {
                      avatarContent = <img src={row.trainerSprite} alt={row.username} className="h-full w-full object-contain image-rendering-pixelated p-1" />;
                    }

                    return (
                      <tr
                        key={row.userId}
                        className="border-b-2 border-[#2d3449] transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 font-headline font-black text-outline">
                          <span className="inline-flex items-center gap-2">
                            {rank <= 3 && (
                              <span className={`material-symbols-outlined ${medalClass} drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]`} style={{ fontVariationSettings: "'FILL' 1" }}>{medalIcon}</span>
                            )}
                            {rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-headline font-bold text-white uppercase tracking-widest text-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 overflow-hidden border-2 border-[#2d3449] bg-[#0B1326] flex shrink-0 items-center justify-center rounded-sm shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                              {avatarContent}
                            </div>
                            {row.username}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-headline font-black text-tertiary text-lg terminal-glow">
                          {row.elo}
                        </td>
                        <td className="px-6 py-4 text-right font-headline font-black text-primary">
                          {row.wins}
                        </td>
                        <td className="px-6 py-4 text-right font-headline font-black text-error">
                          {row.losses}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </Container>
  );
};

export default LeaderboardPage;
