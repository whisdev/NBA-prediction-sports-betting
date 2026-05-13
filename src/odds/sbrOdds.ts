import type { OddsDict } from "./sbrTypes.js";
import { fetchSbrNbaGames, pickSportsbookKey } from "./sbrScraper.js";
import type { SbrGame } from "./sbrTypes.js";

function buildDict(games: SbrGame[], sportsbook: string): OddsDict {
  const dict: OddsDict = {};
  for (const g of games) {
    const hk = pickSportsbookKey(g.home_ml, sportsbook);
    const ak = pickSportsbookKey(g.away_ml, sportsbook);
    const tk = pickSportsbookKey(g.total, sportsbook);
    const key = `${g.home_team}:${g.away_team}`;
    dict[key] = {
      under_over_odds: tk ? g.total[tk] : undefined,
      [g.home_team]: { money_line_odds: hk ? g.home_ml[hk] : undefined },
      [g.away_team]: { money_line_odds: ak ? g.away_ml[ak] : undefined },
    };
  }
  return dict;
}

export async function getOddsFromSbr(sportsbook: string): Promise<OddsDict> {
  const games = await fetchSbrNbaGames();
  return buildDict(games, sportsbook);
}
