# Error Handling

All ThinkLang runtime errors extend `ThinkError`, which extends the built-in `Error`. You can catch specific error types for precise handling.

## Catching Errors

```typescript
import { think, ThinkError, SchemaViolation, GuardFailed, AgentMaxTurnsError, ToolExecutionError } from "thinklang";

try {
  await think<string>({ prompt: "...", jsonSchema: { type: "string" } });
} catch (error) {
  if (error instanceof SchemaViolation) {
    console.error("LLM output didn't match schema:", error.expected);
  } else if (error instanceof GuardFailed) {
    console.error("Guard failed:", error.guardName, error.constraint);
  } else if (error instanceof AgentMaxTurnsError) {
    console.error("Agent hit turn limit:", error.maxTurns);
  } else if (error instanceof ToolExecutionError) {
    console.error("Tool failed:", error.toolName, error.cause);
  } else if (error instanceof ThinkError) {
    console.error("ThinkLang error:", error.message);
  }
}
```

## Error Types

### ThinkError

Base class for all ThinkLang runtime errors.

### SchemaViolation

Thrown when LLM output does not conform to the expected JSON Schema.

Properties: `expected` (`string`), `got` (`unknown`)

### ConfidenceTooLow

Thrown by `Confident.unwrap()` or `Confident.expect()` when confidence is below threshold.

Properties: `threshold` (`number`), `actual` (`number`)

### GuardFailed

Thrown when a guard rule validation fails.

Properties: `guardName` (`string`), `guardValue` (`unknown`), `constraint` (`string`)

### TokenBudgetExceeded

Thrown when operation exceeds configured token budget.

Properties: `budget` (`number`), `required` (`number`)

### ModelUnavailable

Thrown when specified model cannot be reached.

Properties: `model` (`string`)

### Timeout

Thrown when an operation exceeds its time limit.

Properties: `durationMs` (`number`)

### AgentMaxTurnsError

Thrown when an agent reaches its turn limit without producing a final answer.

Properties: `maxTurns` (`number`), `actualTurns` (`number`)

### ToolExecutionError

Thrown when a tool throws during execution in an agent loop.

Properties: `toolName` (`string`), `cause` (`unknown`)

## Retry and Fallback

Use `retryCount` and `fallback` options on `think`/`infer`/`reason`/`agent`:

```typescript
const result = await think<string>({
  prompt: "Generate a summary",
  jsonSchema: { type: "string" },
  guards: [{ name: "length", constraint: 50, rangeEnd: 500 }],
  retryCount: 3,
  fallback: () => "Summary unavailable",
});
```

For agents, `retryCount` retries the entire agent loop:

```typescript
const result = await agent({
  prompt: "Research this topic",
  tools: [searchDocs],
  jsonSchema: { type: "string" },
  maxTurns: 5,
  retryCount: 2,
  fallback: () => "Could not complete research",
});
```

## Confidence Errors

```typescript
import { think, Confident, ConfidenceTooLow } from "thinklang";

// Using expect() with a threshold
try {
  const result = await think<Confident<{ label: string }>>({
    prompt: "Classify this item",
    jsonSchema: {
      type: "object",
      properties: {
        value: { type: "object", properties: { label: { type: "string" } } },
        confidence: { type: "number" },
        reasoning: { type: "string" },
      },
      required: ["value", "confidence", "reasoning"],
    },
  });
  const label = result.expect(0.8); // throws if confidence < 0.8
} catch (error) {
  if (error instanceof ConfidenceTooLow) {
    console.log(`Confidence ${error.actual} below threshold ${error.threshold}`);
  }
}
```

## Next Steps

- [Core Functions](./core-functions.md) for think, infer, reason
- [Agents & Tools](./agents-tools.md) for agent error handling
- [Guards (Language Guide)](/guide/guards) for the .tl syntax equivalent
- [Error Reference](/reference/errors) for complete error documentation
