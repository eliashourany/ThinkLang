import { describe, it, expect, beforeEach } from "vitest";
import { ExactMatchCache } from "../src/runtime/cache.js";

describe("ExactMatchCache", () => {
  let cache: ExactMatchCache;

  beforeEach(() => {
    cache = new ExactMatchCache(60000); // 1 minute TTL
  });

  it("returns undefined for cache miss", () => {
    const result = cache.get("prompt", {}, { type: "string" });
    expect(result).toBeUndefined();
  });

  it("returns cached value for cache hit", () => {
    cache.set("prompt", {}, { type: "string" }, "cached result");
    const result = cache.get("prompt", {}, { type: "string" });
    expect(result).toBe("cached result");
  });

  it("returns undefined for different prompt", () => {
    cache.set("prompt1", {}, { type: "string" }, "result1");
    const result = cache.get("prompt2", {}, { type: "string" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for different context", () => {
    cache.set("prompt", { a: 1 }, { type: "string" }, "result");
    const result = cache.get("prompt", { a: 2 }, { type: "string" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for different schema", () => {
    cache.set("prompt", {}, { type: "string" }, "result");
    const result = cache.get("prompt", {}, { type: "integer" });
    expect(result).toBeUndefined();
  });

  it("respects TTL expiration", async () => {
    const shortCache = new ExactMatchCache(50); // 50ms TTL
    shortCache.set("prompt", {}, { type: "string" }, "result");

    expect(shortCache.get("prompt", {}, { type: "string" })).toBe("result");

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(shortCache.get("prompt", {}, { type: "string" })).toBeUndefined();
  });

  it("clear removes all entries", () => {
    cache.set("p1", {}, {}, "r1");
    cache.set("p2", {}, {}, "r2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("p1", {}, {})).toBeUndefined();
  });

  it("tracks size correctly", () => {
    expect(cache.size).toBe(0);
    cache.set("p1", {}, {}, "r1");
    expect(cache.size).toBe(1);
    cache.set("p2", {}, {}, "r2");
    expect(cache.size).toBe(2);
  });

  it("caches complex objects", () => {
    const complexResult = {
      items: [{ name: "a" }, { name: "b" }],
      total: 2,
    };
    cache.set("prompt", { ctx: "data" }, { type: "object" }, complexResult);
    const result = cache.get("prompt", { ctx: "data" }, { type: "object" });
    expect(result).toEqual(complexResult);
  });

  it("allows custom TTL per entry", async () => {
    cache.set("fast", {}, {}, "fast result", 50); // 50ms TTL
    cache.set("slow", {}, { slow: true }, "slow result", 5000); // 5s TTL

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(cache.get("fast", {}, {})).toBeUndefined();
    expect(cache.get("slow", {}, { slow: true })).toBe("slow result");
  });
});
