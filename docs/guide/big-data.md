# Big Data Processing

ThinkLang includes built-in support for processing large collections of data through AI. Whether you're classifying thousands of reviews, summarizing hundreds of documents, or transforming datasets through LLM calls — big data features handle concurrency, cost tracking, and error recovery for you.

## Overview

| Feature | ThinkLang (.tl) | JS/TS Library |
|---------|-----------------|---------------|
| Batch processing | `batch<T>(items, processor)` | `batch({ items, processor })` |
| Map with AI | `map_think<T>(items, prompt)` | `mapThink({ items, promptTemplate })` |
| Reduce with AI | `reduce_think<T>(items, prompt)` | `reduceThink({ items, prompt })` |
| Text chunking | — | `chunkText(text, options)` |
| Array chunking | — | `chunkArray(items, options)` |
| Streaming | — | `streamThink(options)` / `streamInfer(options)` |
| Dataset pipeline | — | `Dataset.from(items).map().filter().execute()` |

## Batch Processing (ThinkLang)

Process multiple items through AI in parallel using `map_think`:

```
type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("confidence score 0-1")
  score: float
}

let reviews = ["Great product!", "Terrible experience", "It was okay"]

// Classify all reviews in parallel (up to 3 at a time)
let sentiments = map_think<Sentiment>(reviews, "Classify this review's sentiment")
  concurrency: 3
```

### Clauses

| Clause | Description | Example |
|--------|-------------|---------|
| `concurrency: N` | Max parallel LLM calls | `concurrency: 5` |
| `cost_budget: N` | Stop when cost exceeds $N | `cost_budget: 1.00` |
| `on_error: strategy` | `fail_fast` or `continue` | `on_error: continue` |

### Generic batch

Use `batch<T>` for custom processing logic:

```
let results = batch<string>(items, processor)
  concurrency: 5
  cost_budget: 2.00
  on_error: continue
```

## Tree Reduction (ThinkLang)

Aggregate a collection into a single result using `reduce_think`. Items are batched, each batch is summarized by the LLM, then summaries are recursively reduced until a single result remains:

```
let paragraphs = ["First paragraph...", "Second paragraph...", "Third paragraph..."]

let summary = reduce_think<string>(paragraphs, "Combine into a coherent summary")
  batch_size: 5
```

### Clauses

| Clause | Description |
|--------|-------------|
| `batch_size: N` | Items per reduction batch (default: 10) |
| `with context: { ... }` | Additional context for the AI |

## Batch Processing (JS/TS Library)

### `batch()`

The most flexible option — provide any async processor:

```typescript
import { batch, think, zodSchema } from "thinklang";
import { z } from "zod";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await batch({
  items: reviews,
  processor: async (review) => {
    return think({ prompt: `Classify: "${review}"`, ...zodSchema(Sentiment) });
  },
  maxConcurrency: 5,
  costBudget: 1.00,
  onError: "continue",
  onProgress: (p) => console.log(`${p.completed}/${p.total} done`),
  onItemComplete: (e) => console.log(`Item ${e.index}: ${e.durationMs}ms`),
});

console.log(result.results);     // successful items
console.log(result.errors);      // failed items
console.log(result.totalCostUsd); // total cost
```

### `mapThink()`

Simpler API when you just need to apply `think()` to each item:

```typescript
import { mapThink } from "thinklang";

const result = await mapThink({
  items: reviews,
  promptTemplate: (review) => `Classify sentiment: "${review}"`,
  jsonSchema: { type: "object", properties: { label: { type: "string" } } },
  maxConcurrency: 5,
});

console.log(result.results);      // array of results
console.log(result.successCount);  // how many succeeded
console.log(result.errorCount);    // how many failed
```

### `reduceThink()`

Aggregate items using tree-reduction:

```typescript
import { reduceThink } from "thinklang";

const summary = await reduceThink({
  items: paragraphs,
  prompt: "Combine these into a coherent summary",
  jsonSchema: { type: "string" },
  batchSize: 5,
  maxConcurrency: 3,
});
```

## Dataset Pipeline (JS/TS)

The `Dataset` class provides a lazy, chainable API for building data processing pipelines:

```typescript
import { Dataset, think, zodSchema } from "thinklang";

const results = await Dataset.from(reviews)
  .map(async (review) => think({ prompt: `Classify: "${review}"`, ...zodSchema(Sentiment) }))
  .filter(async (sentiment) => sentiment.label === "positive")
  .execute({ maxConcurrency: 3, costBudget: 2.00 });

console.log(results.toArray());
console.log(results.length);
console.log(results.first());
```

### Methods

| Method | Description |
|--------|-------------|
| `Dataset.from(items)` | Create from array |
| `Dataset.range(start, end)` | Create from number range |
| `.map(fn)` | Transform each item |
| `.filter(fn)` | Keep items where fn returns true |
| `.flatMap(fn)` | Transform and flatten |
| `.batch(size)` | Group items into chunks |
| `.reduce(fn, initial)` | Reduce to single value |
| `.execute(options)` | Run the pipeline |

### Execute options

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrency` | 5 | Max parallel operations |
| `costBudget` | — | Stop when cost exceeds threshold |
| `onError` | `"continue"` | `"fail-fast"` or `"continue"` |
| `rateLimit` | — | Min ms between operations |
| `abortSignal` | — | AbortController signal |

## Text Chunking (JS/TS)

Split large text to fit within LLM context windows:

```typescript
import { chunkText, estimateTokens } from "thinklang";

const { chunks, totalChunks } = chunkText(longArticle, {
  maxTokens: 1000,
  strategy: "paragraph", // "paragraph" | "sentence" | "fixed"
  overlap: 50,           // character overlap between chunks
});

console.log(`Split into ${totalChunks} chunks`);
console.log(`First chunk tokens: ~${estimateTokens(chunks[0])}`);
```

### Array chunking

```typescript
import { chunkArray } from "thinklang";

const { chunks } = chunkArray(items, { chunkSize: 10 });
// [[item0..item9], [item10..item19], ...]
```

## Streaming (JS/TS)

Process data incrementally using async generators:

```typescript
import { streamThink, collectStream } from "thinklang";

// Yield results as each chunk is processed
for await (const event of streamThink({
  prompt: longText,
  jsonSchema: { type: "string" },
  chunkOptions: { maxTokens: 500, strategy: "paragraph" },
})) {
  console.log(`Chunk ${event.index + 1}/${event.totalChunks}: ${event.data}`);
}

// Or collect all at once
const allResults = await collectStream(streamThink({ prompt: text, jsonSchema: schema }));
```

## Import Paths

Big data features are available from both the main package and a dedicated entry point:

```typescript
// From main package
import { batch, mapThink, reduceThink, Dataset, chunkText, streamThink } from "thinklang";

// Or from dedicated entry point
import { batch, mapThink, reduceThink, Dataset, chunkText, streamThink } from "thinklang/data";
```
