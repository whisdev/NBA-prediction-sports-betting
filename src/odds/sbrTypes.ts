export type OddsTeamEntry = {
  money_line_odds?: number | string | null;
};

export type OddsGameEntry = {
  under_over_odds?: number | string | null;
  [key: string]: OddsTeamEntry | number | string | null | undefined;
};

export type OddsDict = Record<string, OddsGameEntry>;

export type SbrGame = {
  home_team: string;
  away_team: string;
  home_ml: Record<string, number | undefined>;
  away_ml: Record<string, number | undefined>;
  total: Record<string, number | string | undefined>;
};
