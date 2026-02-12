import { think, type ThinkOptions } from "./think.js";
import { batch } from "./batch.js";
import { chunkArray } from "./chunker.js";

// ─── Types ───────────────────────────────────────────────

export interface MapThinkOptions<T> {
  /** Items to process */
  items: T[];
  /** Prompt template: receives each item and its index, returns a prompt string */
  promptTemplate: (item: T, index: number) => string;
  /** JSON schema for each result */
  jsonSchema: Record<string, unknown>;
  /** Schema name */
  schemaName?: string;
  /** Context shared across all items */
  context?: Record<string, unknown>;
  /** Maximum concurrent LLM calls (default: 5) */
  maxConcurrency?: number;
  /** Cost budget in USD */
  costBudget?: number;
  /** Error handling (default: "continue") */
  onError?: "fail-fast" | "continue";
  /** Abort signal */
  abortSignal?: AbortSignal;
}

export interface MapThinkResult<U> {
  results: U[];
  errors: Array<{ index: number; error: Error }>;
  totalItems: number;
  successCount: number;
  errorCount: number;
  totalCostUsd: number;
  totalDurationMs: number;
}

export interface ReduceThinkOptions<T> {
  /** Items to reduce */
  items: T[];
  /** Prompt describing the reduction/aggregation operation */
  prompt: string;
  /** JSON schema for the final reduced result */
  jsonSchema: Record<string, unknown>;
  /** Schema name */
  schemaName?: string;
  /** How many items to include per reduction batch (default: 10) */
  batchSize?: number;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Maximum concurrent calls for tree-reduce (default: 3) */
  maxConcurrency?: number;
}

// ─── Map Think ───────────────────────────────────────────

/**
 * Apply think() to each item in parallel.
 * Like Array.map() but each item is processed by an LLM call.
 *
 * @example
 * const sentiments = await mapThink({
 *   items: reviews,
 *   promptTemplate: (review) => `Classify the sentiment of: "${review}"`,
 *   jsonSchema: { type: "object", properties: { label: { type: "string" } } },
 *   maxConcurrency: 5,
 * });
 */
export async function mapThink<T, U = unknown>(options: MapThinkOptions<T>): Promise<MapThinkResult<U>> {
  const {
    items,
    promptTemplate,
    jsonSchema,
    schemaName,
    context,
    maxConcurrency = 5,
    costBudget,
    onError = "continue",
    abortSignal,
  } = options;

  const batchResult = await batch({
    items,
    processor: async (item, index) => {
      const prompt = promptTemplate(item, index);
      return think<U>({
        jsonSchema,
        prompt,
        schemaName,
        context: {
          ...context,
          __item_index: index,
          __total_items: items.length,
        },
      });
    },
    maxConcurrency,
    costBudget,
    onError,
    abortSignal,
  });

  return {
    results: batchResult.results.map(r => r.data),
    errors: batchResult.errors.map(e => ({ index: e.index, error: e.error })),
    totalItems: batchResult.totalItems,
    successCount: batchResult.successCount,
    errorCount: batchResult.errorCount,
    totalCostUsd: batchResult.totalCostUsd,
    totalDurationMs: batchResult.totalDurationMs,
  };
}

// ─── Reduce Think ────────────────────────────────────────

/**
 * Aggregate items using tree-reduction via think().
 * Items are batched, each batch is summarized by the LLM,
 * then summaries are further reduced until a single result remains.
 *
 * @example
 * const summary = await reduceThink({
 *   items: paragraphs,
 *   prompt: "Combine these paragraphs into a coherent summary",
 *   jsonSchema: { type: "string" },
 *   batchSize: 5,
 * });
 */
export async function reduceThink<T, U = unknown>(options: ReduceThinkOptions<T>): Promise<U> {
  const {
    items,
    prompt,
    jsonSchema,
    schemaName,
    batchSize = 10,
    context,
    maxConcurrency = 3,
  } = options;

  if (items.length === 0) {
    throw new Error("reduceThink requires at least one item");
  }

  // Single item: just process it directly
  if (items.length === 1) {
    return think<U>({
      jsonSchema,
      prompt,
      schemaName,
      context: {
        ...context,
        items: items,
      },
    });
  }

  // Tree reduction: batch → summarize → repeat
  let current: unknown[] = items;

  while (current.length > 1) {
    const { chunks } = chunkArray(current, { chunkSize: batchSize });

    const batchResult = await batch({
      items: chunks,
      processor: async (chunk) => {
        return think<U>({
          jsonSchema,
          prompt,
          schemaName,
          context: {
            ...context,
            items: chunk,
            __reduction_level: "partial",
            __batch_count: chunks.length,
          },
        });
      },
      maxConcurrency,
    });

    current = batchResult.results
      .sort((a, b) => a.index - b.index)
      .map(r => r.data);
  }

  return current[0] as U;
}
