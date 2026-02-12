# Plan: Agentic Capabilities + Model-Agnostic Provider System

## Current State

ThinkLang has a clean `ModelProvider` interface but is tightly coupled to Anthropic:
- `AnthropicProvider` is the only implementation
- `init()` always instantiates `AnthropicProvider`
- Cost tracker hardcodes Claude model pricing
- No tool/function calling support — only single-shot JSON Schema output
- No multi-turn conversation or agentic loops

## Goals

1. **Model-agnostic provider system** — support OpenAI, Google Gemini, Ollama, and custom providers
2. **Agentic capabilities** — tool use, multi-turn loops, and an `agent` construct in the language

---

## Phase 1: Model-Agnostic Provider System

### 1.1 Extend `ModelProvider` interface (`src/runtime/provider.ts`)

Add optional tool-calling support to the existing interface:

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: unknown;
  isError?: boolean;
}

export interface Message {
  role: "user" | "assistant" | "tool_result";
  content: string | ToolCall[];
  toolResults?: ToolResult[];
}

export interface CompleteOptions {
  systemPrompt: string;
  userMessage: string;
  jsonSchema?: Record<string, unknown>;   // now optional
  schemaName?: string;
  model?: string;
  maxTokens?: number;
  // New fields for agentic use:
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "required" | "none" | { name: string };
  messages?: Message[];                    // multi-turn history
  stopSequences?: string[];
}

export interface CompleteResult {
  data: unknown;
  usage: UsageInfo;
  model: string;
  // New fields:
  toolCalls?: ToolCall[];                  // tool invocations from model
  stopReason?: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
}
```

### 1.2 Provider registry (`src/runtime/provider-registry.ts`) — NEW

A registry to look up providers by name, so `init()` can accept a provider string:

```typescript
export type ProviderFactory = (options: ProviderOptions) => ModelProvider;

export interface ProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const registry = new Map<string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void;
export function createProvider(name: string, options: ProviderOptions): ModelProvider;
```

Built-in registrations: `"anthropic"`, `"openai"`, `"gemini"`, `"ollama"`, `"custom"`.

### 1.3 OpenAI provider (`src/runtime/providers/openai-provider.ts`) — NEW

Implements `ModelProvider` using OpenAI's chat completions API:
- Structured output via `response_format: { type: "json_schema" }`
- Tool calling via `tools` parameter
- Multi-turn via `messages` array
- Supports GPT-4o, GPT-4.1, o3, o4-mini, etc.
- **Peer dependency**: `openai` package (not bundled — users install if needed)

### 1.4 Google Gemini provider (`src/runtime/providers/gemini-provider.ts`) — NEW

Implements `ModelProvider` using Google's Generative AI SDK:
- Structured output via `responseMimeType: "application/json"` + `responseSchema`
- Tool calling via `tools` / `functionDeclarations`
- **Peer dependency**: `@google/generative-ai`

### 1.5 Ollama provider (`src/runtime/providers/ollama-provider.ts`) — NEW

Implements `ModelProvider` using Ollama's OpenAI-compatible REST API:
- Structured output via `format: "json"` + schema in system prompt
- Tool calling via OpenAI-compatible tool format
- No extra dependency — uses `fetch()` against `http://localhost:11434`

### 1.6 Update `init()` (`src/runtime/init.ts`)

```typescript
export interface InitOptions {
  provider?: string | ModelProvider;   // "anthropic" | "openai" | "gemini" | "ollama" | custom instance
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export function init(options: InitOptions = {}): void {
  if (typeof options.provider === "object") {
    setProvider(options.provider);    // custom ModelProvider instance
  } else {
    const name = options.provider ?? detectProvider(options);
    setProvider(createProvider(name, options));
  }
}

function detectProvider(options: InitOptions): string {
  if (options.apiKey?.startsWith("sk-ant-")) return "anthropic";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "anthropic"; // default
}
```

### 1.7 Update cost tracker (`src/runtime/cost-tracker.ts`)

- Move pricing to a `ModelPricing` map that providers can extend
- Add `registerPricing(model: string, pricing: { input: number, output: number })`
- Unknown models get estimated pricing or $0

### 1.8 Update `AnthropicProvider` (`src/runtime/anthropic-provider.ts`)

- Add tool calling support (Anthropic `tools` parameter)
- Handle `tool_use` content blocks in responses
- Support multi-turn `messages` passthrough

### 1.9 Exports update (`src/index.ts`)

