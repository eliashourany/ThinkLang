import { describe, it, expect, beforeEach } from "vitest";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { batch, BatchCostBudgetExceeded } from "../src/runtime/batch.js";
import { think } from "../src/runtime/think.js";

class MockProvider implements ModelProvider {
  callCount = 0;
  response: unknown = {};

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    this.callCount++;
    return { data: this.response, usage: { inputTokens: 10, outputTokens: 5 }, model: "mock-model" };
  }
}

let mockProvider: MockProvider;

beforeEach(() => {
  mockProvider = new MockProvider();
  setProvider(mockProvider);
  globalCache.clear();
  globalCostTracker.reset();
});

describe("batch()", () => {
  it("processes all items and returns results", async () => {
    const result = await batch({
      items: [1, 2, 3],
      processor: async (item) => item * 2,
    });

    expect(result.totalItems).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);
    expect(result.results.map(r => r.data)).toEqual([2, 4, 6]);
  });

  it("handles errors with continue strategy", async () => {
    const result = await batch({
      items: [1, 2, 3],
      processor: async (item) => {
        if (item === 2) throw new Error("bad item");
        return item * 2;
      },
      onError: "continue",
    });

    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.errors[0].item).toBe(2);
  });

  it("handles errors with fail-fast strategy", async () => {
    const processed: number[] = [];
    const result = await batch({
      items: [1, 2, 3, 4, 5],
      processor: async (item) => {
        processed.push(item);
        if (item === 2) throw new Error("bad item");
        return item * 2;
      },
      onError: "fail-fast",
      maxConcurrency: 1,
    });

    expect(result.errorCount).toBeGreaterThanOrEqual(1);
  });

  it("respects maxConcurrency", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const result = await batch({
      items: [1, 2, 3, 4, 5, 6],
      processor: async (item) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(r => setTimeout(r, 50));
        currentConcurrent--;
        return item;
      },
      maxConcurrency: 2,
    });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(result.successCount).toBe(6);
  });

  it("returns results sorted by index", async () => {
    const result = await batch({
      items: ["a", "b", "c"],
      processor: async (item) => item.toUpperCase(),
      maxConcurrency: 3,
    });

    expect(result.results.map(r => r.index)).toEqual([0, 1, 2]);
    expect(result.results.map(r => r.data)).toEqual(["A", "B", "C"]);
  });

  it("calls onItemComplete callback", async () => {
    const events: number[] = [];

    await batch({
      items: [1, 2, 3],
      processor: async (item) => item * 2,
      onItemComplete: (event) => events.push(event.index),
    });

    expect(events.sort()).toEqual([0, 1, 2]);
  });

  it("calls onProgress callback", async () => {
    const progressUpdates: number[] = [];

    await batch({
      items: [1, 2, 3],
      processor: async (item) => item,
      maxConcurrency: 1,
      onProgress: (progress) => progressUpdates.push(progress.completed),
    });

    expect(progressUpdates.length).toBeGreaterThan(0);
  });

  it("works with think() as processor", async () => {
    mockProvider.response = "positive";

    const result = await batch({
      items: ["Great!", "Terrible!", "Okay"],
      processor: async (review) => {
        return think<string>({
          jsonSchema: { type: "string" },
          prompt: `Classify sentiment: ${review}`,
        });
      },
      maxConcurrency: 2,
    });

    expect(result.successCount).toBe(3);
    expect(result.results.every(r => r.data === "positive")).toBe(true);
  });

  it("tracks total duration", async () => {
    const result = await batch({
      items: [1, 2, 3],
      processor: async (item) => {
        await new Promise(r => setTimeout(r, 10));
        return item;
      },
    });

    expect(result.totalDurationMs).toBeGreaterThan(0);
  });

  it("handles empty items array", async () => {
    const result = await batch({
      items: [],
      processor: async (item: number) => item,
    });

    expect(result.totalItems).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });
});
