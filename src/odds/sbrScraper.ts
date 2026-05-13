import { fetch } from "undici";
import type { SbrGame } from "./sbrTypes.js";

const headers: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Content-Type": "application/json",
};

const sportSlug = "nba-basketball";

function extractBuildId(html: string): string | undefined {
  const m = html.match(/__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m?.[1]) return undefined;
  try {
    const j = JSON.parse(m[1]) as { buildId?: string };
    return j.buildId;
  } catch {
    return undefined;
  }
}

/** Port of `sbrscrape.Scoreboard.scrape_games` (SportsbookReview path only). */
export async function fetchSbrNbaGames(date?: string): Promise<SbrGame[]> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const spreadUrl = `https://www.sportsbookreview.com/betting-odds/${sportSlug}/?date=${d}`;
  const r = await fetch(spreadUrl, { headers });
  const html = await r.text();
  const buildId = extractBuildId(html);
  if (!buildId) return [];

  const spreadsUrl = `https://www.sportsbookreview.com/_next/data/${buildId}/betting-odds/${sportSlug}.json?league=${sportSlug}&date=${d}`;
  const spreadsJson = (await (await fetch(spreadsUrl, { headers })).json()) as {
    pageProps?: { oddsTables?: { oddsTableModel?: { gameRows?: unknown[] } }[] };
  };
  const spreadsList =
    spreadsJson.pageProps?.oddsTables?.[0]?.oddsTableModel?.gameRows ?? [];
  const spreads: Record<string, Record<string, unknown>> = {};
  for (const row of spreadsList) {
    const gv = (row as { gameView?: { gameId?: string } }).gameView;
    const id = gv?.gameId;
    if (id) spreads[id] = row as Record<string, unknown>;
  }

  let moneylines: Record<string, Record<string, unknown>> = {};
  try {
    const moneylineUrl = `https://www.sportsbookreview.com/_next/data/${buildId}/betting-odds/${sportSlug}/money-line/full-game.json?league=${sportSlug}&oddsType=money-line&oddsScope=full-game&date=${d}`;
    const moneylineJson = (await (await fetch(moneylineUrl, { headers })).json()) as {
      pageProps?: { oddsTables?: { oddsTableModel?: { gameRows?: unknown[] } }[] };
    };
    const moneylinesList =
      moneylineJson.pageProps?.oddsTables?.[0]?.oddsTableModel?.gameRows ?? [];
    moneylines = Object.fromEntries(
      moneylinesList
        .map((g) => {
          const gv = (g as { gameView?: { gameId?: string } }).gameView;
          return gv?.gameId ? [gv.gameId, g as Record<string, unknown>] : null;
        })
        .filter((x): x is [string, Record<string, unknown>] => x !== null),
    );
  } catch {
    moneylines = {};
  }

  let totals: Record<string, Record<string, unknown>> = {};
  try {
    const totalsUrl = `https://www.sportsbookreview.com/_next/data/${buildId}/betting-odds/${sportSlug}/totals/full-game.json?league=${sportSlug}&oddsType=totals&oddsScope=full-game&date=${d}`;
    const totalsJson = (await (await fetch(totalsUrl, { headers })).json()) as {
      pageProps?: { oddsTables?: { oddsTableModel?: { gameRows?: unknown[] } }[] };
    };
    const totalsList = totalsJson.pageProps?.oddsTables?.[0]?.oddsTableModel?.gameRows ?? [];
    totals = Object.fromEntries(
      totalsList
        .map((g) => {
          const gv = (g as { gameView?: { gameId?: string } }).gameView;
          return gv?.gameId ? [gv.gameId, g as Record<string, unknown>] : null;
        })
        .filter((x): x is [string, Record<string, unknown>] => x !== null),
    );
  } catch {
    totals = {};
  }

  const allStats: Record<
    string,
    {
      spreads: Record<string, unknown>;
      moneylines?: Record<string, unknown>;
      totals?: Record<string, unknown>;
    }
  > = {};
  for (const id of Object.keys(spreads)) {
    allStats[id] = {
      spreads: spreads[id]!,
      moneylines: moneylines[id],
      totals: totals[id],
    };
  }

  const lineKey = "currentLine" as const;
  const games: SbrGame[] = [];

  for (const event of Object.values(allStats)) {
    const s = event.spreads as {
      gameView?: {
        homeTeam?: { fullName?: string };
        awayTeam?: { fullName?: string };
      };
      oddsViews?: {
        sportsbook?: string;
        currentLine?: Record<string, unknown>;
      }[];
    };
    const gameView = s.gameView;
    if (!gameView?.homeTeam?.fullName || !gameView?.awayTeam?.fullName) continue;
    let home_team = gameView.homeTeam.fullName.replace("Los Angeles Clippers", "LA Clippers");
    let away_team = gameView.awayTeam.fullName.replace("Los Angeles Clippers", "LA Clippers");
    const home_ml: Record<string, number | undefined> = {};
    const away_ml: Record<string, number | undefined> = {};
    const total: Record<string, number | string | undefined> = {};

    const mlobj = event.moneylines as typeof s | undefined;
    if (mlobj?.oddsViews) {
      for (const line of mlobj.oddsViews) {
        if (!line?.[lineKey]) continue;
        const book = (line as { sportsbook?: string }).sportsbook;
        if (!book) continue;
        const cl = (line as { currentLine?: Record<string, unknown> }).currentLine;
        const ho = cl?.homeOdds;
        const ao = cl?.awayOdds;
        if (typeof ho === "number") home_ml[book] = ho;
        if (typeof ao === "number") away_ml[book] = ao;
      }
    }

    const tobj = event.totals as typeof s | undefined;
    if (tobj?.oddsViews) {
      for (const line of tobj.oddsViews) {
        if (!line?.[lineKey]) continue;
        const book = (line as { sportsbook?: string }).sportsbook;
        if (!book) continue;
        const cl = (line as { currentLine?: Record<string, unknown> }).currentLine;
        const tval = cl?.total;
        if (typeof tval === "number" || typeof tval === "string") total[book] = tval;
      }
    }

    games.push({ home_team, away_team, home_ml, away_ml, total });
  }

  return games;
}

function normalizeBook(b: string): string {
  return b.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

/** Map CLI name (e.g. `bet_rivers_ny`) to scraped sportsbook label substring match. */
export function pickSportsbookKey(
  bookMap: Record<string, number | string | undefined>,
  requested: string,
): string | undefined {
  const want = normalizeBook(requested);
  for (const k of Object.keys(bookMap)) {
    if (normalizeBook(k) === want) return k;
  }
  for (const k of Object.keys(bookMap)) {
    if (normalizeBook(k).includes(want) || want.includes(normalizeBook(k))) return k;
  }
  return undefined;
}
