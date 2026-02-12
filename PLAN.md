# Plan: Make ThinkLang easy to consume as a JS/TS library

## Problem Analysis

Today, `thinklang` is packaged as a CLI tool that happens to have importable internals. A JS/TS developer who wants to use the AI runtime (`think`, `infer`, `reason`) in their project faces these friction points:

| Problem | Impact |
|---------|--------|
| `main` points to `dist/cli/index.js` | `import ... from "thinklang"` gives the CLI, not a library API |
| No `exports` map in package.json | Consumers must guess deep import paths like `thinklang/dist/runtime/index.js` |
| No `types` field | TypeScript can't auto-resolve type declarations |
| No root barrel export (`src/index.ts`) | No single import for the most-used symbols |
| Must manually call `setProvider(new AnthropicProvider(key))` before any call | Boilerplate before you can do anything useful |
| `think()` / `infer()` / `reason()` return `Promise<unknown>` | No type safety on results despite Zod being a dependency |
| JSON schema must be hand-written | Tedious; Zod schemas are the JS-ecosystem standard |
| `.npmignore` strips `*.d.ts.map` | "Go to Definition" in consumer IDEs lands on `.d.ts` stubs, not readable source |
| All deps installed even for library use | `commander`, `chalk`, `vscode-languageserver` are irrelevant for runtime consumers |
| No JS/TS usage examples | Only `.tl` examples exist; no guidance for programmatic use |

## Implementation Plan

### Step 1 — Root barrel export (`src/index.ts`)

Create `src/index.ts` that re-exports the public API surface:

```ts
// Core AI functions
export { think, type ThinkOptions } from "./runtime/think.js";
export { infer, type InferOptions } from "./runtime/infer.js";
export { reason, type ReasonOptions, type ReasonStep } from "./runtime/reason.js";

// Guards
export { evaluateGuards, type GuardRule, type GuardResult } from "./runtime/guard.js";

// Provider system
export {
  type ModelProvider, type CompleteOptions, type CompleteResult, type UsageInfo,
  setProvider, getProvider,
} from "./runtime/provider.js";
export { AnthropicProvider } from "./runtime/anthropic-provider.js";

// Utilities
export { Confident } from "./runtime/confident.js";
export { withRetry, type RetryOptions } from "./runtime/retry.js";
export { ExactMatchCache, globalCache } from "./runtime/cache.js";
export { truncateContext, excludeFromContext } from "./runtime/context-manager.js";

// Cost tracking
export { CostTracker, globalCostTracker, type UsageRecord, type CostSummary, type OperationSummary } from "./runtime/cost-tracker.js";

// Errors
export {
  ThinkError, SchemaViolation, ConfidenceTooLow, GuardFailed,
  TokenBudgetExceeded, ModelUnavailable, Timeout,
} from "./runtime/errors.js";

// Convenience initializer (new — see Step 3)
export { init } from "./runtime/init.js";

// Compiler (for advanced use)
export { compile, compileToAst, type CompileOptions, type CompileResult } from "./compiler/index.js";
```

This gives consumers a single clean import:
```ts
import { init, think, infer } from "thinklang";
```

### Step 2 — Package.json: `exports`, `main`, `types`

```jsonc
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./runtime": {
      "import": "./dist/runtime/index.js",
      "types": "./dist/runtime/index.d.ts"
    },
    "./compiler": {
      "import": "./dist/compiler/index.js",
      "types": "./dist/compiler/index.d.ts"
    },
    "./parser": {
      "import": "./dist/parser/index.js",
      "types": "./dist/parser/index.d.ts"
    }
  }
}
```

- `import { think } from "thinklang"` now works
- `import { think } from "thinklang/runtime"` also works for tree-shaking-conscious consumers
- `import { compile } from "thinklang/compiler"` keeps compiler separate

### Step 3 — `init()` convenience function (`src/runtime/init.ts`)

Eliminate the boilerplate of constructing a provider manually:

```ts
import { AnthropicProvider } from "./anthropic-provider.js";
import { setProvider } from "./provider.js";

export interface InitOptions {
  apiKey?: string;   // defaults to ANTHROPIC_API_KEY env var
  model?: string;    // defaults to THINKLANG_MODEL env var or "claude-sonnet-4-20250514"
}

export function init(options: InitOptions = {}): void {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No API key provided. Pass { apiKey } to init() or set ANTHROPIC_API_KEY environment variable."
    );
  }
  setProvider(new AnthropicProvider(apiKey, options.model));
}
```

**Before (current):**
```ts
import { AnthropicProvider } from "thinklang/dist/runtime/anthropic-provider.js";
import { setProvider } from "thinklang/dist/runtime/provider.js";
import { think } from "thinklang/dist/runtime/think.js";

setProvider(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
const result = await think({ prompt: "...", jsonSchema: {...} });
```

**After:**
```ts
import { init, think } from "thinklang";

init(); // reads ANTHROPIC_API_KEY from env
const result = await think({ prompt: "...", jsonSchema: {...} });
```

### Step 4 — Generic return types + Zod schema helper

**4a. Make core functions generic:**

Change signatures from returning `Promise<unknown>` to `Promise<T>`:

```ts
// think.ts
export async function think<T = unknown>(options: ThinkOptions): Promise<T> { ... }

// infer.ts
export async function infer<T = unknown>(options: InferOptions): Promise<T> { ... }

// reason.ts
export async function reason<T = unknown>(options: ReasonOptions): Promise<T> { ... }
```

This is backward-compatible — `T` defaults to `unknown`, but consumers can now write:

```ts
interface Sentiment { label: string; score: number }
const result = await think<Sentiment>({ prompt: "...", jsonSchema: sentimentSchema });
// result is typed as Sentiment
```

**4b. Add `zodSchema()` helper (`src/runtime/zod-schema.ts`):**

