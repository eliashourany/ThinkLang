import { batch, type BatchOptions, type BatchResult } from "./batch.js";

// ─── Types ───────────────────────────────────────────────

export interface DatasetExecuteOptions {
  /** Maximum concurrent LLM calls (default: 5) */
  maxConcurrency?: number;
  /** Stop when cost exceeds this USD amount */
  costBudget?: number;
  /** Error handling strategy (default: "continue") */
  onError?: "fail-fast" | "continue";
  /** Called after each item completes */
  onItemComplete?: (event: { index: number; durationMs: number }) => void;
  /** Called periodically with progress */
  onProgress?: (progress: { completed: number; total: number; costSoFar: number }) => void;
  /** Abort signal */
  abortSignal?: AbortSignal;
  /** Rate limit in ms between items */
  rateLimit?: number;
}

type MapFn<T, U> = (item: T, index: number) => Promise<U> | U;
type FilterFn<T> = (item: T, index: number) => Promise<boolean> | boolean;
type ReduceFn<T, U> = (accumulator: U, item: T, index: number) => Promise<U> | U;

interface PipelineStep {
  type: "map" | "filter" | "flatMap" | "batch";
  fn?: Function;
  size?: number;
}

// ─── Dataset Class ───────────────────────────────────────

/**
 * A lazy, chainable collection for processing data through AI operations.
 * Operations are queued and only executed when `.execute()` is called.
 *
 * @example
 * const results = await Dataset.from(reviews)
 *   .map(async (review) => think({ prompt: `Classify: ${review}`, ... }))
 *   .filter(async (result) => result.sentiment === "positive")
 *   .execute({ maxConcurrency: 3 });
 */
export class Dataset<T> {
  private sourceItems: T[];
  private pipeline: PipelineStep[];

  private constructor(items: T[], pipeline: PipelineStep[] = []) {
    this.sourceItems = items;
    this.pipeline = pipeline;
  }

  /** Create a Dataset from an array of items */
  static from<T>(items: T[]): Dataset<T> {
    return new Dataset([...items]);
  }

  /** Create a Dataset from a range of numbers */
  static range(start: number, end: number): Dataset<number> {
    const items: number[] = [];
    for (let i = start; i < end; i++) {
      items.push(i);
    }
    return new Dataset(items);
  }

  /** Transform each item (can be async, e.g. AI call) */
  map<U>(fn: MapFn<T, U>): Dataset<U> {
    return new Dataset<U>(this.sourceItems as any, [
      ...this.pipeline,
      { type: "map", fn },
    ]);
  }

  /** Filter items (can be async, e.g. AI-based filtering) */
  filter(fn: FilterFn<T>): Dataset<T> {
    return new Dataset<T>(this.sourceItems as any, [
      ...this.pipeline,
      { type: "filter", fn },
    ]);
  }

  /** FlatMap: transform each item into an array and flatten */
  flatMap<U>(fn: MapFn<T, U[]>): Dataset<U> {
    return new Dataset<U>(this.sourceItems as any, [
      ...this.pipeline,
      { type: "flatMap", fn },
    ]);
  }

  /** Group items into fixed-size batches */
  batch(size: number): Dataset<T[]> {
    return new Dataset<T[]>(this.sourceItems as any, [
      ...this.pipeline,
      { type: "batch", size },
    ]);
  }

  /** Execute the pipeline and return all results */
  async execute(options: DatasetExecuteOptions = {}): Promise<DatasetResult<T>> {
    const {
      maxConcurrency = 5,
      costBudget,
      onError = "continue",
      onItemComplete,
      onProgress,
      abortSignal,
      rateLimit,
    } = options;

    // Apply pipeline steps sequentially, using batch() for concurrent map/filter
    let items: any[] = [...this.sourceItems];

    for (const step of this.pipeline) {
      switch (step.type) {
        case "map": {
          const batchResult = await batch({
            items,
            processor: async (item, index) => step.fn!(item, index),
            maxConcurrency,
            costBudget,
            onError,
            onItemComplete: onItemComplete
              ? (e) => onItemComplete({ index: e.index, durationMs: e.durationMs })
              : undefined,
            onProgress: onProgress
              ? (p) => onProgress({ completed: p.completed, total: p.total, costSoFar: p.costSoFar })
              : undefined,
            abortSignal,
            rateLimit,
          });
          items = batchResult.results
            .sort((a, b) => a.index - b.index)
            .map(r => r.data);
          break;
        }

        case "filter": {
          const batchResult = await batch({
            items: items.map((item, index) => ({ item, index })),
            processor: async ({ item, index }) => {
              const keep = await step.fn!(item, index);
              return { item, keep };
            },
            maxConcurrency,
            costBudget,
            onError,
            abortSignal,
            rateLimit,
          });
          items = batchResult.results
            .sort((a, b) => a.index - b.index)
            .filter(r => r.data.keep)
            .map(r => r.data.item);
          break;
        }

        case "flatMap": {
          const batchResult = await batch({
            items,
            processor: async (item, index) => step.fn!(item, index),
            maxConcurrency,
            costBudget,
            onError,
            abortSignal,
            rateLimit,
          });
          items = batchResult.results
            .sort((a, b) => a.index - b.index)
            .flatMap(r => r.data);
          break;
        }

        case "batch": {
          const size = step.size!;
          const batched: any[][] = [];
          for (let i = 0; i < items.length; i += size) {
            batched.push(items.slice(i, i + size));
          }
          items = batched;
          break;
        }
      }
    }

    return new DatasetResult(items);
  }

  /** Reduce all items to a single value (runs after execute) */
  async reduce<U>(fn: ReduceFn<T, U>, initial: U, options: DatasetExecuteOptions = {}): Promise<U> {
    const result = await this.execute(options);
    const items = result.toArray();
    let acc = initial;
    for (let i = 0; i < items.length; i++) {
      acc = await fn(acc, items[i], i);
    }
    return acc;
  }

  /** Get the count of source items */
  get length(): number {
    return this.sourceItems.length;
  }
}

// ─── Dataset Result ──────────────────────────────────────

export class DatasetResult<T> {
  private items: T[];

  constructor(items: T[]) {
    this.items = items;
  }

  /** Get all items as an array */
  toArray(): T[] {
    return [...this.items];
  }

  /** Get item count */
  get length(): number {
    return this.items.length;
  }

  /** Get first item */
  first(): T | undefined {
    return this.items[0];
  }

  /** Get last item */
  last(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /** Take the first N items */
  take(n: number): T[] {
    return this.items.slice(0, n);
  }

  /** Iterate over items */
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
