import fs from "node:fs";
import { parse } from "csv-parse/sync";
import type { ScheduleRow } from "./types.js";

/** Parses dates like 21/10/2025 23:30 (day/month/year). */
function parseScheduleDate(s: string): Date {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return new Date(NaN);
  const [, d, mon, y, h, min] = m;
  return new Date(Number(y), Number(mon) - 1, Number(d), Number(h), Number(min));
}

export function loadSchedule(filePath: string): ScheduleRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  const out: ScheduleRow[] = [];
  for (const r of records) {
    const ds = r["Date"] ?? r["date"];
    const home = r["Home Team"] ?? r["HomeTeam"];
    const away = r["Away Team"] ?? r["AwayTeam"];
    if (!ds || !home || !away) continue;
    const date = parseScheduleDate(ds);
    if (Number.isNaN(date.getTime())) continue;
    out.push({ date, homeTeam: home, awayTeam: away });
  }
  return out;
}

export function daysRestBefore(
  schedule: ScheduleRow[],
  team: string,
  before: Date,
): number {
  let last: Date | null = null;
  for (const g of schedule) {
    if (g.date > before) continue;
    if (g.homeTeam !== team && g.awayTeam !== team) continue;
    if (!last || g.date > last) last = g.date;
  }
  if (!last) return 7;
  const diff =
    (before.getTime() - last.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(1, Math.round(diff));
}
