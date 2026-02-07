# Getting Started

This guide walks you through installing ThinkLang and running your first AI-powered program.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- An **Anthropic API key** for AI features

## Installation

Install ThinkLang globally from npm:

```bash
npm install -g thinklang
```

Or run it directly without installing:

```bash
npx thinklang run hello.tl
```

## Environment Setup

Set your Anthropic API key as an environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

You can also create a `.env` file in your project directory:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
THINKLANG_MODEL=claude-opus-4-6
THINKLANG_CACHE=true
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | -- | Your Anthropic API key |
| `THINKLANG_MODEL` | No | `claude-opus-4-6` | Model to use for AI calls |
| `THINKLANG_CACHE` | No | `true` | Cache identical AI requests |

## Your First Program

Create a file called `hello.tl`:

```thinklang
let greeting = think<string>("Say hello to the world in a creative way")
print greeting
```

Run it:

```bash
thinklang run hello.tl
```

The `think` keyword calls an LLM and returns a typed result. Here we asked for a `string`, so that is exactly what we get back.

## A Structured Example

ThinkLang shines when you define types for AI outputs. Create `classify.tl`:

```thinklang
type Classification {
  @description("The category of the email")
  category: string
  @description("Confidence score from 0 to 1")
  confidence: float
  @description("Brief explanation")
  reason: string
}

let email = "Congratulations! You've won a FREE iPhone! Click here now!"

let result = think<Classification>("Classify this email as spam, promotional, personal, or work")
  with context: email

print result
```

The AI returns a structured `Classification` object with exactly the fields you defined.

## CLI Commands

| Command | Description |
|---|---|
| `thinklang run <file.tl>` | Run a ThinkLang program |
| `thinklang compile <file.tl>` | Emit compiled TypeScript to stdout |
| `thinklang repl` | Start an interactive REPL session |
| `thinklang test [target]` | Run `.test.tl` test files |
| `thinklang cost-report` | Show cost summary for the current session |

### Useful Flags

- `thinklang run --show-cost` -- Print a cost summary after execution
- `thinklang compile -o output.ts` -- Write compiled output to a file
- `thinklang test --replay` -- Run tests using recorded snapshots
- `thinklang test --update-snapshots` -- Record live responses to snapshot files
- `thinklang test --pattern <regex>` -- Filter test files by pattern

## Splitting Code Across Files

As your programs grow, use `import` to share types and functions between files:

```thinklang
// types.tl
type Sentiment {
  label: string
  score: float
}
```

```thinklang
// main.tl
import { Sentiment } from "./types.tl"

let result = think<Sentiment>("Analyze sentiment of this review")
  with context: review
print result
```

All top-level `type` and `fn` declarations are automatically importable -- no `export` keyword is needed.

## Next Steps

- Take the [Language Tour](./language-tour.md) for a quick overview of all features
- Learn about the [Type System](./types.md)
- Explore [AI Primitives](./ai-primitives.md): `think`, `infer`, and `reason`
