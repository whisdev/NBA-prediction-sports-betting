import { fetch } from "undici";
import type { DataFrame } from "./types.js";
import { dataHeaders, gamesHeader } from "./headers.js";

export async function getJsonResultSets(url: string): Promise<unknown[] | undefined> {
  const res = await fetch(url, { headers: dataHeaders });
  const json = (await res.json()) as { resultSets?: unknown[] };
  return json.resultSets;
}

export async function getTodaysGamesRaw(url: string): Promise<unknown[] | undefined> {
  const res = await fetch(url, { headers: gamesHeader });
  const json = (await res.json()) as { gs?: { g?: unknown[] } };
  return json.gs?.g;
}

export function toDataFrame(resultSets: unknown[] | undefined): DataFrame {
  if (!resultSets?.[0] || typeof resultSets[0] !== "object") {
    return { headers: [], rows: [] };
  }
  const rs = resultSets[0] as { headers?: string[]; rowSet?: unknown[][] };
  const headers = rs.headers ?? [];
  const rowSet = rs.rowSet ?? [];
  const rows: Record<string, string | number>[] = [];
  for (const r of rowSet) {
    const row: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      const v = r[i];
      row[h] = typeof v === "number" || typeof v === "string" ? v : String(v ?? "");
    });
    rows.push(row);
  }
  return { headers, rows };
}
