import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Radar, ShieldOff, Swords, UserSearch } from "lucide-react";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { BackButton } from "../../../common/ui/BackButton";
import { useMatchmaking } from "../hooks/useMatchmaking";
import { useEffect } from "react";

const MatchmakingSearchPage = () => {
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();
  const { state, cancelSearch } = useMatchmaking();

  useEffect(() => {
    if (state.phase === "matched" && state.match) {
      const timer = setTimeout(() => {
        navigate(`/battle/${state.match.battleId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.match, navigate]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isSearching =
    state.phase === "connecting" || state.phase === "searching";

  return (
    <Container
      variant="page"
      className="flex-col min-h-screen bg-black pt-24 pb-16 px-4"
    >
      <BackButton />
      <div className="w-full max-w-lg mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-950 border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />
          <div className="relative z-10">
            <Text
              variant="secondary"
              className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500 mb-2 block"
            >
              Matchmaking
            </Text>
            <Heading
              level={2}
              className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2"
            >
              {state.phase === "matched" ? "Opponent found" : "Searching duel"}
            </Heading>
            <Text variant="secondary" className="text-sm text-neutral-500 mb-8">
              {state.phase === "matched"
                ? "The system paired you with another trainer."
                : "The system is looking for a player close to your skill."}
            </Text>

            {isSearching && (
              <div className="flex flex-col items-center py-10">
                <div className="relative w-36 h-36 flex items-center justify-center mb-8">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute inset-4 rounded-full border border-emerald-400/20"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3,
                    }}
                  />
                  <div className="relative bg-neutral-900 rounded-full p-6 border border-white/10 shadow-xl">
                    <UserSearch className="w-12 h-12 text-cyan-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-widest mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning queue
                </div>
                <Text
                  variant="secondary"
                  className="text-center text-neutral-400 text-sm max-w-xs"
                >
                  Matching by Elo rating. Stay on this screen; leaving cancels
                  the search.
                </Text>
                {state.elo != null && (
                  <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-amber-400/90 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                    Your Elo: {state.elo}
                  </span>
                )}
              </div>
            )}

            {state.phase === "matched" && state.match && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6"
              >
                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                  <Swords className="w-6 h-6" />
                  <span className="font-black uppercase tracking-widest text-xs">
                    Battle #{state.match.battleId}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-neutral-300">
                  <p>
                    <span className="text-neutral-500">Opponent id:</span>{" "}
                    {state.match.opponent.userId}
                  </p>
                  <p>
                    <span className="text-neutral-500">Opponent Elo:</span>{" "}
                    {state.match.opponent.elo}
                  </p>
                </div>
              </motion.div>
            )}

            {state.phase === "cancelled" && (
              <div className="flex flex-col items-center py-8 text-neutral-400">
                <ShieldOff className="w-10 h-10 mb-3 text-neutral-600" />
                <p className="text-sm font-medium text-center">
                  Search cancelled. You can start again from the dashboard.
                </p>
              </div>
            )}

            {state.phase === "error" && state.errorMessage && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 mb-6">
                <p className="text-red-400 text-sm text-center font-medium">
                  {state.errorMessage}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {isSearching && (
                <button
                  type="button"
                  onClick={cancelSearch}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel search
                </button>
              )}
              {(state.phase === "matched" ||
                state.phase === "cancelled" ||
                state.phase === "error") && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Radar className="w-4 h-4" />
                  Back to dashboard
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </Container>
  );
};

export default MatchmakingSearchPage;
