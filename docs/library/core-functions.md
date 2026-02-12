# Core Functions

ThinkLang provides three core AI functions for different tasks. Each function sends a prompt to a configured LLM provider and returns structured, typed data.

- **`think`** -- general-purpose LLM call
- **`infer`** -- lightweight classification or interpretation of an existing value
- **`reason`** -- multi-step chain-of-thought reasoning

## think\<T\>(options): Promise\<T\>

General-purpose LLM call. Send a prompt, get structured data back.

### Basic usage

```typescript
const greeting = await think<string>({
  prompt: "Say hello",
  jsonSchema: { type: "string" },
});
```

### With Zod schema

```typescript
import { z } from "zod";
import { think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of this review",
  ...zodSchema(Sentiment),
  context: { review: "Great product!" },
});
```

### With context

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

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Yes | The prompt sent to the LLM |
| `jsonSchema` | `object` | Yes | JSON Schema for the expected output |
| `context` | `object` | No | Context data made available to the LLM |
| `withoutKeys` | `string[]` | No | Keys to exclude from context |
| `guards` | `GuardRule[]` | No | Validation rules applied to the result |
| `retryCount` | `number` | No | Number of retry attempts on failure |
| `fallback` | `() => unknown` | No | Fallback value if all retries fail |
| `schemaName` | `string` | No | Optional name for the schema |
| `model` | `string` | No | Override the default model |

### Behavior

1. Checks cache for identical prior call. Returns cached result on hit.
2. Builds system prompt and user message from prompt and context.
3. Calls the configured ModelProvider.
4. Records usage in global CostTracker.
5. Evaluates guard rules (if any). Throws `GuardFailed` on violation.
6. Stores result in cache.

## infer\<T\>(options): Promise\<T\>

Lightweight inference -- give it a value, get a typed interpretation.

```typescript
import { infer } from "thinklang";

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

Another example:

```typescript
const priority = await infer<string>({
  value: "urgent: server is down!",
  hint: "Classify priority as low, medium, high, or critical",
  jsonSchema: { type: "string" },
});
```

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `value` | `unknown` | Yes | The input value to transform/classify |
| `hint` | `string` | No | Optional hint describing the transformation |
| `jsonSchema` | `object` | Yes | JSON Schema for the expected output |
| `context` | `object` | No | Additional context |
| `withoutKeys` | `string[]` | No | Keys to exclude from context |
| `guards` | `GuardRule[]` | No | Validation rules |
| `retryCount` | `number` | No | Retry attempts |
| `fallback` | `() => unknown` | No | Fallback value |

## reason\<T\>(options): Promise\<T\>

Multi-step chain-of-thought reasoning. Guide the LLM through explicit steps.

```typescript
import { reason, zodSchema } from "thinklang";
import { z } from "zod";

const Analysis = z.object({
  recommendation: z.string(),
  risk: z.string(),
});

const analysis = await reason<z.infer<typeof Analysis>>({
  goal: "Analyze this investment portfolio",
  steps: [
    { number: 1, description: "Evaluate current allocation" },
    { number: 2, description: "Assess market conditions" },
    { number: 3, description: "Identify risks" },
    { number: 4, description: "Formulate recommendation" },
  ],
  ...zodSchema(Analysis),
  context: { portfolio: { stocks: 60, bonds: 30, cash: 10 } },
});
```

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `goal` | `string` | Yes | The reasoning objective |
| `steps` | `ReasonStep[]` | Yes | Ordered steps for the LLM to follow |
| `jsonSchema` | `object` | Yes | JSON Schema for the expected output |
| `context` | `object` | No | Context data |
| `withoutKeys` | `string[]` | No | Keys to exclude |
| `guards` | `GuardRule[]` | No | Validation rules |
| `retryCount` | `number` | No | Retry attempts |
| `fallback` | `() => unknown` | No | Fallback value |

`ReasonStep`: `{ number: number; description: string }`

## Comparison

| Function | Use case | Input |
|---|---|---|
| `think` | Generate structured data from a prompt | Prompt + optional context |
| `infer` | Classify or interpret an existing value | Value + optional hint |
| `reason` | Complex analysis with explicit steps | Goal + numbered steps |

All three functions support context, guards, retry, and fallback options.

## Next Steps

- [Agents & Tools](./agents-tools.md) for multi-turn tool calling
- [Big Data & Streaming](./big-data.md) for batch processing
- [Error Handling](./error-handling.md) for handling failures
- [Runtime API Reference](/reference/runtime-api) for complete type definitions
