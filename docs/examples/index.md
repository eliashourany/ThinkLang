# ThinkLang Examples

This page provides an overview of the example programs shipped with ThinkLang. Examples are available for both the ThinkLang language (`.tl` files) and the JS/TS library. Source files are in the `examples/` directory.

---

## Hello Think

The simplest AI call. Sends a prompt and prints the result.

```thinklang
let greeting = think<string>("Say hello to the world in a creative way")
print greeting
```

*Source: `examples/01-hello-think.tl`*

---

## Classification

Uses a structured type to classify an email into a category with a confidence score.

```thinklang
type Classification {
  @description("The category of the email")
  category: string
  @description("Confidence score from 0 to 1")
  confidence: float
  @description("Brief explanation")
  reason: string
}

let email = "Congratulations! You've won a FREE iPhone!"

let result = think<Classification>("Classify this email as spam, promotional, personal, or work")
  with context: email

print result
```

*Source: `examples/02-classification.tl`*

---

## Data Extraction

Extracts structured entities from unstructured text.

```thinklang
type Person {
  name: string
  role: string
  company: string?
}

type ExtractionResult {
  @maxItems(10)
  people: Person[]
  @description("Brief summary of the document")
  summary: string
}

let document = "Meeting notes: John Smith (CEO of Acme Corp) met with Jane Doe..."

let extracted = think<ExtractionResult>("Extract all people and summarize")
  with context: document

print extracted
```

*Source: `examples/03-extraction.tl`*

---

## Sentiment Analysis

Analyzes sentiment with a `Confident` wrapper that tracks the model's self-assessed confidence.

```thinklang
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Intensity from 1-10")
  intensity: int
}

let review = "This product is absolutely amazing!"

let sentiment = think<Confident<Sentiment>>("Analyze the sentiment of this review")
  with context: review

print sentiment
```

*Source: `examples/05-sentiment.tl`*

---

## Multi-Step Processing

Chains multiple `think` calls, feeding the output of one into the context of the next.

```thinklang
let entities = think<Entities>("Extract technologies, applications, and challenges")
  with context: report

let analysis = think<Analysis>("Analyze the landscape based on these entities")
  with context: {
    entities,
    report,
  }

print analysis
```

*Source: `examples/10-multi-step.tl`*

---

## Pipeline

Chains expressions using the `|>` operator for left-to-right data flow.

```thinklang
let result = inputData
  |> think<Summary>("Summarize this")
  |> think<Translation>("Translate to French")
```

*Source: `examples/09-pipeline.tl`*

---

## Infer

Lightweight classification and transformation without a full prompt.

```thinklang
let category = infer<string>("urgent: server is down!", "Classify priority as low, medium, high, or critical")
print category

let language = infer<string>("Bonjour le monde", "Detect the language")
print language
```

*Source: `examples/06-infer-basic.tl`*

---

## Guards

Validates AI output with guard constraints. Retries automatically on failure.

```thinklang
let result = think<Translation>("Translate to Spanish")
  with context: sourceText
  guard {
    length: 5..500
  }
  on_fail: retry(3)

print result
```

*Source: `examples/13-guards.tl`*

---

## Reason Blocks

Multi-step reasoning with explicit numbered steps.

```thinklang
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

print analysis
```

*Source: `examples/12-reason-block.tl`*

---

## Match Patterns

Pattern matching on AI results based on confidence or field values.

```thinklang
let sentiment = think<Confident<Sentiment>>("Analyze the sentiment")
  with context: review

let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence result"
  { confidence: >= 0.5 } => "Moderate confidence result"
  _ => "Low confidence -- manual review needed"
}

print response
```

*Source: `examples/14-match-expression.tl`*

---

## Try/Catch

Error handling for AI operations. Catches specific runtime error types.

```thinklang
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

*Source: `examples/15-try-catch.tl`*

---

## If/Else

Conditional logic based on AI results.

```thinklang
if sentiment.isConfident(0.8) {
  print "High confidence result"
} else {
  print "Low confidence -- needs review"
}
```

---

## Confident Types

Working with `Confident<T>` -- unwrapping, checking confidence, and using fallbacks.

```thinklang
let classified = think<Confident<Category>>("Classify this product")
  with context: item

print classified
```

The `uncertain` modifier enforces safe access at compile time:

```thinklang
let uncertain category = think<Category>("Classify this product")
  with context: text

let safeName = category.unwrap()
let highConf = category.expect(0.8)
```

*Sources: `examples/08-confident-values.tl`, `examples/11-uncertain.tl`*

---

## Context and Privacy

Using `with context` to provide data and `without context` to exclude sensitive fields.

```thinklang
let recommendation = think<Recommendation>("Suggest products based on interests")
  with context: {
    profile,
    sensitiveData,
  }
  without context: sensitiveData

