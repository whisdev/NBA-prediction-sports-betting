export const CACHE_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || "nba-bet:";

export function oddsCacheKey(sportsbook: string): string {
  return `odds:${sportsbook.toLowerCase()}`;
}

export function teamStatsCacheKey(): string {
  return "team-stats:current";
}
