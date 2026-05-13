import { teamIndexCurrent } from "../dictionaries/teamIndexCurrent.js";
import type { OddsDict } from "../odds/sbrTypes.js";

export type GamePair = [string, string];

export function createTodaysGamesFromOdds(odds: OddsDict): GamePair[] {
  const games: GamePair[] = [];
  for (const key of Object.keys(odds)) {
    const [home, away] = key.split(":");
    if (!home || !away) continue;
    if (!(home in teamIndexCurrent) || !(away in teamIndexCurrent)) continue;
    games.push([home, away]);
  }
  return games;
}

export function createTodaysGamesMobile(gs: unknown[] | undefined): GamePair[] {
  if (!gs) return [];
  const games: GamePair[] = [];
  for (const item of gs) {
    const g = item as { h?: { tc?: string; tn?: string }; v?: { tc?: string; tn?: string } };
    const h = g.h;
    const v = g.v;
    if (!h?.tc || !h?.tn || !v?.tc || !v?.tn) continue;
    games.push([`${h.tc} ${h.tn}`, `${v.tc} ${v.tn}`]);
  }
  return games;
}
