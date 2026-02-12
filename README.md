# ThinkLang

An AI-native programming language where `think` is a keyword.

ThinkLang compiles to TypeScript that calls an LLM runtime, letting you write AI-powered programs with structured types, confidence tracking, guards, and pattern matching — all as first-class language features.

```
let greeting = think<string>("Say hello to the world in a creative way")
print greeting
```

## Features

**AI Primitives** — `think`, `infer`, and `reason` are keywords, not library calls.

```
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Intensity from 1-10")
  intensity: int
}

let sentiment = think<Confident<Sentiment>>("Analyze the sentiment of this review")
  with context: review
```

**Type-Safe AI Output** — Define structured types that compile to JSON schemas. The LLM is constrained to return valid data matching your types.

**Confidence Tracking** — `Confident<T>` wraps AI responses with confidence scores and reasoning. Use `.unwrap()`, `.expect(threshold)`, or `.or(fallback)` to handle uncertainty.

**Guards** — Validate AI output with declarative constraints and automatic retry.

```
let summary = think<string>("Summarize this article")
  with context: article
  guard {
    length: 50..200
    contains_none: ["AI", "language model"]
  }
  on_fail: retry(3) then fallback("Could not generate summary")
```

**Pattern Matching** — Match on AI-generated structured data.

```
match sentiment {
  { label: "positive", intensity: >= 8 } => print "Very positive!"
  { label: "negative" } => print "Negative sentiment detected"
  _ => print "Neutral or mild sentiment"
}
```

**Pipeline Operator** — Chain AI operations with `|>`.

**Reason Blocks** — Multi-step AI reasoning with explicit goals and steps.

**Modules** — Split code across files with `import`. Types and functions are automatically importable.

```
import { Sentiment, analyzeSentiment } from "./types.tl"

let result = analyzeSentiment("Great product!")
print result
```

**Context Management** — Pass context to AI calls with `with context:` and exclude sensitive data with `without context:`.

**Error Handling** — Typed error hierarchy (`SchemaViolation`, `ConfidenceTooLow`, `GuardFailed`, etc.) with `try`/`catch`.

## Use as a Library (JS/TS)

ThinkLang's runtime can be used directly in any JavaScript or TypeScript project — no `.tl` files needed.

```bash
npm install thinklang
```

### Simplest usage (zero config)

If `ANTHROPIC_API_KEY` is in your environment, it just works:

```typescript
import { think } from "thinklang";

const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});
console.log(greeting);
```

### With Zod schemas (recommended)

