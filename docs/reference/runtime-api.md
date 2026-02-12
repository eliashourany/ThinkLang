# ThinkLang Runtime API Reference

The ThinkLang runtime is a TypeScript library that powers both compiled ThinkLang programs and direct JS/TS usage. It provides AI integration, confidence tracking, guards, caching, cost tracking, and error handling.

Install and use directly in any JS/TS project:

```bash
npm install thinklang
```

```typescript
import { init, think, infer, reason, zodSchema } from "thinklang";
```

---

## Initialization

### `init(options?: InitOptions): void`

Convenience function to configure the runtime. Reads `ANTHROPIC_API_KEY` from environment by default.

```typescript
interface InitOptions {
  apiKey?: string;   // Defaults to process.env.ANTHROPIC_API_KEY
  model?: string;    // Defaults to process.env.THINKLANG_MODEL or "claude-opus-4-6"
}
```

**Usage:**

```typescript
// Auto-detect from environment
init();

// Explicit configuration
init({ apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514" });
```

If you don't call `init()`, the runtime auto-initializes from `ANTHROPIC_API_KEY` on first AI call.

---

## Core Functions

### `think<T = unknown>(options: ThinkOptions): Promise<T>`

Sends a prompt to the configured LLM and returns a structured response conforming to the provided JSON Schema.

```typescript
interface ThinkOptions {
  jsonSchema: Record<string, unknown>;  // JSON Schema for the expected output
  prompt: string;                       // The prompt sent to the LLM
  context?: Record<string, unknown>;    // Context data made available to the LLM
  withoutKeys?: string[];               // Keys to exclude from context
  guards?: GuardRule[];                 // Validation rules applied to the result
  retryCount?: number;                  // Number of retry attempts on failure
  fallback?: () => unknown;             // Fallback value if all retries fail
  schemaName?: string;                  // Optional name for the schema
}
```

**Behavior:**

1. Checks the cache for an identical prior call. Returns cached result on hit.
2. Builds a system prompt and user message from the prompt and context.
3. Calls the configured `ModelProvider`.
4. Records usage in the global `CostTracker`.
5. Evaluates guard rules (if any). Throws `GuardFailed` on violation.
6. Stores the result in the cache.
7. If the schema has the `Confident` shape (`value` + `confidence` properties), wraps the result in a `Confident<T>` instance.

**Corresponding ThinkLang syntax:**

```thinklang
let result = think<MyType>("Analyze this data")
  with context: inputData
  guard { length: 10..500 }
  on_fail: retry(3)
```

---

### `infer<T = unknown>(options: InferOptions): Promise<T>`

Lightweight inference. Transforms, classifies, or derives a new value from an existing one.

```typescript
interface InferOptions {
  jsonSchema: Record<string, unknown>;  // JSON Schema for the expected output
  value: unknown;                       // The input value to transform/classify
  hint?: string;                        // Optional hint describing the desired transformation
  context?: Record<string, unknown>;    // Context data
  withoutKeys?: string[];               // Keys to exclude from context
  guards?: GuardRule[];                 // Validation rules
  retryCount?: number;                  // Retry attempts
  fallback?: () => unknown;             // Fallback value
  schemaName?: string;                  // Optional schema name
}
```

**Behavior:**

Same pipeline as `think`, but the prompt is built from the `value` and optional `hint` rather than a free-form prompt string.

**Corresponding ThinkLang syntax:**

```thinklang
let lang = infer<string>("Bonjour le monde", "Detect the language")
```

---

### `reason<T = unknown>(options: ReasonOptions): Promise<T>`

Multi-step reasoning. Guides the LLM through numbered steps toward a stated goal.

```typescript
interface ReasonStep {
  number: number;
  description: string;
}

interface ReasonOptions {
  jsonSchema: Record<string, unknown>;  // JSON Schema for the expected output
  goal: string;                         // The reasoning objective
  steps: ReasonStep[];                  // Ordered steps for the LLM to follow
  context?: Record<string, unknown>;    // Context data
  withoutKeys?: string[];               // Keys to exclude from context
  guards?: GuardRule[];                 // Validation rules
  retryCount?: number;                  // Retry attempts
  fallback?: () => unknown;             // Fallback value
  schemaName?: string;                  // Optional schema name
}
```

**Behavior:**

Same pipeline as `think`, but the prompt incorporates the goal and step descriptions to structure the LLM's reasoning process.

**Corresponding ThinkLang syntax:**

```thinklang
let analysis = reason<InvestmentAnalysis> {
  goal: "Analyze the portfolio"
  steps:
    1. "Evaluate current allocation"
    2. "Assess market conditions"
    3. "Identify risks"
    4. "Formulate recommendation"
  with context: { portfolio, market }
}
```

---

## `Confident<T>` Class

Wraps a value with a confidence score and reasoning string. Returned automatically when the type argument to `think`, `infer`, or `reason` is `Confident<T>`.

### Constructor

