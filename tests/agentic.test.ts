import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { defineTool, toolToDefinition } from "../src/runtime/tools.js";
import { agent } from "../src/runtime/agent.js";
import { setProvider, getProvider } from "../src/runtime/provider.js";
import type { ModelProvider, CompleteResult } from "../src/runtime/provider.js";
import {
  registerProvider,
  createProvider,
  getRegisteredProviders,
} from "../src/runtime/provider-registry.js";
import { AnthropicProvider } from "../src/runtime/anthropic-provider.js";
import { OllamaProvider } from "../src/runtime/providers/ollama-provider.js";
import { init } from "../src/runtime/init.js";
import { AgentMaxTurnsError, ToolExecutionError } from "../src/runtime/errors.js";
import { registerPricing } from "../src/runtime/cost-tracker.js";
import { check } from "../src/checker/checker.js";
import type { ProgramNode, TypeDeclarationNode } from "../src/ast/nodes.js";
import type { TypeDeclMap } from "../src/compiler/type-compiler.js";
import { generate } from "../src/compiler/code-generator.js";

// ─── Grammar Tests (tool + agent parsing) ────────────────

let parse: (source: string) => any;

beforeAll(async () => {
  const mod = await import("../src/parser/generated-parser.js");
  parse = mod.parse;
});

function collectTypeDeclarations(ast: ProgramNode): TypeDeclMap {
  const decls: TypeDeclMap = new Map();
  for (const stmt of ast.body) {
    if (stmt.type === "TypeDeclaration") {
      decls.set(stmt.name, stmt as TypeDeclarationNode);
    }
  }
  return decls;
}

describe("ThinkLang Grammar — Agentic", () => {
  describe("tool declarations", () => {
    it("parses a basic tool declaration", () => {
      const ast = parse(`tool searchDocs(query: string): string {
  let result = "found"
  print result
}`);
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe("ToolDeclaration");
      expect(ast.body[0].name).toBe("searchDocs");
      expect(ast.body[0].params).toHaveLength(1);
      expect(ast.body[0].params[0].name).toBe("query");
      expect(ast.body[0].returnType.type).toBe("PrimitiveType");
      expect(ast.body[0].returnType.name).toBe("string");
    });

    it("parses tool with description annotation", () => {
      const ast = parse(`tool fetchWeather(city: string): string @description("Get weather for a city") {
  let result = "sunny"
  print result
}`);
      expect(ast.body[0].type).toBe("ToolDeclaration");
      expect(ast.body[0].description).toBe("Get weather for a city");
    });

    it("parses tool with multiple parameters", () => {
      const ast = parse(`tool calculate(a: int, b: int): int {
  let result = a
  print result
}`);
      expect(ast.body[0].params).toHaveLength(2);
      expect(ast.body[0].params[0].name).toBe("a");
      expect(ast.body[0].params[1].name).toBe("b");
    });

    it("parses tool with named return type", () => {
      const ast = parse(`type Weather {
  temp: float
}

tool getWeather(city: string): Weather {
  let result = "data"
  print result
}`);
      expect(ast.body[1].type).toBe("ToolDeclaration");
      expect(ast.body[1].returnType.type).toBe("NamedType");
      expect(ast.body[1].returnType.name).toBe("Weather");
    });
  });

  describe("agent expressions", () => {
    it("parses basic agent expression", () => {
      const ast = parse(`let result = agent<string>("Find the answer")
  with tools: search`);
      expect(ast.body[0].type).toBe("LetDeclaration");
      expect(ast.body[0].value.type).toBe("AgentExpression");
      expect(ast.body[0].value.typeArgument.type).toBe("PrimitiveType");
      expect(ast.body[0].value.typeArgument.name).toBe("string");
      expect(ast.body[0].value.prompt.type).toBe("StringLiteral");
      expect(ast.body[0].value.tools).toEqual(["search"]);
    });

    it("parses agent with multiple tools", () => {
      const ast = parse(`let result = agent<string>("Do the task")
  with tools: search, write, read`);
      expect(ast.body[0].value.tools).toEqual(["search", "write", "read"]);
    });

    it("parses agent with max turns", () => {
      const ast = parse(`let result = agent<string>("Find it")
  with tools: search
  max turns: 5`);
      expect(ast.body[0].value.maxTurns).toBe(5);
    });

    it("parses agent with named type argument", () => {
      const ast = parse(`type Report {
  summary: string
}

let result = agent<Report>("Generate a report")
  with tools: analyze`);
      expect(ast.body[1].value.typeArgument.type).toBe("NamedType");
      expect(ast.body[1].value.typeArgument.name).toBe("Report");
    });
  });
});

