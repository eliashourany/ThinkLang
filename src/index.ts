// ThinkLang — AI-native programming language runtime
// https://thinklang.dev

// Convenience initializer
export { init, type InitOptions } from "./runtime/init.js";

// Core AI functions
export { think, type ThinkOptions } from "./runtime/think.js";
export { infer, type InferOptions } from "./runtime/infer.js";
export { reason, type ReasonOptions, type ReasonStep } from "./runtime/reason.js";

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
  setProvider,
  getProvider,
} from "./runtime/provider.js";
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
} from "./runtime/errors.js";

// Compiler (advanced use)
export { compile, compileToAst, type CompileOptions, type CompileResult } from "./compiler/index.js";
