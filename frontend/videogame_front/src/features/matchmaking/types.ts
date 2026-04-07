export type MatchmakingPhase =
  | "connecting"
  | "searching"
  | "matched"
  | "cancelled"
  | "error";

export type MatchmakingOpponent = {
  userId: number;
  elo: number;
};

export type MatchmakingFoundPayload = {
  battleId: number;
  opponent: MatchmakingOpponent;
};

export type MatchmakingServerMessage =
  | { type: "matchmaking.queued"; elo?: number }
  | {
      type: "matchmaking.found";
      battleId: number;
      opponent: MatchmakingOpponent;
    }
  | { type: "matchmaking.cancelled" }
  | { type: "rate_limited"; message?: string }
  | { type: "error"; message?: string };