// ─── defineTool Tests ────────────────────────────────────

describe("defineTool()", () => {
  it("creates a tool with raw JSON schema", () => {
    const tool = defineTool({
      name: "testTool",
      description: "A test tool",
      input: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
      execute: async (input: any) => `result for ${input.query}`,
    });

    expect(tool.name).toBe("testTool");
    expect(tool.description).toBe("A test tool");
    expect(tool.inputSchema).toHaveProperty("type", "object");
  });

  it("executes the tool function", async () => {
    const tool = defineTool({
      name: "echo",
      description: "Echo input",
      input: { type: "object", properties: { msg: { type: "string" } } },
      execute: async (input: any) => input.msg,
    });

    const result = await tool.execute({ msg: "hello" });
    expect(result).toBe("hello");
  });
});

describe("toolToDefinition()", () => {
  it("converts a tool to a provider-compatible definition", () => {
    const tool = defineTool({
      name: "myTool",
      description: "Does something",
      input: { type: "object", properties: {} },
      execute: async () => "ok",
    });

    const def = toolToDefinition(tool);
    expect(def.name).toBe("myTool");
    expect(def.description).toBe("Does something");
    expect(def.inputSchema).toEqual({ type: "object", properties: {} });
  });
});

// ─── Provider Registry Tests ─────────────────────────────

