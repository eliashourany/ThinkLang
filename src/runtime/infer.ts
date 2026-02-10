import { getProvider } from "./provider.js";
import { Confident } from "./confident.js";
import { globalCache } from "./cache.js";
import { evaluateGuards, type GuardRule } from "./guard.js";
import { withRetry } from "./retry.js";
import { truncateContext, excludeFromContext } from "./context-manager.js";
import { buildInferPrompt } from "../compiler/prompt-compiler.js";
import { globalCostTracker } from "./cost-tracker.js";

export interface InferOptions {
  jsonSchema: Record<string, unknown>;
  value: unknown;
  hint?: string;
  context?: Record<string, unknown>;
  withoutKeys?: string[];
  guards?: GuardRule[];
  retryCount?: number;
  fallback?: () => unknown;
  schemaName?: string;
  uncertain?: boolean;
}

export async function infer(options: InferOptions): Promise<unknown> {
  const {
    jsonSchema: rawSchema,
    value,
    hint,
    context = {},
    withoutKeys = [],
    guards,
    retryCount,
    fallback,
    schemaName,
    uncertain = false,
  } = options;

  const jsonSchema = uncertain ? {
    type: "object",
    properties: {
      value: rawSchema,
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["value", "confidence", "reasoning"],
    additionalProperties: false,
  } : rawSchema;

  const effectiveContext = excludeFromContext(
    truncateContext(context),
    withoutKeys
  );

  const cacheKey = JSON.stringify({ value, hint });
  const cached = globalCache.get(cacheKey, effectiveContext, jsonSchema);
  if (cached !== undefined) {
    return cached;
  }

  const execute = async () => {
    const provider = getProvider();
    const { systemPrompt, userMessage } = buildInferPrompt(value, hint, effectiveContext);

    const startTime = Date.now();
    const { data: result, usage, model } = await provider.complete({
      systemPrompt,
      userMessage,
      jsonSchema,
      schemaName,
    });
    const durationMs = Date.now() - startTime;

    globalCostTracker.record({
      operation: "infer",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      prompt: JSON.stringify(value).slice(0, 100),
      durationMs,
    });

    if (guards && guards.length > 0) {
      evaluateGuards(result, guards);
    }

    globalCache.set(cacheKey, effectiveContext, jsonSchema, result);

    // Wrap in Confident if schema has that shape
    if (isConfidentSchema(jsonSchema)) {
      const r = result as any;
      return new Confident(r.value, r.confidence, r.reasoning ?? "");
    }

    return result;
  };

  if (retryCount && retryCount > 0) {
    return withRetry(execute, {
      attempts: retryCount,
      fallback: fallback ? fallback : undefined,
    });
  }

  return execute();
}

function isConfidentSchema(schema: Record<string, unknown>): boolean {
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props) return false;
  return "value" in props && "confidence" in props;
}
