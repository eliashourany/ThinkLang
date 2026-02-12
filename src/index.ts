// ThinkLang — AI-native programming language runtime
// https://thinklang.dev

// Convenience initializer
export { init, type InitOptions } from "./runtime/init.js";

// Core AI functions
export { think, type ThinkOptions } from "./runtime/think.js";
export { infer, type InferOptions } from "./runtime/infer.js";
export { reason, type ReasonOptions, type ReasonStep } from "./runtime/reason.js";

// Agentic capabilities
export { agent, type AgentOptions, type AgentResult } from "./runtime/agent.js";
export { defineTool, toolToDefinition, type Tool, type DefineToolConfig } from "./runtime/tools.js";

// Zod schema helper
export { zodSchema, type ZodSchemaResult } from "./runtime/zod-schema.js";

// Guards
export { evaluateGuards, type GuardRule, type GuardResult } from "./runtime/guard.js";

// Provider system
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
} from "./runtime/provider.js";
export { registerProvider, createProvider, getRegisteredProviders, type ProviderOptions, type ProviderFactory } from "./runtime/provider-registry.js";
export { AnthropicProvider } from "./runtime/anthropic-provider.js";

// Confidence wrapper
export { Confident } from "./runtime/confident.js";

// Utilities
export { withRetry, type RetryOptions } from "./runtime/retry.js";
export { ExactMatchCache, globalCache } from "./runtime/cache.js";
export { truncateContext, excludeFromContext } from "./runtime/context-manager.js";

// Cost tracking
export {
  CostTracker,
  globalCostTracker,
  registerPricing,
  type UsageRecord,
  type CostSummary,
  type OperationSummary,
} from "./runtime/cost-tracker.js";

// Errors
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
} from "./runtime/errors.js";

// Built-in tools (opt-in)
export { fetchUrl, readFile, writeFile, runCommand } from "./runtime/builtin-tools.js";

// Big Data
export { batch, type BatchOptions, type BatchResult, type BatchItemEvent, type BatchProgress, BatchCostBudgetExceeded, BatchAbortedError } from "./runtime/batch.js";
export { chunkText, chunkArray, estimateTokens, type TextChunkOptions, type ArrayChunkOptions, type ChunkResult } from "./runtime/chunker.js";
export { streamThink, streamInfer, collectStream, type StreamThinkOptions, type StreamInferOptions, type StreamEvent } from "./runtime/stream.js";
export { Dataset, DatasetResult, type DatasetExecuteOptions } from "./runtime/dataset.js";
export { mapThink, reduceThink, type MapThinkOptions, type MapThinkResult, type ReduceThinkOptions } from "./runtime/map-reduce.js";

// Compiler (advanced use)
export { compile, compileToAst, type CompileOptions, type CompileResult } from "./compiler/index.js";
