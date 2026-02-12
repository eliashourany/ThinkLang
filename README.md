# ThinkLang

An AI-native programming language where `think` is a keyword.

ThinkLang compiles to TypeScript that calls an LLM runtime. Write AI-powered programs with structured types, agentic tool calling, confidence tracking, guards, and pattern matching — all as first-class language features. It's also usable as a standalone JS/TS library.

Model-agnostic: Anthropic, OpenAI, Gemini, Ollama, or bring your own provider.

---

## Two Ways to Use ThinkLang

### As a Language

Write `.tl` files and run them with the CLI. AI primitives are keywords, types compile to JSON schemas, and the compiler catches errors before you hit the API.

```
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Confidence score from 0 to 1")
  score: float
}

let result = think<Sentiment>("Analyze the sentiment of this review")
  with context: review

print result
```

```bash
npm install -g thinklang
thinklang run analyze.tl
```

### As a JS/TS Library

Use the same AI primitives directly from any JavaScript or TypeScript project — no `.tl` files needed.

```typescript
import { think, zodSchema } from "thinklang";
import { z } from "zod";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of this review",
  ...zodSchema(Sentiment),
  context: { review },
});
```

```bash
npm install thinklang
```

---

## Features

### AI Primitives

`think`, `infer`, and `reason` — three primitives for different tasks.

**Language:**
```
let summary = think<Summary>("Summarize this article") with context: article
let lang = infer<string>("Bonjour le monde", "Detect the language")
let plan = reason<Plan> { goal: "Evaluate the portfolio" steps: 1. "Assess allocation" 2. "Identify risks" }
```

**Library:**
```typescript
const summary = await think({ prompt: "Summarize this article", ...zodSchema(Summary), context: { article } });
const lang = await infer({ value: "Bonjour le monde", hint: "Detect the language", jsonSchema: { type: "string" } });
const plan = await reason({ goal: "Evaluate the portfolio", steps: [...], ...zodSchema(Plan) });
```

### Agents & Tools

Declare tools and run multi-turn agent loops. The agent calls tools until it arrives at a final answer.

**Language:**
```
tool searchDocs(query: string): string @description("Search documentation") {
  let result = think<string>("Search for relevant documentation") with context: query
  print result
}

let answer = agent<string>("Find the answer to the user's question")
  with tools: searchDocs
  max turns: 5
```

**Library:**
```typescript
const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search documentation",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => await docsIndex.search(query),
});

const result = await agent({ prompt: "Find the answer", tools: [searchDocs], maxTurns: 5 });
```

### Structured Types & Validation

**Language** — Define types with annotations. The AI is constrained to return valid data:

```
type Classification {
  @description("The category of the email")
  category: string
  @description("Confidence score from 0 to 1")
  confidence: float
}
```

**Library** — Use Zod schemas for the same type safety:

```typescript
const Classification = z.object({
  category: z.string().describe("The category of the email"),
  confidence: z.number().describe("Confidence score from 0 to 1"),
});
```

### Guards

Validate AI output with declarative constraints and automatic retry.

**Language:**
```
let summary = think<string>("Summarize this article") with context: article
  guard { length: 50..200, contains_none: ["AI", "language model"] }
  on_fail: retry(3) then fallback("Could not generate summary")
```

**Library:**
```typescript
const summary = await think({
  prompt: "Summarize this article",
  jsonSchema: { type: "string" },
  context: { article },
  guards: [{ name: "length", constraint: 50, rangeEnd: 200 }],
  retryCount: 3,
  fallback: () => "Could not generate summary",
});
```

### Confidence Tracking

`Confident<T>` wraps AI responses with confidence scores and reasoning.

```
let result = think<Confident<Sentiment>>("Analyze this review") with context: review
let safe = result.expect(0.8)           // throws if confidence < 0.8
let fallback = result.or(defaultValue)  // returns fallback if not confident
```

### Big Data

Process collections through AI at scale with concurrency control, cost budgeting, and streaming.

**Language:**
```
let sentiments = map_think<Sentiment>(reviews, "Classify this review")
  concurrency: 3
  cost_budget: 1.00

let summary = reduce_think<string>(sentiments, "Summarize all sentiments into a report")
  batch_size: 5
```

**Library:**
```typescript
const results = await mapThink({
  items: reviews,
  promptTemplate: (r) => `Classify: "${r}"`,
  ...zodSchema(Sentiment),
  maxConcurrency: 3,
  costBudget: 1.00,
});

const pipeline = await Dataset.from(reviews)
  .map(async (r) => think({ prompt: `Classify: "${r}"`, ...zodSchema(Sentiment) }))
  .filter(async (s) => s.label === "positive")
  .execute({ maxConcurrency: 3 });
```

### Pattern Matching & Pipeline

```
let response = match sentiment {
  { label: "positive", intensity: >= 8 } => "Very positive!"
  { label: "negative" } => "Negative detected"
  _ => "Neutral or mild"
}

let result = rawText
  |> think<Keywords>("Extract keywords")
  |> think<Report>("Write a report from these keywords")
```

### Multi-Provider

Swap providers with a single environment variable. No code changes needed.

| Provider | Package | Env Var | Default Model |
|----------|---------|---------|---------------|
| Anthropic | `@anthropic-ai/sdk` (bundled) | `ANTHROPIC_API_KEY` | `claude-opus-4-6` |
| OpenAI | `openai` (optional) | `OPENAI_API_KEY` | `gpt-4o` |
| Gemini | `@google/generative-ai` (optional) | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| Ollama | *(none)* | `OLLAMA_BASE_URL` | `llama3` |

Custom providers are supported through the `ModelProvider` interface or `registerProvider()`.

---

## Quick Start: Language

```bash
npm install -g thinklang
export ANTHROPIC_API_KEY=your-key-here    # or OPENAI_API_KEY, GEMINI_API_KEY
```

Create `hello.tl`:
```
let greeting = think<string>("Say hello to the world in a creative way")
print greeting
```

```bash
thinklang run hello.tl
```

| Command | Description |
|---------|-------------|
| `thinklang run <file.tl>` | Run a ThinkLang program |
| `thinklang compile <file.tl>` | Emit compiled TypeScript |
| `thinklang repl` | Interactive REPL |
| `thinklang test [target]` | Run `.test.tl` test files |
| `thinklang cost-report` | Show cost summary |

## Quick Start: Library

```bash
npm install thinklang
```

```typescript
import { think } from "thinklang";

// Set ANTHROPIC_API_KEY (or any provider key) in your environment — it just works
const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});
console.log(greeting);
```

For Zod schemas, agents, big data processing, and more — see the [Library documentation](https://thinklang.dev/library/quick-start).

---

## IDE Support

The `thinklang-vscode/` directory contains a VS Code extension with syntax highlighting, 11 code snippets, and full LSP integration (diagnostics, hover, completion, go-to-definition, document symbols, signature help).

## Documentation

Full documentation at **[thinklang.dev](https://thinklang.dev)**.

- [Language Guide](https://thinklang.dev/guide/getting-started) — Getting started with `.tl` files and the CLI
- [Library Guide](https://thinklang.dev/library/quick-start) — Using ThinkLang from JavaScript/TypeScript
- [API Reference](https://thinklang.dev/reference/runtime-api) — Complete runtime API
- [Examples](https://thinklang.dev/examples/) — 22 ThinkLang programs + 10 JS/TS examples

## License

MIT
