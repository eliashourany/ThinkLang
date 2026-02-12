import { globalCostTracker } from "./cost-tracker.js";

// ─── Types ───────────────────────────────────────────────

export interface BatchOptions<T, U> {
  /** Items to process */
  items: T[];
  /** Async processor function applied to each item */
  processor: (item: T, index: number) => Promise<U>;
  /** Maximum concurrent LLM calls (default: 5) */
  maxConcurrency?: number;
  /** Stop processing when cost exceeds this USD amount */
  costBudget?: number;
  /** Whether to stop on first error or continue (default: "continue") */
  onError?: "fail-fast" | "continue";
  /** Called after each item completes */
  onItemComplete?: (event: BatchItemEvent<T, U>) => void;
  /** Called periodically with progress updates */
  onProgress?: (progress: BatchProgress) => void;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Rate limit: minimum milliseconds between item starts */
  rateLimit?: number;
}

export interface BatchItemEvent<T, U> {
  index: number;
  item: T;
  result?: U;
  error?: Error;
  durationMs: number;
}

export interface BatchProgress {
  completed: number;
  failed: number;
  total: number;
  costSoFar: number;
  elapsedMs: number;
}

export interface BatchResult<T, U> {
  results: Array<{ index: number; item: T; data: U }>;
  errors: Array<{ index: number; item: T; error: Error }>;
  totalItems: number;
  successCount: number;
  errorCount: number;
  totalCostUsd: number;
  totalDurationMs: number;
}

// ─── Errors ──────────────────────────────────────────────

export class BatchCostBudgetExceeded extends Error {
  readonly budget: number;
  readonly spent: number;

  constructor(budget: number, spent: number) {
    super(`Batch cost budget exceeded: budget=$${budget.toFixed(4)}, spent=$${spent.toFixed(4)}`);
    this.name = "BatchCostBudgetExceeded";
    this.budget = budget;
    this.spent = spent;
  }
}

export class BatchAbortedError extends Error {
  constructor(reason?: string) {
    super(`Batch aborted${reason ? `: ${reason}` : ""}`);
    this.name = "BatchAbortedError";
  }
}

// ─── Implementation ──────────────────────────────────────

export async function batch<T, U>(options: BatchOptions<T, U>): Promise<BatchResult<T, U>> {
  const {
    items,
    processor,
    maxConcurrency = 5,
    costBudget,
    onError = "continue",
    onItemComplete,
    onProgress,
    abortSignal,
    rateLimit,
  } = options;

  const results: Array<{ index: number; item: T; data: U }> = [];
  const errors: Array<{ index: number; item: T; error: Error }> = [];
  const startTime = Date.now();
  const costBefore = globalCostTracker.getSummary().totalCostUsd;

  let completed = 0;
  let failed = 0;
  let shouldStop = false;
  let lastItemStartTime = 0;

  const emitProgress = () => {
    if (!onProgress) return;
    const costNow = globalCostTracker.getSummary().totalCostUsd;
    onProgress({
      completed: completed + failed,
      failed,
      total: items.length,
      costSoFar: costNow - costBefore,
      elapsedMs: Date.now() - startTime,
    });
  };

  // Process a single item
  const processItem = async (item: T, index: number): Promise<void> => {
    if (shouldStop) return;
    if (abortSignal?.aborted) {
      shouldStop = true;
      return;
    }

    // Rate limiting
    if (rateLimit && rateLimit > 0) {
      const now = Date.now();
      const elapsed = now - lastItemStartTime;
      if (elapsed < rateLimit) {
        await sleep(rateLimit - elapsed);
      }
      lastItemStartTime = Date.now();
    }

    // Cost budget check
    if (costBudget !== undefined) {
      const currentCost = globalCostTracker.getSummary().totalCostUsd - costBefore;
      if (currentCost >= costBudget) {
        shouldStop = true;
        throw new BatchCostBudgetExceeded(costBudget, currentCost);
      }
    }

    const itemStart = Date.now();
    try {
      const data = await processor(item, index);
      const durationMs = Date.now() - itemStart;
      results.push({ index, item, data });
      completed++;

      if (onItemComplete) {
        onItemComplete({ index, item, result: data, durationMs });
      }
    } catch (err) {
      const durationMs = Date.now() - itemStart;
      const error = err instanceof Error ? err : new Error(String(err));
      errors.push({ index, item, error });
      failed++;

      if (onItemComplete) {
        onItemComplete({ index, item, error, durationMs });
      }

      if (onError === "fail-fast") {
        shouldStop = true;
        throw error;
      }
    }

    emitProgress();
  };

  // Execute with concurrency control
  if (onError === "fail-fast") {
    try {
      await runWithConcurrency(items, processItem, maxConcurrency);
    } catch {
      // Error already recorded in errors array
    }
  } else {
    await runWithConcurrency(items, processItem, maxConcurrency);
  }

  const totalDurationMs = Date.now() - startTime;
  const costAfter = globalCostTracker.getSummary().totalCostUsd;

  // Sort results by index for deterministic output
  results.sort((a, b) => a.index - b.index);
  errors.sort((a, b) => a.index - b.index);

  return {
    results,
    errors,
    totalItems: items.length,
    successCount: results.length,
    errorCount: errors.length,
    totalCostUsd: costAfter - costBefore,
    totalDurationMs,
  };
}

// Concurrency-limited executor
async function runWithConcurrency<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  maxConcurrency: number,
): Promise<void> {
  let nextIndex = 0;
  const running = new Set<Promise<void>>();

  const startNext = (): Promise<void> | null => {
    if (nextIndex >= items.length) return null;
    const index = nextIndex++;
    const p = processor(items[index], index).finally(() => running.delete(p));
    running.add(p);
    return p;
  };

  // Fill initial pool
  while (running.size < maxConcurrency && nextIndex < items.length) {
    startNext();
  }

  // As each completes, start the next
  while (running.size > 0) {
    await Promise.race(running);
    while (running.size < maxConcurrency && nextIndex < items.length) {
      startNext();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
