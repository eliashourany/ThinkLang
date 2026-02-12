export { Confident } from "./confident.js";
export { think, type ThinkOptions } from "./think.js";
export { infer, type InferOptions } from "./infer.js";
export { reason, type ReasonOptions, type ReasonStep } from "./reason.js";
export { agent, type AgentOptions, type AgentResult } from "./agent.js";
export { defineTool, toolToDefinition, type Tool, type DefineToolConfig } from "./tools.js";
export { evaluateGuards, type GuardRule, type GuardResult } from "./guard.js";
export { withRetry, type RetryOptions } from "./retry.js";
export { ExactMatchCache, globalCache } from "./cache.js";
export { truncateContext, excludeFromContext } from "./context-manager.js";
export {
  ThinkError,
  SchemaViolation,
  ConfidenceTooLow,
  GuardFailed,
  TokenBudgetExceeded,
  ModelUnavailable,
  Timeout,
  AgentMaxTurnsError,
  ToolExecutionError,
} from "./errors.js";
export {
  type ModelProvider,
  type CompleteOptions,
  type CompleteResult,
  type UsageInfo,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type Message,
  setProvider,
  getProvider,
} from "./provider.js";
export { registerProvider, createProvider, getRegisteredProviders, type ProviderOptions, type ProviderFactory } from "./provider-registry.js";
export { AnthropicProvider } from "./anthropic-provider.js";
export { CostTracker, globalCostTracker, registerPricing, type UsageRecord, type CostSummary, type OperationSummary } from "./cost-tracker.js";
export { init, type InitOptions } from "./init.js";
export { zodSchema, type ZodSchemaResult } from "./zod-schema.js";

// Big Data: batch processing, chunking, streaming, dataset, map-reduce
export { batch, type BatchOptions, type BatchResult, type BatchItemEvent, type BatchProgress, BatchCostBudgetExceeded, BatchAbortedError } from "./batch.js";
export { chunkText, chunkArray, estimateTokens, type TextChunkOptions, type ArrayChunkOptions, type ChunkResult } from "./chunker.js";
export { streamThink, streamInfer, collectStream, type StreamThinkOptions, type StreamInferOptions, type StreamEvent } from "./stream.js";
export { Dataset, DatasetResult, type DatasetExecuteOptions } from "./dataset.js";
export { mapThink, reduceThink, type MapThinkOptions, type MapThinkResult, type ReduceThinkOptions } from "./map-reduce.js";
