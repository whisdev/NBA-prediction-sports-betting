export type DataFrame = {
  headers: string[];
  rows: Record<string, string | number>[];
};

export type ScheduleRow = {
  date: Date;
  homeTeam: string;
  awayTeam: string;
};
