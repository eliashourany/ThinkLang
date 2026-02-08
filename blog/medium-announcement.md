# Introducing ThinkLang: A Programming Language Where AI Is a First-Class Citizen

What if calling an AI model was as natural as declaring a variable?

Not a library import. Not an API wrapper. Not an SDK call buried in try/catch boilerplate. A **keyword** -- built into the language itself.

That's the idea behind **ThinkLang**, an open source programming language I've been building where `think`, `infer`, and `reason` are first-class language primitives. It transpiles to TypeScript and calls an LLM at runtime, but the experience of writing it feels nothing like wiring up API calls.

Today I'm open-sourcing it. Here's why I built it, what it looks like, and where it's going.

---

## The Problem

Every AI application I've built follows the same pattern: write a prompt, call an API, parse JSON, validate the shape, handle errors, retry on failure, track costs, and hope the response matches what I expected. The actual *intent* -- "analyze the sentiment of this text" -- gets buried under plumbing.

Libraries help, but they don't change the fundamental experience. You're still writing code *about* calling an AI, rather than code that *thinks*.

I wanted a language where the AI call disappears into the syntax. Where the compiler enforces type safety on AI outputs. Where uncertainty is a type, not an afterthought.

## The Simplest Example

Here's a complete ThinkLang program:

```
let greeting = think<string>("Say hello to the world in a creative way")
print greeting
```

That's it. `think` is a keyword. The generic parameter `<string>` tells the compiler (and the AI) what type to return. The prompt is the argument. No imports, no configuration, no SDK initialization.

But ThinkLang is not a toy. It's designed for building real AI applications with the same rigor you'd expect from any typed language.

## Type-Safe AI Outputs

The real power shows up when you define structured types:

```
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Intensity from 1-10")
  intensity: int
}

let review = "This product is absolutely amazing! Best purchase I've ever made."

let sentiment = think<Sentiment>("Analyze the sentiment of this review")
  with context: review

print sentiment
```

The `type` declaration compiles to a JSON schema that constrains the AI's output. The `@description` annotations guide the model without polluting your prompt. And the `with context:` clause passes data to the AI while keeping the prompt clean.

If the model returns something that doesn't match the schema, ThinkLang throws a `SchemaViolation` -- not a mysterious runtime error three function calls later.

## Making Uncertainty Explicit

AI outputs are inherently uncertain. Most languages pretend otherwise. ThinkLang has a `Confident<T>` wrapper that makes uncertainty a first-class concept:

```
let sentiment = think<Confident<Sentiment>>("Analyze the sentiment of this review")
  with context: review
```

A `Confident<T>` value carries the data, a confidence score, and the model's reasoning. You can't just use it as if it were a plain value -- you have to explicitly handle the uncertainty:

```
// Extract the value, or throw if confidence < 0.8
let result = sentiment.unwrap(0.8)

// Use a fallback if confidence is low
let safe = sentiment.or(defaultSentiment)
```

This forces you to make a conscious decision about how much you trust the AI's output. It's a small syntactic cost that prevents an entire category of bugs.

## Three Ways to Think

ThinkLang provides three AI primitives, each for a different use case:

**`think`** -- structured generation. Give it a prompt and a type, get back validated data:

```
let analysis = think<Sentiment>("Analyze the sentiment of this review")
  with context: review
```

**`infer`** -- lightweight classification and transformation. No type definition needed for quick operations:

```
let priority = infer<string>("urgent: server is down!", "Classify as low, medium, high, or critical")
let language = infer<string>("Bonjour le monde", "Detect the language")
```

**`reason`** -- multi-step reasoning with explicit goals. For complex tasks that benefit from chain-of-thought:

```
type InvestmentAnalysis {
  recommendation: string
  riskLevel: string
  expectedReturn: string
  reasoning: string
}

let analysis = reason<InvestmentAnalysis> {
  goal: "Analyze this investment portfolio and provide recommendations"
  steps:
    1. "Evaluate the current asset allocation"
    2. "Assess market conditions impact on each asset class"
    3. "Identify risks and opportunities"
    4. "Formulate a recommendation"
  with context: {
    portfolio,
    marketConditions,
  }
}
```

The `reason` block makes the chain-of-thought explicit in the code. Each step is visible, reviewable, and debuggable -- not hidden inside a system prompt.

## Guards: Declarative Output Validation

Sometimes schema validation isn't enough. You need to constrain the content, not just the shape. ThinkLang has guards:

```
let summary = think<string>("Summarize this article")
  with context: article
  guard {
    length: 50..200
    contains_none: ["TODO", "placeholder"]
  }
  on_fail: retry(3) then fallback("Summary unavailable")
```

Guards are declarative constraints on the AI's output. If the output fails validation, ThinkLang automatically retries with exponential backoff. If all retries fail, the fallback kicks in. No manual retry loops. No scattered error handling.

## Pattern Matching on AI Data

ThinkLang has native pattern matching that works naturally with AI-generated structured data:

