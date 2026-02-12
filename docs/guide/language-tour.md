# Language Tour

A quick tour of ThinkLang's features. Each section links to its detailed guide.

## Types

Define structured types that the AI must conform to:

```thinklang
type Sentiment {
  label: string
  score: float
  tags: string[]
}
```

Primitives: `string`, `int`, `float`, `bool`, `null`. Supports arrays (`T[]`), optionals (`T?`), unions (`A | B`), and the `Confident<T>` wrapper.

[Full guide: Types](./types.md)

## think

The core primitive. Calls the LLM with a prompt and returns a typed result:

```thinklang
let summary = think<Summary>("Summarize this article")
  with context: article
```

[Full guide: AI Primitives](./ai-primitives.md)

## infer

Lightweight inference on an existing value:

```thinklang
let lang = infer<string>("Bonjour le monde", "Detect the language")
```

[Full guide: AI Primitives](./ai-primitives.md)

## reason

Multi-step reasoning with explicit steps:

```thinklang
let analysis = reason<Analysis> {
  goal: "Evaluate the investment portfolio"
  steps:
    1. "Assess current allocation"
    2. "Analyze market conditions"
    3. "Formulate recommendation"
  with context: { portfolio, market }
}
```

[Full guide: AI Primitives](./ai-primitives.md)

## Context

Scope data for AI calls with `with context` and exclude sensitive data with `without context`:

```thinklang
let result = think<Report>("Analyze this data")
  with context: { userData, metrics }
  without context: sensitiveData
```

[Full guide: Context](./context.md)

## Confidence

Track AI confidence with `Confident<T>` and require explicit handling of uncertain values:

```thinklang
let uncertain result = think<Confident<Category>>("Classify this item")
  with context: item

let safe = result.expect(0.8)
```

[Full guide: Confidence](./confidence.md)

## Guards

Constrain AI output with validation rules:

```thinklang
let text = think<string>("Write a summary")
  guard { length: 50..300 }
  on_fail: retry(3)
```

[Full guide: Guards](./guards.md)

## Match

Pattern match on values, including AI results:

```thinklang
let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence"
  { confidence: >= 0.5 } => "Moderate confidence"
  _ => "Manual review needed"
}
```

[Full guide: Match](./match.md)

## Pipeline

Chain operations with the `|>` operator:

```thinklang
let result = rawText
  |> think<Keywords>("Extract keywords") with context: rawText
  |> think<Report>("Write a report from these keywords")
```

[Full guide: Pipeline](./pipeline.md)

## Error Handling

Catch specific AI error types:

```thinklang
try {
  let result = think<Summary>("Summarize") with context: text
} catch SchemaViolation (e) {
  print "Schema error"
} catch ConfidenceTooLow (e) {
  print "Low confidence"
}
```

[Full guide: Error Handling](./error-handling.md)

## Testing

Built-in test blocks with semantic assertions:

```thinklang
test "sentiment is positive" {
  let s = think<Sentiment>("Analyze sentiment") with context: review
  assert s.label == "positive"
  assert.semantic(s, "indicates a happy customer")
}
```

[Full guide: Testing](./testing.md)

## Tools

Define tools that AI agents can use:

```thinklang
tool searchDocs(query: string): string @description("Search docs") {
  let result = think<string>("Search for relevant info")
    with context: query
  print result
}
```

[Full guide: Agents & Tools](./agents.md)

## Agents

Run agentic workflows with multi-turn tool calling:

```thinklang
let answer = agent<string>("Find the answer to this question")
  with tools: searchDocs
  max turns: 5
```

The agent loops: sends the prompt to the LLM, the LLM calls tools, results are fed back, until a final answer is produced.

[Full guide: Agents & Tools](./agents.md)

## Modules

Split code across files with `import`. All top-level types and functions are importable:

```thinklang
import { Sentiment, analyzeSentiment } from "./types.tl"

let result = analyzeSentiment("Great product!")
print result
```

No `export` keyword needed. Paths are relative to the importing file. Circular imports are detected.

[Full guide: Syntax Reference -- Imports](../reference/syntax.md#imports)

## Multiple Providers

ThinkLang is model-agnostic. Set any supported provider's API key:

```bash
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY, GEMINI_API_KEY
```

Or use Ollama for local models with no API key needed.

[Full guide: Provider System](./providers.md)

## Cost Tracking

Monitor AI usage and costs:

```bash
thinklang run app.tl --show-cost
thinklang cost-report
```

[Full guide: Cost Tracking](./cost-tracking.md)
