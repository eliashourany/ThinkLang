import { describe, it, expect, beforeEach } from "vitest";
import { CostTracker } from "../src/runtime/cost-tracker.js";

let tracker: CostTracker;

beforeEach(() => {
  tracker = new CostTracker();
});

describe("CostTracker", () => {
  it("starts with empty records", () => {
    const summary = tracker.getSummary();
    expect(summary.totalCalls).toBe(0);
    expect(summary.totalInputTokens).toBe(0);
    expect(summary.totalOutputTokens).toBe(0);
    expect(summary.totalCostUsd).toBe(0);
  });

  it("records a usage entry", () => {
    tracker.record({
      operation: "think",
      model: "claude-opus-4-6",
      inputTokens: 100,
      outputTokens: 50,
      durationMs: 500,
    });

    const records = tracker.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].operation).toBe("think");
    expect(records[0].inputTokens).toBe(100);
    expect(records[0].outputTokens).toBe(50);
    expect(records[0].durationMs).toBe(500);
  });

  it("calculates cost using model pricing", () => {
    tracker.record({
      operation: "think",
      model: "claude-opus-4-6",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      durationMs: 1000,
    });

    const summary = tracker.getSummary();
    // claude-opus-4-6: $15/M input, $75/M output
    expect(summary.totalCostUsd).toBeCloseTo(90, 2);
  });

  it("summarizes by operation", () => {
    tracker.record({ operation: "think", model: "claude-opus-4-6", inputTokens: 100, outputTokens: 50, durationMs: 100 });
    tracker.record({ operation: "think", model: "claude-opus-4-6", inputTokens: 200, outputTokens: 100, durationMs: 200 });
    tracker.record({ operation: "infer", model: "claude-opus-4-6", inputTokens: 50, outputTokens: 25, durationMs: 50 });

    const summary = tracker.getSummary();
    expect(summary.totalCalls).toBe(3);
    expect(summary.byOperation.get("think")!.calls).toBe(2);
    expect(summary.byOperation.get("think")!.inputTokens).toBe(300);
    expect(summary.byOperation.get("infer")!.calls).toBe(1);
  });

  it("summarizes by model", () => {
    tracker.record({ operation: "think", model: "claude-opus-4-6", inputTokens: 100, outputTokens: 50, durationMs: 100 });
    tracker.record({ operation: "think", model: "claude-sonnet-4-5-20250929", inputTokens: 100, outputTokens: 50, durationMs: 100 });

    const summary = tracker.getSummary();
    expect(summary.byModel.size).toBe(2);
    expect(summary.byModel.get("claude-opus-4-6")!.calls).toBe(1);
    expect(summary.byModel.get("claude-sonnet-4-5-20250929")!.calls).toBe(1);
  });

  it("stores truncated prompt", () => {
    const longPrompt = "x".repeat(200);
    tracker.record({
      operation: "think",
      model: "claude-opus-4-6",
      inputTokens: 10,
      outputTokens: 5,
      prompt: longPrompt,
      durationMs: 10,
    });

    const records = tracker.getRecords();
    expect(records[0].prompt).toHaveLength(100);
  });

  it("reset clears all records", () => {
    tracker.record({ operation: "think", model: "claude-opus-4-6", inputTokens: 10, outputTokens: 5, durationMs: 10 });
    expect(tracker.getRecords()).toHaveLength(1);

    tracker.reset();
    expect(tracker.getRecords()).toHaveLength(0);
    expect(tracker.getSummary().totalCalls).toBe(0);
  });

  it("uses fallback pricing for unknown model", () => {
    tracker.record({
      operation: "think",
      model: "unknown-model",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      durationMs: 1000,
    });

    const summary = tracker.getSummary();
    // Falls back to default pricing (input: 3, output: 15 per million tokens)
    expect(summary.totalCostUsd).toBeCloseTo(18, 2);
  });

  it("records timestamp", () => {
    const before = Date.now();
    tracker.record({ operation: "think", model: "claude-opus-4-6", inputTokens: 10, outputTokens: 5, durationMs: 10 });
    const after = Date.now();

    const records = tracker.getRecords();
    expect(records[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(records[0].timestamp).toBeLessThanOrEqual(after);
  });

  it("handles different pricing tiers", () => {
    // Haiku is cheaper
    tracker.record({
      operation: "think",
      model: "claude-haiku-4-5-20251001",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      durationMs: 1000,
    });

    const summary = tracker.getSummary();
    // haiku: $0.8/M input, $4/M output
    expect(summary.totalCostUsd).toBeCloseTo(4.8, 2);
  });
});