```typescript
new Confident<T>(value: T, confidence: number, reasoning?: string)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `value` | `T` | The wrapped value |
| `confidence` | `number` | Confidence score between 0 and 1 |
| `reasoning` | `string` | Explanation of why this confidence level was assigned |

### Methods

#### `isConfident(threshold?: number): boolean`

Returns `true` if the confidence meets or exceeds the threshold.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | `number` | `0.7` | Minimum confidence level |

```thinklang
if result.isConfident(0.9) {
  print "High confidence"
}
```

#### `unwrap(threshold?: number): T`

Returns the inner value. Throws `ConfidenceTooLow` if confidence is below the threshold.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | `number` | `0.0` | Minimum confidence level |

```thinklang
let value = result.unwrap()         // always unwraps
let safe = result.unwrap(0.5)       // throws if confidence < 0.5
```

#### `expect(threshold: number): T`

Returns the inner value. Throws `ConfidenceTooLow` if confidence is below the threshold.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `threshold` | `number` | Yes | Minimum confidence level |

```thinklang
let value = result.expect(0.8)
```

#### `or(fallback: T): T`

Returns the inner value if confidence meets the default threshold (0.7), otherwise returns the fallback.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fallback` | `T` | Value to return when confidence is low |

```thinklang
let label = result.or("unknown")
```

#### `map<U>(fn: (value: T) => U): Confident<U>`

Transforms the inner value while preserving the confidence score and reasoning.

```typescript
const upperResult = result.map(v => v.toUpperCase());
```

#### `static combine<T>(items: Confident<T>[]): Confident<T[]>`

Combines multiple `Confident` values into a single `Confident` containing an array. The combined confidence is the average of all item confidences.

```typescript
const combined = Confident.combine([conf1, conf2, conf3]);
```

#### `toString(): string`

Returns a human-readable representation: `Confident(<value>, confidence=<n>)`.

#### `toJSON(): object`

Returns a plain object with `value`, `confidence`, and `reasoning` fields.

---

## Guard Evaluation

### `evaluateGuards(value: unknown, rules: GuardRule[]): GuardResult`

Validates a value against an array of guard rules. Throws `GuardFailed` on the first rule violation.

```typescript
interface GuardRule {
  name: string;           // Rule name: "length", "contains_none", "passes", or custom
  constraint: unknown;    // The constraint value or function
  rangeEnd?: unknown;     // End of range (for range constraints like min..max)
}

interface GuardResult {
  passed: boolean;
  failures: GuardFailure[];
}

interface GuardFailure {
  guardName: string;
  constraint: string;
  actualValue: unknown;
}
```

### Built-in Guard Rules

| Rule | Constraint | Description |
|------|-----------|-------------|
| `length` | `min..max` (numeric range) | Checks string length is within bounds |
| `contains_none` | Array of strings | Ensures output contains none of the forbidden terms |
| `passes` | Function `(value) => boolean` | Runs a custom validator |
| *(any other name)* | `min..max` (numeric range) | Generic numeric range check |

---

## Error Classes

All runtime errors extend `ThinkError`, which extends the built-in `Error`.

### `ThinkError`

Base class for all ThinkLang runtime errors.

```typescript
class ThinkError extends Error {
  constructor(message: string)
}
```

### `SchemaViolation`

Thrown when the LLM output does not conform to the expected JSON Schema.

```typescript
class SchemaViolation extends ThinkError {
  readonly expected: string;   // Description of expected type
  readonly got: unknown;       // The actual value received
}
```

### `ConfidenceTooLow`

Thrown by `Confident.unwrap()` or `Confident.expect()` when the confidence is below the required threshold.

```typescript
class ConfidenceTooLow extends ThinkError {
  readonly threshold: number;  // The required minimum confidence
  readonly actual: number;     // The actual confidence value
}
```

### `GuardFailed`

Thrown when a guard rule validation fails.

```typescript
class GuardFailed extends ThinkError {
  readonly guardName: string;    // Name of the failed guard
  readonly guardValue: unknown;  // The actual value that failed
  readonly constraint: string;   // Description of the constraint
}
```

### `TokenBudgetExceeded`

Thrown when the operation exceeds the configured token budget.

```typescript
class TokenBudgetExceeded extends ThinkError {
  readonly budget: number;     // The configured budget
  readonly required: number;   // The tokens actually needed
}
```

### `ModelUnavailable`

Thrown when the specified model cannot be reached.

```typescript
class ModelUnavailable extends ThinkError {
  readonly model: string;  // The model that was requested
}
```

### `Timeout`

Thrown when an operation exceeds its time limit.

```typescript
class Timeout extends ThinkError {
  readonly durationMs: number;  // The duration before timeout
}
```

---

## CostTracker

Tracks token usage and estimated costs across all AI operations.

### `globalCostTracker` (singleton)

The global `CostTracker` instance used by all runtime functions.

### `CostTracker.record(opts)`

Records a usage entry.

```typescript
record(opts: {
  operation: "think" | "infer" | "reason" | "semantic_assert";
  model: string;
  inputTokens: number;
  outputTokens: number;
  prompt?: string;
  durationMs: number;
}): void
```

