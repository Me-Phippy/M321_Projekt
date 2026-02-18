// Team API Typen

export interface TeamInfo {
  id: number;
  name: string;
  color: {
    red: number;
    green: number;
    blue: number;
  };
}

export interface TeamGameInfo {
  id: number;
  score: number;
  colorBudget: number;
}

export interface TeamFullInfo extends TeamInfo {
  score?: number;
  colorBudget?: number;
}
