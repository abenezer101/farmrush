export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  rank: number;
};

export type GameInitResponse = {
  username: string;
  currentScore: number;
  leaderboard: LeaderboardEntry[];
};

export type UpdateScoreRequest = {
  score: number;
};

export type UpdateScoreResponse = {
  success: boolean;
  newScore: number;
  leaderboard: LeaderboardEntry[];
};