print recommendation
```

*Source: `examples/16-without-context.tl`*

---

## Testing

ThinkLang includes a built-in test framework with value assertions and semantic assertions.

```thinklang
test "classification produces a valid category" {
  let result = think<Category>("Classify as food or drink")
    with context: "orange juice"
  assert result.name == "drink"
}

test "summary is relevant" {
  let summary = think<Summary>("Summarize this article")
    with context: article
  assert.semantic(summary, "mentions key financial metrics")
}
```

Run tests with:

```bash
npx tsx src/cli/index.ts test
npx tsx src/cli/index.ts test --update-snapshots
npx tsx src/cli/index.ts test --replay
```

---

## Modules (Imports)

Split code across files using `import`. Types and functions are automatically importable from other `.tl` files.

```thinklang
// types.tl
type Sentiment {
  label: string
  score: float
}

fn analyzeSentiment(text: string): Sentiment {
  let result = think<Sentiment>("Analyze the sentiment")
    with context: text
  print result
}
```

```thinklang
// main.tl
import { Sentiment, analyzeSentiment } from "./types.tl"

let result = analyzeSentiment("Great product!")
print result
```

No `export` keyword needed. Paths are relative. Circular imports are detected.

---

---

## Library Examples (JS/TS)

ThinkLang's runtime can be used directly from JavaScript or TypeScript. These examples are in `examples/js/`.

### Basic think() Call

```typescript
import { think } from "thinklang";

const greeting = await think<string>({
  prompt: "Say hello to the world in a creative way",
  jsonSchema: { type: "string" },
});
console.log(greeting);
```

*Source: `examples/js/basic-think.ts`*

---

### Zod Schemas for Typed Output

```typescript
import { z } from "zod";
import { think, zodSchema } from "thinklang";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
  explanation: z.string(),
});

const result = await think<z.infer<typeof Sentiment>>({
  prompt: "Analyze the sentiment of: 'This is the best product I have ever used!'",
  ...zodSchema(Sentiment),
});

console.log(`Sentiment: ${result.label} (${result.score})`);
```

*Source: `examples/js/with-zod.ts`*

---

### Agent with Tools

```typescript
import { z } from "zod";
import { agent, defineTool, zodSchema } from "thinklang";

const searchDocs = defineTool({
  name: "searchDocs",
  description: "Search internal documentation",
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => `Results for "${query}": ...`,
});

const result = await agent<{ answer: string; sources: string[] }>({
  prompt: "How does ThinkLang handle type safety?",
  tools: [searchDocs],
  maxTurns: 5,
  ...zodSchema(z.object({ answer: z.string(), sources: z.array(z.string()) })),
});

console.log(result.data.answer);
console.log(`Completed in ${result.turns} turns`);
```

*Source: `examples/js/agent-tools.ts`*

---

### All Library Examples

| File | Feature |
|------|---------|
| `examples/js/basic-think.ts` | Minimal `think()` call |
| `examples/js/with-zod.ts` | Zod schemas for typed output |
| `examples/js/explicit-init.ts` | Explicit `init()` with options |
| `examples/js/custom-provider.ts` | Custom `ModelProvider` implementation |
| `examples/js/cost-tracking.ts` | Token usage and cost monitoring |
| `examples/js/agent-tools.ts` | Agent with tools |
| `examples/js/multi-provider.ts` | Using different providers |
| `examples/js/batch-processing.ts` | Batch processing with concurrency |
| `examples/js/dataset-pipeline.ts` | Lazy Dataset pipeline with map/filter |
| `examples/js/chunking-streaming.ts` | Text chunking and streaming |

---

## ThinkLang Language Examples (.tl)

## Example Index

| # | File | Feature |
|---|------|---------|
| 01 | `01-hello-think.tl` | Basic `think` call |
| 02 | `02-classification.tl` | Structured types, `with context` |
| 03 | `03-extraction.tl` | Nested types, arrays, `@maxItems` |
| 04 | `04-summarization.tl` | `@description` annotations |
| 05 | `05-sentiment.tl` | `Confident<T>` |
| 06 | `06-infer-basic.tl` | `infer` expression |
| 07 | `07-with-context.tl` | Context blocks with multiple variables |
| 08 | `08-confident-values.tl` | `Confident<T>` methods |
| 09 | `09-pipeline.tl` | Pipeline `\|>` operator |
| 10 | `10-multi-step.tl` | Chaining multiple `think` calls |
| 11 | `11-uncertain.tl` | `uncertain` modifier, `.unwrap()`, `.expect()` |
| 12 | `12-reason-block.tl` | `reason` blocks with goals and steps |
| 13 | `13-guards.tl` | Guard constraints, `on_fail: retry(n)` |
| 14 | `14-match-expression.tl` | `match` expression with patterns |
| 15 | `15-try-catch.tl` | `try`/`catch` error handling |
| 16 | `16-without-context.tl` | `without context` for privacy |
| 17 | `17-cache-demo.tl` | Exact-match caching |
