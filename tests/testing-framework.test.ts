import { describe, it, expect, beforeEach } from "vitest";
import { parse } from "../src/parser/index.js";
import { compile } from "../src/compiler/index.js";
import { setProvider, type CompleteOptions, type CompleteResult, type ModelProvider } from "../src/runtime/provider.js";
import { globalCache } from "../src/runtime/cache.js";
import { globalCostTracker } from "../src/runtime/cost-tracker.js";
import { ReplayProvider } from "../src/testing/replay-provider.js";
import {
  createEmptySnapshot,
  addSnapshotEntry,
  type SnapshotFile,
} from "../src/testing/snapshot.js";

class MockProvider implements ModelProvider {
  response: unknown = {};
  async complete(options: CompleteOptions): Promise<CompleteResult> {
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

describe("Test block parsing", () => {
  it("parses a simple test block", async () => {
    const source = `test "basic test" {
  assert 1 == 1
}`;
    const ast = await parse(source);
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe("TestBlock");
    const testBlock = ast.body[0] as any;
    expect(testBlock.description).toBe("basic test");
    expect(testBlock.body).toHaveLength(1);
  });

  it("parses assert statement", async () => {
    const source = `assert 1 == 1`;
    const ast = await parse(source);
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe("AssertStatement");
    const assertNode = ast.body[0] as any;
    expect(assertNode.kind).toBe("value");
    expect(assertNode.expression).toBeDefined();
  });

  it("parses semantic assert", async () => {
    const source = `assert.semantic("hello", "is a greeting")`;
    const ast = await parse(source);
    expect(ast.body).toHaveLength(1);
    const assertNode = ast.body[0] as any;
    expect(assertNode.type).toBe("AssertStatement");
    expect(assertNode.kind).toBe("semantic");
    expect(assertNode.subject).toBeDefined();
    expect(assertNode.criteria).toBeDefined();
  });

  it("parses test block with mode", async () => {
    const source = `test mode: replay("fixtures/test.json") "replay test" {
  assert true
}`;
    const ast = await parse(source);
    expect(ast.body).toHaveLength(1);
    const testBlock = ast.body[0] as any;
    expect(testBlock.type).toBe("TestBlock");
    expect(testBlock.mode).not.toBeNull();
    expect(testBlock.mode.modeName).toBe("replay");
    expect(testBlock.mode.argument).toBe("fixtures/test.json");
  });

  it("parses test block with multiple statements", async () => {
    const source = `test "multi" {
  let x = 42
  assert x == 42
  assert x > 0
}`;
    const ast = await parse(source);
    const testBlock = ast.body[0] as any;
    expect(testBlock.body).toHaveLength(3);
  });
});

describe("Test block compilation", () => {
  it("compiles test block to executable code", async () => {
    const source = `test "basic" {
  assert 1 == 1
}`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("test");
    expect(result.code).toContain("Assertion");
  });

  it("compiles semantic assert to think call", async () => {
    const source = `assert.semantic("hello", "is a greeting")`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("__tl_runtime.think(");
    expect(result.code).toContain("semantic_assert");
  });

  it("compiles assert with expression", async () => {
    const source = `let x = 5
assert x > 0`;
    const result = await compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("Assertion failed");
  });
});

describe("Snapshot", () => {
  it("creates empty snapshot", () => {
    const snapshot = createEmptySnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.entries).toHaveLength(0);
  });

  it("adds entries to snapshot", () => {
    const snapshot = createEmptySnapshot();
    addSnapshotEntry(
      snapshot,
      { systemPrompt: "sys", userMessage: "user", jsonSchema: { type: "string" } },
      { data: "result", usage: { inputTokens: 100, outputTokens: 50 }, model: "test-model" }
    );

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.entries[0].response.value).toBe("result");
    expect(snapshot.entries[0].metadata.model).toBe("test-model");
  });
});

describe("ReplayProvider", () => {
  it("replays snapshot entries in order", async () => {
    const snapshot: SnapshotFile = {
      version: 1,
      entries: [
        {
          request: { systemPrompt: "s", userMessage: "u", jsonSchema: {} },
          response: { value: "first" },
          metadata: { inputTokens: 10, outputTokens: 5, model: "mock" },
        },
        {
          request: { systemPrompt: "s", userMessage: "u", jsonSchema: {} },
          response: { value: "second" },
          metadata: { inputTokens: 20, outputTokens: 10, model: "mock" },
        },
      ],
    };

    const provider = new ReplayProvider(snapshot);

    const r1 = await provider.complete({
      systemPrompt: "s", userMessage: "u", jsonSchema: {},
    });
    expect(r1.data).toBe("first");
    expect(r1.usage.inputTokens).toBe(10);

    const r2 = await provider.complete({
      systemPrompt: "s", userMessage: "u", jsonSchema: {},
    });
    expect(r2.data).toBe("second");
  });

  it("throws when no more entries", async () => {
    const snapshot: SnapshotFile = { version: 1, entries: [] };
    const provider = new ReplayProvider(snapshot);

    await expect(
      provider.complete({ systemPrompt: "s", userMessage: "u", jsonSchema: {} })
    ).rejects.toThrow("no more snapshot entries");
  });

  it("tracks remaining entries", async () => {
    const snapshot: SnapshotFile = {
      version: 1,
      entries: [
        {
          request: { systemPrompt: "s", userMessage: "u", jsonSchema: {} },
          response: { value: "v" },
          metadata: { inputTokens: 10, outputTokens: 5, model: "mock" },
        },
      ],
    };

    const provider = new ReplayProvider(snapshot);
    expect(provider.remaining).toBe(1);

    await provider.complete({ systemPrompt: "s", userMessage: "u", jsonSchema: {} });
    expect(provider.remaining).toBe(0);
  });
});
