import { describe, it, expect, beforeEach } from "vitest";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { Dataset } from "../src/runtime/dataset.js";

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

describe("Dataset", () => {
  it("creates from array", () => {
    const ds = Dataset.from([1, 2, 3]);
    expect(ds.length).toBe(3);
  });

  it("creates from range", () => {
    const ds = Dataset.range(0, 5);
    expect(ds.length).toBe(5);
  });

  it("map transforms items", async () => {
    const result = await Dataset.from([1, 2, 3])
      .map(async (item) => item * 2)
      .execute();

    expect(result.toArray()).toEqual([2, 4, 6]);
  });

  it("filter removes items", async () => {
    const result = await Dataset.from([1, 2, 3, 4, 5])
      .filter(async (item) => item > 3)
      .execute();

    expect(result.toArray()).toEqual([4, 5]);
  });

  it("chains map and filter", async () => {
    const result = await Dataset.from([1, 2, 3, 4, 5])
      .map(async (item) => item * 10)
      .filter(async (item) => item >= 30)
      .execute();

    expect(result.toArray()).toEqual([30, 40, 50]);
  });

  it("flatMap flattens results", async () => {
    const result = await Dataset.from([1, 2, 3])
      .flatMap(async (item) => [item, item * 10])
      .execute();

    expect(result.toArray()).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it("batch groups items", async () => {
    const result = await Dataset.from([1, 2, 3, 4, 5])
      .batch(2)
      .execute();

    expect(result.toArray()).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("reduce aggregates items", async () => {
    const sum = await Dataset.from([1, 2, 3, 4, 5])
      .reduce(async (acc, item) => acc + item, 0);

    expect(sum).toBe(15);
  });

  it("DatasetResult provides convenience methods", async () => {
    const result = await Dataset.from([10, 20, 30])
      .map(async (item) => item)
      .execute();

    expect(result.length).toBe(3);
    expect(result.first()).toBe(10);
    expect(result.last()).toBe(30);
    expect(result.take(2)).toEqual([10, 20]);
  });

  it("DatasetResult is iterable", async () => {
    const result = await Dataset.from([1, 2, 3])
      .map(async (item) => item)
      .execute();

    const collected = [];
    for (const item of result) {
      collected.push(item);
    }
    expect(collected).toEqual([1, 2, 3]);
  });

  it("respects maxConcurrency option", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    await Dataset.from([1, 2, 3, 4, 5, 6])
      .map(async (item) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(r => setTimeout(r, 30));
        currentConcurrent--;
        return item;
      })
      .execute({ maxConcurrency: 2 });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("handles empty dataset", async () => {
    const result = await Dataset.from([])
      .map(async (item: number) => item * 2)
      .execute();

    expect(result.toArray()).toEqual([]);
    expect(result.length).toBe(0);
  });
});
