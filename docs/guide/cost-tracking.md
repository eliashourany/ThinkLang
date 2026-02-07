# Cost Tracking

Every AI call costs tokens. ThinkLang tracks usage automatically so you can monitor and control costs.

## Show Cost After Execution

Add the `--show-cost` flag to see a cost summary after running a program:

```bash
thinklang run app.tl --show-cost
```

Output:

```
--- Cost Summary ---
Total calls: 5
Total tokens: 3200 input, 1800 output
Total cost: $0.063000

By operation:
  think: 3 calls, 3500 tokens, $0.045000
  infer: 2 calls, 1500 tokens, $0.018000

By model:
  claude-opus-4-6: 5 calls, $0.063000
```

## Cost Report Command

View the cost report for the current session:

```bash
thinklang cost-report
```

This shows the same summary as `--show-cost` but can be run independently.

## What Gets Tracked

Every `think`, `infer`, `reason`, and `assert.semantic` call is recorded with:

| Field | Description |
|---|---|
| `operation` | Which primitive was called (`think`, `infer`, `reason`, `semantic_assert`) |
| `model` | The model used (e.g., `claude-opus-4-6`) |
| `inputTokens` | Number of input tokens consumed |
| `outputTokens` | Number of output tokens generated |
| `costUsd` | Estimated cost in USD |
| `durationMs` | How long the call took |
| `prompt` | First 100 characters of the prompt (for identification) |

## Cost Summary

The cost summary aggregates records into:

- **Total** input tokens, output tokens, cost, and call count
- **By operation** -- breakdown by `think`, `infer`, `reason`, `semantic_assert`
- **By model** -- breakdown by which model handled each call

## Model Pricing

Costs are calculated from per-million-token pricing:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| claude-opus-4-6 | $15.00 | $75.00 |
| claude-sonnet-4-5 | $3.00 | $15.00 |
| claude-haiku-4-5 | $0.80 | $4.00 |

## Reducing Costs

- **Enable caching.** Set `THINKLANG_CACHE=true` (the default). Identical requests are served from cache at zero cost.
- **Use `infer` for simple tasks.** `infer` uses shorter prompts than `think`, reducing token usage.
- **Keep context small.** Only include relevant data with `with context`. Large context means more input tokens.
- **Use `without context` for exclusions.** Strip unnecessary data before it reaches the AI.
- **Choose the right model.** Set `THINKLANG_MODEL` to a smaller model for tasks that do not require the most capable one.
- **Use replay in tests.** Run `thinklang test --replay` to avoid live API calls during test iteration.
