# Using ThinkLang as a Library

ThinkLang's runtime can be used directly in any JavaScript or TypeScript project. You get the same AI primitives (`think`, `infer`, `reason`) without writing `.tl` files.

## Installation

```bash
npm install thinklang
```

## Quick Start

If `ANTHROPIC_API_KEY` is in your environment, it works with zero configuration:

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

Use `init()` when you need to configure the API key or model explicitly:

```typescript
import { init, think } from "thinklang";

init({
  apiKey: "sk-ant-...",
  model: "claude-sonnet-4-20250514",
});

const result = await think<string>({
  prompt: "Say hello briefly",
  jsonSchema: { type: "string" },
});
```

If you don't call `init()`, the runtime auto-initializes from the `ANTHROPIC_API_KEY` environment variable on first use.

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

## Custom Providers

Implement the `ModelProvider` interface to use a different LLM backend:

```typescript
import { setProvider, think, type ModelProvider, type CompleteOptions, type CompleteResult } from "thinklang";

class MyProvider implements ModelProvider {
  async complete(options: CompleteOptions): Promise<CompleteResult> {
    // Call your LLM here
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
import { think, ThinkError, SchemaViolation, GuardFailed } from "thinklang";

try {
  await think<string>({ prompt: "...", jsonSchema: { type: "string" } });
} catch (error) {
  if (error instanceof SchemaViolation) {
    console.error("LLM output didn't match schema:", error.expected);
  } else if (error instanceof GuardFailed) {
    console.error("Guard failed:", error.guardName, error.constraint);
  } else if (error instanceof ThinkError) {
    console.error("ThinkLang error:", error.message);
  }
}
```

## Package Exports

ThinkLang exposes several entry points:

| Import path | Contents |
|-------------|----------|
| `thinklang` | Everything: init, think, infer, reason, zodSchema, errors, providers, cost tracking |
| `thinklang/runtime` | Runtime only (same as above, without compiler) |
| `thinklang/compiler` | `compile()` and `compileToAst()` for `.tl` source code |
| `thinklang/parser` | `parse()` and `parseSync()` for `.tl` source code |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | API key (auto-detected by runtime) |
| `THINKLANG_MODEL` | `claude-opus-4-6` | Default model |
| `THINKLANG_CACHE` | `true` | Enable response caching |

## Next Steps

- See `examples/js/` for runnable TypeScript examples
- Read the [Runtime API Reference](../reference/runtime-api.md) for full details
- Learn about [Guards](./guards.md) for output validation
- Learn about [Error Handling](./error-handling.md) for all error types
