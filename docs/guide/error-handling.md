# Error Handling

AI operations can fail in predictable ways. ThinkLang provides typed error handling with `try`/`catch` so you can respond to specific failure modes.

## Syntax

```thinklang
try {
  // statements
} catch ErrorType (binding) {
  // handle error
}
```

## Example

```thinklang
type Summary {
  headline: string
  points: string[]
}

let text = "Brief update: all systems operational."

try {
  let result = think<Summary>("Summarize this text in detail")
    with context: text
  print result
} catch SchemaViolation (e) {
  print "Schema error occurred"
} catch ConfidenceTooLow (e) {
  print "Confidence too low for reliable result"
}
```

## Error Types

ThinkLang defines these error types, all extending a base `ThinkError`:

| Error Type | When it occurs |
|---|---|
| `SchemaViolation` | AI output does not match the expected type/schema |
| `ConfidenceTooLow` | Confidence is below the threshold passed to `expect()` |
| `GuardFailed` | A guard constraint was not satisfied |
| `TokenBudgetExceeded` | The request would exceed the token budget |
| `ModelUnavailable` | The configured model cannot be reached |
| `Timeout` | The AI call timed out |

## Multiple Catch Clauses

You can catch different error types in separate clauses:

```thinklang
try {
  let result = think<Analysis>("Analyze this data")
    with context: data
    guard { length: 100..1000 }
  print result
} catch SchemaViolation (e) {
  print "The AI returned malformed data"
} catch GuardFailed (e) {
  print "Output did not meet constraints"
} catch Timeout (e) {
  print "The request timed out"
}
```

Unmatched error types propagate up the call stack.

## Combining with Guards

Guards and try/catch complement each other. Use guards with `on_fail: retry(N)` for automatic recovery, and try/catch for handling failures that retries cannot fix:

```thinklang
try {
  let result = think<Summary>("Summarize")
    with context: text
    guard { length: 50..500 }
    on_fail: retry(3)
  print result
} catch GuardFailed (e) {
  print "All retries failed — guard still not satisfied"
}
```

## Combining with Confidence

Handle `ConfidenceTooLow` when using `expect()`:

```thinklang
try {
  let value = result.expect(0.9)
  print value
} catch ConfidenceTooLow (e) {
  print "Falling back to manual review"
}
```
