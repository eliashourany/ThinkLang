import { describe, it, expect, beforeEach } from "vitest";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { mapThink, reduceThink } from "../src/runtime/map-reduce.js";

class MockProvider implements ModelProvider {
  callCount = 0;
  responseQueue: unknown[] = [];
  defaultResponse: unknown = {};

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    this.callCount++;
    const response = this.responseQueue.length > 0
      ? this.responseQueue.shift()
      : this.defaultResponse;
    return { data: response, usage: { inputTokens: 10, outputTokens: 5 }, model: "mock-model" };
  }
}

let mockProvider: MockProvider;

beforeEach(() => {
  mockProvider = new MockProvider();
  setProvider(mockProvider);
  globalCache.clear();
  globalCostTracker.reset();
});

describe("mapThink()", () => {
  it("applies think to each item", async () => {
    mockProvider.defaultResponse = "positive";

    const result = await mapThink({
      items: ["Great!", "Terrible!", "Okay"],
      promptTemplate: (review) => `Classify: ${review}`,
      jsonSchema: { type: "string" },
    });

    expect(result.totalItems).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.results).toEqual(["positive", "positive", "positive"]);
    expect(mockProvider.callCount).toBe(3);
  });

  it("reports errors without failing", async () => {
    let callNum = 0;
    const errorProvider: ModelProvider = {
      async complete() {
        callNum++;
        if (callNum === 2) throw new Error("API error");
        return { data: "ok", usage: { inputTokens: 5, outputTokens: 3 }, model: "mock" };
      },
    };
    setProvider(errorProvider);

    const result = await mapThink({
      items: ["a", "b", "c"],
      promptTemplate: (item) => `Process: ${item}`,
      jsonSchema: { type: "string" },
      maxConcurrency: 1,
    });

    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(1);
  });

  it("respects concurrency limit", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const slowProvider: ModelProvider = {
      async complete() {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(r => setTimeout(r, 50));
        currentConcurrent--;
        return { data: "ok", usage: { inputTokens: 5, outputTokens: 3 }, model: "mock" };
      },
    };
    setProvider(slowProvider);

    await mapThink({
      items: [1, 2, 3, 4, 5, 6],
      promptTemplate: (item) => `Item: ${item}`,
      jsonSchema: { type: "string" },
      maxConcurrency: 2,
    });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("tracks cost", async () => {
    mockProvider.defaultResponse = "result";

    const result = await mapThink({
      items: ["a", "b", "c"],
      promptTemplate: (item) => `Process: ${item}`,
      jsonSchema: { type: "string" },
    });

    expect(result.totalCostUsd).toBeGreaterThanOrEqual(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("reduceThink()", () => {
  it("reduces items via tree reduction", async () => {
    mockProvider.defaultResponse = "combined";

    const result = await reduceThink({
      items: ["one", "two", "three", "four", "five"],
      prompt: "Summarize these items",
      jsonSchema: { type: "string" },
      batchSize: 2,
    });

    expect(result).toBe("combined");
    // With 5 items and batchSize 2: first pass produces 3 results, then 2, then 1
    expect(mockProvider.callCount).toBeGreaterThan(1);
  });

  it("handles single item", async () => {
    mockProvider.defaultResponse = "single";

    const result = await reduceThink({
      items: ["only one"],
      prompt: "Summarize",
      jsonSchema: { type: "string" },
    });

    expect(result).toBe("single");
    expect(mockProvider.callCount).toBe(1);
  });

  it("throws on empty items", async () => {
    await expect(reduceThink({
      items: [],
      prompt: "Summarize",
      jsonSchema: { type: "string" },
    })).rejects.toThrow("at least one item");
  });
});
