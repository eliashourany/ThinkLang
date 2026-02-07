# Testing

ThinkLang has a built-in test framework for validating AI outputs. Tests live in `.test.tl` files and support both value assertions and semantic assertions.

## Test Blocks

Define tests with the `test` keyword:

```thinklang
test "sentiment analysis returns positive" {
  let review = "This product is absolutely amazing!"

  let result = think<Sentiment>("Analyze sentiment") with context: review

  assert result.label == "positive"
  assert result.intensity >= 7
}
```

## Assertions

### Value Assertions

Use `assert` for standard value checks:

```thinklang
test "basic assertions" {
  let x = 42
  assert x == 42
  assert x > 0
  assert x != 0
}
```

### Semantic Assertions

Use `assert.semantic` to have the AI evaluate whether a value meets qualitative criteria:

```thinklang
test "summary quality" {
  let summary = think<Summary>("Summarize this article") with context: article

  assert.semantic(summary, "contains a clear headline")
  assert.semantic(summary, "key points are relevant to the original text")
  assert.semantic(summary, "tone assessment is accurate")
}
```

Semantic assertions call the AI to judge whether the subject satisfies the criteria. They return a `passes` boolean and an `explanation`.

## Running Tests

Run all `.test.tl` files in the current directory:

```bash
thinklang test
```

Run a specific file or directory:

```bash
thinklang test tests/
thinklang test tests/sentiment.test.tl
```

Filter by pattern:

```bash
thinklang test --pattern "sentiment"
```

## Replay Mode

AI calls are non-deterministic. ThinkLang supports snapshot-based replay for deterministic test runs.

### Recording Snapshots

Record live AI responses to snapshot files:

```bash
thinklang test --update-snapshots
```

This saves each AI request and response pair to a JSON snapshot file.

### Replaying Snapshots

Run tests using recorded snapshots instead of live AI calls:

```bash
thinklang test --replay
```

In replay mode, the `ReplayProvider` replays saved responses in order. No API calls are made, so tests run fast, are deterministic, and cost nothing.

### Per-Test Replay

You can also specify a snapshot file for individual test blocks:

```thinklang
test "classification is consistent" replay("snapshots/classify.json") {
  let result = think<Category>("Classify this item") with context: item
  assert result.name == "Electronics"
}
```

## Test Output

Test results are reported per file:

```
tests/sentiment.test.tl
  PASS: sentiment analysis returns positive (1.2s, $0.003)
  PASS: neutral text detected correctly (0.8s, $0.002)
  FAIL: edge case handling -- Assertion failed: result.label == "mixed"

2 passed, 1 failed (2.0s total, $0.005)
```

## Preamble

Type declarations, functions, and `let` bindings placed outside test blocks serve as shared preamble -- they are available to all tests in the file:

```thinklang
type Sentiment {
  label: string
  intensity: int
}

let review = "Great product!"

test "positive sentiment" {
  let result = think<Sentiment>("Analyze sentiment") with context: review
  assert result.label == "positive"
}

test "high intensity" {
  let result = think<Sentiment>("Analyze sentiment") with context: review
  assert result.intensity >= 5
}
```
