import { describe, it, expect, beforeEach } from "vitest";
import { Confident } from "../src/runtime/confident.js";
import { setProvider, type ModelProvider, type CompleteOptions, type CompleteResult } from "../src/runtime/provider.js";
import { think } from "../src/runtime/think.js";
import { infer } from "../src/runtime/infer.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import {
  ConfidenceTooLow,
  SchemaViolation,
  GuardFailed,
  ThinkError,
} from "../src/runtime/errors.js";

// Mock provider
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

describe("Confident<T>", () => {
  it("creates a Confident value", () => {
    const c = new Confident("hello", 0.95, "high confidence");
    expect(c.value).toBe("hello");
    expect(c.confidence).toBe(0.95);
    expect(c.reasoning).toBe("high confidence");
  });

  it("isConfident checks threshold", () => {
    const c = new Confident("test", 0.8);
    expect(c.isConfident(0.7)).toBe(true);
    expect(c.isConfident(0.9)).toBe(false);
    expect(c.isConfident()).toBe(true); // default 0.7
  });

  it("unwrap returns value", () => {
    const c = new Confident("test", 0.8);
    expect(c.unwrap()).toBe("test");
    expect(c.unwrap(0.5)).toBe("test");
  });

  it("unwrap throws ConfidenceTooLow when below threshold", () => {
    const c = new Confident("test", 0.3);
    expect(() => c.unwrap(0.5)).toThrow(ConfidenceTooLow);
  });

  it("expect returns value when above threshold", () => {
    const c = new Confident("test", 0.9);
    expect(c.expect(0.8)).toBe("test");
  });

  it("expect throws when below threshold", () => {
    const c = new Confident("test", 0.3);
    expect(() => c.expect(0.5)).toThrow(ConfidenceTooLow);
  });

  it("or returns value when confident", () => {
    const c = new Confident("test", 0.9);
    expect(c.or("fallback")).toBe("test");
  });

  it("or returns fallback when not confident", () => {
    const c = new Confident("test", 0.3);
    expect(c.or("fallback")).toBe("fallback");
  });

  it("map transforms value", () => {
    const c = new Confident(5, 0.9);
    const mapped = c.map(v => v * 2);
    expect(mapped.value).toBe(10);
    expect(mapped.confidence).toBe(0.9);
  });

  it("combine merges Confident values", () => {
    const items = [
      new Confident("a", 0.8, "r1"),
      new Confident("b", 0.6, "r2"),
    ];
    const combined = Confident.combine(items);
    expect(combined.value).toEqual(["a", "b"]);
    expect(combined.confidence).toBeCloseTo(0.7);
  });

  it("toJSON serializes correctly", () => {
    const c = new Confident("test", 0.9, "reason");
    const json = c.toJSON();
    expect(json).toEqual({ value: "test", confidence: 0.9, reasoning: "reason" });
  });
});

describe("think()", () => {
  it("calls provider with correct schema and prompt", async () => {
    mockProvider.response = "hello";
    const result = await think({
      jsonSchema: { type: "string" },
      prompt: "Say hello",
    });
    expect(result).toBe("hello");
    expect(mockProvider.lastOptions!.userMessage).toContain("Say hello");
  });

  it("passes context to provider", async () => {
    mockProvider.response = "result";
    await think({
      jsonSchema: { type: "string" },
      prompt: "Analyze",
      context: { data: "test data" },
    });
    expect(mockProvider.lastOptions!.userMessage).toContain("test data");
  });

  it("wraps result in Confident when schema matches", async () => {
    mockProvider.response = {
      value: "positive",
      confidence: 0.9,
      reasoning: "clearly positive",
    };
    const result = await think({
      jsonSchema: {
        type: "object",
        properties: {
          value: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
        },
      },
      prompt: "Analyze sentiment",
    });
    expect(result).toBeInstanceOf(Confident);
    expect((result as Confident<string>).value).toBe("positive");
  });

  it("caches identical calls", async () => {
    mockProvider.response = "cached";
    const opts = {
      jsonSchema: { type: "string" },
      prompt: "Same prompt",
    };

    const r1 = await think(opts);
    mockProvider.response = "different";
    const r2 = await think(opts);

    expect(r1).toBe("cached");
    expect(r2).toBe("cached"); // From cache
  });
});

describe("infer()", () => {
  it("calls provider with value and hint", async () => {
    mockProvider.response = "French";
    const result = await infer({
      jsonSchema: { type: "string" },
      value: "Bonjour",
      hint: "Detect language",
    });
    expect(result).toBe("French");
    expect(mockProvider.lastOptions!.userMessage).toContain("Bonjour");
    expect(mockProvider.lastOptions!.userMessage).toContain("Detect language");
  });
});

describe("ThinkError classes", () => {
  it("SchemaViolation has expected fields", () => {
    const err = new SchemaViolation("string", 42);
    expect(err).toBeInstanceOf(ThinkError);
    expect(err).toBeInstanceOf(SchemaViolation);
    expect(err.expected).toBe("string");
    expect(err.got).toBe(42);
    expect(err.name).toBe("SchemaViolation");
  });

  it("ConfidenceTooLow has expected fields", () => {
    const err = new ConfidenceTooLow(0.8, 0.3);
    expect(err).toBeInstanceOf(ThinkError);
    expect(err.threshold).toBe(0.8);
    expect(err.actual).toBe(0.3);
  });

  it("GuardFailed has expected fields", () => {
    const err = new GuardFailed("length", "short", "10..500");
    expect(err).toBeInstanceOf(ThinkError);
    expect(err.guardName).toBe("length");
    expect(err.constraint).toBe("10..500");
  });
});
