export type LeaderboardEntry = {
  userId: number;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  fotoBase64?: string | null;
  trainerSprite?: string | null;
};

export type LeaderboardResponse = {
  results: LeaderboardEntry[];
};
