# ThinkLang

An AI-native programming language where `think` is a keyword.

ThinkLang compiles to TypeScript that calls an LLM runtime, letting you write AI-powered programs with structured types, agentic tool calling, confidence tracking, guards, and pattern matching — all as first-class language features. It is model-agnostic: use Anthropic, OpenAI, Gemini, Ollama, or bring your own provider.

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

**Agentic Capabilities** — Declare tools and run multi-turn agent loops as language constructs. The agent calls tools until it arrives at a final answer.

```
tool searchDocs(query: string): string @description("Search documentation") {
  let result = think<string>("Search for relevant documentation")
    with context: query
  print result
}

let answer = agent<string>("Find the answer to the user's question")
  with tools: searchDocs
  max turns: 5
```

**Model-Agnostic** — Swap between Anthropic, OpenAI, Gemini, and Ollama with a single environment variable. Custom providers are supported through the `ModelProvider` interface.

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

**Error Handling** — Typed error hierarchy (`SchemaViolation`, `ConfidenceTooLow`, `GuardFailed`, `AgentMaxTurnsError`, `ToolExecutionError`, etc.) with `try`/`catch`.

## Supported Providers

ThinkLang works with multiple LLM providers out of the box. Only **one** provider is required.

| Provider | Package | Env Var | Default Model |
|----------|---------|---------|---------------|
| anthropic | @anthropic-ai/sdk (bundled) | `ANTHROPIC_API_KEY` | claude-opus-4-6 |
| openai | openai (optional) | `OPENAI_API_KEY` | gpt-4o |
| gemini | @google/generative-ai (optional) | `GEMINI_API_KEY` | gemini-2.0-flash |
| ollama | (none) | `OLLAMA_BASE_URL` | llama3 |

The provider is auto-detected from whichever API key is set, or you can specify it explicitly with `init({ provider: "openai" })`.

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

### Multi-provider usage

```typescript
import { init, think } from "thinklang";

// Use OpenAI
init({ provider: "openai", apiKey: "sk-..." });

// Use Gemini
init({ provider: "gemini", apiKey: "AI..." });

// Use Ollama (local, no API key needed)
init({ provider: "ollama", baseUrl: "http://localhost:11434" });

// Or bring your own ModelProvider
init({ provider: myCustomProvider });
```

### Agent with tools

Define tools and run agentic loops where the LLM calls tools until it produces a final answer:

```typescript
import { z } from "zod";
import { init, agent, defineTool, zodSchema } from "thinklang";

// Use any provider
init({ provider: "openai", apiKey: "sk-..." });

// Define tools
const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => await docsIndex.search(query),
});

// Run an agent
const result = await agent({
  prompt: "Find information about authentication",
  tools: [searchDocs],
  maxTurns: 5,
});

console.log(result.data);          // final answer
console.log(result.turns);         // number of turns used
console.log(result.toolCallHistory); // full tool call trace
```

### Core functions

| Function | Purpose |
|----------|---------|
| `think<T>(options)` | General-purpose LLM call with structured output |
| `infer<T>(options)` | Type inference / transformation on a given value |
| `reason<T>(options)` | Multi-step chain-of-thought reasoning |
| `agent<T>(options)` | Multi-turn tool-calling agent loop |
| `defineTool(config)` | Define a tool for use with `agent` |
| `zodSchema(zodType)` | Convert a Zod schema to JSON Schema for structured output |
| `init(options?)` | Configure provider, API key, and model |

All AI functions return `Promise<T>` with structured, schema-validated data. `agent` returns `Promise<AgentResult<T>>` which includes the data, turn count, total usage, and tool call history. See the [Runtime API reference](https://thinklang.dev/reference/runtime-api) and `examples/js/` for more.

---

## Use as a Language (CLI)

ThinkLang is also a full programming language where `think` is a keyword. Write `.tl` files and run them with the CLI.

### Prerequisites

- Node.js 18+
- An API key for at least one supported provider

### Install

```bash
# Global install
npm install -g thinklang

# Or use npx
npx thinklang run hello.tl
```

### Configure

Set an API key for at least one provider. ThinkLang auto-detects which provider to use based on which key is available.

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=your-key-here

# Or OpenAI
export OPENAI_API_KEY=your-key-here

# Or Gemini
export GEMINI_API_KEY=your-key-here

# Or Ollama (no API key needed)
export OLLAMA_BASE_URL=http://localhost:11434
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | One of these | — | Anthropic API key |
| `OPENAI_API_KEY` | One of these | — | OpenAI API key |
| `GEMINI_API_KEY` | One of these | — | Google Gemini API key |
| `OLLAMA_BASE_URL` | One of these | `http://localhost:11434` | Ollama server URL |
| `THINKLANG_MODEL` | No | Provider default | Override the default model |
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

- Syntax highlighting for all ThinkLang keywords and constructs (including `tool` and `agent`)
- 11 code snippets (`think`, `infer`, `reason`, `type`, `fn`, `match`, `trycatch`, `guard`, `test`, etc.)
- LSP integration for diagnostics, hover, completion, go-to-definition, document symbols, and signature help

### LSP Server

The language server runs over stdio and provides:

- **Diagnostics** — Parse errors and type checker warnings
- **Hover** — Type information for variables, types, and fields
- **Completion** — Keywords (`tool`, `agent`, types, variables), member completions
- **Go to Definition** — Jump to type, function, tool, and variable declarations
- **Document Symbols** — Outline of types, functions, tools, and variables
- **Signature Help** — Parameter hints for `think<T>()`, `infer<T>()`, `agent<T>()`, and user-defined functions

## Examples

### JavaScript/TypeScript (library usage)

| File | Feature |
|------|---------|
| `examples/js/basic-think.ts` | Minimal `think()` call |
| `examples/js/with-zod.ts` | Zod schemas for typed output |
| `examples/js/explicit-init.ts` | Explicit `init()` with options |
| `examples/js/custom-provider.ts` | Custom `ModelProvider` implementation |
| `examples/js/cost-tracking.ts` | Token usage and cost monitoring |
| `examples/js/agent-tools.ts` | Agent with tools |
| `examples/js/multi-provider.ts` | Using different providers |

### ThinkLang programs (.tl)

19 example programs in `examples/`:

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
| `18-tool-declaration.tl` | Tool declarations |
| `19-agent-expression.tl` | Agentic tool-calling loops |

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
├── runtime/      # Multi-provider LLM integration: think/infer/reason/agent,
│                 #   tools, provider registry, caching, cost tracking
│   └── providers/  # OpenAI, Gemini, Ollama provider implementations
└── testing/      # Test runner, assertions, snapshots, replay
thinklang-vscode/ # VS Code extension
docs/             # VitePress documentation site
tests/            # Vitest test suite
examples/         # 19 example programs
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
