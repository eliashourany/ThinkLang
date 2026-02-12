# Using ThinkLang as a Library

ThinkLang's runtime can be used directly in any JavaScript or TypeScript project. You get the same AI primitives (`think`, `infer`, `reason`), agentic tool-calling (`agent`, `defineTool`), and multi-provider support without writing `.tl` files.

## Installation

```bash
npm install thinklang
```

## Quick Start

If any supported API key is in your environment (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`), it works with zero configuration:

```typescript
import { think } from "thinklang";

const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});
console.log(greeting);
```

## Using Zod Schemas

The `zodSchema()` helper converts [Zod](https://zod.dev) types to JSON Schema, so you never have to write JSON schemas by hand:

```typescript
import { z } from "zod";
import { think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
  explanation: z.string(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of: 'This is the best product I have ever used!'",
  ...zodSchema(Sentiment),
});

console.log(result.label);  // "positive"
console.log(result.score);  // 0.95
```

`zodSchema()` supports all common Zod types: objects, strings, numbers, booleans, enums, arrays, optionals, nullable, unions, literals, records, and nested objects. It also preserves `.describe()` annotations.

## Explicit Initialization

Use `init()` when you need to configure the provider, API key, or model explicitly:

```typescript
import { init, think } from "thinklang";

// Use Anthropic (default)
init({ apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514" });

// Use OpenAI (requires: npm install openai)
init({ provider: "openai", apiKey: "sk-..." });

// Use Gemini (requires: npm install @google/generative-ai)
init({ provider: "gemini", apiKey: "AI..." });

// Use Ollama (local, no API key needed)
init({ provider: "ollama" });

// Use a custom ModelProvider instance
init({ provider: myCustomProvider });
```

If you don't call `init()`, the runtime auto-initializes from environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`) on first use.

## Core Functions

### `think<T>(options): Promise<T>`

General-purpose LLM call. Send a prompt, get structured data back.

```typescript
const category = await think<{ label: string; confidence: number }>({
  prompt: "Classify this support ticket",
  jsonSchema: {
    type: "object",
    properties: {
      label: { type: "string" },
      confidence: { type: "number" },
    },
    required: ["label", "confidence"],
    additionalProperties: false,
  },
  context: { ticket: "My order hasn't arrived after 2 weeks" },
});
```

### `infer<T>(options): Promise<T>`

Lightweight inference — give it a value, get a typed interpretation.

```typescript
const parsed = await infer<{ iso: string }>({
  value: "Jan 5th 2025",
  hint: "Parse this into an ISO date",
  jsonSchema: {
    type: "object",
    properties: { iso: { type: "string" } },
    required: ["iso"],
    additionalProperties: false,
  },
});
// parsed.iso → "2025-01-05"
```

### `reason<T>(options): Promise<T>`

Multi-step chain-of-thought reasoning.

```typescript
const analysis = await reason<{ recommendation: string; risk: string }>({
  goal: "Analyze this investment portfolio",
  steps: [
    { number: 1, description: "Evaluate current allocation" },
    { number: 2, description: "Assess market conditions" },
    { number: 3, description: "Identify risks" },
    { number: 4, description: "Formulate recommendation" },
  ],
  jsonSchema: {
    type: "object",
    properties: {
      recommendation: { type: "string" },
      risk: { type: "string" },
    },
    required: ["recommendation", "risk"],
    additionalProperties: false,
  },
  context: { portfolio: { stocks: 60, bonds: 30, cash: 10 } },
});
```

## Agents and Tools

ThinkLang's agentic runtime is fully available from the library API. Define tools that the LLM can call, then run an agent loop that orchestrates tool use automatically.

### Defining Tools

Use `defineTool()` to create tools. It accepts Zod schemas or raw JSON Schema for the input:

```typescript
import { defineTool } from "thinklang";
import { z } from "zod";

const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation for relevant info",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const results = await docsIndex.search(query);
    return results.map(r => r.title).join("\n");
  },
});
```

### Running an Agent

Use `agent()` to start an agentic loop. The LLM calls tools as needed until it produces a final answer:

```typescript
import { agent, defineTool, zodSchema } from "thinklang";
import { z } from "zod";

const getWeather = defineTool({
  name: "getWeather",
  description: "Get weather for a city",
  input: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const res = await fetch(`https://api.weather.example/v1/${city}`);
    return res.text();
  },
});

const Report = z.object({
  city: z.string(),
  temperature: z.number(),
  conditions: z.string(),
  recommendation: z.string(),
});

const result = await agent<z.infer<typeof Report>>({
  prompt: "What is the weather in Tokyo? Recommend what to wear.",
  tools: [getWeather],
  ...zodSchema(Report),
  maxTurns: 5,
});

