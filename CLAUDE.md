# CLAUDE.md

ThinkLang is an AI-native programming language where `think` is a keyword — it transpiles to TypeScript that calls an LLM runtime. The runtime is also usable as a standalone JS/TS library (`import { think } from "thinklang"`). It is model-agnostic, supporting Anthropic, OpenAI, Google Gemini, Ollama, and custom providers.

## Build

Two-stage build: parser generation then TypeScript compilation.

```bash
npm run build           # both stages
npm run build:parser    # regenerate PEG parser only
npm run build:ts        # tsc only
```

**You must run `npm run build:parser` after any change to `src/grammar/thinklang.peggy`.** The generated file (`src/parser/generated-parser.ts`) is gitignored.

## Test

```bash
npm test          # vitest run (single pass)
npm run test:watch  # vitest in watch mode
```

Tests live in `tests/` and use Vitest with globals enabled. Test timeout is 30s. There are 17 test files covering the grammar, parser, checker, compiler, runtime, integration, caching, guards, match, reason blocks, cost tracking, LSP, imports, the testing framework, init, zod-schema, auto-init, and agentic features.

## Project Structure

```
src/
├── index.ts      # Root barrel export (library entry point: import { think } from "thinklang")
├── ast/          # AST node type definitions
├── checker/      # Type checker (scope, types, diagnostics)
├── cli/          # Commander.js CLI (run, compile, repl, test, cost-report commands)
├── compiler/     # Code generator: AST → TypeScript source; module resolver for imports
├── grammar/      # PEG grammar (thinklang.peggy)
├── lsp/          # Language Server Protocol (diagnostics, hover, completion, go-to-def, symbols, signature help)
├── parser/       # Wraps the generated Peggy parser
├── repl/         # Interactive REPL
├── runtime/      # AI integration: multi-provider system, think/infer/reason/agent, tools, caching, cost tracking
│   ├── provider.ts           # ModelProvider interface, CompleteOptions/Result with tool calling types
│   ├── provider-registry.ts  # Provider registry: registerProvider/createProvider
│   ├── anthropic-provider.ts # Anthropic SDK provider (tool calling + multi-turn)
│   ├── providers/            # Additional providers
│   │   ├── openai-provider.ts  # OpenAI (optional peer dep)
│   │   ├── gemini-provider.ts  # Google Gemini (optional peer dep)
│   │   └── ollama-provider.ts  # Ollama (no extra deps)
│   ├── agent.ts              # Agentic loop: multi-turn tool calling
│   ├── tools.ts              # defineTool() + toolToDefinition()
│   ├── builtin-tools.ts      # Built-in tools: fetchUrl, readFile, writeFile, runCommand
│   ├── init.ts               # Multi-provider init()
│   └── ...                   # think, infer, reason, guard, cache, cost-tracker, etc.
└── testing/      # Built-in test framework: runner, assertions, snapshots, replay provider
thinklang-vscode/ # VS Code extension (TextMate grammar, snippets, LSP client)
docs/             # VitePress documentation site
```

## Architecture

Compilation pipeline: **parse → resolve imports → type check → code generate**.

1. PEG grammar (`thinklang.peggy`) parses `.tl` files into an AST (with `imports` and `body`)
2. Module resolver (`module-resolver.ts`) resolves `import` declarations: reads/parses imported files, extracts types and functions, detects circular imports
3. Checker validates types with scope tracking (imported functions are registered in scope)
4. Code generator emits TypeScript that imports from the runtime (imported types/functions are emitted before local declarations)

The language supports `tool` declarations (compiled to `defineTool()` calls) and `agent<T>(prompt) with tools: ...` expressions (compiled to `agent()` calls with multi-turn tool-calling loops).

The LSP server (`src/lsp/`) runs a parallel pipeline per document: parse → collect type decls → check → build scope tree → build symbol index. It provides diagnostics, hover, completion, go-to-definition, document symbols, and signature help.

The testing framework (`src/testing/`) discovers `*.test.tl` files, compiles test blocks, and executes them. It supports value assertions (`assert expr`), semantic assertions (`assert.semantic(value, criteria)`), and deterministic replay via snapshot fixtures.

## Environment

Copy `.env.example` to `.env` and set:

- `ANTHROPIC_API_KEY` (required for Anthropic provider)
- `OPENAI_API_KEY` (required for OpenAI provider)
- `GEMINI_API_KEY` (required for Gemini provider)
- `OLLAMA_BASE_URL` (for Ollama, defaults to `http://localhost:11434`)
- `THINKLANG_MODEL` (optional, defaults to `claude-opus-4-6`)
- `THINKLANG_CACHE` (optional, defaults to `true`)

At least one provider API key must be set. The runtime auto-detects the provider from available env vars.

## CLI

```bash
npx tsx src/cli/index.ts run <file.tl>              # run a program
npx tsx src/cli/index.ts run <file.tl> --show-cost  # run with cost tracking
npx tsx src/cli/index.ts compile <file.tl>          # emit TypeScript
npx tsx src/cli/index.ts repl                       # interactive REPL
npx tsx src/cli/index.ts test [file|dir]            # run .test.tl files
npx tsx src/cli/index.ts test --update-snapshots    # record snapshot fixtures
npx tsx src/cli/index.ts test --replay              # replay from snapshots (no API calls)
npx tsx src/cli/index.ts cost-report                # show cost summary
```

