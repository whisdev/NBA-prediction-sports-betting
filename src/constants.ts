import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (this file lives in `src/`). */
export const REPO_ROOT = path.resolve(here, "..");

export const TODAYS_GAMES_URL =
  "https://data.nba.com/data/10s/v2015/json/mobile_teams/nba/2025/scores/00_todays_scores.json";

export const TEAM_STATS_URL =
  "https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2025-26&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=";

export const SCHEDULE_PATH = path.join(REPO_ROOT, "Data", "nba-2025-UTC.csv");

export const ONNX_MODEL_DIR = path.join(REPO_ROOT, "Models", "onnx");

/** Stat columns to drop when flattening home/away rows (matches Python pipeline). */
export const DROP_STAT_COLS = new Set(["TEAM_ID", "TEAM_NAME"]);