### `CostTracker.getSummary(): CostSummary`

Returns an aggregate summary of all recorded usage.

```typescript
interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCalls: number;
  byOperation: Map<string, OperationSummary>;
  byModel: Map<string, OperationSummary>;
}

interface OperationSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
```

### `CostTracker.getRecords(): UsageRecord[]`

Returns a copy of all individual usage records.

```typescript
interface UsageRecord {
  timestamp: number;
  operation: "think" | "infer" | "reason" | "semantic_assert";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  prompt?: string;
  durationMs: number;
}
```

### `CostTracker.reset(): void`

Clears all recorded usage data.

### Supported Model Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `claude-opus-4-6` | $15.00 | $75.00 |
| `claude-sonnet-4-5-20250929` | $3.00 | $15.00 |
| `claude-haiku-4-5-20251001` | $0.80 | $4.00 |
| `claude-3-5-sonnet-20241022` | $3.00 | $15.00 |
| `claude-3-5-haiku-20241022` | $0.80 | $4.00 |
| `claude-3-opus-20240229` | $15.00 | $75.00 |

---

## Cache

### `ExactMatchCache`

An in-memory cache with TTL-based expiration. Cache keys are SHA-256 hashes of the prompt, context, and schema combined.

```typescript
class ExactMatchCache {
  constructor(ttlMs?: number)  // Default: 3,600,000 (1 hour)

  get(prompt: string, context: unknown, schema: unknown): unknown | undefined
  set(prompt: string, context: unknown, schema: unknown, value: unknown, ttlMs?: number): void
  clear(): void
  readonly size: number
}
```

Caching is enabled by default. Set `THINKLANG_CACHE=false` to disable.

### `globalCache` (singleton)

The global `ExactMatchCache` instance used by `think`, `infer`, and `reason`.

---

## Provider Interface

### `ModelProvider`

The interface that any LLM provider must implement.

```typescript
interface ModelProvider {
  complete(options: CompleteOptions): Promise<CompleteResult>;
}

interface CompleteOptions {
  systemPrompt: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  schemaName?: string;
  model?: string;
  maxTokens?: number;
}

interface CompleteResult {
  data: unknown;
  usage: UsageInfo;
  model: string;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}
```

### `setProvider(provider: ModelProvider): void`

Registers a `ModelProvider` as the active provider for all AI calls.

### `getProvider(): ModelProvider`

Returns the currently configured provider. If no provider has been explicitly set, auto-initializes from the `ANTHROPIC_API_KEY` environment variable. Throws if no provider is configured and no env var is available.

### `AnthropicProvider`

The built-in provider that uses the Anthropic SDK. Configured automatically when `ANTHROPIC_API_KEY` is set.

```typescript
class AnthropicProvider implements ModelProvider {
  constructor(apiKey: string)
}
```

---

## Retry

### `withRetry<T>(fn, options): Promise<T>`

Executes a function with automatic retry on failure, using exponential backoff.

```typescript
interface RetryOptions {
  attempts: number;            // Maximum number of attempts
  baseDelayMs?: number;        // Base delay in ms (default: 500)
  onRetry?: (attempt: number, error: Error) => void;  // Callback on each retry
  fallback?: () => unknown;    // Value to return if all retries fail
}
```

Backoff formula: `baseDelayMs * 2^(attempt - 1)`.

---

## Context Manager

### `truncateContext(context, options?): Record<string, unknown>`

Truncates context to fit within a token budget. Largest entries are truncated first.

```typescript
interface ContextManagerOptions {
  maxTokens?: number;      // Default: 100,000
  charsPerToken?: number;  // Default: 4
}
```

### `excludeFromContext(context, exclusions): Record<string, unknown>`

Removes specified keys from the context object. Used by the `without context:` clause.

---

## Zod Schema Helper

### `zodSchema<T>(schema: ZodType<T>): { jsonSchema: Record<string, unknown> }`

Converts a Zod schema into the JSON Schema object expected by `think`, `infer`, and `reason`. The result spreads directly into the options object.

```typescript
import { z } from "zod";
import { think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze sentiment",
  ...zodSchema(Sentiment),
});
```

**Supported Zod types:**

| Zod Type | JSON Schema |
|----------|-------------|
| `z.string()` | `{ type: "string" }` |
| `z.number()` | `{ type: "number" }` |
| `z.boolean()` | `{ type: "boolean" }` |
| `z.enum([...])` | `{ type: "string", enum: [...] }` |
| `z.array(T)` | `{ type: "array", items: T }` |
| `z.object({...})` | `{ type: "object", properties: {...}, required: [...] }` |
| `z.optional(T)` | Field excluded from `required` |
| `z.nullable(T)` | `{ anyOf: [T, { type: "null" }] }` |
| `z.union([...])` | `{ anyOf: [...] }` |
| `z.literal(v)` | `{ type: ..., const: v }` |
| `z.record(K, V)` | `{ type: "object", additionalProperties: V }` |

Descriptions set via `.describe()` are preserved in the JSON Schema output.