Export the new provider registry and types:
```typescript
export { registerProvider, createProvider } from "./runtime/provider-registry.js";
export { OpenAIProvider } from "./runtime/providers/openai-provider.js";
// etc.
```

---

## Phase 2: Agentic Capabilities (Runtime)

### 2.1 Tool registry (`src/runtime/tools.ts`) — NEW

A runtime registry for tools that agents can invoke:

```typescript
export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: TInput) => Promise<TOutput>;
}

export function defineTool<TInput, TOutput>(config: {
  name: string;
  description: string;
  input: ZodType<TInput> | Record<string, unknown>;
  execute: (input: TInput) => Promise<TOutput>;
}): Tool<TInput, TOutput>;
```

### 2.2 Agent loop (`src/runtime/agent.ts`) — NEW

The core agentic runtime — an LLM loop that calls tools until done:

```typescript
export interface AgentOptions {
  prompt: string;
  tools: Tool[];
  context?: Record<string, unknown>;
  maxTurns?: number;           // default 10, safety limit
  model?: string;
  jsonSchema?: Record<string, unknown>;  // optional structured final output
  schemaName?: string;
  guards?: GuardRule[];
  onToolCall?: (call: ToolCall) => void;        // observability hook
  onToolResult?: (result: ToolResult) => void;  // observability hook
  abortSignal?: AbortSignal;
}

export async function agent<T = unknown>(options: AgentOptions): Promise<AgentResult<T>> {
  // 1. Build initial messages with system prompt + user prompt
  // 2. Loop:
  //    a. Call provider.complete() with tools + messages
  //    b. If stopReason === "end_turn" → parse final answer, return
  //    c. If stopReason === "tool_use" → execute tool calls, append results, continue
  //    d. If maxTurns reached → throw AgentMaxTurnsError
  // 3. Apply guards to final result
  // 4. Track cost for all turns combined
}

export interface AgentResult<T> {
  data: T;
  turns: number;
  totalUsage: UsageInfo;
  toolCallHistory: Array<{ call: ToolCall; result: ToolResult }>;
}
```

### 2.3 Built-in tools (`src/runtime/builtin-tools.ts`) — NEW

Useful default tools:

- `fetchUrl(url) → string` — HTTP GET, returns body text
- `readFile(path) → string` — read a local file
- `writeFile(path, content) → void` — write a local file
- `runCommand(command) → { stdout, stderr, exitCode }` — shell execution (sandboxed, opt-in)
- `searchWeb(query) → SearchResult[]` — web search (requires API key)

Each is opt-in — users explicitly pass them to `agent()`.

### 2.4 Error types (`src/runtime/errors.ts`)

Add:
- `AgentMaxTurnsError` — agent hit turn limit
- `ToolExecutionError` — a tool threw during execution

---

## Phase 3: Language-Level `agent` Construct

### 3.1 Grammar extension (`src/grammar/thinklang.peggy`)

Add `agent` as a new AI expression:

```thinklang
// Define tools
tool fetchPrice(ticker: string): float {
  // regular ThinkLang/JS body
  return api.getPrice(ticker)
}

// Agent expression
let result = agent<PortfolioAdvice>("Analyze my portfolio and suggest rebalancing")
  with tools: fetchPrice, getNews, calculateRisk
  with context: { portfolio: myPortfolio }
  max turns: 15
  guard passes(validateAdvice)
  on fail retry 2 with fallback { defaultAdvice() }
```

New grammar rules:
- `ToolDeclaration` — `tool name(params): returnType { body }`
- `AgentExpression` — `agent<Type>(prompt) with tools: ... [max turns: N] [guard ...] [on fail ...]`

### 3.2 AST nodes (`src/ast/nodes.ts`)

```typescript
export interface ToolDeclarationNode {
  type: "ToolDeclaration";
  name: string;
  params: ParameterNode[];
  returnType: TypeNode;
  body: StatementNode[];
  location: Location;
}

export interface AgentExpressionNode {
  type: "AgentExpression";
  typeArgument: TypeNode;
  prompt: Expression;
  tools: string[];             // tool names
  context?: ContextEntry[];
  maxTurns?: number;
  guards?: GuardClause[];
  onFail?: OnFailClause;
  location: Location;
}
```

### 3.3 Checker updates (`src/checker/`)

- Register `tool` declarations in scope (similar to `fn`)
- Validate tool param types and return types
- Validate `agent` expression: tools must be in scope, type argument must be defined

### 3.4 Code generator updates (`src/compiler/code-generator.ts`)

