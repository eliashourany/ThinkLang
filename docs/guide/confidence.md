# Confidence

AI outputs are inherently uncertain. ThinkLang provides the `Confident<T>` wrapper and the `uncertain` modifier to make this uncertainty explicit and force safe handling.

## Confident\<T\>

Wrap any type in `Confident<T>` to request confidence metadata from the AI:

```thinklang
type Category {
  name: string
  subcategory: string
}

let result = think<Confident<Category>>("Classify this product")
  with context: item
```

The AI returns an object with three fields:

| Field | Type | Description |
|---|---|---|
| `value` | `T` | The actual data (your `Category`) |
| `confidence` | `float` | Confidence score from 0.0 to 1.0 |
| `reasoning` | `string` | Explanation of the confidence level |

## The uncertain Modifier

Mark a variable as `uncertain` to tell the compiler that the value must be explicitly unwrapped before use:

```thinklang
let uncertain category = think<Category>("Classify this product")
  with context: text
```

The compiler enforces that you cannot use `category` directly -- you must unwrap it first.

## Unwrapping Values

### unwrap()

Extract the value unconditionally:

```thinklang
let uncertain result = think<Category>("Classify this") with context: text

let value = result.unwrap()
print value
```

### expect(threshold)

Extract the value only if confidence meets a minimum threshold. Throws `ConfidenceTooLow` if it does not:

```thinklang
let uncertain result = think<Confident<Category>>("Classify this") with context: text

let value = result.expect(0.8)
print value
```

If confidence is below `0.8`, a `ConfidenceTooLow` error is thrown.

### or(fallback)

Return the value if confident (above 0.7 by default), otherwise return a fallback:

```thinklang
let uncertain result = think<Confident<Category>>("Classify this") with context: text

let safe = result.or({ name: "unknown", subcategory: "none" })
```

## isConfident()

Check whether the confidence meets a threshold without unwrapping:

```thinklang
let result = think<Confident<Sentiment>>("Analyze sentiment") with context: review

if result.isConfident(0.9) {
  print "High confidence result"
} else {
  print "Consider manual review"
}
```

The default threshold for `isConfident()` is `0.7`.

## Combining with Match

`Confident<T>` works well with pattern matching:

```thinklang
let sentiment = think<Confident<Sentiment>>("Analyze sentiment") with context: review

let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence result"
  { confidence: >= 0.5 } => "Moderate confidence result"
  _ => "Low confidence — manual review needed"
}

print response
```

## Combining with Try/Catch

Handle confidence failures gracefully:

```thinklang
try {
  let value = result.expect(0.9)
  print value
} catch ConfidenceTooLow (e) {
  print "Confidence too low for reliable result"
}
```

## Summary

| Method | Behavior |
|---|---|
| `unwrap()` | Returns value unconditionally |
| `expect(threshold)` | Returns value or throws `ConfidenceTooLow` |
| `or(fallback)` | Returns value if confident, else fallback |
| `isConfident(threshold?)` | Returns `bool`, default threshold 0.7 |

## Using from JS/TS

The `Confident<T>` class is available in the library with the same methods. When the JSON schema has the Confident shape (`value` + `confidence` + `reasoning` properties), the runtime automatically wraps the result. See the [Library Error Handling](/library/error-handling) guide for catching `ConfidenceTooLow`.

```typescript
import { think, Confident, ConfidenceTooLow } from "thinklang";

const result = await think<Confident<{ label: string }>>({
  prompt: "Classify this product",
  jsonSchema: {
    type: "object",
    properties: {
      value: { type: "object", properties: { label: { type: "string" } }, required: ["label"] },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["value", "confidence", "reasoning"],
  },
});

// Same methods as in the language
const safe = result.expect(0.8);        // throws ConfidenceTooLow if < 0.8
const fallback = result.or({ label: "unknown" });
const isReliable = result.isConfident(0.9);
const mapped = result.map(v => v.label.toUpperCase());
```
