import { useCallback, useEffect, useRef, useState } from "react";
import { getMatchmakingWebSocketUrl } from "../../../api/apiClient";
import type {
  MatchmakingFoundPayload,
  MatchmakingPhase,
  MatchmakingServerMessage,
} from "../types";

export type MatchmakingState = {
  phase: MatchmakingPhase;
  elo: number | null;
  match: MatchmakingFoundPayload | null;
  errorMessage: string | null;
};

const initialState: MatchmakingState = {
  phase: "connecting",
  elo: null,
  match: null,
  errorMessage: null,
};

export function useMatchmaking() {
  const [state, setState] = useState<MatchmakingState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountingRef = useRef(false);

  const sendJoin = useCallback((ws: WebSocket) => {
    ws.send(JSON.stringify({ type: "matchmaking.join" }));
  }, []);

  const cancelSearch = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "matchmaking.cancel" }));
    }
  }, []);

  useEffect(() => {
    unmountingRef.current = false;
    const url = getMatchmakingWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, phase: "connecting", errorMessage: null }));
      sendJoin(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as MatchmakingServerMessage;
        if (data.type === "matchmaking.queued") {
          setState({
            phase: "searching",
            elo: data.elo ?? null,
            match: null,
            errorMessage: null,
          });
          return;
        }
        if (data.type === "matchmaking.found") {
          setState({
            phase: "matched",
            elo: null,
            match: {
              battleId: data.battleId,
              opponent: data.opponent,
            },
            errorMessage: null,
          });
          return;
        }
        if (data.type === "matchmaking.cancelled") {
          setState((s) => ({
            ...s,
            phase: "cancelled",
            errorMessage: null,
          }));
          return;
        }
        if (data.type === "rate_limited") {
          setState({
            phase: "error",
            elo: null,
            match: null,
            errorMessage: data.message || "Too many requests. Try again.",
          });
          return;
        }
        if (data.type === "error") {
          setState({
            phase: "error",
            elo: null,
            match: null,
            errorMessage: data.message || "Matchmaking error.",
          });
        }
      } catch {
        setState({
          phase: "error",
          elo: null,
          match: null,
          errorMessage: "Invalid server message.",
        });
      }
    };

    ws.onerror = () => {
      setState({
        phase: "error",
        elo: null,
        match: null,
        errorMessage: "Connection error.",
      });
    };

    ws.onclose = (ev) => {
      wsRef.current = null;
      if (unmountingRef.current) {
        return;
      }
      if (ev.code === 4401) {
        setState({
          phase: "error",
          elo: null,
          match: null,
          errorMessage: "Session expired. Please sign in again.",
        });
        return;
      }
      setState((prev) => {
        if (prev.phase === "matched" || prev.phase === "cancelled") {
          return prev;
        }
        if (prev.phase === "error" && prev.errorMessage) {
          return prev;
        }
        return {
          phase: "error",
          elo: null,
          match: null,
          errorMessage: "Disconnected from matchmaking.",
        };
      });
    };

    return () => {
      unmountingRef.current = true;
      wsRef.current = null;
      ws.close();
    };
  }, [sendJoin]);

  return { state, cancelSearch };
}