Compile `tool` declarations to `defineTool()` calls:
```typescript
const fetchPrice = defineTool({
  name: "fetchPrice",
  description: "...",
  input: { type: "object", properties: { ticker: { type: "string" } } },
  execute: async ({ ticker }) => { /* body */ }
});
```

Compile `agent<T>(...)` to `agent()` runtime call:
```typescript
const result = await agent<PortfolioAdvice>({
  prompt: "Analyze my portfolio...",
  tools: [fetchPrice, getNews, calculateRisk],
  context: { portfolio: myPortfolio },
  maxTurns: 15,
  jsonSchema: { /* PortfolioAdvice schema */ },
  guards: [...]
});
```

### 3.5 LSP updates (`src/lsp/`)

- Add completion for `agent`, `tool` keywords
- Hover info for tool declarations
- Go-to-definition for tool references in agent expressions
- Diagnostics for invalid tool references

---

## Phase 4: Library API for JS/TS Users

### 4.1 Final library surface

```typescript
import { init, think, infer, reason, agent, defineTool, zodSchema } from "thinklang";

// Initialize with any provider
init({ provider: "openai", apiKey: "sk-..." });
// or
init({ provider: "ollama", model: "llama3", baseUrl: "http://localhost:11434" });
// or bring your own
init({ provider: myCustomProvider });

// Define tools
const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => await docsIndex.search(query),
});

// Run agent
const answer = await agent<Answer>({
  prompt: "Answer this customer question using our docs",
  tools: [searchDocs],
  ...zodSchema(AnswerSchema),
  maxTurns: 5,
});
```

### 4.2 Package exports update

```json
{
  "exports": {
    ".": "dist/index.js",
    "./runtime": "dist/runtime/index.js",
    "./compiler": "dist/compiler/index.js",
    "./parser": "dist/parser/index.js",
    "./tools": "dist/runtime/builtin-tools.js"
  },
  "peerDependencies": {
    "openai": ">=4.0.0",
    "@google/generative-ai": ">=0.20.0"
  },
  "peerDependenciesMeta": {
    "openai": { "optional": true },
    "@google/generative-ai": { "optional": true }
  }
}
```

---

## Implementation Order

| Step | What | Files | Dependencies |
|------|------|-------|-------------|
| 1 | Extend `CompleteOptions`/`CompleteResult` with tool types | `provider.ts` | None |
| 2 | Provider registry | `provider-registry.ts` (new) | Step 1 |
| 3 | Update `AnthropicProvider` for tools + multi-turn | `anthropic-provider.ts` | Step 1 |
| 4 | Update `init()` for multi-provider | `init.ts` | Step 2 |
| 5 | OpenAI provider | `providers/openai-provider.ts` (new) | Step 1-2 |
| 6 | Ollama provider | `providers/ollama-provider.ts` (new) | Step 1-2 |
| 7 | Gemini provider | `providers/gemini-provider.ts` (new) | Step 1-2 |
| 8 | Update cost tracker | `cost-tracker.ts` | Step 2 |
| 9 | Tool registry + `defineTool` | `tools.ts` (new) | Step 1 |
| 10 | Agent loop runtime | `agent.ts` (new) | Steps 1, 9 |
| 11 | Built-in tools | `builtin-tools.ts` (new) | Step 9 |
| 12 | Grammar: `tool` + `agent` | `thinklang.peggy` | None |
| 13 | AST nodes | `nodes.ts` | Step 12 |
| 14 | Checker updates | `checker/` | Step 13 |
| 15 | Code generator updates | `code-generator.ts` | Steps 10, 13 |
| 16 | LSP updates | `lsp/` | Steps 13-14 |
| 17 | Update exports | `index.ts`, `package.json` | All above |
| 18 | Tests | `tests/` | All above |
| 19 | Docs + examples | `docs/`, `examples/` | All above |

---

## Design Decisions

1. **Peer dependencies for non-Anthropic SDKs** — keeps `thinklang` lightweight; users install only what they need
2. **Ollama via fetch, no SDK** — Ollama exposes an OpenAI-compatible API, no extra package needed
3. **`defineTool` uses Zod or raw JSON Schema** — consistent with existing `zodSchema()` pattern
4. **Agent loop is a runtime function, not middleware** — keeps it simple, composable, testable
5. **`maxTurns` safety limit** — prevents runaway agents; configurable per call
6. **Tool declarations in the language are syntactic sugar** — they compile down to `defineTool()` calls
7. **Observability hooks (`onToolCall`, `onToolResult`)** — enable logging, debugging, UI integration without coupling
8. **`abortSignal` support** — enables cancellation from outside (UI, timeout, etc.)