console.log(result.data);             // the Report object
console.log(result.turns);            // how many loop iterations
console.log(result.toolCallHistory);  // full history of tool calls
```

### Agent Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string` | required | The goal for the agent |
| `tools` | `Tool[]` | required | Tools the agent can call |
| `jsonSchema` | `object` | — | JSON Schema for the final output |
| `maxTurns` | `number` | `10` | Maximum loop iterations |
| `guards` | `GuardRule[]` | — | Validate the final output |
| `retryCount` | `number` | — | Retry the entire loop on failure |
| `fallback` | `() => T` | — | Fallback if all retries fail |
| `onToolCall` | `(call) => void` | — | Called before each tool executes |
| `onToolResult` | `(result) => void` | — | Called after each tool executes |
| `abortSignal` | `AbortSignal` | — | Cancel the agent loop |
| `context` | `object` | — | Context data for the agent |
| `model` | `string` | — | Override the default model |

### Built-in Tools

ThinkLang ships with opt-in built-in tools that you can pass to any agent:

```typescript
import { agent, fetchUrl, readFile, writeFile, runCommand } from "thinklang";

const result = await agent({
  prompt: "Read the README and summarize it",
  tools: [readFile],
  jsonSchema: { type: "string" },
  maxTurns: 3,
});
```

| Tool | Description |
|------|-------------|
| `fetchUrl` | Fetch a URL via HTTP GET |
| `readFile` | Read a local file |
| `writeFile` | Write content to a local file |
| `runCommand` | Run a shell command |

### Observability Hooks

Track what the agent is doing in real time:

```typescript
const result = await agent({
  prompt: "Research this topic",
  tools: [searchDocs],
  jsonSchema: { type: "string" },
  onToolCall: (call) => {
    console.log(`Calling tool: ${call.name}`, call.input);
  },
  onToolResult: (result) => {
    console.log(`Tool ${result.toolName}:`, result.isError ? "ERROR" : "OK");
  },
});
```

## Custom Providers

Implement the `ModelProvider` interface to use any LLM backend:

```typescript
import { setProvider, think, type ModelProvider, type CompleteOptions, type CompleteResult } from "thinklang";

class MyProvider implements ModelProvider {
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    const data = await myLLM.generate(options.userMessage, options.jsonSchema);
    return {
      data,
      usage: { inputTokens: 0, outputTokens: 0 },
      model: "my-model",
    };
  }
}

setProvider(new MyProvider());
const result = await think<string>({ prompt: "...", jsonSchema: { type: "string" } });
```

### Register a Custom Provider

You can also register providers by name so they work with `init()`:

```typescript
import { registerProvider, init } from "thinklang";

registerProvider("my-llm", (options) => {
  return new MyProvider(options.apiKey, options.model);
});

init({ provider: "my-llm", apiKey: "my-key" });
```

See the [Provider System](./providers.md) guide for full details.

## Cost Tracking

Every AI call automatically tracks token usage:

```typescript
import { think, globalCostTracker } from "thinklang";

await think<string>({ prompt: "Hello", jsonSchema: { type: "string" } });

const summary = globalCostTracker.getSummary();
console.log(`Cost: $${summary.totalCostUsd.toFixed(4)}`);
console.log(`Tokens: ${summary.totalInputTokens} in / ${summary.totalOutputTokens} out`);
```

## Error Handling

All runtime errors extend `ThinkError`:

```typescript
import { think, agent, ThinkError, SchemaViolation, GuardFailed, AgentMaxTurnsError, ToolExecutionError } from "thinklang";

try {
  await think<string>({ prompt: "...", jsonSchema: { type: "string" } });
} catch (error) {
  if (error instanceof SchemaViolation) {
    console.error("LLM output didn't match schema:", error.expected);
  } else if (error instanceof GuardFailed) {
    console.error("Guard failed:", error.guardName, error.constraint);
  } else if (error instanceof AgentMaxTurnsError) {
    console.error("Agent hit turn limit:", error.maxTurns);
  } else if (error instanceof ToolExecutionError) {
    console.error("Tool failed:", error.toolName, error.cause);
  } else if (error instanceof ThinkError) {
    console.error("ThinkLang error:", error.message);
  }
}
```

## Package Exports

ThinkLang exposes several entry points:

| Import path | Contents |
|-------------|----------|
| `thinklang` | Everything: init, think, infer, reason, agent, defineTool, zodSchema, errors, providers, cost tracking |
| `thinklang/runtime` | Runtime only (same as above, without compiler) |
| `thinklang/compiler` | `compile()` and `compileToAst()` for `.tl` source code |
| `thinklang/parser` | `parse()` and `parseSync()` for `.tl` source code |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Anthropic API key (auto-detected) |
| `OPENAI_API_KEY` | — | OpenAI API key (auto-detected) |
| `GEMINI_API_KEY` | — | Google Gemini API key (auto-detected) |
| `OLLAMA_BASE_URL` | — | Ollama server URL (auto-detected) |
| `THINKLANG_MODEL` | `claude-opus-4-6` | Default model |
| `THINKLANG_CACHE` | `true` | Enable response caching |

## Next Steps

- See `examples/js/` for runnable TypeScript examples
- Read the [Runtime API Reference](../reference/runtime-api.md) for full details
- Learn about [Agents & Tools](./agents.md) for agentic workflows
- Learn about the [Provider System](./providers.md) for multi-provider setup
- Learn about [Guards](./guards.md) for output validation
- Learn about [Error Handling](./error-handling.md) for all error types
