import { DROP_STAT_COLS } from "../constants.js";
import { teamIndexCurrent } from "../dictionaries/teamIndexCurrent.js";
import type { OddsDict, OddsTeamEntry } from "../odds/sbrTypes.js";
import { daysRestBefore } from "./schedule.js";
import type { DataFrame, ScheduleRow } from "./types.js";

export type BuiltGamesData = {
  games: [string, string][];
  mlMatrix: Float32Array[];
  uoLines: string[];
  homeOdds: (number | string | null)[];
  awayOdds: (number | string | null)[];
};

function num(v: string | number | undefined): number {
  if (v === undefined) return 0;
  if (typeof v === "number") return v;
  const x = Number.parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
}

export function buildGamesBatch(
  games: [string, string][],
  df: DataFrame,
  odds: OddsDict | null,
  schedule: ScheduleRow[],
  today: Date,
): BuiltGamesData {
  const mlMatrix: Float32Array[] = [];
  const uoLines: string[] = [];
  const homeOdds: (number | string | null)[] = [];
  const awayOdds: (number | string | null)[] = [];
  const usedGames: [string, string][] = [];

  for (const [homeTeam, awayTeam] of games) {
    const hi = teamIndexCurrent[homeTeam];
    const ai = teamIndexCurrent[awayTeam];
    if (hi === undefined || ai === undefined) continue;

    if (odds) {
      const key = `${homeTeam}:${awayTeam}`;
      const g = odds[key];
      if (!g) continue;
      uoLines.push(String(g.under_over_odds ?? ""));
      const ho = g[homeTeam] as OddsTeamEntry | undefined;
      const ao = g[awayTeam] as OddsTeamEntry | undefined;
      homeOdds.push(ho?.money_line_odds ?? null);
      awayOdds.push(ao?.money_line_odds ?? null);
    } else {
      throw new Error("Interactive odds are not implemented; pass --odds=<sportsbook>.");
    }

    const homeRow = rowsSafe(df.rows, hi);
    const awayRow = rowsSafe(df.rows, ai);
    const feats: number[] = [];
    for (const h of df.headers) {
      if (DROP_STAT_COLS.has(h)) continue;
      feats.push(num(homeRow[h]));
    }
    for (const h of df.headers) {
      if (DROP_STAT_COLS.has(h)) continue;
      feats.push(num(awayRow[h]));
    }
    feats.push(daysRestBefore(schedule, homeTeam, today));
    feats.push(daysRestBefore(schedule, awayTeam, today));

    if (feats.length !== 106) {
      throw new Error(`Expected 106 ML features, got ${feats.length}`);
    }
    mlMatrix.push(new Float32Array(feats));
    usedGames.push([homeTeam, awayTeam]);
  }

  return { games: usedGames, mlMatrix, uoLines, homeOdds, awayOdds };
}

function rowsSafe(rows: Record<string, string | number>[], i: number) {
  const r = rows[i];
  if (!r) throw new Error(`Missing team row index ${i}`);
  return r;
}

export function buildUoMatrix(mlMatrix: Float32Array[], uoLines: string[]): Float32Array[] {
  if (mlMatrix.length !== uoLines.length) {
    throw new Error("UO lines count must match games");
  }
  const out: Float32Array[] = [];
  for (let i = 0; i < mlMatrix.length; i++) {
    const ou = Number.parseFloat(uoLines[i] ?? "");
    const line = Number.isFinite(ou) ? ou : 0;
    const row = new Float32Array(107);
    row.set(mlMatrix[i]!);
    row[106] = line;
    out.push(row);
  }
  return out;
}
