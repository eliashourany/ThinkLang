# Library Quick Start

ThinkLang's runtime can be used directly in any JavaScript or TypeScript project. You get the same AI primitives (`think`, `infer`, `reason`), agentic tool-calling (`agent`, `defineTool`), and multi-provider support --- all without writing `.tl` files.

::: tip Looking for the language guide?
If you want to write `.tl` files and use the CLI, see the [Language Getting Started](/guide/getting-started).
:::

## Installation

```bash
npm install thinklang
```

## Zero-Config Quick Start

If any supported API key is in your environment (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`), it works with zero configuration:

```typescript
import { think } from "thinklang";

const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});
console.log(greeting);
```

That is all you need. The runtime auto-detects the provider from whichever API key is set and initializes itself on first use.

## Using Zod Schemas (Recommended)

Writing JSON schemas by hand gets tedious fast. The `zodSchema()` helper converts [Zod](https://zod.dev) types to JSON Schema so you can define structured outputs with full TypeScript type inference:

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

`zodSchema()` supports all common Zod types: objects, strings, numbers, booleans, enums, arrays, optionals, nullable, unions, literals, records, and nested objects. `.describe()` annotations are preserved as `description` fields in the generated JSON Schema.

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

If you don't call `init()`, the runtime auto-initializes from environment variables on first use.

## Package Entry Points

ThinkLang exposes several entry points so you can import only what you need:

| Import path | Contents |
|---|---|
| `thinklang` | Everything: init, think, infer, reason, agent, defineTool, zodSchema, errors, providers, cost tracking |
| `thinklang/runtime` | Runtime only |
| `thinklang/compiler` | `compile()` and `compileToAst()` for `.tl` source code |
| `thinklang/parser` | `parse()` and `parseSync()` for `.tl` source code |
| `thinklang/data` | Big data: batch, Dataset, mapThink, reduceThink, chunking, streaming |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | --- | Anthropic API key (auto-detected) |
| `OPENAI_API_KEY` | --- | OpenAI API key (auto-detected) |
| `GEMINI_API_KEY` | --- | Google Gemini API key (auto-detected) |
| `OLLAMA_BASE_URL` | --- | Ollama server URL (auto-detected) |
| `THINKLANG_MODEL` | `claude-opus-4-6` | Default model |
| `THINKLANG_CACHE` | `true` | Enable response caching |

## Next Steps

- [Core Functions](./core-functions.md) --- think, infer, and reason in detail
- [Agents & Tools](./agents-tools.md) --- agentic workflows and tool definitions
- [Big Data & Streaming](./big-data.md) --- batch processing, datasets, map-reduce, and streaming
- [Providers](./providers.md) --- multi-provider setup and custom providers
- [Error Handling](./error-handling.md) --- all error types and recovery patterns
- [Runtime API Reference](/reference/runtime-api) --- full API details
- `examples/js/` --- runnable TypeScript examples
