import { getProvider } from "./provider.js";
import { Confident } from "./confident.js";
import { globalCache } from "./cache.js";
import { evaluateGuards, type GuardRule } from "./guard.js";
import { withRetry } from "./retry.js";
import { truncateContext, excludeFromContext } from "./context-manager.js";
import { buildThinkPrompt } from "../compiler/prompt-compiler.js";
import { globalCostTracker } from "./cost-tracker.js";

export interface ThinkOptions {
  jsonSchema: Record<string, unknown>;
  prompt: string;
  context?: Record<string, unknown>;
  withoutKeys?: string[];
  guards?: GuardRule[];
  retryCount?: number;
  fallback?: () => unknown;
  schemaName?: string;
}

export async function think(options: ThinkOptions): Promise<unknown> {
  const {
    jsonSchema,
    prompt,
    context = {},
    withoutKeys = [],
    guards,
    retryCount,
    fallback,
    schemaName,
  } = options;

  const effectiveContext = excludeFromContext(
    truncateContext(context),
    withoutKeys
  );

  // Check cache first
  const cached = globalCache.get(prompt, effectiveContext, jsonSchema);
  if (cached !== undefined) {
    return cached;
  }

  const execute = async () => {
    const provider = getProvider();
    const { systemPrompt, userMessage } = buildThinkPrompt(prompt, effectiveContext);

    const startTime = Date.now();
    const { data: result, usage, model } = await provider.complete({
      systemPrompt,
      userMessage,
      jsonSchema,
      schemaName,
    });
    const durationMs = Date.now() - startTime;

    globalCostTracker.record({
      operation: "think",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      prompt: prompt.slice(0, 100),
      durationMs,
    });

    // Evaluate guards if present
    if (guards && guards.length > 0) {
      evaluateGuards(result, guards);
    }

    // Cache the result
    globalCache.set(prompt, effectiveContext, jsonSchema, result);

    // Wrap in Confident if the schema has the Confident shape
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
