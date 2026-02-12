# CLAUDE.md

ThinkLang is an AI-native programming language where `think` is a keyword — it transpiles to TypeScript that calls an LLM runtime. The runtime is also usable as a standalone JS/TS library (`import { think } from "thinklang"`).

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

Tests live in `tests/` and use Vitest with globals enabled. Test timeout is 30s. There are 16 test files covering the grammar, parser, checker, compiler, runtime, integration, caching, guards, match, reason blocks, cost tracking, LSP, imports, the testing framework, init, zod-schema, and auto-init.

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
├── runtime/      # AI integration: Anthropic SDK, think/infer/reason/guard, caching, cost tracking, init, zodSchema
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

The LSP server (`src/lsp/`) runs a parallel pipeline per document: parse → collect type decls → check → build scope tree → build symbol index. It provides diagnostics, hover, completion, go-to-definition, document symbols, and signature help.

The testing framework (`src/testing/`) discovers `*.test.tl` files, compiles test blocks, and executes them. It supports value assertions (`assert expr`), semantic assertions (`assert.semantic(value, criteria)`), and deterministic replay via snapshot fixtures.

## Environment

Copy `.env.example` to `.env` and set:

- `ANTHROPIC_API_KEY` (required for AI features)
- `THINKLANG_MODEL` (optional, defaults to `claude-opus-4-6`)
- `THINKLANG_CACHE` (optional, defaults to `true`)

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
import { init, think, infer, reason, zodSchema } from "thinklang";
```

Package entry points (configured via `exports` in package.json):
- `thinklang` — main entry: init, think, infer, reason, zodSchema, errors, cost tracking, provider system
- `thinklang/runtime` — runtime only
- `thinklang/compiler` — compile/compileToAst
- `thinklang/parser` — parse/parseSync

Key library features:
- **`init(options?)`** (`src/runtime/init.ts`): Convenience initializer. Reads `ANTHROPIC_API_KEY` from env or accepts `{ apiKey, model }`.
- **`zodSchema(zodType)`** (`src/runtime/zod-schema.ts`): Converts a Zod schema to JSON Schema for use with think/infer/reason. Spreads into options: `think({ prompt: "...", ...zodSchema(MyType) })`.
- **Auto-init**: `getProvider()` auto-initializes from `ANTHROPIC_API_KEY` env var on first use — no explicit init needed.
- **Generic returns**: `think<T>()`, `infer<T>()`, `reason<T>()` return `Promise<T>` for type-safe results.

## Key Interfaces

- **`ModelProvider`** (`src/runtime/provider.ts`): `complete(options: CompleteOptions): Promise<CompleteResult>`. `CompleteResult` returns `{ data, usage: { inputTokens, outputTokens }, model }`.
- **`CostTracker`** (`src/runtime/cost-tracker.ts`): `record()`, `getSummary()`, `getRecords()`, `reset()`. `globalCostTracker` singleton is called automatically by think/infer/reason.
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
