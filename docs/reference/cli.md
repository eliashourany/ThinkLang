# ThinkLang CLI Reference

The `thinklang` CLI compiles and runs ThinkLang (`.tl`) programs, provides a REPL, and manages testing and cost reporting.

---

## Installation

```bash
npm install -g thinklang
```

Or run commands via `npx` without installing globally:

```bash
npx thinklang <command> [options]
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
2. Initializes the provider from available API keys (auto-detected).
3. Reads and compiles the source file.
4. Reports any compilation errors and exits with code 1 if present.
5. Prints any compilation warnings.
6. Executes the compiled TypeScript with the ThinkLang runtime.
7. If `--show-cost` is set, prints token usage and cost breakdown.

**Example:**

```bash
thinklang run examples/01-hello-think.tl
thinklang run examples/02-classification.tl --show-cost
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
thinklang compile examples/01-hello-think.tl

# Write to a file
thinklang compile examples/01-hello-think.tl -o output.ts
```

---

### `thinklang repl`

Starts an interactive Read-Eval-Print Loop for ThinkLang.

```bash
thinklang repl
```

The REPL initializes the provider from available environment variables and allows you to enter ThinkLang statements interactively.

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
thinklang test

# Run tests in a specific directory
thinklang test tests/

# Record snapshots
thinklang test --update-snapshots

# Replay from snapshots (no AI calls)
thinklang test --replay

# Filter by pattern
thinklang test --pattern "classification"
```

---

### `thinklang cost-report`

Displays the cost report for the current session.

```bash
thinklang cost-report
```

**Output includes:**

- Total number of AI calls
- Total input and output tokens
- Total estimated cost in USD
- Breakdown by operation (`think`, `infer`, `reason`, `agent`, `semantic_assert`, `batch`, `map_think`, `reduce_think`)
- Breakdown by model

If no AI calls have been made, prints "No AI calls were made."

---

## Environment Variables

Configure ThinkLang behavior through environment variables. Create a `.env` file in the project root or export them in your shell.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | One of these | -- | Anthropic API key |
| `OPENAI_API_KEY` | One of these | -- | OpenAI API key |
| `GEMINI_API_KEY` | One of these | -- | Google Gemini API key |
| `OLLAMA_BASE_URL` | One of these | `http://localhost:11434` | Ollama server URL |
| `THINKLANG_MODEL` | No | Provider default | Override the default model for any provider |
| `THINKLANG_CACHE` | No | `true` | Set to `false` to disable result caching |

The provider is auto-detected from whichever API key is set. See the [Provider System](/library/providers) for details on detection order and supported providers.

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
