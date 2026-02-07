# Context

Context controls what data the AI can see when processing a request. ThinkLang provides `with context` to include data and `without context` to exclude it.

## with context: variable

Pass a single variable as context:

```thinklang
let email = "Congratulations! You've won a FREE iPhone!"

let result = think<Classification>("Classify this email")
  with context: email
```

The variable name and value are both sent to the AI, so the AI knows it is looking at an `email`.

## with context: block

Pass multiple variables using a block:

```thinklang
let sourceText = "The quick brown fox jumps over the lazy dog"
let targetLang = "French"

let result = think<Translation>("Translate the source text to the target language")
  with context: {
    sourceText,
    targetLang,
  }
```

Each variable name becomes a labeled key in the context, helping the AI understand the role of each piece of data.

## Chaining Context

You can pass AI results as context to subsequent calls:

```thinklang
let entities = think<Entities>("Extract technologies and challenges")
  with context: report

let analysis = think<Analysis>("Analyze the landscape based on these entities")
  with context: {
    entities,
    report,
  }
```

This enables multi-step workflows where each AI call builds on the previous one.

## without context

Use `without context` to exclude sensitive data from being sent to the AI. This is critical for privacy -- you can include a broad context while stripping out specific fields:

```thinklang
let profile = "John Doe, age 30, interests: hiking, photography"
let sensitiveData = "SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111"

let recommendation = think<Recommendation>("Suggest products based on user interests")
  with context: {
    profile,
    sensitiveData,
  }
  without context: sensitiveData
```

In this example, `sensitiveData` is excluded before the context is sent to the AI. The AI only sees `profile`.

## Context Truncation

ThinkLang automatically truncates context that exceeds the model's token limit. Large string values are trimmed with a `[truncated]` marker, and a warning is emitted:

```
[ThinkLang] Context exceeds token limit (~120000 tokens). Truncating...
```

Context entries are sorted by size, so smaller entries are preserved in full before larger ones are truncated.

## Best Practices

- **Name variables descriptively.** The variable name is sent to the AI as a label: `sourceText` is more informative than `s`.
- **Include only relevant data.** Smaller, focused context produces better results and costs less.
- **Use `without context` for sensitive fields.** Never send PII, credentials, or secrets to the AI.
- **Chain context across calls.** Build up understanding incrementally rather than dumping everything into one call.