ThinkLang files use the `.tl` extension. Examples are in `examples/`.

## Library API (JS/TS)

ThinkLang can be used as a library in any JS/TS project:

```typescript
import { init, think, infer, reason, agent, defineTool, zodSchema } from "thinklang";
```

Package entry points (configured via `exports` in package.json):
- `thinklang` — main entry: init, think, infer, reason, agent, defineTool, zodSchema, errors, providers, cost tracking
- `thinklang/runtime` — runtime only
- `thinklang/compiler` — compile/compileToAst
- `thinklang/parser` — parse/parseSync

Key library features:
- **`init(options?)`** (`src/runtime/init.ts`): Multi-provider initializer. Accepts `{ provider, apiKey, model, baseUrl }`. Auto-detects provider from API key format or env vars.
- **`agent(options)`** (`src/runtime/agent.ts`): Agentic loop — the LLM calls tools until it produces a final answer. Options: `prompt`, `tools`, `context`, `maxTurns`, `guards`, `retryCount`, `onToolCall`, `onToolResult`, `abortSignal`.
- **`defineTool(config)`** (`src/runtime/tools.ts`): Define tools for agent use. Accepts Zod schemas or raw JSON Schema for input.
- **`zodSchema(zodType)`** (`src/runtime/zod-schema.ts`): Converts a Zod schema to JSON Schema for use with think/infer/reason. Spreads into options: `think({ prompt: "...", ...zodSchema(MyType) })`.
- **`registerProvider(name, factory)`** (`src/runtime/provider-registry.ts`): Register custom LLM providers.
- **`registerPricing(model, pricing)`** (`src/runtime/cost-tracker.ts`): Register custom model pricing for cost tracking.
- **Auto-init**: `getProvider()` auto-initializes from env vars on first use — no explicit init needed.
- **Generic returns**: `think<T>()`, `infer<T>()`, `reason<T>()`, `agent<T>()` return `Promise<T>` for type-safe results.

## Provider System

The runtime is model-agnostic. Built-in providers:

| Provider | Package | Env Var | Default Model |
|----------|---------|---------|---------------|
| `anthropic` | `@anthropic-ai/sdk` (bundled) | `ANTHROPIC_API_KEY` | `claude-opus-4-6` |
| `openai` | `openai` (optional peer dep) | `OPENAI_API_KEY` | `gpt-4o` |
| `gemini` | `@google/generative-ai` (optional peer dep) | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| `ollama` | *(none — uses fetch)* | `OLLAMA_BASE_URL` | `llama3` |

Custom providers: implement the `ModelProvider` interface or register a factory with `registerProvider()`.

## Key Interfaces

- **`ModelProvider`** (`src/runtime/provider.ts`): `complete(options: CompleteOptions): Promise<CompleteResult>`. `CompleteOptions` includes `tools`, `toolChoice`, `messages` for multi-turn tool calling. `CompleteResult` returns `{ data, usage, model, toolCalls?, stopReason? }`.
- **`AgentOptions`** / **`AgentResult`** (`src/runtime/agent.ts`): `agent<T>(options)` runs a multi-turn loop. Options include `prompt`, `tools`, `context`, `maxTurns`, `guards`, `onToolCall`, `onToolResult`, `abortSignal`. Result includes `data`, `turns`, `totalUsage`, `toolCallHistory`.
- **`Tool`** / **`defineTool()`** (`src/runtime/tools.ts`): `defineTool({ name, description, input, execute })` creates a tool. `input` accepts Zod schemas or JSON Schema objects.
- **`CostTracker`** (`src/runtime/cost-tracker.ts`): `record()`, `getSummary()`, `getRecords()`, `reset()`. `globalCostTracker` singleton is called automatically. Supports `registerPricing()` for custom models. Tracks `"think"`, `"infer"`, `"reason"`, `"agent"`, and `"semantic_assert"` operations.
- **`DocumentManager`** (`src/lsp/document-manager.ts`): `analyze(uri, text): DocumentState`. Returns AST, diagnostics, type declarations, symbol index, and enriched scope.
- **`ReplayProvider`** (`src/testing/replay-provider.ts`): Implements `ModelProvider`, replays responses from snapshot files for deterministic tests.
- **`resolveImports`** (`src/compiler/module-resolver.ts`): `resolveImports(imports, filePath, resolving?)` → `{ importedTypes, importedFunctions, errors }`. Resolves relative paths, detects circular imports, parses imported files to extract type and function declarations.

## Publishing

`npm publish` triggers `prepare` which runs the full build.
The `files` field in package.json controls what's included in the tarball.

## Coding Conventions

- ESM throughout (`"type": "module"` in package.json, `"module": "Node16"` in tsconfig)
- Strict TypeScript (`"strict": true`, target ES2022)
- All imports use `.js` extensions (Node16 module resolution)
- Tests in `tests/` using Vitest globals (`describe`, `it`, `expect` — no imports needed)
- AST nodes use 1-based line/column (`Location`); LSP uses 0-based (`Position`). Conversion utilities in `src/lsp/utils.ts`
- Optional peer dependencies (`openai`, `@google/generative-ai`) are loaded lazily — provider files can be imported without installing the SDK
