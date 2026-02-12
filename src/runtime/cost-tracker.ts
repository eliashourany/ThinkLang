export interface UsageRecord {
  timestamp: number;
  operation: "think" | "infer" | "reason" | "agent" | "semantic_assert" | "batch" | "map_think" | "reduce_think";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  prompt?: string;
  durationMs: number;
}

export interface OperationSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCalls: number;
  byOperation: Map<string, OperationSummary>;
  byModel: Map<string, OperationSummary>;
}

// Pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4 },
  "claude-3-opus-20240229": { input: 15, output: 75 },
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "o3": { input: 10, output: 40 },
  "o4-mini": { input: 1.1, output: 4.4 },
  // Google
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
};

// Default pricing for unknown models (rough estimate)
const DEFAULT_PRICING = { input: 3, output: 15 };

/**
 * Register custom pricing for a model.
 * Pricing is per million tokens (USD).
 */
export function registerPricing(model: string, pricing: { input: number; output: number }): void {
  MODEL_PRICING[model] = pricing;
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export class CostTracker {
  private records: UsageRecord[] = [];

  record(opts: {
    operation: UsageRecord["operation"];
    model: string;
    inputTokens: number;
    outputTokens: number;
    prompt?: string;
    durationMs: number;
  }): void {
    this.records.push({
      timestamp: Date.now(),
      operation: opts.operation,
      model: opts.model,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      costUsd: calculateCost(opts.model, opts.inputTokens, opts.outputTokens),
      prompt: opts.prompt ? opts.prompt.slice(0, 100) : undefined,
      durationMs: opts.durationMs,
    });
  }

  getSummary(): CostSummary {
    const byOperation = new Map<string, OperationSummary>();
    const byModel = new Map<string, OperationSummary>();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;

    for (const r of this.records) {
      totalInputTokens += r.inputTokens;
      totalOutputTokens += r.outputTokens;
      totalCostUsd += r.costUsd;

      const opEntry = byOperation.get(r.operation) ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      opEntry.calls++;
      opEntry.inputTokens += r.inputTokens;
      opEntry.outputTokens += r.outputTokens;
      opEntry.costUsd += r.costUsd;
      byOperation.set(r.operation, opEntry);

      const modelEntry = byModel.get(r.model) ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      modelEntry.calls++;
      modelEntry.inputTokens += r.inputTokens;
      modelEntry.outputTokens += r.outputTokens;
      modelEntry.costUsd += r.costUsd;
      byModel.set(r.model, modelEntry);
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      totalCalls: this.records.length,
      byOperation,
      byModel,
    };
  }

  getRecords(): UsageRecord[] {
    return [...this.records];
  }

  reset(): void {
    this.records = [];
  }
}

export const globalCostTracker = new CostTracker();
