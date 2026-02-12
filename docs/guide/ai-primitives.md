# AI Primitives

ThinkLang provides three AI primitives, each suited to different tasks: `think`, `infer`, and `reason`.

## think

`think` is the primary primitive. It sends a prompt to the LLM and returns a typed, structured result.

### Syntax

```thinklang
think<Type>("prompt")
think<Type>("prompt") with context: expr
```

### Examples

Return a simple value:

```thinklang
let greeting = think<string>("Say hello in a creative way")
```

Return a structured type:

```thinklang
type Summary {
  @description("One-line headline")
  headline: string
  @description("Key points from the text")
  keyPoints: string[]
  @description("Overall tone: positive, negative, or neutral")
  tone: string
}

let article = "The tech sector grew significantly in 2025..."

let summary = think<Summary>("Summarize this article")
  with context: article

print summary
```

Return an array:

```thinklang
type Person {
  name: string
  role: string
  company: string?
}

type ExtractionResult {
  @maxItems(10)
  people: Person[]
  summary: string
}

let extracted = think<ExtractionResult>("Extract all people mentioned")
  with context: document
```

### With Confidence

Request confidence scoring by wrapping the type in `Confident<T>`:

```thinklang
let result = think<Confident<Sentiment>>("Analyze the sentiment")
  with context: review
```

## infer

`infer` performs lightweight inference on an existing value. It is simpler than `think` -- you provide a value and an optional hint, and the AI classifies, converts, or interprets it.

### Syntax

```thinklang
infer<Type>(value)
infer<Type>(value, "hint")
```

### Examples

Classify a message:

```thinklang
let priority = infer<string>("urgent: server is down!", "Classify priority as low, medium, high, or critical")
```

Detect a language:

```thinklang
let language = infer<string>("Bonjour le monde", "Detect the language")
```

Infer structured data:

```thinklang
type ContactInfo {
  name: string
  email: string?
  phone: string?
}

let info = infer<ContactInfo>("Call John at 555-0123 or email john@example.com")
```

## reason

`reason` performs multi-step reasoning. You define a goal and explicit steps for the AI to follow. This produces higher-quality results for complex tasks that benefit from a structured thought process.

### Syntax

```thinklang
reason<Type> {
  goal: "description"
  steps:
    1. "first step"
    2. "second step"
    3. "third step"
}
```

### Example

```thinklang
type InvestmentAnalysis {
  recommendation: string
  riskLevel: string
  expectedReturn: string
  reasoning: string
}

let portfolio = "Tech stocks: 60%, Bonds: 20%, Real estate: 15%, Cash: 5%"
let market = "Rising interest rates, AI sector booming, housing market cooling"

let analysis = reason<InvestmentAnalysis> {
  goal: "Analyze this investment portfolio and provide recommendations"
  steps:
    1. "Evaluate the current asset allocation"
    2. "Assess market conditions impact on each asset class"
    3. "Identify risks and opportunities"
    4. "Formulate a recommendation"
  with context: {
    portfolio,
    market,
  }
}

print analysis
```

The `steps` guide the LLM through a chain-of-thought process before producing the final structured output.

## Comparison

| Primitive | Use case | Input | Output |
|---|---|---|---|
| `think` | Generate structured data from a prompt | Prompt string + optional context | Typed result |
| `infer` | Classify or interpret an existing value | Value + optional hint | Typed result |
| `reason` | Complex analysis with explicit steps | Goal + numbered steps + optional context | Typed result |

All three primitives support `with context`, `without context`, `guard`, and `on_fail` clauses.

## Using from JS/TS

The same three primitives are available as library functions. See the [Library Core Functions](/library/core-functions) guide for full details.

```typescript
import { think, infer, reason, zodSchema } from "thinklang";
import { z } from "zod";

const Summary = z.object({ headline: z.string(), keyPoints: z.array(z.string()) });

// think
const summary = await think<z.infer<typeof Summary>>({
  prompt: "Summarize this article",
  ...zodSchema(Summary),
  context: { article },
});

// infer
const lang = await infer<string>({
  value: "Bonjour le monde",
  hint: "Detect the language",
  jsonSchema: { type: "string" },
});

// reason
const analysis = await reason({
  goal: "Analyze this investment portfolio",
  steps: [
    { number: 1, description: "Evaluate current allocation" },
    { number: 2, description: "Identify risks" },
  ],
  ...zodSchema(z.object({ recommendation: z.string(), risk: z.string() })),
  context: { portfolio },
});
```
