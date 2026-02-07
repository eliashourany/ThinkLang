import { describe, it, expect, beforeEach } from "vitest";
import { reason } from "../src/runtime/reason.js";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { compile } from "../src/compiler/index.js";

class MockProvider implements ModelProvider {
  lastOptions: CompleteOptions | null = null;
  response: unknown = {};

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    this.lastOptions = options;
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

describe("reason() runtime", () => {
  it("calls provider with goal and steps in prompt", async () => {
    mockProvider.response = { recommendation: "buy" };

    const result = await reason({
      jsonSchema: { type: "object", properties: { recommendation: { type: "string" } } },
      goal: "Analyze portfolio",
      steps: [
        { number: 1, description: "Evaluate allocation" },
        { number: 2, description: "Assess risks" },
      ],
    });

    expect(result).toEqual({ recommendation: "buy" });
    expect(mockProvider.lastOptions!.userMessage).toContain("Analyze portfolio");
    expect(mockProvider.lastOptions!.userMessage).toContain("1. Evaluate allocation");
    expect(mockProvider.lastOptions!.userMessage).toContain("2. Assess risks");
    expect(mockProvider.lastOptions!.systemPrompt).toContain("reasoning");
  });

  it("passes context to reason call", async () => {
    mockProvider.response = { result: "ok" };

    await reason({
      jsonSchema: { type: "object", properties: { result: { type: "string" } } },
      goal: "Analyze",
      steps: [{ number: 1, description: "Step" }],
      context: { data: "important info" },
    });

    expect(mockProvider.lastOptions!.userMessage).toContain("important info");
  });

  it("caches identical reason calls", async () => {
    mockProvider.response = { value: "cached" };
    const opts = {
      jsonSchema: { type: "object", properties: { value: { type: "string" } } },
      goal: "Same goal",
      steps: [{ number: 1, description: "Same step" }],
    };

    const r1 = await reason(opts);
    mockProvider.response = { value: "different" };
    const r2 = await reason(opts);

    expect(r1).toEqual({ value: "cached" });
    expect(r2).toEqual({ value: "cached" });
  });
});

describe("reason block compilation", () => {
  it("compiles reason block to runtime call", async () => {
    const source = `let analysis = reason<string> {
  goal: "Analyze data"
  steps:
    1. "Gather info"
    2. "Draw conclusions"
}
print analysis`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("__tl_runtime.reason(");
    expect(result.code).toContain("Analyze data");
    expect(result.code).toContain("Gather info");
  });

  it("compiles reason block with context", async () => {
    const source = `let data = "test"
let analysis = reason<string> {
  goal: "Analyze"
  steps:
    1. "Step one"
  with context: data
}
print analysis`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("context:");
  });
});
