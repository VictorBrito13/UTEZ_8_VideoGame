import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BackButton } from "../../../common/ui/BackButton";
import { Container } from "../../../common/ui/Container";
import { BASE_URL } from "../../../common/utils/url";

function processMatchmakingMessage(
  event: MessageEvent,
  ws: WebSocket,
  searchingRef: { current: boolean },
  setStatus: React.Dispatch<React.SetStateAction<"idle" | "searching" | "found">>,
  setMessage: React.Dispatch<React.SetStateAction<string>>,
  setOpponent: React.Dispatch<React.SetStateAction<any>>,
  navigate: (path: string) => void,
) {
  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "matchmaking.queued":
        setMessage(`IN QUEUE. YOUR ELO: ${data.elo}. BROADENING SEARCH...`);
        break;
      case "matchmaking.cancelled":
        searchingRef.current = false;
        setStatus("idle");
        setMessage("SEARCH CANCELLED.");
        navigate("/");
        break;
      case "matchmaking.found":
        searchingRef.current = false;
        setStatus("found");
        setOpponent(data.opponent);
        setMessage("OPPONENT FOUND! CONNECTING TO BATTLE ARENA...");
        setTimeout(() => {
          navigate(`/battle/${data.battleId}`);
          ws.close();
        }, 3000);
        break;
      case "error":
      case "rate_limited": {
        searchingRef.current = false;
        const errText =
          typeof data.message === "string" && data.message.length > 0
            ? data.message
            : "AN ERROR OCCURRED";
        toast.error(errText);
        setStatus("idle");
        setMessage("");
        ws.close();
        navigate("/");
        break;
      }
    }
  } catch {
    // Ignore invalid JSON
  }
}

export const MatchmakingPage = () => {
  const [status, setStatus] = useState<"idle" | "searching" | "found">("idle");
  const [message, setMessage] = useState("");
  const [opponent, setOpponent] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const searchingRef = useRef(false);
  const navigate = useNavigate();

  const handleStartSearch = () => {
    setStatus("searching");
    searchingRef.current = true;
    setMessage("SEARCHING FOR OPPONENT...");

    const token = localStorage.getItem("access_token") || "";
    const wsUrl = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(`${wsUrl}/ws/matchmaking?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "matchmaking.join" }));
    };

    ws.onmessage = (evt) => {
      processMatchmakingMessage(evt, ws, searchingRef, setStatus, setMessage, setOpponent, navigate);
    };

    ws.onerror = () => {
      searchingRef.current = false;
      toast.error("Connection error. Ensure the server is running.");
      setStatus("idle");
      setMessage("");
      ws.close();
      navigate("/");
    };

    ws.onclose = () => {
      if (searchingRef.current) {
        searchingRef.current = false;
        setStatus("idle");
        setMessage("SEARCH CANCELLED.");
        navigate("/");
      }
    };
  };

  const handleCancelSearch = () => {
    searchingRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "matchmaking.cancel" }));
      wsRef.current.close();
    }
    setStatus("idle");
    setMessage("SEARCH CANCELLED.");
    setOpponent(null);
    navigate("/");
  };

  useEffect(() => {
    // Auto-start search on mount
    handleStartSearch();

    // Cleanup on unmount
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "matchmaking.cancel" }));
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Container variant="page" className="flex-col min-h-screen justify-center items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-6 z-10">
        <BackButton />
      </div>

      <div className="z-10 w-full max-w-lg mx-auto text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-6xl font-headline font-black tracking-widest text-primary uppercase terminal-glow">
            ARENA RANKED
          </h1>
          <p className="text-outline font-headline font-bold tracking-widest mt-2 uppercase text-sm">
            GLOBAL MATCHMAKING SYSTEM
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <div className="flex flex-col items-center gap-8 bg-surface-container-low beveled-border p-8 shadow-[12px_12px_0_rgba(0,0,0,0.5)]">
              <div className="w-32 h-32 rounded-sm border-4 border-[#2d3449] bg-[#0B1326] flex items-center justify-center shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                <span className="material-symbols-outlined text-outline text-6xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
              </div>
              <p className="text-outline font-headline font-black uppercase tracking-widest text-xs">
                INITIALIZING NEURAL LINK...
              </p>
            </div>
          )}

          {status === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 bg-surface-container-low beveled-border p-8 shadow-[12px_12px_0_rgba(0,0,0,0.5)]"
            >
              <div className="relative w-32 h-32 flex items-center justify-center bg-[#0B1326] border-4 border-[#2d3449] rounded-sm shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-primary m-4"
                />
                <span className="material-symbols-outlined text-primary text-4xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
              </div>

              <div>
                <h3 className="text-xl font-headline font-black tracking-widest uppercase text-white terminal-glow">{message}</h3>
                <p className="text-outline font-headline font-bold uppercase tracking-widest text-xs mt-2">
                  CONNECTING TO PLAYERS WITH SIMILAR SKILL LEVELS...
                </p>
              </div>

              <button
                onClick={handleCancelSearch}
                className="flex items-center gap-2 px-8 py-4 beveled-button bg-[#0B1326] border-2 border-[#2d3449] hover:bg-error-container hover:text-on-error-container transition-colors font-headline font-black uppercase tracking-widest text-sm mt-4 text-error"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span> CANCEL SEARCH
              </button>
            </motion.div>
          )}

          {status === "found" && opponent && (
            <motion.div
              key="found"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 bg-surface-container-low beveled-border p-8 shadow-[12px_12px_0_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-8 md:gap-12 w-full justify-center">
                <div className="text-center flex-1">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-sm border-4 border-secondary bg-secondary-container flex items-center justify-center mb-4 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                    <span className="text-xl md:text-2xl font-headline font-black text-on-secondary-container">YOU</span>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
                  </motion.div>
                  <span className="text-xs font-headline font-black tracking-widest mt-2 uppercase text-primary">
                    VS
                  </span>
                </div>

                <div className="text-center flex-1">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-sm border-4 border-error bg-error-container flex items-center justify-center mb-4 relative overflow-hidden shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-error/20 animate-pulse" />
                    <span className="text-xs md:text-sm font-headline font-black uppercase px-2 z-10 break-all text-on-error-container">
                      {opponent.username || `USER ${opponent.userId}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">
                    ELO: {opponent.elo}
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center bg-tertiary-container border-2 border-tertiary px-8 py-4 w-full shadow-[inset_4px_4px_0_rgba(0,0,0,0.2)]">
                <p className="font-headline font-black text-on-tertiary-container uppercase tracking-widest text-sm">
                  {message}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Container>
  );
};
