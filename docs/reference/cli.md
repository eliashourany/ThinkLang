# ThinkLang CLI Reference

The `thinklang` CLI compiles and runs ThinkLang (`.tl`) programs, provides a REPL, and manages testing and cost reporting.

---

## Installation

```bash
npm install
npm run build
```

Run commands via `npx`:

```bash
npx tsx src/cli/index.ts <command> [options]
```

---

## Commands

### `thinklang run <file> [--show-cost]`

Compiles and executes a ThinkLang program.

| Argument / Option | Required | Description |
|-------------------|----------|-------------|
| `<file>` | Yes | Path to a `.tl` file |
| `--show-cost` | No | Print a cost summary after execution |

**Process:**

1. Loads environment variables from `.env`.
2. Initializes the Anthropic provider (if `ANTHROPIC_API_KEY` is set).
3. Reads and compiles the source file.
4. Reports any compilation errors and exits with code 1 if present.
5. Prints any compilation warnings.
6. Executes the compiled TypeScript with the ThinkLang runtime.
7. If `--show-cost` is set, prints token usage and cost breakdown.

**Example:**

```bash
npx tsx src/cli/index.ts run examples/01-hello-think.tl
npx tsx src/cli/index.ts run examples/02-classification.tl --show-cost
```

---

### `thinklang compile <file> [-o output]`

Compiles a ThinkLang program to TypeScript source code without executing it.

| Argument / Option | Required | Description |
|-------------------|----------|-------------|
| `<file>` | Yes | Path to a `.tl` file |
| `-o, --output <file>` | No | Write output to a file instead of stdout |

**Example:**

```bash
# Print compiled TypeScript to stdout
npx tsx src/cli/index.ts compile examples/01-hello-think.tl

# Write to a file
npx tsx src/cli/index.ts compile examples/01-hello-think.tl -o output.ts
```

---

### `thinklang repl`

Starts an interactive Read-Eval-Print Loop for ThinkLang.

```bash
npx tsx src/cli/index.ts repl
```

The REPL initializes the Anthropic provider and allows you to enter ThinkLang statements interactively.

---

### `thinklang test [target] [options]`

Runs ThinkLang test files (`.test.tl`).

| Argument / Option | Required | Description |
|-------------------|----------|-------------|
| `[target]` | No | File or directory to test (default: `.`) |
| `--update-snapshots` | No | Record live AI responses to snapshot files |
| `--replay` | No | Use snapshot files for deterministic replay |
| `--pattern <regex>` | No | Filter test files by regex pattern |

**Modes:**

| Mode | Description |
|------|-------------|
| Default (live) | Runs tests against the live AI provider |
| `--update-snapshots` | Runs live and saves AI responses to snapshot files for future replay |
| `--replay` | Uses saved snapshots instead of calling the AI, making tests deterministic and free |

**Exit code:** Returns `1` if any tests fail, `0` otherwise.

**Example:**

```bash
# Run all tests in current directory
npx tsx src/cli/index.ts test

# Run tests in a specific directory
npx tsx src/cli/index.ts test tests/

# Record snapshots
npx tsx src/cli/index.ts test --update-snapshots

# Replay from snapshots (no AI calls)
npx tsx src/cli/index.ts test --replay

# Filter by pattern
npx tsx src/cli/index.ts test --pattern "classification"
```

---

### `thinklang cost-report`

Displays the cost report for the current session.

```bash
npx tsx src/cli/index.ts cost-report
```

**Output includes:**

- Total number of AI calls
- Total input and output tokens
- Total estimated cost in USD
- Breakdown by operation (`think`, `infer`, `reason`, `semantic_assert`)
- Breakdown by model

If no AI calls have been made, prints "No AI calls were made."

---

## Environment Variables

Configure ThinkLang behavior through environment variables. Create a `.env` file in the project root (copy from `.env.example`).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI features) | -- | Your Anthropic API key |
| `THINKLANG_MODEL` | No | `claude-opus-4-6` | The Claude model to use |
| `THINKLANG_CACHE` | No | `true` | Set to `false` to disable result caching |

**Example `.env` file:**

```env
ANTHROPIC_API_KEY=sk-ant-...
THINKLANG_MODEL=claude-sonnet-4-5-20250929
THINKLANG_CACHE=true
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Compilation errors or test failures |
