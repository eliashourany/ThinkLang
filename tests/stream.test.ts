import { describe, it, expect, beforeEach } from "vitest";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { streamThink, streamInfer, collectStream } from "../src/runtime/stream.js";

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

describe("streamThink()", () => {
  it("yields events for each chunk", async () => {
    mockProvider.response = "summary";

    const events = [];
    for await (const event of streamThink({
      prompt: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
      jsonSchema: { type: "string" },
      chunkOptions: { maxChars: 25, strategy: "paragraph" },
    })) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThan(1);
    expect(events[0].index).toBe(0);
    expect(events[0].data).toBe("summary");
    expect(events[0].totalChunks).toBe(events.length);
  });

  it("handles single-chunk text", async () => {
    mockProvider.response = "result";

    const events = [];
    for await (const event of streamThink({
      prompt: "Short",
      jsonSchema: { type: "string" },
    })) {
      events.push(event);
    }

    expect(events.length).toBe(1);
    expect(events[0].data).toBe("result");
  });
});

describe("streamInfer()", () => {
  it("yields events for each value", async () => {
    mockProvider.response = "French";

    const events = [];
    for await (const event of streamInfer({
      values: ["Bonjour", "Hello", "Hola"],
      jsonSchema: { type: "string" },
    })) {
      events.push(event);
    }

    expect(events.length).toBe(3);
    expect(events[0].data).toBe("French");
    expect(events[2].index).toBe(2);
  });
});

describe("collectStream()", () => {
  it("collects all events into an array", async () => {
    mockProvider.response = "result";

    const gen = streamThink({
      prompt: "First.\n\nSecond.\n\nThird.",
      jsonSchema: { type: "string" },
      chunkOptions: { maxChars: 15, strategy: "paragraph" },
    });

    const results = await collectStream(gen);
    expect(results.length).toBeGreaterThan(1);
    expect(results.every(r => r === "result")).toBe(true);
  });
});
