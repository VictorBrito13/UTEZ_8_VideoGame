export type LeaderboardEntry = {
  userId: number;
  username: string;
  elo: number;
  wins: number;
  losses: number;
};

export type LeaderboardResponse = {
  results: LeaderboardEntry[];
};
