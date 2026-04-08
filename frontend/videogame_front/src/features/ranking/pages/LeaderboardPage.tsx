import React from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
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
        className="w-full px-4 md:px-12"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" />
              <Heading
                level={1}
                className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-4xl"
              >
                Leaderboard
              </Heading>
            </div>
            <Text variant="secondary" className="mt-2 text-neutral-500">
              Top players by ELO (highest first).
            </Text>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 shadow-2xl">
          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
          )}

          {error && !loading && (
            <p className="p-8 text-center text-sm font-bold text-red-400">
              {error}
            </p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="p-8 text-center text-sm text-neutral-500">
              No rankings yet.
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-neutral-900/80 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-right">ELO</th>
                    <th className="px-6 py-4 text-right">W</th>
                    <th className="px-6 py-4 text-right">L</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row, index) => {
                    const rank = index + 1;
                    const medal =
                      rank === 1
                        ? "text-amber-400"
                        : rank === 2
                          ? "text-neutral-300"
                          : rank === 3
                            ? "text-amber-700"
                            : "text-neutral-600";
                    return (
                      <tr
                        key={row.userId}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4 font-mono text-neutral-400">
                          <span className="inline-flex items-center gap-2">
                            {rank <= 3 && (
                              <Medal className={`h-4 w-4 ${medal}`} />
                            )}
                            {rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {row.username}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-cyan-400">
                          {row.elo}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400/90">
                          {row.wins}
                        </td>
                        <td className="px-6 py-4 text-right text-red-400/80">
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
