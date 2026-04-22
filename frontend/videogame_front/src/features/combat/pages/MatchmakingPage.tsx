import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BackButton } from "../../../common/ui/BackButton";
import { Container } from "../../../common/ui/Container";
import { BASE_URL } from "../../../common/utils/url";
import apiClient from "../../../api/apiClient";

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
  const [, setMessage] = useState("");
  const [opponent, setOpponent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  
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
    const fetchData = async () => {
      try {
        const [profileRes, teamRes] = await Promise.all([
          apiClient.get("/api/profile/me/"),
          apiClient.get("/api/team/")
        ]);
        setProfile(profileRes.data);
        setTeam(teamRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    handleStartSearch();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "matchmaking.cancel" }));
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (status === "searching") {
      const interval = setInterval(() => {
        setProgress(p => (p >= 95 ? 95 : p + Math.random() * 5));
      }, 500);
      return () => clearInterval(interval);
    } else if (status === "found") {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [status]);

  return (
    <Container variant="page" className="flex-col min-h-screen relative overflow-hidden bg-background text-on-background selection:bg-primary selection:text-on-primary justify-center items-center py-10">
      <style>{`
        .scan-line {
            background: linear-gradient(to bottom, transparent, #ffb4a8 50%, transparent);
            height: 100px;
            width: 100%;
            position: absolute;
            top: -100px;
            animation: scan 3s linear infinite;
            opacity: 0.2;
        }
        @keyframes scan {
            0% { top: -100px; }
            100% { top: 100%; }
        }
        .pulse-ring {
            border: 2px solid #ffb4a8;
            border-radius: 50%;
            position: absolute;
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      
      <div className="absolute top-0 left-0 w-full p-6 z-50">
        <BackButton />
      </div>

      <div className="w-full max-w-6xl z-10 p-4 md:p-8 mt-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 font-headline text-white flex items-center justify-center gap-4 drop-shadow-[0_0_15px_rgba(255,180,168,0.5)]">
            {status === "searching" ? "SEARCHING" : status === "found" ? "OPPONENT" : "BATTLE"} <span className="text-primary italic">{status === "searching" ? "OPPONENT" : status === "found" ? "FOUND" : "RANKED"}</span>
          </h2>
          <div className="flex items-center justify-center space-x-4">
            <span className="h-px w-12 bg-outline-variant opacity-30"></span>
            <p className="text-on-surface-variant font-headline uppercase tracking-[0.2em] text-[10px] md:text-xs font-bold">GLOBAL BATTLE NETWORK • REGION: KANTO-G04</p>
            <span className="h-px w-12 bg-outline-variant opacity-30"></span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center relative">
          {/* Center VS Element */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:block">
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="pulse-ring"></div>
              <div className="pulse-ring" style={{ animationDelay: '0.5s' }}></div>
              <div className="pulse-ring" style={{ animationDelay: '1s' }}></div>
              <div className="bg-surface-container-highest border-4 border-primary p-4 rotate-45 flex items-center justify-center shadow-2xl z-10">
                <span className="font-black text-4xl text-primary -rotate-45 font-headline italic">VS</span>
              </div>
            </div>
          </div>

          {/* Your Profile Card */}
          <div className="relative group h-[400px]">
            <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border-l-8 border-primary relative overflow-hidden transition-all duration-500 hover:bg-surface-container-high h-full flex flex-col justify-between shadow-[12px_12px_0_rgba(0,0,0,0.3)]">
              <div className="scan-line"></div>
              <div className="flex justify-between items-start mb-4 z-10 relative">
                <div className="flex items-center gap-3">
                  <img src={profile?.trainer_sprite || "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/1.png"} alt="Trainer" className="w-12 h-12 rounded-sm bg-[#0B1326] object-contain border-2 border-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]" style={{ imageRendering: "pixelated" }} />
                  <div>
                    <span className="bg-primary/10 text-primary px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]">YOU</span>
                    <h3 className="text-xl md:text-2xl font-black uppercase font-headline mt-2 tracking-tight text-white">{profile?.username || "TRAINER"}</h3>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-primary font-black text-xl md:text-2xl font-headline">{profile?.elo || 1000}</div>
                  <div className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest">ELO RATING</div>
                </div>
              </div>
              
              <div className="flex-grow flex items-center justify-center relative z-10 py-4">
                {team.length > 0 ? (
                  <motion.img 
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    src={team[0].user_creature.sprite || team[0].user_creature.front_sprite} 
                    className="w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(255,31,31,0.4)] group-hover:scale-110 transition-transform duration-500" 
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <span className="material-symbols-outlined text-outline text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>catching_pokemon</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-auto px-6 pb-6 z-10 relative">
                <div className="bg-[#0B1326] border-2 border-[#2d3449] p-4 rounded-sm text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="text-[9px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">WINS</div>
                  <div className="text-xl font-black text-white font-headline">{profile?.wins || 0}</div>
                </div>
                <div className="bg-[#0B1326] border-2 border-[#2d3449] p-4 rounded-sm text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="text-[9px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">TIER</div>
                  <div className="text-xl font-black text-tertiary font-headline">S1</div>
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Card */}
          <div className="relative h-[400px]">
            <div className="bg-surface-container-low p-6 md:p-8 rounded-xl border-r-8 border-outline-variant/30 relative overflow-hidden transition-all duration-500 h-full flex flex-col justify-between backdrop-blur-xl shadow-[12px_12px_0_rgba(0,0,0,0.3)]">
              <div className="flex justify-between items-start mb-4 z-10 relative">
                <div>
                  <span className="bg-outline-variant/10 text-on-surface-variant px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3)]">OPPONENT</span>
                  {status === "found" && opponent ? (
                    <div className="flex items-center gap-3 mt-2">
                       <img src={opponent.trainer_sprite || "https://cdn.jsdelivr.net/npm/pokeapi-sprites/sprites/trainers/2.png"} alt="Opponent" className="w-12 h-12 rounded-sm bg-[#0B1326] object-contain border-2 border-error shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]" style={{ imageRendering: "pixelated" }} />
                       <h3 className="text-xl md:text-2xl font-black uppercase font-headline tracking-tight text-white">{opponent.username || `USER ${opponent.userId}`}</h3>
                    </div>
                  ) : (
                    <h3 className="text-2xl font-black uppercase font-headline mt-2 tracking-tight text-on-surface-variant/40 animate-pulse">SEARCHING...</h3>
                  )}
                </div>
                {status === "found" && opponent && (
                  <div className="text-right shrink-0">
                    <div className="text-error font-black text-xl md:text-2xl font-headline">{opponent.elo}</div>
                    <div className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest">ELO RATING</div>
                  </div>
                )}
              </div>
              
              <div className="flex-grow flex items-center justify-center relative z-10 py-4">
                {status === "found" && opponent ? (
                  opponent.first_pokemon_sprite ? (
                    <motion.img 
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      src={opponent.first_pokemon_sprite} 
                      className="w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-[0_0_30px_rgba(255,180,168,0.3)] hover:scale-110 transition-transform duration-500" 
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-error text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>catching_pokemon</span>
                  )
                ) : (
                  <>
                    <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center animate-spin" style={{ animationDuration: '8s' }}>
                      <span className="material-symbols-outlined text-primary/50 text-6xl animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 blur-2xl animate-pulse"></div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-4 z-10 relative px-6 pb-6 mt-auto">
                {status === "found" && opponent ? (
                  <div className="grid grid-cols-2 gap-6 mt-2">
                    <div className="bg-[#0B1326] border-2 border-error/30 p-4 rounded-sm text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                      <div className="text-[9px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">WINS</div>
                      <div className="text-xl font-black text-white font-headline">{opponent.wins || "?"}</div>
                    </div>
                    <div className="bg-[#0B1326] border-2 border-error/30 p-4 rounded-sm text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                      <div className="text-[9px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">STATUS</div>
                      <div className="text-xl font-black text-error font-headline animate-pulse">READY</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-10 bg-[#0B1326] border-2 border-[#2d3449] rounded-sm animate-pulse w-full"></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="h-16 bg-[#0B1326] border-2 border-[#2d3449] rounded-sm animate-pulse"></div>
                      <div className="h-16 bg-[#0B1326] border-2 border-[#2d3449] rounded-sm animate-pulse"></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Progress & Cancel */}
        <div className="mt-12 w-full max-w-2xl mx-auto bg-surface-container-low p-6 border-2 border-[#2d3449] shadow-[8px_8px_0_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center space-x-2">
              {status === "searching" ? (
                <span className="material-symbols-outlined text-primary text-sm animate-spin" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
              ) : status === "found" ? (
                 <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              ) : (
                 <span className="material-symbols-outlined text-outline text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
              )}
              <span className="font-headline uppercase text-[10px] md:text-xs font-bold tracking-widest text-on-surface-variant">
                {status === "searching" ? "Connecting to Battle Frontier" : status === "found" ? "Link Established. Transferring..." : "Idle"}
              </span>
            </div>
            <span className="text-primary font-black text-sm font-headline">{Math.floor(progress)}%</span>
          </div>
          
          <div className="h-4 w-full bg-[#0B1326] border-2 border-[#2d3449] rounded-sm overflow-hidden p-0.5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
            <div className="h-full bg-primary relative transition-all duration-300" style={{ width: `${progress}%` }}>
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]"></div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <button 
              onClick={handleCancelSearch}
              className="bg-[#0B1326] border-2 border-[#2d3449] hover:bg-error-container hover:text-on-error-container hover:border-error text-error px-8 py-3 rounded-sm font-headline uppercase tracking-widest text-xs font-bold transition-all hover:translate-y-[-2px] active:scale-95 shadow-[4px_4px_0_rgba(0,0,0,0.3)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