```
let sentiment = think<Confident<Sentiment>>("Analyze the sentiment")
  with context: review

let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence result"
  { confidence: >= 0.5 } => "Moderate confidence result"
  _ => "Low confidence -- manual review needed"
}
```

This makes branching on AI outputs clean and readable, replacing chains of if/else statements that check confidence thresholds and field values.

## Error Handling That Knows About AI

ThinkLang has a typed error hierarchy designed for AI failure modes:

```
try {
  let result = think<Summary>("Summarize this text in detail")
    with context: text
  print result
} catch SchemaViolation (e) {
  print "Schema error occurred"
} catch ConfidenceTooLow (e) {
  print "Confidence too low for reliable result"
}
```

`SchemaViolation`, `ConfidenceTooLow`, `GuardFailed` -- these are specific, catchable error types, not generic exceptions. You can handle each failure mode differently because the language understands what can go wrong with AI calls.

## Context Privacy

When you're passing data to an AI, sometimes you need to include context for your code but exclude sensitive fields from the LLM call:

```
let recommendation = think<Recommendation>("Suggest products based on user interests")
  with context: {
    profile,
    sensitiveData,
  }
  without context: sensitiveData
```

The `without context:` clause strips fields before they reach the model. Privacy controls are part of the language, not an afterthought in a middleware layer.

## Built-In Cost Tracking

Every AI call in ThinkLang is automatically tracked. No instrumentation required:

```bash
$ thinklang run analyze.tl --show-cost

# Output includes:
# Total cost: $0.0234
# Breakdown: 3 think calls ($0.0180), 2 infer calls ($0.0054)
# Model: claude-opus-4-6 | Tokens: 1,240 in / 890 out
```

You can also run `thinklang cost-report` for aggregate summaries across runs. Cost awareness is built into the development workflow, not discovered in a billing dashboard weeks later.

## Testing AI Code

Testing non-deterministic AI outputs is hard. ThinkLang's built-in testing framework addresses this with two key features:

**Semantic assertions** -- test *meaning*, not exact strings:

```
test "sentiment analysis" {
  let result = think<Sentiment>("Analyze sentiment")
    with context: "I love this product!"
  assert result.label == "positive"
  assert.semantic(result, "correctly identifies positive sentiment")
}
```

**Deterministic replay** -- record AI responses once, replay them forever:

```bash
$ thinklang test --update-snapshots   # Record live responses
$ thinklang test --replay             # Replay from snapshots (no API calls, no cost)
```

Snapshot replay means your CI pipeline can run AI tests without an API key, without network access, and without cost. Development iteration becomes fast and free.

## The Tooling

ThinkLang ships with a complete development environment:

- **CLI** with `run`, `compile`, `repl`, `test`, and `cost-report` commands
- **VS Code extension** with syntax highlighting, 11 code snippets, and a full LSP server providing diagnostics, hover information, completions, go-to-definition, and signature help
- **Response caching** that automatically deduplicates identical AI calls at zero cost
- **Module system** with imports for reusing types and functions across files

## How It Works Under the Hood

ThinkLang follows a traditional compiler pipeline: **parse -> resolve imports -> type check -> code generate**.

1. A PEG grammar parses `.tl` files into an AST
2. The module resolver handles imports (with circular dependency detection)
3. The type checker validates scope and types
4. The code generator emits TypeScript that imports from the ThinkLang runtime

The runtime uses the Anthropic SDK with JSON schema mode for structured outputs, automatic retries, confidence extraction, and cost tracking. Types are compiled to JSON schemas that constrain the model's response format.

## Getting Started

```bash
npm install thinklang

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run your first program
echo 'let greeting = think<string>("Say hello")' > hello.tl
npx thinklang run hello.tl
```

17 example programs in the `examples/` directory cover every feature, from basic think calls to multi-step reasoning with guards and pattern matching.

## Why Open Source

ThinkLang is MIT licensed and open source because the idea of AI-native programming languages is bigger than one project. I want to see what happens when the community pushes on these concepts -- when people find use cases I haven't imagined, syntax improvements I haven't considered, and patterns that only emerge at scale.

The language is at version 0.1.1. The grammar, runtime, and tooling are functional and tested (13 test suites), but there's plenty of room to grow: more model providers, richer type system features, optimization passes, and whatever else the community decides matters.

## Links

- **GitHub**: [github.com/eliashourany/ThinkLang](https://github.com/eliashourany/ThinkLang)
- **Documentation**: [thinklang.dev](https://thinklang.dev)
- **VS Code Extension**: Search "ThinkLang" in the marketplace

If you've ever felt that calling an AI should be simpler -- that it should feel like part of the language, not something bolted on -- give ThinkLang a try. Star the repo, file an issue, or open a PR. I'd love to hear what you think.

---

*ThinkLang is built by [Elias Hourany](https://github.com/eliashourany). If you found this interesting, follow me for updates on the project.*
