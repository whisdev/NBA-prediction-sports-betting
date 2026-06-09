#!/usr/bin/env npx tsx
import chalk from "chalk";
import {
  ONNX_MODEL_DIR,
  SCHEDULE_PATH,
  TEAM_STATS_URL,
  TODAYS_GAMES_URL,
} from "../constants.js";
import { teamIndexCurrent } from "../dictionaries/teamIndexCurrent.js";
import { createTodaysGamesFromOdds, createTodaysGamesMobile } from "../nba/games.js";
import { buildGamesBatch, buildUoMatrix } from "../nba/features.js";
import { loadSchedule } from "../nba/schedule.js";
import { getJsonResultSets, getTodaysGamesRaw, toDataFrame } from "../nba/stats.js";
import type { OddsDict } from "../odds/sbrTypes.js";
import { getOddsFromSbr } from "../odds/sbrOdds.js";
import { XgbOnnxPredictor } from "../predict/xgboostOnnx.js";
import { calculateKellyCriterion } from "../utils/kellyCriterion.js";
import { expectedValue } from "../utils/expectedValue.js";
import { cacheFlushNamespace } from "../utils/redisCache.js";
import { closeRedisClient, isRedisEnabled, pingRedis } from "../utils/redis.js";

type CliArgs = {
  odds?: string;
  kc: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { kc: false };
  for (const a of argv) {
    if (a === "-kc" || a === "--kc") out.kc = true;
    else if (a.startsWith("-odds=")) out.odds = a.slice("-odds=".length);
    else if (a.startsWith("--odds=")) out.odds = a.slice("--odds=".length);
  }
  return out;
}

function toOddsInt(o: string | number | null | undefined): number | null {
  if (o === null || o === undefined) return null;
  if (typeof o === "number") return o;
  const x = Number.parseInt(String(o), 10);
  return Number.isFinite(x) ? x : null;
}

function formatGameLine(
  homeTeam: string,
  awayTeam: string,
  winnerIsHome: boolean,
  winnerConfidence: number,
  underOver: number,
  ouValue: string,
  ouConfidence: number,
): string {
  const winnerTeam = winnerIsHome ? homeTeam : awayTeam;
  const loserTeam = winnerIsHome ? awayTeam : homeTeam;
  const winnerColor = winnerIsHome ? chalk.green : chalk.red;
  const loserColor = winnerIsHome ? chalk.red : chalk.green;
  const ouLabel = underOver === 0 ? "UNDER" : "OVER";
  const ouColor = underOver === 0 ? chalk.magenta : chalk.blue;
  return (
    `${winnerColor(winnerTeam)}${chalk.cyan(` (${winnerConfidence}%)`)} vs ` +
    `${loserColor(loserTeam)}: ${ouColor(ouLabel)} ${ouValue}${chalk.cyan(` (${ouConfidence}%)`)}`
  );
}

async function resolveGames(
  oddsDict: OddsDict | null,
  sportsbook?: string,
): Promise<{ games: [string, string][]; odds: OddsDict | null } | null> {
  if (oddsDict) {
    const games = createTodaysGamesFromOdds(oddsDict);
    if (games.length === 0) {
      console.log("No games found.");
      return null;
    }
    const gameKey = `${games[0]![0]}:${games[0]![1]}`;
    if (!(gameKey in oddsDict)) {
      console.log(gameKey);
      console.log(
        chalk.red(
          "--------------Games list not up to date for todays games!!! Scraping disabled until list is updated.--------------",
        ),
      );
      return { games, odds: null };
    }
    console.log(chalk.bold(`------------------${sportsbook ?? "odds"} data------------------`));
    for (const key of Object.keys(oddsDict)) {
      const [home, away] = key.split(":");
      const o = oddsDict[key]!;
      const ho = o[home!] as { money_line_odds?: number | string } | undefined;
      const ao = o[away!] as { money_line_odds?: number | string } | undefined;
      console.log(`${away} (${ao?.money_line_odds}) @ ${home} (${ho?.money_line_odds})`);
    }
    return { games, odds: oddsDict };
  }

  const raw = await getTodaysGamesRaw(TODAYS_GAMES_URL);
  const games = createTodaysGamesMobile(raw);
  return { games, odds: null };
}

