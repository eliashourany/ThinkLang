# Big Data & Streaming

ThinkLang provides tools for processing large collections through AI: batch processing, map/reduce, lazy dataset pipelines, text chunking, and streaming. All available from `thinklang` or `thinklang/data`.

## batch()

The most flexible option -- provide any async processor:

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
});

console.log(result.results);      // successful items
console.log(result.errors);       // failed items
console.log(result.totalCostUsd); // total cost
```

### batch() Options

| Option | Type | Default | Description |
|---|---|---|---|
| `items` | `T[]` | required | Items to process |
| `processor` | `(item: T, index: number) => Promise<U>` | required | Async processor function |
| `maxConcurrency` | `number` | `5` | Max parallel operations |
| `costBudget` | `number` | -- | USD threshold, stops when exceeded |
| `onError` | `"fail-fast" \| "continue"` | `"continue"` | Error handling strategy |
| `onProgress` | `(progress) => void` | -- | Progress callback |
| `onItemComplete` | `(item, result) => void` | -- | Per-item completion callback |
| `abortSignal` | `AbortSignal` | -- | Cancellation signal |
| `rateLimit` | `number` | -- | Min ms between item starts |

### BatchResult

| Field | Type | Description |
|---|---|---|
| `results` | `U[]` | Successfully processed items |
| `errors` | `BatchError[]` | Failed items with error details |
| `totalItems` | `number` | Total items in the input |
| `successCount` | `number` | Number of successful items |
| `errorCount` | `number` | Number of failed items |
| `totalCostUsd` | `number` | Total cost in USD |
| `totalDurationMs` | `number` | Total elapsed time in ms |

## mapThink()

Simpler API when you just need to apply `think()` to each item:

```typescript
import { mapThink, zodSchema } from "thinklang";
import { z } from "zod";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

const result = await mapThink({
  items: reviews,
  promptTemplate: (review) => `Classify sentiment: "${review}"`,
  ...zodSchema(Sentiment),
  maxConcurrency: 5,
});

console.log(result.results);
console.log(result.successCount);
console.log(result.errorCount);
```

## reduceThink()

Aggregate items using tree-reduction. Items are batched, each batch is summarized by the LLM, then summaries are recursively reduced:

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

## Dataset

Lazy, chainable collection for building data pipelines. Pipelines are built lazily and only run on `.execute()`.

```typescript
import { Dataset, think, zodSchema } from "thinklang";
import { z } from "zod";

const Sentiment = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number(),
});

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
|---|---|
| `Dataset.from(items)` | Create a dataset from an array |
| `Dataset.range(start, end)` | Create a dataset from a number range |
| `.map(fn)` | Transform each item |
| `.filter(fn)` | Keep items where fn returns true |
| `.flatMap(fn)` | Transform and flatten |
| `.batch(size)` | Group items into chunks |
| `.reduce(fn, initial)` | Reduce to a single value |
| `.execute(options)` | Run the pipeline |

### Execute Options

| Option | Type | Default | Description |
|---|---|---|---|
| `maxConcurrency` | `number` | `5` | Max parallel operations |
| `costBudget` | `number` | -- | USD threshold |
| `onError` | `"fail-fast" \| "continue"` | `"continue"` | Error handling strategy |
| `rateLimit` | `number` | -- | Min ms between item starts |
| `abortSignal` | `AbortSignal` | -- | Cancellation signal |

## Text Chunking

Split large text to fit within LLM context windows:

```typescript
import { chunkText, estimateTokens } from "thinklang";

const { chunks, totalChunks } = chunkText(longArticle, {
  maxTokens: 1000,
  strategy: "paragraph", // "paragraph" | "sentence" | "fixed"
  overlap: 50,
});

console.log(`Split into ${totalChunks} chunks`);
console.log(`First chunk tokens: ~${estimateTokens(chunks[0])}`);
```

### Array Chunking

```typescript
import { chunkArray } from "thinklang";

const { chunks } = chunkArray(items, { chunkSize: 10 });
```

## Streaming

Process data incrementally using async generators:

```typescript
import { streamThink, collectStream } from "thinklang";

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

```typescript
// From main package
import { batch, mapThink, reduceThink, Dataset, chunkText, streamThink } from "thinklang";

// Or from dedicated entry point
import { batch, mapThink, reduceThink, Dataset, chunkText, streamThink } from "thinklang/data";
```

## Next Steps

- [Core Functions](./core-functions.md) for think, infer, reason
- [Agents & Tools](./agents-tools.md) for agentic workflows
- [Big Data (Language Guide)](/guide/big-data) for the .tl syntax equivalent
- [Runtime API Reference](/reference/runtime-api) for complete type definitions