Use `zodSchema()` to define typed output with [Zod](https://zod.dev) — no hand-written JSON schemas:

```typescript
import { z } from "zod";
import { think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of: 'Great product!'",
  ...zodSchema(Sentiment),
});
// result is typed as { label: "positive" | "negative" | "neutral"; score: number }
```

### Explicit initialization

```typescript
import { init, think } from "thinklang";

init({ apiKey: "sk-ant-...", model: "claude-sonnet-4-20250514" });

const result = await think<string>({
  prompt: "Say hello briefly",
  jsonSchema: { type: "string" },
});
```

### Core functions

| Function | Purpose |
|----------|---------|
| `think<T>(options)` | General-purpose LLM call with structured output |
| `infer<T>(options)` | Type inference / transformation on a given value |
| `reason<T>(options)` | Multi-step chain-of-thought reasoning |

All three return `Promise<T>` with structured, schema-validated data. See the [Runtime API reference](https://thinklang.dev/reference/runtime-api) and `examples/js/` for more.

---

## Use as a Language (CLI)

ThinkLang is also a full programming language where `think` is a keyword. Write `.tl` files and run them with the CLI.

### Prerequisites

- Node.js 18+
- An Anthropic API key

### Install

```bash
# Global install
npm install -g thinklang

# Or use npx
npx thinklang run hello.tl
```

### Configure

Set the `ANTHROPIC_API_KEY` environment variable:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `THINKLANG_MODEL` | No | `claude-opus-4-6` | Model to use |
| `THINKLANG_CACHE` | No | `true` | Enable response caching |

### Run

```bash
# Run a program
thinklang run hello.tl

# Run with cost tracking
thinklang run hello.tl --show-cost

# Compile to TypeScript
thinklang compile hello.tl

# Interactive REPL
thinklang repl
```

## Testing

ThinkLang has a built-in test framework. Write tests in `.test.tl` files:

```
type Sentiment {
  label: string
  score: float
}

test "sentiment analysis returns valid result" {
  let result = think<Sentiment>("Analyze: 'Great product!'")
  assert result.label == "positive"
  assert result.score > 0.5
}

test "semantic assertion" {
  let response = think<string>("Write a greeting")
  assert.semantic(response, "is a friendly greeting")
}
```

Run tests:

```bash
# Run all tests
thinklang test

# Record snapshots for deterministic replay
thinklang test --update-snapshots

# Replay from snapshots (no API calls)
thinklang test --replay

# Filter by pattern
thinklang test --pattern "sentiment"
```

## Cost Tracking

Every AI call tracks token usage and estimated cost:

```bash
# Show cost after running a program
thinklang run program.tl --show-cost

# View cost summary
thinklang cost-report
```

## IDE Support

### VS Code Extension

The `thinklang-vscode/` directory contains a VS Code extension with:

- Syntax highlighting for all ThinkLang keywords and constructs
- 11 code snippets (`think`, `infer`, `reason`, `type`, `fn`, `match`, `trycatch`, `guard`, `test`, etc.)
- LSP integration for diagnostics, hover, completion, go-to-definition, document symbols, and signature help

### LSP Server

The language server runs over stdio and provides:

- **Diagnostics** — Parse errors and type checker warnings
- **Hover** — Type information for variables, types, and fields
- **Completion** — Keywords, types, variables, member completions
- **Go to Definition** — Jump to type, function, and variable declarations
- **Document Symbols** — Outline of types, functions, and variables
- **Signature Help** — Parameter hints for `think<T>()`, `infer<T>()`, and user-defined functions

## Examples

### JavaScript/TypeScript (library usage)

| File | Feature |
|------|---------|
| `examples/js/basic-think.ts` | Minimal `think()` call |
| `examples/js/with-zod.ts` | Zod schemas for typed output |
| `examples/js/explicit-init.ts` | Explicit `init()` with options |
| `examples/js/custom-provider.ts` | Custom `ModelProvider` implementation |
| `examples/js/cost-tracking.ts` | Token usage and cost monitoring |

### ThinkLang programs (.tl)

17 example programs in `examples/`:

| File | Feature |
|------|---------|
| `01-hello-think.tl` | Basic `think` call |
| `02-classification.tl` | Structured types with context |
| `03-extraction.tl` | Data extraction |
| `04-summarization.tl` | Text summarization |
| `05-sentiment.tl` | Sentiment analysis with `Confident<T>` |
| `06-infer-basic.tl` | Type inference with `infer` |
| `07-with-context.tl` | Context management |
| `08-confident-values.tl` | Confidence tracking and unwrapping |
| `09-pipeline.tl` | Pipeline operator `\|>` |
| `10-multi-step.tl` | Multi-step processing |
| `11-uncertain.tl` | Uncertain values and handling |
| `12-reason-block.tl` | Reason blocks with goals and steps |
| `13-guards.tl` | Output guards with retry |
| `14-match-expression.tl` | Pattern matching |
| `15-try-catch.tl` | Error handling |
| `16-without-context.tl` | Context exclusion |
| `17-cache-demo.tl` | Response caching |

## Documentation

Full documentation is available at **[thinklang.dev](https://thinklang.dev)**.

The `docs/` directory contains a VitePress documentation site:

```bash
cd docs
npm install
npm run dev      # dev server
npm run build    # static build
```

## Project Structure

```
src/
├── ast/          # AST node type definitions
├── checker/      # Type checker (scope, types, diagnostics)
├── cli/          # CLI (run, compile, repl, test, cost-report)
├── compiler/     # Code generator: AST → TypeScript; module resolver
├── grammar/      # PEG grammar (thinklang.peggy)
├── lsp/          # Language Server Protocol implementation
├── parser/       # Wraps the generated Peggy parser
├── repl/         # Interactive REPL
├── runtime/      # Anthropic SDK, think/infer/reason, caching, cost tracking
└── testing/      # Test runner, assertions, snapshots, replay
thinklang-vscode/ # VS Code extension
docs/             # VitePress documentation site
tests/            # Vitest test suite
examples/         # 17 example programs
```

## Development

For contributors working on ThinkLang itself:

```bash
git clone https://github.com/eliashourany/ThinkLang.git
cd thinklang
npm install             # also runs build via prepare script

npm run build           # full build (parser + TypeScript)
npm run build:parser    # regenerate PEG parser only
npm run build:ts        # TypeScript compilation only
npm test                # run test suite
npm run test:watch      # tests in watch mode
```

## License

MIT
