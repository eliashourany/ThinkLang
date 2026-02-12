# Guards

Guards constrain AI outputs with validation rules. When a guard fails, ThinkLang can retry the AI call or fall back to a default value.

## Basic Guard

Add a `guard` clause after a `think`, `infer`, or `reason` expression:

```thinklang
let result = think<Translation>("Translate to Spanish")
  with context: sourceText
  guard {
    length: 5..500
  }
```

If the AI's response does not satisfy the guard, a `GuardFailed` error is thrown.

## Guard Rules

### length

Constrain the character length of the output (or its JSON serialization):

```thinklang
guard {
  length: 50..300
}
```

The range `50..300` means the output must be between 50 and 300 characters.

### contains_none

Ensure the output does not contain any of the forbidden strings:

```thinklang
guard {
  contains_none: ["TODO", "placeholder", "lorem ipsum"]
}
```

### Numeric Range Guards

For named fields, you can validate numeric ranges:

```thinklang
guard {
  score: 0..100
}
```

## on_fail

Specify what happens when a guard fails.

### Retry

Retry the AI call up to N times:

```thinklang
let result = think<Summary>("Summarize this article")
  with context: article
  guard {
    length: 100..500
  }
  on_fail: retry(3)
```

Retries use exponential backoff (500ms base delay).

### Retry with Fallback

If all retries fail, use a fallback value:

```thinklang
let result = think<Summary>("Summarize this article")
  with context: article
  guard {
    length: 100..500
  }
  on_fail: retry(3) then fallback({ headline: "Summary unavailable", keyPoints: [] })
```

## Multiple Guard Rules

Combine multiple rules in a single guard block:

```thinklang
let result = think<string>("Write a product description")
  with context: product
  guard {
    length: 50..300
    contains_none: ["click here", "buy now", "limited time"]
  }
  on_fail: retry(2)
```

All rules must pass for the guard to succeed.

## Guard Failure Errors

When a guard fails and no retry/fallback is configured, a `GuardFailed` error is thrown:

```thinklang
try {
  let result = think<string>("Generate text")
    guard { length: 10..50 }
} catch GuardFailed (e) {
  print "Guard failed — output did not meet constraints"
}
```

The `GuardFailed` error includes the guard name, the constraint that was violated, and the actual value that caused the failure.

## Using from JS/TS

Guards are available in the library via the `guards`, `retryCount`, and `fallback` options on `think()`, `infer()`, `reason()`, and `agent()`. See the [Library Core Functions](/library/core-functions) and [Library Error Handling](/library/error-handling) guides.

```typescript
import { think } from "thinklang";

const result = await think<string>({
  prompt: "Write a product description",
  jsonSchema: { type: "string" },
  context: { product },
  guards: [
    { name: "length", constraint: 50, rangeEnd: 300 },
    { name: "contains_none", constraint: ["click here", "buy now", "limited time"] },
  ],
  retryCount: 2,
  fallback: () => "Description unavailable",
});
```