async function runPredictions(
  games: [string, string][],
  mlBatch: Float32Array[],
  uoBatch: Float32Array[],
  uoLines: string[],
  homeOdds: (string | number | null)[],
  awayOdds: (string | number | null)[],
  kc: boolean,
): Promise<void> {
  const predictor = new XgbOnnxPredictor();
  await predictor.load(ONNX_MODEL_DIR);
  const mlPred = await predictor.predictMlRows(mlBatch);
  const ouPred = await predictor.predictUoRows(uoBatch);

  console.log(chalk.bold("---------------XGBoost Model Predictions---------------"));
  for (let idx = 0; idx < games.length; idx++) {
    const [homeTeam, awayTeam] = games[idx]!;
    const mlRow = mlPred[idx]!;
    const ouRow = ouPred[idx]!;
    const winner = mlRow[1]! > mlRow[0]! ? 1 : 0;
    const underOver = ouRow[1]! > ouRow[0]! ? 1 : 0;
    const winnerConfidence = Math.round(Math.max(mlRow[0]!, mlRow[1]!) * 1000) / 10;
    const ouConfidence = Math.round(Math.max(ouRow[0]!, ouRow[1]!) * 1000) / 10;
    console.log(
      formatGameLine(
        homeTeam,
        awayTeam,
        winner === 1,
        winnerConfidence,
        underOver,
        uoLines[idx]!,
        ouConfidence,
      ),
    );
  }
  console.log(chalk.bold("-------------------------------------------------------"));

  if (kc) console.log(chalk.bold("------------Expected Value & Kelly Criterion-----------"));
  else console.log(chalk.bold("---------------------Expected Value--------------------"));

  for (let idx = 0; idx < games.length; idx++) {
    const [homeTeam, awayTeam] = games[idx]!;
    const ml = mlPred[idx]!;
    const ph = ml[1]!;
    const pa = ml[0]!;
    const ho = toOddsInt(homeOdds[idx]);
    const ao = toOddsInt(awayOdds[idx]);
    let evHome = 0;
    let evAway = 0;
    if (ho !== null && ao !== null) {
      evHome = expectedValue(ph, ho);
      evAway = expectedValue(pa, ao);
    }
    const hc = evHome > 0 ? chalk.green : chalk.red;
    const ac = evAway > 0 ? chalk.green : chalk.red;
    const kfh =
      kc && ho !== null
        ? ` Fraction of Bankroll: ${calculateKellyCriterion(ho, ph)}%`
        : "";
    const kfa =
      kc && ao !== null
        ? ` Fraction of Bankroll: ${calculateKellyCriterion(ao, pa)}%`
        : "";
    console.log(`${homeTeam} EV: ${hc(String(evHome))}${kfh}`);
    console.log(`${awayTeam} EV: ${ac(String(evAway))}${kfa}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "redis" && argv[1] === "ping") {
    if (!isRedisEnabled()) {
      console.log(chalk.yellow("Redis disabled. Set REDIS_URL or REDIS_HOST."));
      return;
    }
    console.log((await pingRedis()) ? chalk.green("Redis PONG") : chalk.red("Redis unreachable"));
    return;
  }
  if (argv[0] === "redis" && argv[1] === "flush") {
    const n = await cacheFlushNamespace();
    console.log(chalk.green(`Flushed ${n} Redis key(s)`));
    return;
  }

  const args = parseArgs(argv);
  if (!args.odds) {
    console.log(chalk.yellow("Usage:"));
    console.log(chalk.cyan("  npm run predict -- -odds=fanduel"));
    console.log(chalk.cyan("  npm run predict -- -odds=draftkings -kc"));
    process.exit(1);
  }

  const oddsDict = await getOddsFromSbr(args.odds);
  const resolved = await resolveGames(oddsDict, args.odds);
  if (!resolved) return;
  let { games } = resolved;
  const activeOdds = resolved.odds;

  if (!activeOdds) {
    console.log(chalk.red("Odds unavailable for today's slate key; stopping."));
    process.exit(1);
  }

  games = games.filter(
    (g) => g[0] in teamIndexCurrent && g[1] in teamIndexCurrent,
  );

  const rs = await getJsonResultSets(TEAM_STATS_URL);
  const df = toDataFrame(rs);
  const schedule = loadSchedule(SCHEDULE_PATH);
  const today = new Date();

  const built = buildGamesBatch(games, df, activeOdds, schedule, today);
  const { games: usedGames, mlMatrix, uoLines, homeOdds, awayOdds } = built;

  if (usedGames.length === 0) {
    console.log(chalk.yellow("No matching games after joining odds and team indices."));
    return;
  }

  const uoMatrix = buildUoMatrix(mlMatrix, uoLines);
  await runPredictions(usedGames, mlMatrix, uoMatrix, uoLines, homeOdds, awayOdds, args.kc);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closeRedisClient();
  });