describe("Provider Registry", () => {
  it("has built-in providers registered", () => {
    const providers = getRegisteredProviders();
    expect(providers).toContain("anthropic");
    expect(providers).toContain("openai");
    expect(providers).toContain("gemini");
    expect(providers).toContain("ollama");
  });

  it("creates Anthropic provider", () => {
    const provider = createProvider("anthropic", { apiKey: "test-key" });
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("creates Ollama provider", () => {
    const provider = createProvider("ollama", {});
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("throws on unknown provider", () => {
    expect(() => createProvider("nonexistent")).toThrow('Unknown provider "nonexistent"');
  });

  it("allows registering custom providers", () => {
    const customProvider: ModelProvider = {
      complete: async () => ({
        data: "custom",
        usage: { inputTokens: 0, outputTokens: 0 },
        model: "custom-model",
      }),
    };

    registerProvider("custom-test", () => customProvider);
    const provider = createProvider("custom-test");
    expect(provider).toBe(customProvider);
  });
});

// ─── init() Multi-Provider Tests ─────────────────────────

describe("init() multi-provider", () => {
  beforeEach(() => {
    setProvider(null as any);
  });

  it("accepts provider name 'anthropic'", () => {
    init({ provider: "anthropic", apiKey: "test-key" });
    const provider = getProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("accepts provider name 'ollama'", () => {
    init({ provider: "ollama" });
    const provider = getProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it("accepts a custom ModelProvider instance", () => {
    const custom: ModelProvider = {
      complete: async () => ({
        data: "test",
        usage: { inputTokens: 0, outputTokens: 0 },
        model: "custom",
      }),
    };
    init({ provider: custom });
    expect(getProvider()).toBe(custom);
  });

  it("auto-detects anthropic from API key format", () => {
    init({ apiKey: "sk-ant-test123" });
    expect(getProvider()).toBeInstanceOf(AnthropicProvider);
  });
});

// ─── Agent Loop Tests ────────────────────────────────────

describe("agent()", () => {
  function createMockProvider(responses: CompleteResult[]): ModelProvider {
    let callIndex = 0;
    return {
      complete: async () => {
        const response = responses[callIndex] ?? responses[responses.length - 1];
        callIndex++;
        return response;
      },
    };
  }

  beforeEach(() => {
    setProvider(null as any);
  });

  it("returns data from a single-turn response", async () => {
    const mock = createMockProvider([
      {
        data: { answer: "42" },
        usage: { inputTokens: 100, outputTokens: 50 },
        model: "test-model",
        stopReason: "end_turn",
      },
    ]);
    setProvider(mock);

    const result = await agent({
      prompt: "What is the answer?",
      tools: [],
    });

    expect(result.data).toEqual({ answer: "42" });
    expect(result.turns).toBe(1);
    expect(result.totalUsage.inputTokens).toBe(100);
    expect(result.totalUsage.outputTokens).toBe(50);
  });

  it("executes tool calls and continues", async () => {
    const searchTool = defineTool({
      name: "search",
      description: "Search for info",
      input: { type: "object", properties: { query: { type: "string" } } },
      execute: async (input: any) => `Results for: ${input.query}`,
    });

    const mock = createMockProvider([
      // Turn 1: tool call
      {
        data: "",
        usage: { inputTokens: 100, outputTokens: 50 },
        model: "test-model",
        toolCalls: [
          { id: "call-1", name: "search", input: { query: "test" } },
        ],
        stopReason: "tool_use",
      },
      // Turn 2: final answer
      {
        data: { result: "Found it" },
        usage: { inputTokens: 200, outputTokens: 100 },
        model: "test-model",
        stopReason: "end_turn",
      },
    ]);
    setProvider(mock);

    const result = await agent({
      prompt: "Find info",
      tools: [searchTool],
    });

    expect(result.data).toEqual({ result: "Found it" });
    expect(result.turns).toBe(2);
    expect(result.toolCallHistory).toHaveLength(1);
    expect(result.toolCallHistory[0].call.name).toBe("search");
    expect(result.toolCallHistory[0].result.output).toBe("Results for: test");
  });

  it("throws AgentMaxTurnsError when limit reached", async () => {
    const mock = createMockProvider([
      {
        data: "",
        usage: { inputTokens: 10, outputTokens: 5 },
        model: "test-model",
        toolCalls: [{ id: "call-1", name: "search", input: {} }],
        stopReason: "tool_use",
      },
    ]);
    setProvider(mock);

    const searchTool = defineTool({
      name: "search",
      description: "Search",
      input: { type: "object" },
      execute: async () => "result",
    });

    await expect(
      agent({
        prompt: "Loop forever",
        tools: [searchTool],
        maxTurns: 2,
      })
    ).rejects.toThrow(AgentMaxTurnsError);
  });

  it("calls onToolCall and onToolResult hooks", async () => {
    const toolCalls: any[] = [];
    const toolResults: any[] = [];

    const searchTool = defineTool({
      name: "search",
      description: "Search",
      input: { type: "object", properties: { q: { type: "string" } } },
      execute: async () => "found",
    });

    const mock = createMockProvider([
      {
        data: "",
        usage: { inputTokens: 10, outputTokens: 5 },
        model: "test-model",
        toolCalls: [{ id: "call-1", name: "search", input: { q: "test" } }],
        stopReason: "tool_use",
      },
      {
        data: "done",
        usage: { inputTokens: 20, outputTokens: 10 },
        model: "test-model",
        stopReason: "end_turn",
      },
    ]);
    setProvider(mock);

    await agent({
      prompt: "Search for something",
      tools: [searchTool],
      onToolCall: (call) => toolCalls.push(call),
      onToolResult: (result) => toolResults.push(result),
    });

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe("search");
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].toolName).toBe("search");
    expect(toolResults[0].output).toBe("found");
  });

  it("handles unknown tool calls gracefully", async () => {
    const mock = createMockProvider([
      {
        data: "",
        usage: { inputTokens: 10, outputTokens: 5 },
        model: "test-model",
        toolCalls: [{ id: "call-1", name: "nonexistent", input: {} }],
        stopReason: "tool_use",
      },
      {
        data: "recovered",
        usage: { inputTokens: 20, outputTokens: 10 },
        model: "test-model",
        stopReason: "end_turn",
      },
    ]);
    setProvider(mock);

    const result = await agent({
      prompt: "test",
      tools: [],
    });

    expect(result.data).toBe("recovered");
    expect(result.toolCallHistory[0].result.isError).toBe(true);
    expect(result.toolCallHistory[0].result.output).toContain("Unknown tool");
  });

  it("handles tool execution errors gracefully", async () => {
    const failingTool = defineTool({
      name: "failing",
      description: "Always fails",
      input: { type: "object" },
      execute: async () => { throw new Error("Tool crashed"); },
    });

    const mock = createMockProvider([
      {
        data: "",
        usage: { inputTokens: 10, outputTokens: 5 },
        model: "test-model",
        toolCalls: [{ id: "call-1", name: "failing", input: {} }],
        stopReason: "tool_use",
      },
      {
        data: "handled",
        usage: { inputTokens: 20, outputTokens: 10 },
        model: "test-model",
        stopReason: "end_turn",
      },
    ]);
    setProvider(mock);

    const result = await agent({
      prompt: "test",
      tools: [failingTool],
    });

    expect(result.data).toBe("handled");
    expect(result.toolCallHistory[0].result.isError).toBe(true);
    expect(result.toolCallHistory[0].result.output).toContain("Tool crashed");
  });
});

// ─── Error Types Tests ──────────────────────────────────

describe("Error types", () => {
  it("AgentMaxTurnsError includes max and actual turns", () => {
    const err = new AgentMaxTurnsError(10, 10);
    expect(err.message).toContain("10");
    expect(err.name).toBe("AgentMaxTurnsError");
  });

  it("ToolExecutionError includes tool name", () => {
    const cause = new Error("something failed");
    const err = new ToolExecutionError("myTool", cause);
    expect(err.message).toContain("myTool");
    expect(err.name).toBe("ToolExecutionError");
  });
});

// ─── Cost Tracker — registerPricing Tests ────────────────

describe("registerPricing()", () => {
  it("allows registering custom model pricing", () => {
    registerPricing("custom-model-v1", { input: 5, output: 20 });
  });
});

// ─── Checker Tests (tool + agent) ────────────────────────

describe("Checker — Agentic", () => {
  it("checks tool declaration without errors", () => {
    const ast = parse(`tool search(query: string): string {
  let result = "found"
  print result
}`);
    const typeDecls = collectTypeDeclarations(ast);
    const result = check(ast, typeDecls);
    expect(result.errors).toHaveLength(0);
  });

  it("checks agent expression without errors", () => {
    const ast = parse(`tool search(query: string): string {
  let result = "found"
  print result
}

let answer = agent<string>("Find the answer")
  with tools: search`);
    const typeDecls = collectTypeDeclarations(ast);
    const result = check(ast, typeDecls);
    expect(result.errors).toHaveLength(0);
  });

  it("registers tool as function in scope", () => {
    const ast = parse(`tool myTool(x: int): string {
  let r = "ok"
  print r
}

let result = myTool(42)`);
    const typeDecls = collectTypeDeclarations(ast);
    const result = check(ast, typeDecls);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Compiler Tests (tool + agent) ───────────────────────

describe("Compiler — Agentic", () => {
  it("compiles tool declaration to defineTool call", () => {
    const ast = parse(`tool search(query: string): string {
  let result = "found"
  print result
}`);
    const typeDecls = collectTypeDeclarations(ast);
    const code = generate(ast, typeDecls);
    expect(code).toContain("defineTool");
    expect(code).toContain("search");
    expect(code).toContain("query");
  });

  it("compiles agent expression to agent() call", () => {
    const ast = parse(`tool search(query: string): string {
  let result = "found"
  print result
}

let answer = agent<string>("Find the answer")
  with tools: search`);
    const typeDecls = collectTypeDeclarations(ast);
    const code = generate(ast, typeDecls);
    expect(code).toContain("agent(");
    expect(code).toContain("search");
  });

  it("compiles agent with max turns", () => {
    const ast = parse(`tool search(query: string): string {
  let result = "found"
  print result
}

let answer = agent<string>("Find it")
  with tools: search
  max turns: 5`);
    const typeDecls = collectTypeDeclarations(ast);
    const code = generate(ast, typeDecls);
    expect(code).toContain("maxTurns: 5");
  });
});
