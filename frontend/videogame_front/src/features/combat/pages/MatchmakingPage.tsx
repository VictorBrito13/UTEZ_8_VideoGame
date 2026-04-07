import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Search, XCircle, ShieldAlert } from "lucide-react";
import { BackButton } from "../../../common/ui/BackButton";
import { BASE_URL } from "../../../common/utils/url";

export const MatchmakingPage = () => {
  const [status, setStatus] = useState<
    "idle" | "searching" | "found" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [opponent, setOpponent] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  const handleStartSearch = () => {
    setStatus("searching");
    setMessage("Searching for opponent...");

    // Connect to WebSocket
    const token = localStorage.getItem("access_token") || "";
    const wsUrl = BASE_URL.replace("http://", "ws://").replace(
      "https://",
      "wss://",
    );
    const ws = new WebSocket(`${wsUrl}/ws/matchmaking?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send join message
      ws.send(JSON.stringify({ type: "matchmaking.join" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Matchmaking event:", data);

        switch (data.type) {
          case "matchmaking.queued":
            setMessage(`In queue. Your ELO: ${data.elo}. Broadening search...`);
            break;
          case "matchmaking.found":
            setStatus("found");
            setOpponent(data.opponent);
            setMessage("Opponent found! Connecting to battle arena...");

            // Navigate to battle arena after a short delay
            setTimeout(() => {
              navigate(`/battle/${data.battleId}`);
              ws.close();
            }, 3000);
            break;
          case "error":
          case "rate_limited":
            setStatus("error");
            setMessage(data.message || "An error occurred");
            ws.close();
            break;
        }
      } catch (err) {
        console.error("Error parsing matchmaking message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("Matchmaking WS Error:", error);
      setStatus("error");
      setMessage("Connection error. Ensure the server is running.");
      ws.close();
    };

    ws.onclose = () => {
      if (status === "searching") {
        setStatus("idle");
        setMessage("Search cancelled.");
      }
    };
  };

  const handleCancelSearch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "matchmaking.cancel" }));
      wsRef.current.close();
    }
    setStatus("idle");
    setMessage("Search cancelled.");
    setOpponent(null);
  };

  useEffect(() => {
    // Auto-start search on mount
    handleStartSearch();

    // Cleanup on unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "matchmaking.cancel" }));
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-6 z-10">
        <BackButton />
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-lg mx-auto text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 uppercase">
            Arena_Ranked
          </h1>
          <p className="text-neutral-500 font-bold tracking-widest mt-2 uppercase text-sm">
            Global Matchmaking System
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 rounded-full border border-white/10 bg-neutral-900/50 flex items-center justify-center">
                <Swords size={48} className="text-neutral-500 animate-pulse" />
              </div>
              <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">
                Initializing Neural Link...
              </p>
            </div>
          )}

          {status === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-t-2 border-red-500"
                />
                <Search size={32} className="text-red-500 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-bold">{message}</h3>
                <p className="text-neutral-500 text-sm mt-2">
                  Connecting to players with similar skill levels...
                </p>
              </div>

              <button
                onClick={handleCancelSearch}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-bold uppercase tracking-widest text-sm mt-4"
              >
                <XCircle size={18} /> Cancel Search
              </button>
            </motion.div>
          )}

          {status === "found" && opponent && (
            <motion.div
              key="found"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="flex items-center gap-12">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center mb-4">
                    <span className="text-2xl font-black">YOU</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Swords size={32} className="text-red-500" />
                  </motion.div>
                  <span className="text-xs font-black tracking-widest mt-2 uppercase text-red-500">
                    VS
                  </span>
                </div>

                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border border-red-500/50 bg-red-900/20 flex items-center justify-center mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                    <span className="text-sm font-black uppercase px-2 z-10 break-all">
                      {opponent.username || `User ${opponent.userId}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-neutral-500">
                    ELO: {opponent.elo}
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center bg-emerald-500/10 border border-emerald-500/30 px-8 py-4 rounded-2xl w-full">
                <p className="font-black text-emerald-400 uppercase tracking-widest">
                  {message}
                </p>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/50 flex items-center justify-center text-red-500">
                <ShieldAlert size={40} />
              </div>
              <p className="font-bold text-red-400">{message}</p>
              <button
                onClick={() => setStatus("idle")}
                className="w-full py-4 rounded-2xl bg-neutral-900 border border-white/10 text-white font-black hover:bg-neutral-800 transition-colors uppercase tracking-widest mt-4"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
