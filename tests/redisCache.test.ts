import { afterEach, describe, expect, it } from "vitest";
import { oddsCacheKey } from "../src/utils/cacheKeys.js";
import { cacheGet, cacheSet, clearMemoryCache } from "../src/utils/redisCache.js";

describe("redisCache", () => {
  afterEach(() => {
    clearMemoryCache();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
  });

  it("builds odds cache keys", () => {
    expect(oddsCacheKey("FanDuel")).toBe("odds:fanduel");
  });

  it("stores odds dict in memory fallback", async () => {
    await cacheSet(oddsCacheKey("draftkings"), { "LAL:LAC": {} }, 60);
    const v = await cacheGet<Record<string, unknown>>(oddsCacheKey("draftkings"));
    expect(v).toBeTruthy();
  });
});