Zod is already a dependency. Add a thin utility that converts a Zod type to the JSON schema format expected by the runtime:

```ts
import { type ZodType } from "zod";

export function zodSchema<T>(schema: ZodType<T>): {
  jsonSchema: Record<string, unknown>;
  _phantom?: T;  // carries the type for inference
} {
  // Use Zod's built-in .toJsonSchema() (available since Zod 3.24)
  // or implement a minimal converter for object/string/number/boolean/array/enum
  return { jsonSchema: zodToJsonSchema(schema) };
}
```

This enables the ideal developer experience:

```ts
import { z } from "zod";
import { init, think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

init();
const result = await think({
  prompt: "Analyze sentiment of: 'Great product!'",
  ...zodSchema(Sentiment),
});
// result is typed as { label: "positive" | "negative" | "neutral"; score: number }
```

Implementation note: Check if the installed Zod version supports `.toJsonSchema()` (Zod 3.24+). If not, use the popular `zod-to-json-schema` package (add as dependency), or write a minimal recursive converter covering object, string, number, boolean, array, enum, and optional — which covers 95% of use cases.

### Step 5 — Fix `.npmignore` for better IDE experience

Remove `*.d.ts.map` from `.npmignore` so that consumers get "Go to Definition" support that navigates to the TypeScript source declarations rather than opaque `.d.ts` files:

```diff
- *.d.ts.map
```

The `.d.ts.map` files are small and meaningfully improve the library consumer DX.

### Step 6 — Auto-init with lazy provider

Make the provider auto-initialize on first use if `ANTHROPIC_API_KEY` is set, so the simplest possible usage requires zero setup:

In `provider.ts`, change `getProvider()`:

```ts
export function getProvider(): ModelProvider {
  if (!currentProvider) {
    // Auto-init from environment if possible
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const { AnthropicProvider } = require("./anthropic-provider.js");
      currentProvider = new AnthropicProvider(apiKey);
    } else {
      throw new Error(
        "No ModelProvider configured. Set ANTHROPIC_API_KEY in environment or call init()."
      );
    }
  }
  return currentProvider;
}
```

This means the absolute simplest usage is:

```ts
// ANTHROPIC_API_KEY is set in environment
import { think } from "thinklang";

const result = await think({ prompt: "...", jsonSchema: {...} });
// Just works — no init() call needed
```

While `init()` still exists for explicit configuration (custom API key, model override, etc.).

Note: Use dynamic `import()` instead of `require()` since the project is ESM.

### Step 7 — Move CLI/LSP-only deps to optional or restructure

Currently `npm install thinklang` pulls in `commander`, `chalk`, `vscode-languageserver`, and `vscode-languageserver-textdocument` — none of which are needed by library consumers.

**Option A (minimal change):** Move them to `optionalDependencies` or add a note that they're only used by the CLI/LSP. The library code never imports them, so they're dead weight but harmless.

**Option B (recommended):** Move CLI-only deps to `peerDependencies` with `peerDependenciesMeta` marking them optional, or restructure into a monorepo where `thinklang` is the runtime library and `thinklang-cli` is the CLI wrapper.

**Pragmatic recommendation for v0.x:** Keep all deps in `dependencies` for now (simplicity), but add a comment in package.json and document that library consumers only load the runtime modules. Revisit when the package grows. The `exports` map already ensures library consumers don't accidentally import CLI code.

### Step 8 — Add JS/TS usage examples

Create `examples/js/` with a few TypeScript examples showing programmatic usage:

- `examples/js/basic-think.ts` — Minimal think call
- `examples/js/with-zod.ts` — Using Zod schemas for typed results
- `examples/js/custom-provider.ts` — Implementing a custom ModelProvider
- `examples/js/cost-tracking.ts` — Monitoring token usage and costs

### Summary — Before vs. After

**Before (current state):**
```ts
import { AnthropicProvider } from "thinklang/dist/runtime/anthropic-provider.js";
import { setProvider } from "thinklang/dist/runtime/provider.js";
import { think } from "thinklang/dist/runtime/think.js";

setProvider(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));

const result = await think({
  prompt: "Classify this text",
  jsonSchema: {
    type: "object",
    properties: {
      label: { type: "string", enum: ["positive", "negative", "neutral"] },
      score: { type: "number" },
    },
    required: ["label", "score"],
    additionalProperties: false,
  },
});
// result is `unknown` — no type safety
```

**After (with all changes):**
```ts
import { think, zodSchema } from "thinklang";
import { z } from "zod";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await think({
  prompt: "Classify this text",
  ...zodSchema(Sentiment),
});
// result is { label: "positive" | "negative" | "neutral"; score: number }
```

Or at absolute minimum (env var set, no Zod):
```ts
import { think } from "thinklang";

const result = await think<{ label: string }>({
  prompt: "Classify this text",
  jsonSchema: { type: "object", properties: { label: { type: "string" } }, required: ["label"] },
});
// result is { label: string }
```

## Priority Order

| Priority | Step | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Step 1 — Root barrel export | Small | Enables clean imports |
| **P0** | Step 2 — `exports` map in package.json | Small | Makes package resolution work |
| **P0** | Step 3 — `init()` function | Small | Eliminates boilerplate |
| **P1** | Step 6 — Auto-init lazy provider | Small | Zero-config for env-var users |
| **P1** | Step 4a — Generic return types | Small | Type safety, backward-compat |
| **P1** | Step 4b — `zodSchema()` helper | Medium | Modern DX, typed results |
| **P1** | Step 5 — Fix .npmignore | Trivial | Better IDE navigation |
| **P2** | Step 8 — JS/TS examples | Medium | Discoverability |
| **P3** | Step 7 — Dep restructuring | Large | Smaller install size |
